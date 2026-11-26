# Comandou Operations and UX Implementation Plan

> **For agentic workers:** Execute task-by-task in this session. Use test-first changes where test seams exist and record every blocked integration in the final validation report.

**Goal:** Make the Comandou workspace clearer and safer for counter-first stores while preserving command, QR, service, production, fiscal, and subscription flows.

**Architecture:** Keep Next.js App Router pages, shared shells, existing RPC services, server-side authorization, Postgres transactions, and tenant resolution. Add UI state only at the route/component layer; keep critical inventory, payment, idempotency, and fiscal readiness rules in server handlers and migrations.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS 4, TanStack Query, Zustand, Postgres/Neon, `pg`, Zod, Node built-in test runner where pure modules can be tested without adding a dependency.

**Spec:** User-provided pasted request dated 2026-11-25.

## Global Constraints

- Use test/local or homologation environments and fictitious data for flows that write to a database.
- Use only fiscal homologation; never emit a production document during validation.
- Reuse existing routes and preserve compatibility for links already in use.
- Keep server-side authorization and tenant isolation authoritative.
- Preserve existing records and current command, QR, cashier, and restaurant behavior.
- Use Brazilian Portuguese and the operation's familiar terms.
- Report any flow that cannot be validated and the exact missing setup.

## Review Focus

- Duplicate requests after a timeout or double click must not create duplicate payments, sales, or stock movements — exercise the same idempotency key twice.
- A request for one tenant must never read or write another tenant's data — inspect tenant and role checks at server handlers.
- Products with stock control off, insufficient balance, and fractional `kg` quantities must retain their defined behavior — exercise all three paths.
- Feature toggles and fiscal credentials can disagree — ensure UI status does not claim fiscal readiness from a toggle alone.
- Empty catalog, filtered-empty history, and narrow viewport must each produce distinct, usable states — render and inspect representative screens.

---

### Task 1: Map current behavior and establish validation

**Files:** `README.md`, `package.json`, existing route/handler files; create test scripts and focused tests if needed.

- [ ] Record routes, roles, module flags, provider integrations, and current migration state.
- [ ] Identify a test database with only fictitious tenant data; do not use production data for writes.
- [ ] Establish runnable tests for pure critical calculations and validation seams without adding a dependency unless the repo already contains one.
- [ ] Run baseline `npm run typecheck` and `npm run build`; record output.

### Task 2: Operation navigation and onboarding

**Files:** `src/app/admin/layout.tsx`, `src/app/caixa/layout.tsx`, `src/components/layout/painel-shell.tsx`, `src/components/admin/primeiros-passos.tsx`, `src/app/admin/page.tsx`, related tests.

- [ ] Add an “Operação” group for Balcão, Atendimento, and Produção, filtered by active module and user role.
- [ ] Make the counter workflow visible from authorized landing screens without removing existing URLs.
- [ ] Keep “Cardápio” as a group for categories, products, and extras; add safe menu preview only if the current route can do so without a real command.
- [ ] Make onboarding checklist depend on real store type/resources and real catalog/stock/command data.

### Task 3: Store identity and menu separation

**Files:** `src/app/login/*`, `src/components/brand/*`, `src/app/admin/comandas/page.tsx`, `src/app/imprimir/cartoes/page.tsx`, access handlers/services as needed.

- [ ] Confirm shared root login and tenant login resolution for two test tenants, including fallback branding and recovery text.
- [ ] Separate the physical command-card registration view from active commands/history, reusing existing routes and queries.
- [ ] Keep the old link operational if a route changes.

### Task 4: Command, QR, and server workflow

**Files:** `src/components/garcom/*`, `src/app/garcom/*`, `src/app/c/[token]/*`, `src/app/k/[token]/*`, `src/server/handlers/{comandas,pedidos,mesas}.ts`, related tests.

- [ ] Simplify new-command submission, field validation, duplicate-submit state, and phone optionality according to server rules.
- [ ] Make QR and service actions easy to find after opening a command.
- [ ] Verify additions, QR order, ready notification, waiter delivery confirmation, account request, and closure with and without service charge.

### Task 5: Counter sales, inventory, and idempotency

**Files:** `src/app/caixa/balcao/page.tsx`, `src/app/admin/estoque/page.tsx`, `src/server/handlers/{balcao,caixa}.ts`, `src/services/{balcao,caixa}.service.ts`, `db/migrations/*`, related tests.

- [ ] Clarify scanner focus and feedback for found/unknown/unavailable/invalid-quantity items.
- [ ] Distinguish empty catalog from no search matches and provide a useful product-creation link for authorized roles.
- [ ] Prevent duplicate counter sale/payment/stock decrement after a repeated request, with a durable idempotency key and a database constraint.
- [ ] Verify stock-control-off, insufficient stock, duplicate barcode, `kg` decimals, and cancellation/refund behavior.
- [ ] Keep transaction boundaries atomic for sale, payment, and stock movement.

### Task 6: Production screens

**Files:** `src/app/kds/[setor]/page.tsx`, `src/components/kds/kds-board.tsx`, related labels and tests.

- [ ] Resolve the displayed production name from the configured sector while retaining internal route slugs.
- [ ] Preserve Recebido, Preparando, and Pronto; improve ticket hierarchy for command number, quantity, product, extras, notes, and wait time.
- [ ] Verify concurrent orders across sectors, delayed filter, status transitions, and ready notification.

### Task 7: Fiscal readiness and subscription states

**Files:** `src/app/admin/configuracoes/page.tsx`, `src/app/caixa/balcao/page.tsx`, `src/server/handlers/balcao.ts`, `src/app/assinatura/page.tsx`, `src/lib/planos.ts`.

- [ ] Derive “pending”, “homologation”, or “production” status from actual configuration; never expose tokens.
- [ ] Give actionable missing-field messages to admins and cashiers.
- [ ] Confirm non-fiscal sale persistence when emission is unavailable and retry behavior when permitted.
- [ ] Show payment/contact instructions only when the configured Pix/WhatsApp values exist; align plan status with actual tenant subscription data.
- [ ] Validate only against fiscal homologation credentials if available.

### Task 8: Responsive/accessibility review and final validation

**Files:** all changed screens and tests.

- [ ] Check keyboard focus, accessible labels, dialog focus, contrast, touch targets, and empty/loading/error states.
- [ ] Run the repository's available checks and the new critical-flow tests.
- [ ] Exercise desktop and narrow/mobile layouts; record browser/database/Focus configuration blockers precisely.
- [ ] Review the complete diff for tenant isolation, compatibility, duplicate effects, and migration order.

