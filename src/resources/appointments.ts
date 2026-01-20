import { HttpClient } from "../http.js";
import type {
  Appointment,
  AppointmentActionOptions,
  AppointmentRequestDefaults,
  AppointmentType,
  CancelAppointmentPayload,
  CreateAppointmentOptions,
  CreateAppointmentPayload,
  GetAppointmentOptions,
  ListAppointmentsParams,
  RescheduleAppointmentPayload,
  UpdateAppointmentPayload,
} from "../types.js";

export class AppointmentsResource {
  /**
   * Creates a helper for listing and mutating appointments through Acuity's REST API.
   * @param http HTTP client configured with account credentials.
   * @param defaults Optional mutation defaults applied to create/cancel/reschedule calls.
   */
  constructor(
    private readonly http: HttpClient,
    private readonly defaults: AppointmentRequestDefaults = {},
  ) {}

  /**
   * Retrieves appointments that match the supplied filters (calendar, client, status, etc.).
   */
  list(params?: ListAppointmentsParams): Promise<Appointment[]> {
    const query = this.expandFieldFilters(params);
    return this.http.request<Appointment[], Record<string, unknown> | undefined>(
      "GET",
      "/appointments",
      { query },
    );
  }

  /**
   * Expands the `fields` object into `field:id` query parameters for the Acuity API.
   */
  private expandFieldFilters(params?: ListAppointmentsParams): Record<string, unknown> | undefined {
    if (!params) return undefined;
    const { fields, ...rest } = params;
    if (!fields || Object.keys(fields).length === 0) {
      return rest as Record<string, unknown>;
    }
    const expanded: Record<string, unknown> = { ...rest };
    for (const [fieldId, value] of Object.entries(fields)) {
      expanded[`field:${fieldId}`] = value;
    }
    return expanded;
  }

  /**
   * Lists every appointment type configured on the account.
   */
  types(): Promise<AppointmentType[]> {
    return this.http.request<AppointmentType[]>("GET", "/appointment-types");
  }

  /**
   * Fetches a single appointment by ID, optionally including historical form answers.
   */
  get(id: number, options?: GetAppointmentOptions): Promise<Appointment> {
    return this.http.request<Appointment, GetAppointmentOptions | undefined>(
      "GET",
      `/appointments/${id}`,
      { query: options },
    );
  }

  /**
   * Books a new appointment and applies any configured mutation defaults (admin/noEmail).
   */
  create(
    payload: CreateAppointmentPayload,
    options?: CreateAppointmentOptions,
  ): Promise<Appointment> {
    const query = this.mergeQueryOptions(this.defaults.create, options);
    return this.http.request<Appointment, CreateAppointmentOptions | undefined>(
      "POST",
      "/appointments",
      { query, body: payload },
    );
  }

  /**
   * Updates mutable appointment fields such as contact info, notes, or custom fields.
   */
  update(id: number, payload: UpdateAppointmentPayload): Promise<Appointment> {
    return this.http.request<Appointment>("PUT", `/appointments/${id}`, {
      body: payload,
    });
  }

  /**
   * Cancels an appointment (optionally marking it as a no-show) while honoring mutation defaults.
   */
  cancel(
    id: number,
    payload?: CancelAppointmentPayload,
    options?: AppointmentActionOptions,
  ): Promise<Appointment> {
    const query = this.mergeQueryOptions(this.defaults.cancel, options);
    return this.http.request<Appointment, AppointmentActionOptions | undefined>(
      "PUT",
      `/appointments/${id}/cancel`,
      {
        query,
        body: payload,
      },
    );
  }

  /**
   * Moves an appointment to a new datetime (and optional calendar) while honoring mutation defaults.
   */
  reschedule(
    id: number,
    payload: RescheduleAppointmentPayload,
    options?: AppointmentActionOptions,
  ): Promise<Appointment> {
    const query = this.mergeQueryOptions(this.defaults.reschedule, options);
    return this.http.request<Appointment, AppointmentActionOptions | undefined>(
      "PUT",
      `/appointments/${id}/reschedule`,
      {
        query,
        body: payload,
      },
    );
  }

  private mergeQueryOptions<T extends object>(defaults?: T, overrides?: T): T | undefined {
    if (!defaults && !overrides) {
      return undefined;
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    return {
      ...defaults,
      ...overrides,
    } as T;
  }
}
