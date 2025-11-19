export interface AcuityClientOptions {
  /**
   * Acuity user ID that serves as the HTTP Basic Auth username.
   */
  userId: string | number;
  /**
   * API key serving as the HTTP Basic Auth password.
   */
  apiKey: string;
  /**
   * Override the default REST base URL.
   */
  baseUrl?: string;
  /**
   * Optional timeout applied to every HTTP request (milliseconds).
   */
  requestTimeoutMs?: number;
  /**
   * Default appointment mutation flags (e.g. `noEmail`, `admin`) that are
   * merged into create/cancel/reschedule requests unless overridden per call.
   */
  appointmentDefaults?: AppointmentRequestDefaults;
}

export type SortDirection = "asc" | "desc";

export interface ListAppointmentsParams {
  calendarID?: number;
  categoryID?: number;
  appointmentTypeID?: number;
  clientID?: number;
  max?: number;
  minDate?: string;
  maxDate?: string;
  minTime?: string;
  maxTime?: string;
  canceled?: boolean;
  showall?: boolean;
  direction?: SortDirection;
  /**
   * Strip form answers from each appointment to reduce payload size.
   */
  excludeForms?: boolean;
  timezone?: string;
  page?: number;
  limit?: number;
}

export interface AppointmentFormAnswer {
  id: number;
  fieldID: number;
  name: string;
  value: string | string[] | null;
  isMultiple: boolean;
  sortOrder: number;
}

export interface Appointment {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  date: string;
  endDate?: string;
  time: string;
  endTime?: string;
  type: string;
  appointmentTypeID: number;
  calendar: string;
  calendarID: number;
  calendarTimeZone: string;
  price?: string;
  paid?: string;
  notes?: string;
  forms: AppointmentFormAnswer[];
  certificate?: unknown;
  package?: unknown;
  noShow?: boolean;
  canceled?: boolean;
}

export type AppointmentTypeKind = "service" | "class" | "series";

export interface AppointmentType {
  id: number;
  active: boolean;
  name: string;
  description?: string | null;
  duration: number;
  price?: string | number | null;
  category?: string | null;
  color?: string | null;
  private: boolean;
  type: AppointmentTypeKind;
  classSize: number | null;
  paddingAfter?: number;
  paddingBefore?: number;
  calendarIDs: number[];
}

export interface GetAppointmentOptions {
  pastFormAnswers?: boolean;
}

export interface AppointmentQueryOptions {
  /**
   * Suppress Acuity's transactional emails for the mutation being performed.
   */
  noEmail?: boolean;
  /**
   * Execute the request with admin-level privileges, overriding client-facing restrictions.
   */
  admin?: boolean;
}

export type CreateAppointmentOptions = AppointmentQueryOptions;
export type AppointmentActionOptions = AppointmentQueryOptions;

/**
 * Default query parameters that are automatically merged into the appointment mutation helpers.
 * Useful for consistently applying flags such as `admin=true` or `noEmail=true` without repeating them.
 */
export interface AppointmentRequestDefaults {
  /**
   * Baseline query overrides applied to `appointments.create` (e.g., always book as admin and/or suppress emails).
   */
  create?: CreateAppointmentOptions;
  /**
   * Baseline query overrides applied to `appointments.cancel` (e.g., skip client email notifications).
   */
  cancel?: AppointmentActionOptions;
  /**
   * Baseline query overrides applied to `appointments.reschedule`, such as forcing admin privileges or muting client notifications.
   */
  reschedule?: AppointmentActionOptions;
}

export interface CreateAppointmentPayload {
  datetime: string;
  appointmentTypeID: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  calendarID?: number;
  notes?: string;
  fields?: Array<{ fieldID: number; value: string | string[] }>;
  certificate?: string;
  packageID?: number;
  coupon?: string;
  formID?: number;
  smsOptIn?: boolean;
}

export type UpdateAppointmentPayload = Partial<
  Pick<
    CreateAppointmentPayload,
    | "firstName"
    | "lastName"
    | "email"
    | "phone"
    | "notes"
    | "fields"
    | "calendarID"
  >
>;

export interface CancelAppointmentPayload {
  noShow?: boolean;
  cancelNote?: string;
}

export interface RescheduleAppointmentPayload {
  datetime: string;
  calendarID?: number;
}

export interface AvailabilityDatesParams {
  /**
   * Month to inspect, formatted as `YYYY-MM` (e.g., `"2025-01"`).
   */
  month: string;
  /**
   * Appointment type whose availability should be evaluated.
   */
  appointmentTypeID: number;
  /**
   * Optional calendar filter; omit to aggregate across all calendars.
   */
  calendarID?: number;
  /**
   * IANA timezone identifier (e.g., `America/New_York`) for the response payload.
   */
  timezone?: string;
}

export interface AvailabilityDate {
  /**
   * ISO date string (YYYY-MM-DD) returned by `/availability/dates`.
   */
  date: string;
}

export interface AvailabilityTimeSlot {
  /**
   * ISO timestamp (with timezone offset) for a specific bookable slot.
   */
  time: string;
}

export interface AvailabilityTimesParams {
  /**
   * Date to evaluate, formatted as `YYYY-MM-DD`.
   */
  date: string;
  /**
   * Appointment type whose availability should be evaluated for the date.
   */
  appointmentTypeID: number;
  /**
   * Optional calendar filter; omit to include all calendars that offer the slot.
   */
  calendarID?: number;
  /**
   * IANA timezone identifier (e.g., `America/New_York`) applied to display fields.
   */
  timezone?: string;
}

export interface CheckTimesPayload {
  datetime: string;
  appointmentTypeID: number;
  calendarID?: number;
  timezone?: string;
  duration?: number;
  price?: string | number;
}

export interface CheckTimesResponse {
  datetime: string;
  timezone: string;
  appointmentTypeID: number;
  appointmentType: string;
  calendarID: number;
  calendar: string;
  available: boolean;
  multipleClientsAllowed?: boolean;
  duration: number;
  price?: string;
  deposit?: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  certificate?: Record<string, unknown> | null;
  package?: Record<string, unknown> | null;
  addons?: unknown[];
  labels?: unknown[];
  forms?: unknown[];
  message?: string;
}

export interface Calendar {
  id: number;
  name: string;
  timezone: string;
  email?: string | null;
  replyTo?: string | null;
  description?: string | null;
  location?: string | null;
  image?: string | null;
  thumbnail?: string | null;
}

export type StaticWebhookAppointmentAction =
  | "scheduled"
  | "rescheduled"
  | "canceled"
  | "changed";

export type StaticWebhookEventType =
  `appointment.${StaticWebhookAppointmentAction}`;

export interface StaticWebhookEvent {
  scope: "appointment";
  action: StaticWebhookAppointmentAction;
  type: StaticWebhookEventType;
  id: number;
  calendarID: number | null;
  appointmentTypeID: number | null;
  payload: Record<string, string | undefined>;
  rawBody: string;
}

export type StaticWebhookHandler = (
  event: StaticWebhookEvent,
) => void | Promise<void>;

export type DynamicWebhookEvent = StaticWebhookEventType;

export type DynamicWebhookStatus = "active" | "disabled";

export interface CreateWebhookSubscriptionPayload {
  event: DynamicWebhookEvent;
  target: string;
}

export interface WebhookSubscription {
  id: number;
  event: DynamicWebhookEvent;
  target: string;
  status: DynamicWebhookStatus;
}
