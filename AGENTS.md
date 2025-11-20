# Repository Guidelines

## Project Structure & Module Organization
Core TypeScript sources live in `src/`, with `client.ts`, `http.ts`, and `resources/*` exposing typed API helpers; shared DTOs and option contracts sit in `types.ts`, and error helpers in `errors.ts`. Generated JS/DT files emit to `dist/` after builds—never hand-edit them. Docs describing Acuity endpoints live under `docs/acuity-appointments-availability.md`; keep SDK behavior changes mirrored there.

## Build, Test, and Development Commands
- `bun install` — install deps pinned in `bun.lock`.
- `bun run build` — compile TypeScript via `tsc -p tsconfig.build.json` into `dist/`.
- `bun run typecheck` — no-emit compiler pass for faster CI sanity checks.
- `bun run lint` / `bun run fmt` — run Oxlint (type-aware) and OxFMT; run `fmt` before committing if lint reports formatting issues.
- `bun run src/index.ts` — execute the SDK entry for manual smoke tests.

## Coding Style & Naming Conventions
The repo targets Bun + TypeScript ES modules. Use 2-space indentation, named exports, and PascalCase for classes/resources (`AppointmentsResource`), camelCase for variables/functions, and SCREAMING_SNAKE_CASE only for env constants. Prefer async/await over raw promises. Let Oxlint/OxFMT enforce spacing/import order; never disable lint rules without justification.

## Testing Guidelines
A formal test harness is not yet committed; when adding tests, prefer Bun’s `bun test` runner with files placed alongside code as `*.test.ts`. Keep tests deterministic by mocking network calls at the `HttpClient` boundary. Run `bun run typecheck` after tests to ensure DTO changes stay aligned.

## Commit & Pull Request Guidelines
Commits observed in history use short, imperative subjects (“add release workflow and lint”). Keep scopes small, reference packages or domains when helpful (`appointments: add pagination`). PRs should describe API changes, note docs or dist impacts, and link related tickets. Include reproduction steps or screenshots for behavior changes, and confirm lint/typecheck/test status in the description.

## Security & Configuration Tips
Authenticate via `AcuityClientOptions` (`src/types.ts`) using Basic Auth credentials; load them from `.env` or CI secrets, never from the repo. Review `baseUrl` overrides before merging to avoid accidentally pointing to staging endpoints in releases.

## Permissions

When you are running in the sandbox and dont have permissions to use a tool, request permissions
