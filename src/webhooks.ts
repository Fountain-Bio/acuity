import { createHmac, timingSafeEqual } from "node:crypto";

import { AcuityWebhookError } from "./errors.js";
import type {
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

export interface WebhookSignatureVerificationOptions {
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

export interface VerifyWebhookSignatureParams
  extends WebhookSignatureVerificationOptions {
  body: WebhookBody;
  headers?: WebhookHeaders;
  /**
   * Signature to verify. If omitted, the helper tries to resolve it from the
   * provided headers.
   */
  signature?: string | null;
}

export interface WebhookHandlerOptions {
  /**
   * API key used to verify webhook payloads. Required when
   * `verifySignature !== false`.
   */
  secret?: string;
  /**
   * Override the signature header name. Defaults to `x-acuity-signature`.
   */
  headerName?: string;
  /**
   * Disable signature verification (useful for local development).
   */
  verifySignature?: boolean;
}

export interface WebhookHandleResult {
  event: WebhookEvent;
  signature: string | null;
  verified: boolean;
}

export type WebhookHandlerFn = (
  body: WebhookBody,
  headers: WebhookHeaders | undefined,
  handler: WebhookHandler,
  signature?: string | null,
) => Promise<WebhookHandleResult>;

export function verifyWebhookSignature(
  params: VerifyWebhookSignatureParams,
): string {
  const secret = params.secret?.trim();
  if (!secret) {
    throw new AcuityWebhookError({
      code: "invalid_payload",
      message: "Webhook secret is required to verify requests.",
    });
  }

  const resolvedSignature =
    resolveSignature(params.signature, params.headers, params.headerName) ??
    null;

  if (!resolvedSignature) {
    const header = params.headerName ?? DEFAULT_SIGNATURE_HEADER;
    throw new AcuityWebhookError({
      code: "signature_missing",
      message: `Missing "${header}" header on webhook request.`,
    });
  }

  const bodyBytes = normalizeBody(params.body);
  const expected = computeSignature(secret, bodyBytes);

  if (!safeCompare(expected, resolvedSignature)) {
    throw new AcuityWebhookError({ code: "signature_mismatch" });
  }

  return resolvedSignature;
}

export function parseWebhookEvent(body: WebhookBody): WebhookEvent {
  const normalized = normalizeBody(body);
  return parseWebhookEventFromText(decodeBody(normalized));
}

export function createWebhookHandler(
  options: WebhookHandlerOptions,
): WebhookHandlerFn {
  const shouldVerify = options.verifySignature !== false;
  const secret = options.secret?.trim();
  const headerName = options.headerName ?? DEFAULT_SIGNATURE_HEADER;

  if (shouldVerify && !secret) {
    throw new AcuityWebhookError({
      code: "invalid_payload",
      message: "Webhook secret is required to verify requests.",
    });
  }

  return async function handleWebhook(
    body: WebhookBody,
    headers: WebhookHeaders | undefined,
    handler: WebhookHandler,
    signature?: string | null,
  ): Promise<WebhookHandleResult> {
    if (typeof handler !== "function") {
      throw new AcuityWebhookError({
        code: "invalid_payload",
        message: "Webhook handler function is required.",
      });
    }

    const resolvedSignature = shouldVerify
      ? verifyWebhookSignature({
          body,
          headers,
          signature,
          secret: secret!,
          headerName,
        })
      : (resolveSignature(signature, headers, headerName) ?? null);

    const event = parseWebhookEvent(body);
    await handler(event);

    return {
      event,
      signature: resolvedSignature,
      verified: shouldVerify,
    };
  };
}

const APPOINTMENT_EVENT_TYPES = new Set<WebhookEventType>([
  "appointment.scheduled",
  "appointment.rescheduled",
  "appointment.canceled",
  "appointment.changed",
]);

function isWebhookEventType(value: string): value is WebhookEventType {
  return (APPOINTMENT_EVENT_TYPES as ReadonlySet<string>).has(value);
}

function parseWebhookEventFromText(bodyText: string): WebhookEvent {
  const params = new URLSearchParams(bodyText);
  const payload: Record<string, string | undefined> = {};
  params.forEach((value, key) => {
    payload[key] = value;
  });

  const actionValue = payload.action;

  if (!actionValue) {
    throw new AcuityWebhookError({
      code: "invalid_payload",
      message: 'Webhook payload is missing "action".',
    });
  }

  if (!isWebhookEventType(actionValue)) {
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
    action: actionValue,
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
