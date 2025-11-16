import { HttpClient } from "../http";
import type {
  AvailabilityDate,
  AvailabilityDatesParams,
  AvailabilityTimeSlot,
  AvailabilityTimesParams,
  CheckTimesPayload,
  CheckTimesResponse,
} from "../types";

export class AvailabilityResource {
  constructor(private readonly http: HttpClient) {}

  dates(params: AvailabilityDatesParams): Promise<AvailabilityDate[]> {
    return this.http.request<
      AvailabilityDate[],
      AvailabilityDatesParams | undefined
    >("GET", "/availability/dates", { query: params });
  }

  times(params: AvailabilityTimesParams): Promise<AvailabilityTimeSlot[]> {
    return this.http.request<
      AvailabilityTimeSlot[],
      AvailabilityTimesParams | undefined
    >("GET", "/availability/times", { query: params });
  }

  checkTimes(payload: CheckTimesPayload): Promise<CheckTimesResponse> {
    return this.http.request<CheckTimesResponse>(
      "POST",
      "/availability/check-times",
      { body: payload },
    );
  }
}
