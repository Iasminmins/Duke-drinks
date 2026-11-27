# Operation Readiness Implementation Plan

> **For agentic workers:** Execute sequentially and keep each stage independently reviewable.

**Goal:** Make cashier and service operations reliable, then offer establishment-based subscriptions without exposing data across stores.

**Architecture:** Preserve the existing tenant-per-store model while fixing transactional boundaries in cashier operations. Treat multi-establishment pricing as a quote/request until a tenant-group and authorized store-selector model exists; never let a price simulation switch tenant context.

**Tech Stack:** Next.js App Router, React Query, PostgreSQL/Neon, existing RPC registry and tenant context.

**Spec:** User request in the 2026-11-27 conversation: correct Cashier and History; validate sale, stock decrement, reversal, and close; validate QR→order→Kitchen/Bar→payment; update business-type setup; finish subscription and establishment request flow.

## Global Constraints

- Keep tenant RLS and `app.eid` isolation intact for every read and write.
- Do not create fake sales or payments in production to verify flows.
- Use prices: 1 establishment R$ 139/month, 2 R$ 259/month, and +R$ 120 from the third onward.
- Use “estabelecimento” consistently in customer-facing copy.
- A simulated quantity must never change the active tenant, active plan, or permissions.
- Do not mark a multi-establishment request as active before cross-store selection and authorization are implemented.

## Review Focus

- Payment racing with cash-register close must serialize and either finish before close or fail after it.
- A repeated sale request must not charge twice or decrement stock twice.
- Reversal after close must be rejected, and a valid reversal must restore tracked stock exactly once.
- History date filters must use the São Paulo business date and report query failures clearly.
- Requests from one establishment must not reveal another establishment's operations, staff, or reports.

---

### Task 1: Cashier and History correctness

**Files:** `src/server/handlers/caixa.ts`, `src/app/caixa/historico/page.tsx`, `src/lib/data.ts`, `tests/critical-rules.test.mjs`.

- [x] Serialize payment and cash-register close on the same cash-register row.
- [x] Serialize payment reversal against cash-register close.
- [x] Derive History date defaults in `America/Sao_Paulo`; show retry/error state for failed history requests.
- [x] Add regression cases for São Paulo day boundaries and run the focused test suite.

### Task 2: Sale, stock, reversal, and close

**Files:** `src/server/handlers/balcao.ts`, cashier pages/services, relevant migration, transactional integration tests.

- [ ] Verify sale idempotency and stock movement on a non-production database branch.
- [x] Implement a safe, auditable reversal path for eligible sales, including stock restoration and exclusion from cash totals.
- [ ] Verify sale, reversal, and close against an isolated Postgres database.
- [ ] Verify closing a register prevents later payment/reversal changes.
- [ ] Do not cancel an authorized fiscal document without a supported fiscal cancellation flow.

### Task 3: QR to production to payment

**Files:** `src/server/handlers/{mesas,pedidos,caixa}.ts`, relevant customer, KDS, waiter, and cashier screens.

- [ ] Exercise QR authorization, order creation, kitchen/bar routing, status transitions, service, payment, and History.
- [x] Revalidate and lock the comanda inside the order transaction to reject a race with payment/close.
- [ ] Verify invalid or expired QR credentials and closed comandas are rejected.
- [ ] Run the flow only against isolated test data.

### Task 4: Business-type setup and subscription requests

**Files:** `src/lib/planos.ts`, settings UI/handlers, `src/app/assinatura/page.tsx`, platform request queue, tenant/group migrations.

- [x] Keep pricing totals separate from active subscription values and use consistent terminology.
- [x] Add a working contract/request action and a platform-side review path.
- [x] Define and implement authorized multi-establishment membership and selection; link stores only in the platform review flow.
- [ ] Verify cash, stock, users, and reports are scoped to the selected establishment.
- [ ] Keep multi-establishment requests pending until those isolation checks pass.

## Verification

- Run relevant automated tests and production build after each stage.
- Use a non-production Neon branch for database integration flows.
- Before production migration or deployment, inspect the exact migration and scope of affected tenant data.
