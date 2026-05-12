# CollabBoard technical documentation

Canonical handover docs for the repository. Legacy notes under `/readme` may be outdated; prefer this folder.

## Reading order

1. [01-overview.md](./01-overview.md) — product and stack
2. [02-local-setup.md](./02-local-setup.md) — install, env, run dev/prod
3. [03-architecture.md](./03-architecture.md) — processes, routing, data flow
4. [04-environment-variables.md](./04-environment-variables.md) — all configuration keys
5. [05-database-supabase.md](./05-database-supabase.md) — schema, RLS, app integration
6. [06-realtime-protocol.md](./06-realtime-protocol.md) — Socket.IO events
7. [07-deployment.md](./07-deployment.md) — production and networking
8. [08-handover-checklist.md](./08-handover-checklist.md) — onboarding checklist

## Related

- Manual QA: [`../testing/README.md`](../testing/README.md) (use `npm test` to validate case-doc structure)
- SQL: [`../supabase/schema.sql`](../supabase/schema.sql), [`../supabase/seed.sql`](../supabase/seed.sql)
- Entry README: [`../README.md`](../README.md)
