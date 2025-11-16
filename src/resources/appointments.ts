import { HttpClient } from "../http";
import type {
  Appointment,
  CancelAppointmentPayload,
  CreateAppointmentPayload,
  GetAppointmentOptions,
  ListAppointmentsParams,
  RescheduleAppointmentPayload,
  UpdateAppointmentPayload,
} from "../types";

export class AppointmentsResource {
  constructor(private readonly http: HttpClient) {}

  list(params?: ListAppointmentsParams): Promise<Appointment[]> {
    return this.http.request<Appointment[], ListAppointmentsParams | undefined>(
      "GET",
      "/appointments",
      { query: params },
    );
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
    options?: { admin?: boolean },
  ): Promise<Appointment> {
    const query = options?.admin ? { admin: true } : undefined;
    return this.http.request<Appointment, { admin: boolean } | undefined>(
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

  cancel(id: number, payload?: CancelAppointmentPayload): Promise<Appointment> {
    return this.http.request<Appointment>("PUT", `/appointments/${id}/cancel`, {
      body: payload,
    });
  }

  reschedule(
    id: number,
    payload: RescheduleAppointmentPayload,
  ): Promise<Appointment> {
    return this.http.request<Appointment>(
      "PUT",
      `/appointments/${id}/reschedule`,
      { body: payload },
    );
  }
}
