import { HttpClient } from "../http.js";
import type {
  CreateWebhookSubscriptionPayload,
  WebhookSubscription,
} from "../types.js";

export class WebhooksResource {
  constructor(private readonly http: HttpClient) {}

  list(): Promise<WebhookSubscription[]> {
    return this.http.request<WebhookSubscription[]>("GET", "/webhooks");
  }

  create(
    payload: CreateWebhookSubscriptionPayload,
  ): Promise<WebhookSubscription> {
    return this.http.request<WebhookSubscription>("POST", "/webhooks", {
      body: payload,
    });
  }

  delete(id: number): Promise<void> {
    return this.http.request<void>("DELETE", `/webhooks/${id}`);
  }
}
