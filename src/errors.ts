// Generic HTTP/status-driven codes that can be returned across endpoints.
export const AcuityErrorCode = {
  BadRequest: "bad_request",
  Unauthorized: "unauthorized",
  Forbidden: "forbidden",
  NotFound: "not_found",
  MethodNotAllowed: "method_not_allowed",
  Conflict: "conflict",
  InvalidData: "invalid_data",
  TooManyRequests: "too_many_requests",
  ServerError: "server_error",
  UnknownError: "unknown_error",
  Timeout: "timeout",
  Network: "network_error",
} as const;

export type AcuityErrorCode =
  (typeof AcuityErrorCode)[keyof typeof AcuityErrorCode];

// Endpoint-scoped codes for POST /appointments.
export const AppointmentErrorCode = {
  RequiredFirstName: "required_first_name",
  RequiredLastName: "required_last_name",
  RequiredEmail: "required_email",
  InvalidEmail: "invalid_email",
  InvalidFields: "invalid_fields",
  RequiredField: "required_field",
  RequiredAppointmentTypeId: "required_appointment_type_id",
  InvalidAppointmentType: "invalid_appointment_type",
  InvalidCalendar: "invalid_calendar",
  RequiredDatetime: "required_datetime",
  InvalidTimezone: "invalid_timezone",
  InvalidDatetime: "invalid_datetime",
  NoAvailableCalendar: "no_available_calendar",
  NotAvailableMinHoursInAdvance: "not_available_min_hours_in_advance",
  NotAvailableMaxDaysInAdvance: "not_available_max_days_in_advance",
  NotAvailable: "not_available",
  InvalidCertificate: "invalid_certificate",
  ExpiredCertificate: "expired_certificate",
  CertificateUses: "certificate_uses",
  InvalidCertificateType: "invalid_certificate_type",
} as const;

export type AppointmentErrorCode =
  (typeof AppointmentErrorCode)[keyof typeof AppointmentErrorCode];

// Endpoint-scoped codes for PUT /appointments/cancel.
export const CancelAppointmentErrorCode = {
  CancelNotAllowed: "cancel_not_allowed",
  CancelTooClose: "cancel_too_close",
} as const;

export type CancelAppointmentErrorCode =
  (typeof CancelAppointmentErrorCode)[keyof typeof CancelAppointmentErrorCode];

// Endpoint-scoped codes for PUT /appointments/reschedule.
export const RescheduleAppointmentErrorCode = {
  RescheduleNotAllowed: "reschedule_not_allowed",
  RescheduleTooClose: "reschedule_too_close",
  RescheduleSeries: "reschedule_series",
  RescheduleCanceled: "reschedule_canceled",
  InvalidCalendar: "invalid_calendar",
  RequiredDatetime: "required_datetime",
  InvalidTimezone: "invalid_timezone",
  InvalidDatetime: "invalid_datetime",
  NotAvailableMinHoursInAdvance: "not_available_min_hours_in_advance",
  NotAvailableMaxDaysInAdvance: "not_available_max_days_in_advance",
  NotAvailable: "not_available",
} as const;

export type RescheduleAppointmentErrorCode =
  (typeof RescheduleAppointmentErrorCode)[keyof typeof RescheduleAppointmentErrorCode];

export type KnownAcuityErrorCode =
  | AcuityErrorCode
  | AppointmentErrorCode
  | CancelAppointmentErrorCode
  | RescheduleAppointmentErrorCode;

export interface AcuityErrorDetails {
  status: number;
  code?: KnownAcuityErrorCode;
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
  signature_missing: "Webhook signature header is missing.",
  signature_mismatch: "Webhook signature verification failed.",
  invalid_payload: "Webhook payload is invalid.",
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
