# Qingmo Docs

Qingmo Docs is a collaborative document editor built with Go, Gin, PostgreSQL,
ProseMirror, Tiptap, and Yjs.

## Workspace

- `apps/backend/server` - Go + Gin backend
- `apps/frontend/web` - Vite + React web app
- `packages/core` - shared editor core
- `packages/react` - React bindings

## Scripts

- `cp apps/backend/server/.env.example apps/backend/server/.env` - create the
  local backend environment file
- `pnpm db:start` - start PostgreSQL for local development
- `pnpm dev` - start all workspace development processes, including the Go
  server
- `pnpm --filter @qingmo/server dev` - start only the Go server
- `make -C apps/backend/server dev` - start only the Go server without pnpm
- `pnpm build`
- `pnpm check-types`
- `pnpm lint`
- `pnpm lint:fix`
- `pnpm fmt`
- `pnpm fmt:check`

## Tooling

- Go
- TypeScript
- oxlint
- oxfmt
- Turbo
