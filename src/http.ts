import { type AcuityClientOptions } from "./types";
import {
  AcuityAuthError,
  AcuityConflictError,
  AcuityError,
  type AcuityErrorResponse,
  AcuityForbiddenError,
  AcuityNetworkError,
  AcuityNotFoundError,
  AcuityRateLimitError,
  AcuityServerError,
  AcuityValidationError,
} from "./errors";

type HttpMethod = "GET" | "POST" | "PUT";

export interface RequestOptions<Q extends object | undefined = undefined> {
  query?: Q;
  body?: unknown;
  signal?: AbortSignal;
}

const DEFAULT_BASE_URL = "https://acuityscheduling.com/api/v1";

export class HttpClient {
  private readonly userId: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly defaultSignal?: AbortSignal;

  constructor(options: AcuityClientOptions) {
    this.userId = String(options.userId);
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    this.defaultSignal = options.signal;
  }

  async request<T, Q extends object | undefined = undefined>(
    method: HttpMethod,
    path: string,
    options?: RequestOptions<Q>,
  ): Promise<T> {
    const url = this.createUrl(path, options?.query);
    const headers: Record<string, string> = {
      Authorization: this.buildAuthHeader(),
    };
    const init: RequestInit = {
      method,
      headers,
      signal: options?.signal ?? this.defaultSignal,
    };

    if (options?.body !== undefined) {
      headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    let response: Response;
    try {
      response = await fetch(url, init);
    } catch (error) {
      throw new AcuityNetworkError({
        status: 0,
        code: "network_error",
        message: (error as Error).message,
        payload: error,
      });
    }

    const payload = await this.parsePayload(response);
    if (!response.ok) {
      throw this.createError(response.status, payload);
    }

    return payload as T;
  }

  private createUrl(path: string, query?: object): string {
    const url = new URL(path, this.baseUrl);
    if (query) {
      for (const [key, value] of Object.entries(
        query as Record<string, unknown>,
      )) {
        if (value === undefined || value === null) continue;
        url.searchParams.append(key, this.normalizeQueryValue(value));
      }
    }
    return url.toString();
  }

  private normalizeQueryValue(value: unknown): string {
    if (Array.isArray(value)) {
      return value.map((item) => this.normalizeQueryValue(item)).join(",");
    }
    if (typeof value === "boolean") {
      return value ? "true" : "false";
    }
    return String(value);
  }

  private buildAuthHeader(): string {
    const credentials = Buffer.from(`${this.userId}:${this.apiKey}`).toString(
      "base64",
    );
    return `Basic ${credentials}`;
  }

  private async parsePayload(response: Response): Promise<unknown> {
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      try {
        return await response.json();
      } catch {
        return {};
      }
    }
    const text = await response.text();
    return text ? { message: text } : {};
  }

  private createError(status: number, payload: unknown): AcuityError {
    const normalized = (payload ?? {}) as AcuityErrorResponse;
    const code = normalized.error ?? this.mapStatusToCode(status);
    const message = normalized.message;
    const details = { status, code, message, payload };

    if (status === 401) return new AcuityAuthError(details);
    if (status === 403) return new AcuityForbiddenError(details);
    if (status === 404) return new AcuityNotFoundError(details);
    if (status === 409) return new AcuityConflictError(details);
    if (status === 422) return new AcuityValidationError(details);
    if (status === 429) return new AcuityRateLimitError(details);
    if (status >= 500) return new AcuityServerError(details);
    if (status >= 400) return new AcuityValidationError(details);
    return new AcuityError(details);
  }

  private mapStatusToCode(status: number): string {
    switch (status) {
      case 400:
        return "bad_request";
      case 401:
        return "unauthorized";
      case 403:
        return "forbidden";
      case 404:
        return "not_found";
      case 405:
        return "method_not_allowed";
      case 409:
        return "conflict";
      case 422:
        return "invalid_data";
      case 429:
        return "too_many_requests";
      default:
        return status >= 500 ? "server_error" : "unknown_error";
    }
  }
}
