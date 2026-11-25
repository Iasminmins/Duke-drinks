# Comprovante de Venda Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Print and reprint a plain sales receipt from the existing counter workflow.

**Architecture:** Keep receipt rendering inside the counter page using the persisted sale object plus establishment settings. Use print-only styling sized for an 80 mm thermal printer.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS.

**Spec:** `docs/superpowers/specs/2026-11-25-comprovante-venda-design.md`

## Global Constraints

- Keep the receipt distinct from NFC-e; no fiscal QR, access key, or authorization claims.
- Keep existing sale and fiscal workflows intact.
- Print on 80 mm thermal paper.

## Review Focus

- Weighted meat quantities remain readable in kg with three decimal places.
- Cash payment includes received amount and change; other methods do not show misleading change.
- Printing hides the counter UI and presents only the receipt.

---

### Task 1: Add print-only sales receipt

**Files:**
- Create: `src/components/caixa/comprovante-venda.tsx`
- Modify: `src/app/caixa/balcao/page.tsx`

**Interfaces:**
- Consumes: `VendaBalcao`, `Estabelecimento`
- Produces: receipt component and print/reprint actions in the counter workflow

- [x] Render establishment, sale number/time, line items, totals, payment, received amount, and change.
- [x] Trigger print after a sale completes and expose a reprint button for recent sales.
- [x] Add 80 mm print CSS and ensure only the receipt is visible on paper.
- [x] Run the project typecheck and production build.
