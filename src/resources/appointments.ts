import { HttpClient } from "../http";
import type {
  Appointment,
  AppointmentEmailOptions,
  CancelAppointmentPayload,
  CreateAppointmentOptions,
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
    options?: CreateAppointmentOptions,
  ): Promise<Appointment> {
    return this.http.request<
      Appointment,
      CreateAppointmentOptions | undefined
    >("POST", "/appointments", { query: options, body: payload });
  }

  update(id: number, payload: UpdateAppointmentPayload): Promise<Appointment> {
    return this.http.request<Appointment>("PUT", `/appointments/${id}`, {
      body: payload,
    });
  }

  cancel(
    id: number,
    payload?: CancelAppointmentPayload,
    options?: AppointmentEmailOptions,
  ): Promise<Appointment> {
    return this.http.request<
      Appointment,
      AppointmentEmailOptions | undefined
    >("PUT", `/appointments/${id}/cancel`, {
      query: options,
      body: payload,
    });
  }

  reschedule(
    id: number,
    payload: RescheduleAppointmentPayload,
    options?: AppointmentEmailOptions,
  ): Promise<Appointment> {
    return this.http.request<
      Appointment,
      AppointmentEmailOptions | undefined
    >("PUT", `/appointments/${id}/reschedule`, {
      query: options,
      body: payload,
    });
  }
}
