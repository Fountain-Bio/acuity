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
   * Optional AbortController signal shared across requests.
   */
  signal?: AbortSignal;
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
  includePayments?: boolean;
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
  [key: string]: unknown;
}

export interface GetAppointmentOptions {
  pastFormAnswers?: boolean;
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
> & {
  sendConfirmationEmail?: boolean;
  sendRescheduleEmail?: boolean;
};

export interface CancelAppointmentPayload {
  noShow?: boolean;
  cancelNote?: string;
  sendEmail?: boolean;
}

export interface RescheduleAppointmentPayload {
  datetime: string;
  calendarID?: number;
  sendRescheduleEmail?: boolean;
}

export interface AvailabilityDatesParams {
  month: string;
  appointmentTypeID: number;
  calendarID?: number;
  timezone?: string;
}

export interface AvailabilityDate {
  date: string;
  slots: number;
}

export interface AvailabilityTimesParams {
  date: string;
  appointmentTypeID: number;
  calendarID?: number;
  timezone?: string;
}

export interface AvailabilityTimeSlot {
  time: string;
  slots: number;
  type: string;
  appointmentTypeID: number;
  price?: string;
  calendar?: string;
  calendarID?: number;
  isDefaultCalendar?: boolean;
  timezone?: string;
  readableTime?: string;
  [key: string]: unknown;
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
  payments?: unknown[];
  addons?: unknown[];
  labels?: unknown[];
  forms?: unknown[];
  message?: string;
  [key: string]: unknown;
}
