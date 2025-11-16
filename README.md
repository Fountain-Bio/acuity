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
