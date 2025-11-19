export interface AcuityErrorDetails {
  status: number;
  code?: string;
  message?: string;
  payload?: unknown;
}

export class AcuityError extends Error {
  public readonly status: number;
  public readonly code?: string;
  public readonly payload?: unknown;

  constructor({ status, code, message, payload }: AcuityErrorDetails) {
    super(message ?? code ?? `Acuity request failed with status ${status}`);
    this.name = "AcuityError";
    this.status = status;
    this.code = code;
    this.payload = payload;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export class AcuityAuthError extends AcuityError {
  constructor(details: AcuityErrorDetails) {
    super({
      ...details,
      message: details.message ?? "Authentication with Acuity failed.",
    });
    this.name = "AcuityAuthError";
  }
}

export class AcuityForbiddenError extends AcuityError {
  constructor(details: AcuityErrorDetails) {
    super({
      ...details,
      message:
        details.message ??
        "You do not have permission to access this resource.",
    });
    this.name = "AcuityForbiddenError";
  }
}

export class AcuityNotFoundError extends AcuityError {
  constructor(details: AcuityErrorDetails) {
    super({
      ...details,
      message: details.message ?? "The requested resource was not found.",
    });
    this.name = "AcuityNotFoundError";
  }
}

export class AcuityRateLimitError extends AcuityError {
  constructor(details: AcuityErrorDetails) {
    super({
      ...details,
      message:
        details.message ?? "Rate limit exceeded. Please retry with backoff.",
    });
    this.name = "AcuityRateLimitError";
  }
}

export class AcuityValidationError extends AcuityError {
  constructor(details: AcuityErrorDetails) {
    super({
      ...details,
      message: details.message ?? "Validation failed for the provided data.",
    });
    this.name = "AcuityValidationError";
  }
}

export class AcuityConflictError extends AcuityError {
  constructor(details: AcuityErrorDetails) {
    super({
      ...details,
      message:
        details.message ??
        "The request conflicts with the current state of the resource.",
    });
    this.name = "AcuityConflictError";
  }
}

export class AcuityServerError extends AcuityError {
  constructor(details: AcuityErrorDetails) {
    super({
      ...details,
      message: details.message ?? "Acuity encountered an internal error.",
    });
    this.name = "AcuityServerError";
  }
}

export class AcuityNetworkError extends AcuityError {
  constructor(details: AcuityErrorDetails) {
    super({
      ...details,
      message: details.message ?? "Network error while calling Acuity.",
    });
    this.name = "AcuityNetworkError";
  }
}

export class AcuityTimeoutError extends AcuityError {
  constructor(details: AcuityErrorDetails) {
    super({
      ...details,
      message:
        details.message ??
        "Acuity request timed out. Consider increasing the timeout threshold.",
    });
    this.name = "AcuityTimeoutError";
  }
}

export type AcuityErrorResponse = {
  status_code?: number;
  status?: number;
  error?: string;
  message?: string;
  details?: unknown;
};

export type AcuityWebhookErrorCode =
  | "signature_missing"
  | "signature_mismatch"
  | "invalid_payload";

export interface AcuityWebhookErrorDetails {
  code: AcuityWebhookErrorCode;
  message?: string;
  cause?: unknown;
}

const WEBHOOK_ERROR_MESSAGES: Record<AcuityWebhookErrorCode, string> = {
  signature_missing: "Static webhook signature header is missing.",
  signature_mismatch: "Static webhook signature verification failed.",
  invalid_payload: "Static webhook payload is invalid.",
};

export class AcuityWebhookError extends Error {
  public readonly code: AcuityWebhookErrorCode;

  constructor({ code, message, cause }: AcuityWebhookErrorDetails) {
    super(message ?? WEBHOOK_ERROR_MESSAGES[code], { cause });
    this.name = "AcuityWebhookError";
    this.code = code;
    Error.captureStackTrace?.(this, this.constructor);
  }
}
