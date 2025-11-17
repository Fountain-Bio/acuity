import { HttpClient } from "../http";
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
} from "../types";

export class AppointmentsResource {
  constructor(
    private readonly http: HttpClient,
    private readonly defaults: AppointmentRequestDefaults = {},
  ) {}

  list(params?: ListAppointmentsParams): Promise<Appointment[]> {
    return this.http.request<Appointment[], ListAppointmentsParams | undefined>(
      "GET",
      "/appointments",
      { query: params },
    );
  }

  types(): Promise<AppointmentType[]> {
    return this.http.request<AppointmentType[]>("GET", "/appointment-types");
  }

  get(id: number, options?: GetAppointmentOptions): Promise<Appointment> {
    return this.http.request<Appointment, GetAppointmentOptions | undefined>(
      "GET",
      `/appointments/${id}`,
      { query: options },
    );
  }

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

  update(id: number, payload: UpdateAppointmentPayload): Promise<Appointment> {
    return this.http.request<Appointment>("PUT", `/appointments/${id}`, {
      body: payload,
    });
  }

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

  private mergeQueryOptions<T extends object>(
    defaults?: T,
    overrides?: T,
  ): T | undefined {
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
