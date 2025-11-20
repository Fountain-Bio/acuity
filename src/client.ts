import { HttpClient } from "./http.js";
import { AppointmentsResource } from "./resources/appointments.js";
import { AvailabilityResource } from "./resources/availability.js";
import { CalendarsResource } from "./resources/calendars.js";
import { WebhooksResource } from "./resources/webhooks.js";
import { type AcuityClientOptions } from "./types.js";

export class Acuity {
  public readonly appointments: AppointmentsResource;
  public readonly availability: AvailabilityResource;
  public readonly calendars: CalendarsResource;
  public readonly webhooks: WebhooksResource;

  private readonly http: HttpClient;

  constructor(options: AcuityClientOptions) {
    this.http = new HttpClient(options);
    this.appointments = new AppointmentsResource(
      this.http,
      options.appointmentDefaults,
    );
    this.availability = new AvailabilityResource(this.http);
    this.calendars = new CalendarsResource(this.http);
    this.webhooks = new WebhooksResource(this.http);
  }
}
