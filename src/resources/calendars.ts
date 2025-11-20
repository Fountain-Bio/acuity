import { HttpClient } from "../http.js";
import type { Calendar } from "../types.js";

export class CalendarsResource {
  constructor(private readonly http: HttpClient) {}

  list(): Promise<Calendar[]> {
    return this.http.request<Calendar[]>("GET", "/calendars");
  }
}
