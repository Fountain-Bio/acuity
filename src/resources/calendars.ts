import { HttpClient } from "../http";
import type { Calendar } from "../types";

export class CalendarsResource {
  constructor(private readonly http: HttpClient) {}

  list(): Promise<Calendar[]> {
    return this.http.request<Calendar[]>("GET", "/calendars");
  }
}
