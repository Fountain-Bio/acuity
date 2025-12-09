import { type AcuityClientOptions } from "./types.js";
import {
  AppointmentErrorCode,
  CancelAppointmentErrorCode,
  RescheduleAppointmentErrorCode,
  AcuityErrorCode,
  type KnownAcuityErrorCode,
  AcuityAuthError,
  AcuityConflictError,
  AcuityError,
  type AcuityErrorResponse,
  AcuityForbiddenError,
  AcuityNetworkError,
  AcuityNotFoundError,
  AcuityRateLimitError,
  AcuityServerError,
  AcuityTimeoutError,
  AcuityValidationError,
} from "./errors.js";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

export interface RequestOptions<Q extends object | undefined = undefined> {
  query?: Q;
  body?: unknown;
}

const DEFAULT_BASE_URL = "https://acuityscheduling.com/api/v1";

export class HttpClient {
  private readonly userId: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs?: number;

  constructor(options: AcuityClientOptions) {
    this.userId = String(options.userId);
    this.apiKey = options.apiKey;
    this.baseUrl = this.normalizeBaseUrl(options.baseUrl ?? DEFAULT_BASE_URL);
    this.timeoutMs = options.requestTimeoutMs;
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
      signal: this.createTimeoutSignal(),
    };

    if (options?.body !== undefined) {
      headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    let response: Response;
    try {
      response = await fetch(url, init);
    } catch (error) {
      if (this.timeoutMs !== undefined && this.isAbortError(error)) {
        throw new AcuityTimeoutError({
          status: 0,
          code: AcuityErrorCode.Timeout,
          message: `Acuity request timed out after ${this.timeoutMs}ms`,
          payload: error,
        });
      }

      throw new AcuityNetworkError({
        status: 0,
        code: AcuityErrorCode.Network,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
        message: (error as Error).message,
        payload: error,
      });
    }

    const payload = await this.parsePayload(response);
    if (!response.ok) {
      throw this.createError(response.status, payload);
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    return payload as T;
  }

  private createUrl(path: string, query?: object): string {
    const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
    const url = new URL(normalizedPath, this.baseUrl);
    if (query) {
      for (const [key, value] of Object.entries(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
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
    const credentials = Buffer.from(`${this.userId}:${this.apiKey}`).toString("base64");
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
    const code = this.normalizeErrorCode(normalized.error) ?? this.mapStatusToCode(status);
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

  private normalizeErrorCode(raw?: string): KnownAcuityErrorCode | undefined {
    if (isKnownErrorCode(raw)) {
      return raw;
    }
    return undefined;
  }

  private mapStatusToCode(status: number): AcuityErrorCode {
    switch (status) {
      case 400:
        return AcuityErrorCode.BadRequest;
      case 401:
        return AcuityErrorCode.Unauthorized;
      case 403:
        return AcuityErrorCode.Forbidden;
      case 404:
        return AcuityErrorCode.NotFound;
      case 405:
        return AcuityErrorCode.MethodNotAllowed;
      case 409:
        return AcuityErrorCode.Conflict;
      case 422:
        return AcuityErrorCode.InvalidData;
      case 429:
        return AcuityErrorCode.TooManyRequests;
      default:
        return status >= 500 ? AcuityErrorCode.ServerError : AcuityErrorCode.UnknownError;
    }
  }

  private normalizeBaseUrl(baseUrl: string): string {
    return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  }

  private createTimeoutSignal(): AbortSignal | undefined {
    if (this.timeoutMs === undefined) {
      return undefined;
    }
    return AbortSignal.timeout(this.timeoutMs);
  }

  private isAbortError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }
    if (error.name === "AbortError") {
      return true;
    }
    // Some runtimes use an error code instead of the class name.
    if ("code" in error) {
      const code = (error as { code?: unknown }).code;
      return code === "ABORT_ERR";
    }
    return false;
  }
}

const KNOWN_ERROR_CODE_VALUES = new Set<string>([
  ...(Object.values(AcuityErrorCode) as string[]),
  ...(Object.values(AppointmentErrorCode) as string[]),
  ...(Object.values(CancelAppointmentErrorCode) as string[]),
  ...(Object.values(RescheduleAppointmentErrorCode) as string[]),
]);

function isKnownErrorCode(value: unknown): value is KnownAcuityErrorCode {
  return typeof value === "string" && KNOWN_ERROR_CODE_VALUES.has(value);
}
