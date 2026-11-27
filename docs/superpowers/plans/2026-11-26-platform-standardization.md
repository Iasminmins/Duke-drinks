# Platform Internal UI Standardization Implementation Plan

> **For agentic workers:** Use the inline executing-plans workflow. Do not dispatch subagents.

**Goal:** Make the store-facing Admin, Cashier, Service, and Kitchen/Bar screens feel like one product while preserving role-specific navigation and QR/print surfaces.

**Architecture:** Keep the existing `PainelShell`, `GarcomShell`, KDS board, and tenant theme system. Improve consistency through shared page-heading semantics and a semantic danger-text token rather than replacing the layouts or flattening the brand-specific surfaces.

**Tech Stack:** Next.js App Router, React, Tailwind CSS v4, existing shared UI components.

**Spec:** `artifacts/platform-audit/auditoria.md`

## Global Constraints

- Keep the admin sidebar and all existing role/module access rules.
- Preserve the light/dark tenant theme preference.
- Keep customer QR, product login/marketing, and physical print layouts distinct.
- Do not change sales, comanda, kitchen, or permissions behavior.
- Do not add dependencies or tests for this visual-only change.

## Review Focus

- At narrow viewport widths, active route titles must still truncate without covering user controls.
- Admin area pages must not show the same page title twice.
- Danger and error text must remain readable in both light and dark panel themes.
- Role-specific navigation and theme switching must continue to use the existing shell behavior.
- Printed QR sheets must remain white and sized for A4.

---

### Task 1: Semantic status colors across panel themes

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/components/ui/badge.tsx`
- Modify: `src/components/layout/user-menu.tsx`
- Modify: internal status call sites currently hard-coding `#ff6b7f`

- [x] Add a `danger-fg` color token for dark, light, and Comandou themes.
- [x] Replace internal danger-text hard-coded colors with `text-danger-fg`, preserving public customer styling if it has a different contrast need.
- [x] Review token application in both theme classes.

### Task 2: One page-title hierarchy in panel screens

**Files:**
- Modify: `src/components/layout/painel-shell.tsx`
- Modify: `src/components/layout/admin-navigation.ts`
- Modify: `src/app/admin/areas/page.tsx`
- Modify: `src/components/kds/kds-board.tsx` only if required to retain a single meaningful heading per role.

- [x] Render the active panel breadcrumb as the page-level heading, using one shared responsive size and preserving ancestor breadcrumbs.
- [x] Add missing labels for nested admin destinations that currently show only their parent route.
- [x] Remove the duplicate body title from Admin → Áreas do sistema while retaining its introductory text and section hierarchy.
- [x] Confirm Garçom screens retain their body heading because their mobile shell intentionally has no route title.

### Task 3: Responsive shared shell spacing and visual review

**Files:**
- Modify: `src/components/layout/painel-shell.tsx`
- Modify: `artifacts/platform-audit/auditoria.md`

- [x] Normalize shell page-content spacing without changing the existing sidebar width, collapse behavior, or responsive drawer.
- [x] Keep the KDS board wide enough for its three work columns and avoid constraining physical print output.
- [ ] Review representative Admin, Cashier, Service, KDS, and print pages in desktop and mobile-sized browser viewports.
- [ ] Record the final decisions and any remaining visual exceptions in the audit report.

## Verification

- Run `npm run typecheck` and `npm run build`.
- Capture representative pages at desktop and mobile widths; verify the sidebar remains visible on desktop navigation and the mobile drawer remains usable.
- Inspect dark and light panel themes for danger text contrast.
- Verify `/imprimir/cartoes` still presents centered white cards and a working print toolbar.
