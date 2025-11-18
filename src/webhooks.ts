import { createHmac, timingSafeEqual } from "node:crypto";

import { AcuityWebhookError } from "./errors";
import type {
  StaticWebhookAppointmentAction,
  StaticWebhookEventType,
  StaticWebhookEvent,
  StaticWebhookHandler,
} from "./types";

const DEFAULT_SIGNATURE_HEADER = "x-acuity-signature";
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

type HeaderBag = Record<string, string | string[] | undefined> | HeaderGetter;

type HeaderGetter = {
  get(name: string): string | null | undefined;
};

export type StaticWebhookBody = string | ArrayBuffer | ArrayBufferView;

export interface StaticWebhookVerificationInput {
  /**
   * API key configured for the static webhook.
   */
  secret: string;
  /**
   * Raw `application/x-www-form-urlencoded` body as delivered by Acuity.
   */
  body: StaticWebhookBody;
  /**
   * Optional explicit signature extracted from the request.
   */
  signature?: string | null;
  /**
   * Entire header bag (Node, Fetch, or framework specific) if you prefer auto extraction.
   */
  headers?: HeaderBag;
  /**
   * Override the signature header name. Defaults to `x-acuity-signature`.
   */
  headerName?: string;
}

export type StaticWebhookHandleInput = StaticWebhookVerificationInput;

export function verifyStaticWebhookSignature(
  input: StaticWebhookVerificationInput,
): boolean {
  const secret = input.secret?.trim();
  if (!secret) {
    throw new AcuityWebhookError({
      code: "invalid_payload",
      message: "Static webhook verification requires a non-empty secret.",
    });
  }

  const signature = resolveSignature(
    input.signature,
    input.headers,
    input.headerName,
  );

  if (!signature) {
    return false;
  }

  const bodyBytes = normalizeBody(input.body);
  const expected = computeSignature(secret, bodyBytes);
  return safeCompare(expected, signature);
}

export function parseStaticWebhookEvent(bodyText: string): StaticWebhookEvent {
  return parseStaticWebhookEventFromText(bodyText);
}

export async function handleStaticWebhook(
  handler: StaticWebhookHandler,
  input: StaticWebhookHandleInput,
): Promise<StaticWebhookEvent> {
  const secret = input.secret?.trim();
  if (!secret) {
    throw new AcuityWebhookError({
      code: "invalid_payload",
      message: "Static webhook secret is required to verify requests.",
    });
  }

  const headerName = input.headerName ?? DEFAULT_SIGNATURE_HEADER;
  const signature =
    resolveSignature(input.signature, input.headers, headerName) ?? null;

  if (!signature) {
    throw new AcuityWebhookError({
      code: "signature_missing",
      message: `Missing "${headerName}" header on static webhook request.`,
    });
  }

  const bodyBytes = normalizeBody(input.body);
  const expected = computeSignature(secret, bodyBytes);

  if (!safeCompare(expected, signature)) {
    throw new AcuityWebhookError({ code: "signature_mismatch" });
  }

  const event = parseStaticWebhookEventFromText(decodeBody(bodyBytes));
  await handler(event);
  return event;
}

const APPOINTMENT_ACTIONS: readonly StaticWebhookAppointmentAction[] = [
  "scheduled",
  "rescheduled",
  "canceled",
  "changed",
];

const APPOINTMENT_EVENT_TYPE_MAP: Record<
  StaticWebhookAppointmentAction,
  StaticWebhookEventType
> = {
  scheduled: "appointment.scheduled",
  rescheduled: "appointment.rescheduled",
  canceled: "appointment.canceled",
  changed: "appointment.changed",
};

function parseStaticWebhookEventFromText(bodyText: string): StaticWebhookEvent {
  const params = new URLSearchParams(bodyText);
  const payload: Record<string, string | undefined> = {};
  params.forEach((value, key) => {
    payload[key] = value;
  });

  const actionValue = payload.action?.trim();

  if (!actionValue) {
    throw new AcuityWebhookError({
      code: "invalid_payload",
      message: 'Static webhook payload is missing "action".',
    });
  }

  if (!isAppointmentAction(actionValue)) {
    throw new AcuityWebhookError({
      code: "invalid_payload",
      message: `Unsupported static webhook action "${actionValue}".`,
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
        message: `Static webhook payload is missing "${field}".`,
      });
    }
    return null;
  }

  const parsed = Number.parseInt(trimmed, 10);

  if (Number.isNaN(parsed)) {
    throw new AcuityWebhookError({
      code: "invalid_payload",
      message: `Static webhook payload field "${field}" must be numeric.`,
    });
  }

  return parsed;
}

function isAppointmentAction(
  action: string,
): action is StaticWebhookAppointmentAction {
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

function normalizeBody(body: StaticWebhookBody): Uint8Array {
  if (typeof body === "string") {
    return textEncoder.encode(body);
  }

  if (body instanceof ArrayBuffer) {
    return new Uint8Array(body);
  }

  if (ArrayBuffer.isView(body)) {
    return new Uint8Array(body.buffer, body.byteOffset, body.byteLength);
  }

  throw new TypeError("Unsupported static webhook body type.");
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
