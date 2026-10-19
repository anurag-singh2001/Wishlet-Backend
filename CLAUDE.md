# Backend (Fastify + Prisma)

Request flow: `routes/*.routes.ts` → `controllers/*.controller.ts` → `services/*.service.ts` → `repositories/*.repository.ts` → Prisma.

- Routes only map URLs to controller methods.
- Controllers: parse input with the Zod schemas in `schemas/`, call one service, shape the response. No business logic.
- Services: business rules. Never touch `request`/`reply`, never call `prisma` directly.
- Repositories: the only place that imports `utils/prisma.ts`.
- Errors: throw `ApiError(status, CODE, message)` from `plugins/error-handler.ts`; the central handler formats it (Zod errors become 400).
- Classes are exported as singletons (`export const wishService = new WishService()`); follow that pattern.
- ESM with `Node16` resolution: relative imports must end in `.js` (`../services/wish.service.js`).
- Env vars are read only through `config/env.ts`.

## Schema changes

Edit `prisma/schema.prisma`, then `npm run db:migrate -- --name <change>`. Never edit generated SQL by hand. Template-specific fields go in `content` JSON, not new columns.

## Tests

`node:test` + `node:assert`, files in `src/__tests__/*.test.ts`, run with `npm test`. Mock repository methods by reassigning them on the singleton and restore in `finally` (see `slug.test.ts`). Tests must not need a live database.
