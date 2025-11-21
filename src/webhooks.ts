import { createHmac, timingSafeEqual } from "node:crypto";

import { AcuityWebhookError } from "./errors.js";
import type {
  WebhookAppointmentAction,
  WebhookEventType,
  WebhookEvent,
  WebhookHandler,
} from "./types.js";

const DEFAULT_SIGNATURE_HEADER = "x-acuity-signature";
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

type HeaderBag = Record<string, string | string[] | undefined> | HeaderGetter;

type HeaderGetter = {
  get(name: string): string | null | undefined;
};

export type WebhookBody = string | ArrayBuffer | ArrayBufferView;
export type WebhookHeaders = HeaderBag;

export interface WebhookFactoryOptions {
  /**
   * API key used to sign webhook requests (main admin for dashboard-configured
   * hooks, or the authenticated user's key for API-created hooks).
   */
  secret: string;
  /**
   * Override the signature header name. Defaults to `x-acuity-signature`.
   */
  headerName?: string;
}

export type WebhookHandlerFn = (
  body: WebhookBody,
  headers: WebhookHeaders | undefined,
  handler: WebhookHandler,
  signature?: string | null,
) => Promise<WebhookEvent>;

export function createWebhookHandler(
  options: WebhookFactoryOptions,
): WebhookHandlerFn {
  const secret = options.secret?.trim();
  if (!secret) {
    throw new AcuityWebhookError({
      code: "invalid_payload",
      message: "Webhook secret is required to verify requests.",
    });
  }

  const headerName = options.headerName ?? DEFAULT_SIGNATURE_HEADER;

  return async function handleWebhook(
    body: WebhookBody,
    headers: WebhookHeaders | undefined,
    handler: WebhookHandler,
    signature?: string | null,
  ): Promise<WebhookEvent> {
    if (typeof handler !== "function") {
      throw new AcuityWebhookError({
        code: "invalid_payload",
        message: "Webhook handler function is required.",
      });
    }

    const resolvedSignature =
      resolveSignature(signature, headers, headerName) ?? null;

    if (!resolvedSignature) {
      throw new AcuityWebhookError({
        code: "signature_missing",
        message: `Missing "${headerName}" header on webhook request.`,
      });
    }

    const bodyBytes = normalizeBody(body);
    const expected = computeSignature(secret, bodyBytes);

    if (!safeCompare(expected, resolvedSignature)) {
      throw new AcuityWebhookError({ code: "signature_mismatch" });
    }

    const event = parseWebhookEventFromText(decodeBody(bodyBytes));
    await handler(event);
    return event;
  };
}

const APPOINTMENT_ACTIONS: readonly WebhookAppointmentAction[] = [
  "scheduled",
  "rescheduled",
  "canceled",
  "changed",
];

const APPOINTMENT_EVENT_TYPE_MAP: Record<
  WebhookAppointmentAction,
  WebhookEventType
> = {
  scheduled: "appointment.scheduled",
  rescheduled: "appointment.rescheduled",
  canceled: "appointment.canceled",
  changed: "appointment.changed",
};

function parseWebhookEventFromText(bodyText: string): WebhookEvent {
  const params = new URLSearchParams(bodyText);
  const payload: Record<string, string | undefined> = {};
  params.forEach((value, key) => {
    payload[key] = value;
  });

  const actionValue = payload.action?.trim();

  if (!actionValue) {
    throw new AcuityWebhookError({
      code: "invalid_payload",
      message: 'Webhook payload is missing "action".',
    });
  }

  if (!isAppointmentAction(actionValue)) {
    throw new AcuityWebhookError({
      code: "invalid_payload",
      message: `Unsupported webhook action "${actionValue}".`,
    });
  }

  const id = parseNumeric(payload.id, "id", true);
  const calendarID = parseNumeric(payload.calendarID, "calendarID");
  const appointmentTypeID = parseNumeric(
    payload.appointmentTypeID,
    "appointmentTypeID",
  );

  return {
    scope: "appointment",
    action: actionValue,
    type: APPOINTMENT_EVENT_TYPE_MAP[actionValue],
    id,
    calendarID,
    appointmentTypeID,
    payload,
    rawBody: bodyText,
  };
}

function parseNumeric(
  value: string | undefined,
  field: string,
  required?: false,
): number | null;
function parseNumeric(
  value: string | undefined,
  field: string,
  required: true,
): number;
function parseNumeric(
  value: string | undefined,
  field: string,
  required = false,
): number | null {
  const trimmed = value?.trim();

  if (!trimmed) {
    if (required) {
      throw new AcuityWebhookError({
        code: "invalid_payload",
        message: `Webhook payload is missing "${field}".`,
      });
    }
    return null;
  }

  const parsed = Number.parseInt(trimmed, 10);

  if (Number.isNaN(parsed)) {
    throw new AcuityWebhookError({
      code: "invalid_payload",
      message: `Webhook payload field "${field}" must be numeric.`,
    });
  }

  return parsed;
}

function isAppointmentAction(
  action: string,
): action is WebhookAppointmentAction {
  return (APPOINTMENT_ACTIONS as readonly string[]).includes(action);
}

function resolveSignature(
  signature: string | null | undefined,
  headers: HeaderBag | undefined,
  headerName?: string,
): string | undefined {
  if (signature && signature.trim()) {
    return signature.trim();
  }

  if (!headers) {
    return undefined;
  }

  const target = (headerName ?? DEFAULT_SIGNATURE_HEADER).toLowerCase();

  if (isHeaderGetter(headers)) {
    const direct =
      headers.get(headerName ?? DEFAULT_SIGNATURE_HEADER) ??
      headers.get(target);
    return normalizeHeaderValue(direct);
  }

  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === target) {
      return normalizeHeaderValue(headers[key]);
    }
  }

  return undefined;
}

function normalizeHeaderValue(
  value: string | string[] | undefined | null,
): string | undefined {
  if (Array.isArray(value)) {
    return value[0]?.trim();
  }
  return value?.trim() ?? undefined;
}

function isHeaderGetter(value: HeaderBag): value is HeaderGetter {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  if (!("get" in value)) {
    return false;
  }

  const candidate = value as { get?: unknown };
  return typeof candidate.get === "function";
}

function normalizeBody(body: WebhookBody): Uint8Array {
  if (typeof body === "string") {
    return textEncoder.encode(body);
  }

  if (body instanceof ArrayBuffer) {
    return new Uint8Array(body);
  }

  if (ArrayBuffer.isView(body)) {
    return new Uint8Array(body.buffer, body.byteOffset, body.byteLength);
  }

  throw new TypeError("Unsupported webhook body type.");
}

function decodeBody(bytes: Uint8Array): string {
  return textDecoder.decode(bytes);
}

function computeSignature(secret: string, body: Uint8Array): string {
  return createHmac("sha256", secret).update(body).digest("base64");
}

function safeCompare(expected: string, actual: string): boolean {
  const expectedBytes = textEncoder.encode(expected);
  const actualBytes = textEncoder.encode(actual);

  if (expectedBytes.length !== actualBytes.length) {
    return false;
  }

  return timingSafeEqual(expectedBytes, actualBytes);
}
