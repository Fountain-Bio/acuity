import { HttpClient } from "./http";
import { AppointmentsResource } from "./resources/appointments";
import { AvailabilityResource } from "./resources/availability";
import { type AcuityClientOptions } from "./types";

export class Acuity {
  public readonly appointments: AppointmentsResource;
  public readonly availability: AvailabilityResource;

  private readonly http: HttpClient;

  constructor(options: AcuityClientOptions) {
    this.http = new HttpClient(options);
    this.appointments = new AppointmentsResource(
      this.http,
      options.appointmentDefaults,
    );
    this.availability = new AvailabilityResource(this.http);
  }
}
