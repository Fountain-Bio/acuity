# acuity-sdk

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run src/index.ts
```

This project was created using `bun init` in bun v1.3.2. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.

## Usage

```ts
import { Acuity } from "@fountain-bio/acuity-sdk";

const acuity = new Acuity({
  userId: process.env.ACUITY_USER_ID!,
  apiKey: process.env.ACUITY_API_KEY!,
  requestTimeoutMs: 10_000,
  appointmentDefaults: {
    create: { admin: true, noEmail: true },
    cancel: { admin: true, noEmail: true },
    reschedule: { admin: true, noEmail: true },
  },
});

// Per-call options still override the defaults:
await acuity.appointments.create(payload, { admin: true });
```

`requestTimeoutMs` is optional; when provided the SDK will automatically cancel calls that exceed the threshold. Timed-out requests throw `AcuityTimeoutError`, letting you distinguish them from other network failures.

## Handling static webhooks

```ts
import { createWebhookHandler } from "@fountain-bio/acuity-sdk";

const handleWebhook = createWebhookHandler({
  secret: process.env.ACUITY_WEBHOOK_SECRET!,
});

export async function POST(req: Request) {
  const body = await req.text();

  await handleWebhook(body, req.headers, async (event) => {
    switch (event.type) {
      case "appointment.scheduled":
        break;
      case "appointment.rescheduled":
        break;
      case "appointment.canceled":
        break;
      case "appointment.changed":
        break;
    }
  });

  return new Response(null, { status: 204 });
}
```

`createWebhookHandler` (also exported as `createStaticWebhookHandler` for backwards compatibility) binds the API key and signature header name once, returning a function you call per request with the raw body, headers, and your event handler. The helper verifies the `x-acuity-signature` header, parses the form-encoded payload, and surfaces typed appointment events for you to branch on.

## Managing dynamic webhooks

```ts
const hook = await acuity.webhooks.create({
  event: "appointment.scheduled",
  target: "https://example.com/webhooks/acuity",
});

const subscriptions = await acuity.webhooks.list();

await acuity.webhooks.delete(hook.id);
```

Dynamic webhooks call your HTTPS endpoint and include an `x-acuity-signature` header. Use the API key tied to the authenticated user that created the webhook when instantiating `createWebhookHandler`, and compare the computed signature against the header before processing the payload. Acuity caps each account at 25 dynamic webhooks and returns `400` if you try to create more.

```ts
const handleDynamicWebhook = createWebhookHandler({
  secret: process.env.ACUITY_API_KEY!,
});

export async function POST(req: Request) {
  await handleDynamicWebhook(await req.text(), req.headers, async (event) => {
    console.log("dynamic webhook event", event.type);
  });
  return new Response(null, { status: 204 });
}
```
