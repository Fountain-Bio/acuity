import { HttpClient } from "./http";
import { AppointmentsResource } from "./resources/appointments";
import { AvailabilityResource } from "./resources/availability";
import { CalendarsResource } from "./resources/calendars";
import { WebhooksResource } from "./resources/webhooks";
import { type AcuityClientOptions } from "./types";

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
