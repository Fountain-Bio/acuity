# acuity-sdk

[![npm version](https://img.shields.io/npm/v/%40fountain-bio%2Facuity)](https://www.npmjs.com/package/@fountain-bio/acuity)

To install dependencies:

```bash
bun install
```

For npm publishing from CI, use npm Trusted Publishing (GitHub Actions OIDC) for this repository/workflow. No `NPM_TOKEN` secret is required.

## CLI

Every release publishes a small yargs-powered CLI so you can explore the API without writing code:

```bash
bunx @fountain-bio/acuity appointments list \
  --user-id $ACUITY_USER_ID \
  --api-key $ACUITY_API_KEY \
  --max 5
```

Flags mirror the SDK types: `appointments list/get/types`, `availability dates/times/check`, `calendars list`, and `webhooks list/create/delete`. Credentials default from `ACUITY_USER_ID` / `ACUITY_API_KEY`; optional `ACUITY_BASE_URL` and `ACUITY_TIMEOUT_MS` are also respected. Pass `--compact` to emit single-line JSON.

Rescheduling helpers: `availability times` now accepts `--ignore` to pass a comma-separated list of appointment IDs (`ignoreAppointmentIDs`) that should be ignored when computing open slots (helpful when you need to keep the current booking’s slot visible).

Create and manage dynamic webhooks from the CLI:

```bash
bunx @fountain-bio/acuity webhooks create \
  --user-id $ACUITY_USER_ID \
  --api-key $ACUITY_API_KEY \
  --event appointment.scheduled \
  --target https://example.com/webhooks/acuity

bunx @fountain-bio/acuity webhooks list

bunx @fountain-bio/acuity webhooks delete 123
```

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

## Handling webhooks

```ts
import { createWebhookHandler } from "@fountain-bio/acuity-sdk";

const handleWebhook = createWebhookHandler({
  secret: process.env.ACUITY_WEBHOOK_SECRET!,
  // Turn verification off in non-prod environments if you need to replay requests.
  verifySignature: process.env.NODE_ENV === "production",
});

export async function POST(req: Request) {
  const body = await req.text();

  const result = await handleWebhook(body, req.headers, async (event) => {
    switch (event.action) {
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

  // result.verified === false when verifySignature is disabled
  return new Response(null, { status: 204 });
}
```

`createWebhookHandler` binds the signature preferences once, returning a function you call per request with the raw body, headers, and your event handler. The helper can verify the `x-acuity-signature` header (enabled by default), parse the form-encoded payload, and surface typed appointment events. If you want to own each step manually, use the exported `verifyWebhookSignature` and `parseWebhookEvent` helpers directly.

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
  verifySignature: process.env.NODE_ENV === "production",
});

export async function POST(req: Request) {
  await handleDynamicWebhook(await req.text(), req.headers, async (event) => {
    console.log("dynamic webhook event", event.action);
  });
  return new Response(null, { status: 204 });
}
```
