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
  appointmentDefaults: {
    create: { admin: true, noEmail: true },
    cancel: { admin: true, noEmail: true },
    reschedule: { admin: true, noEmail: true },
  },
});

// Per-call options still override the defaults:
await acuity.appointments.create(payload, { admin: true });
```

## Handling static webhooks

```ts
import { handleStaticWebhook } from "@fountain-bio/acuity-sdk";

export async function POST(req: Request) {
  const body = await req.text();

  await handleStaticWebhook(
    async (event) => {
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
    },
    {
      secret: process.env.ACUITY_WEBHOOK_SECRET!,
      body,
      headers: req.headers,
    },
  );

  return new Response(null, { status: 204 });
}
```

`handleStaticWebhook` verifies the `x-acuity-signature` header with your static webhook API key, parses the form-encoded payload, and hands you strongly typed appointment events to branch on. Call `verifyStaticWebhookSignature` if you only need a boolean guard or `parseStaticWebhookEvent(bodyText)` when another layer already validated the signature and gave you the raw form body as a string. Dynamic webhooks (and order notifications) are intentionally left out for now.
