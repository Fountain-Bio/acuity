# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TypeScript SDK and CLI for the [Acuity Scheduling API](https://acuityscheduling.com/). Published as `@fountain-bio/acuity` on npm.

## Commands

```bash
bun install          # Install dependencies
bun run build        # Compile TypeScript to dist/
bun run typecheck    # Type-check without emitting
bun run lint         # Run oxlint with type-aware rules + oxfmt check
bun run fmt          # Format code with oxfmt
bun test             # Run tests (bun:test)
```

## Bun Preferences

Use Bun instead of Node.js:

- `bun <file>` instead of `node` or `ts-node`
- `bun test` instead of jest/vitest
- `bun install` instead of npm/yarn/pnpm
- Bun auto-loads `.env` files (no dotenv needed)

## Architecture

```
src/
├── index.ts           # Public exports
├── client.ts          # Acuity class - main entry point
├── http.ts            # HttpClient - handles auth, requests, errors
├── types.ts           # All TypeScript interfaces
├── errors.ts          # Error classes and error codes
├── webhooks.ts        # Webhook signature verification and parsing
├── cli.ts             # yargs-powered CLI (bunx @fountain-bio/acuity)
└── resources/
    ├── appointments.ts  # CRUD + list/types/reschedule/cancel
    ├── availability.ts  # dates/times/checkTimes
    ├── calendars.ts     # list
    └── webhooks.ts      # list/create/delete subscriptions
```

**Client pattern**: `Acuity` class composes resource classes (`appointments`, `availability`, `calendars`, `webhooks`), each receiving a shared `HttpClient` instance.

**Error hierarchy**: `AcuityError` base class with specialized subclasses (`AcuityAuthError`, `AcuityValidationError`, `AcuityTimeoutError`, etc.). Error codes are typed enums split by endpoint scope.

**Webhook handling**: `createWebhookHandler()` returns a handler function for verifying signatures and parsing form-encoded payloads. Supports both dashboard-configured and API-created dynamic webhooks.

## Environment Variables

- `ACUITY_USER_ID` - User ID for HTTP Basic Auth
- `ACUITY_API_KEY` - API key for HTTP Basic Auth
- `ACUITY_BASE_URL` - Optional API base URL override
- `ACUITY_TIMEOUT_MS` - Optional request timeout
