import { HttpClient } from "../http.js";
import type {
  AvailabilityDate,
  AvailabilityDatesParams,
  AvailabilityTimeSlot,
  AvailabilityTimesParams,
  CheckTimesPayload,
  CheckTimesResponse,
} from "../types.js";

export class AvailabilityResource {
  /**
   * Provides helpers for inspecting Availabilities endpoints using the shared HTTP client.
   */
  constructor(private readonly http: HttpClient) {}

  /**
   * Returns the days within the requested month that still have open slots for the appointment type.
   */
  dates(params: AvailabilityDatesParams): Promise<AvailabilityDate[]> {
    return this.http.request<
      AvailabilityDate[],
      AvailabilityDatesParams | undefined
    >("GET", "/availability/dates", { query: params });
  }

  /**
   * Lists individual time slots for a given date and appointment type (optionally filtered by calendar/timezone).
   */
  times(params: AvailabilityTimesParams): Promise<AvailabilityTimeSlot[]> {
    return this.http.request<
      AvailabilityTimeSlot[],
      AvailabilityTimesParams | undefined
    >("GET", "/availability/times", { query: params });
  }

  /**
   * Confirms whether the provided datetime (plus optional calendar/duration overrides) is still bookable.
   */
  checkTimes(payload: CheckTimesPayload): Promise<CheckTimesResponse> {
    return this.http.request<CheckTimesResponse>(
      "POST",
      "/availability/check-times",
      { body: payload },
    );
  }
}
