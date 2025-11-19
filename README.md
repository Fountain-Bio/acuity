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
import { createStaticWebhookHandler } from "@fountain-bio/acuity-sdk";

const handleWebhook = createStaticWebhookHandler({
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

`createStaticWebhookHandler` binds the API key and signature header name once, returning a function you call per request with the raw body, headers, and your event handler. The helper verifies the `x-acuity-signature` header, parses the form-encoded payload, and surfaces typed appointment events for you to branch on. Dynamic webhooks (and order notifications) remain out of scope for now.
