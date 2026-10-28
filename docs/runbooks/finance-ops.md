# ENGIDA Treasury & Finance Operations Runbook (Phase 3)

**Platform:** ENGIDA Admin & Host Financial Engine  
**Release:** Phase 3 — Escrow & Finance (Gated)  
**Classification:** Confidential — Internal Operations & Engineering  
**Version:** 1.0.0  

---

## 1. System Overview & Architecture

The ENGIDA finance engine provides auditable, non-custodial, double-entry financial settlement for Ethiopian accommodations. It replaces client-driven payment declarations with server quote-bound payment capture, automated escrow custody, strict four-eyes policy refunds, encrypted host banking accounts, and daily batched disbursements.

```
Guest Checkout ────────► Server Quote Binding ──────► Provider Gateway (Chapa/Sandbox)
                             │                                 │
                             ▼                                 ▼ Webhook
                      Payment Session                   Atomic Capture
                             │                                 │
                             ▼                                 ▼
                    Escrow Liability (2010) ◄───── Double-Entry Ledger Entry
                             │
            Check-In + 24h   │ (No Active Disputes)
                             ▼
                    Host Payable (2020) + Commission Revenue (4010) + Tax (2030)
                             │
            Daily 02:00      ▼
             Addis Cron    Host Payout Batch (AES-256-GCM Encrypted Destination)
```

---

## 2. Hard Gate & Safety Controls (P3-00)

All live money movement flags default to `false` in production database seeds and migrations.

| Setting Key | Default | Description |
|---|---|---|
| `finance.live_capture_enabled` | `false` | When false, checkouts run through `SandboxPaymentProvider`. When true, calls Chapa API. |
| `finance.live_refunds_enabled` | `false` | When false, refund execution is simulated. When true, dispatches gateway reversal. |
| `finance.live_payouts_enabled` | `false` | When false, payout transfers are simulated. When true, dispatches provider bank transfer. |
| `finance.auto_release_enabled` | `false` | When false, escrow release requires manual approval. When true, releases 24h post check-in. |

### Safe Production Activation Checklist
1. Verify database migration `1753000000000-FinanceAndEscrow.ts` is applied.
2. Confirm valid Chapa API keys in environment variables:
   - `CHAPA_SECRET_KEY`
   - `CHAPA_WEBHOOK_SECRET`
   - `FINANCE_ENCRYPTION_KEY` (32-byte hex for AES-256-GCM)
3. Run ledger invariant verification: `GET /admin/finance/summary` (`status: "CLEAN"`, `balanced: true`).
4. Enable flags one-by-one via `/admin/finance` Settings tab with administrator audit log.

---

## 3. Double-Entry General Ledger

ENGIDA maintains an immutable double-entry journal. **Balances are derived strictly from ledger entries; no direct balance edits or mutations are permitted.**

### Standard Chart of Accounts

| Account Code | Account Name | Type | Normal Balance | Description |
|---|---|---|---|---|
| `1010` | Cash In Clearing | ASSET | DEBIT | In-flight provider capture clearing |
| `1020` | Escrow Operating Account | ASSET | DEBIT | Funds held at payment provider |
| `2010` | Escrow Liability | LIABILITY | CREDIT | Funds held in trust for host until stay completes |
| `2020` | Host Payable | LIABILITY | CREDIT | Cleared host earnings ready for disbursement |
| `2030` | Tax Withholding Payable | LIABILITY | CREDIT | VAT & withholding taxes due to authorities |
| `2040` | Refund Clearing | LIABILITY | CREDIT | Funds committed to guest refund processing |
| `2050` | Unearned Guest Deposits | LIABILITY | CREDIT | Legacy reservation prepayments |
| `3010` | Platform Equity | EQUITY | CREDIT | Retained platform capital |
| `4010` | Platform Commission Revenue | REVENUE | CREDIT | Earned commission revenue (10% default) |
| `5010` | Payment Gateway Fees | EXPENSE | DEBIT | Provider merchant transaction fees |
| `5020` | Refund & Dispute Expense | EXPENSE | DEBIT | Unrecovered dispute losses & chargebacks |

### Mathematical Invariant
At all times:
$$\sum \text{Debits} \equiv \sum \text{Credits}$$
The system runs background verification every 6 hours via `FinanceJobsService.verifyLedgerInvariantsJob()`. If any discrepancy occurs, an alert issue is created with `severity: 'CRITICAL'`.

---

## 4. Policy-Based Refunds & Dual Approval ("Four-Eyes")

Refunds are calculated based on listing cancellation policy (FLEXIBLE, MODERATE, STRICT) and check-in timeline.

### Dual Approval Rule
For any refund where $\text{Amount} \ge \text{Threshold}$ (default: `500,000 minor units` = **ETB 5,000.00**):
1. Proposing administrator proposes the refund via `POST /admin/finance/refunds`. Status becomes `PENDING_APPROVAL`.
2. **The proposing administrator cannot approve their own refund request.**
3. A second distinct administrator must review and sign off via `POST /admin/finance/refunds/:id/approve`.
4. Execution calls `POST /admin/finance/refunds/:id/execute` to post balanced ledger reversals:
   - Debit Escrow Liability (`2010`) or Host Payable (`2020`)
   - Credit Refund Clearing (`2040`)
   - Reverse proportional platform commission (`4010`) and tax withholding (`2030`)

---

## 5. Host Payout Batches & Banking Encryption

### Encryption Standard
Host account numbers and sensitive identifiers are encrypted with **AES-256-GCM** using `FINANCE_ENCRYPTION_KEY`.
- Stored fields: `account_number_encrypted`, `account_number_last4`, `phone_encrypted`, `phone_last4`.
- Frontend consoles only ever display masked versions: `•••• 1234`.

### Daily Payout Schedule
Scheduled payouts run daily at **02:00 East Africa Time (Addis Ababa)**:
1. Postgres advisory lock (`742101`) ensures single-runner execution across multi-instance clusters.
2. Identifies all hosts with cleared positive balances in `Host Payable (2020)`.
3. Checks for verified payout destination account.
4. If payout total $\ge$ `1,000,000 minor` (**ETB 10,000.00**), sets `status: 'PENDING_APPROVAL'` for dual review.
5. If below threshold or approved, executes batch transfer through provider and debits `Host Payable (2020)`, credits `Escrow Operating Account (1020)`.

---

## 6. Provider Reconciliation Engine

Nightly and on-demand reconciliation matches provider settlement statements against local records:

| Discrepancy Type | Cause | Resolution Action |
|---|---|---|
| `MISSING_LOCAL_CAPTURE` | Webhook dropped by network | Ingest provider transaction and record ledger capture |
| `AMOUNT_MISMATCH` | Currency conversion delta or fee discrepancy | Post manual adjusting journal entry |
| `MISSING_PROVIDER_CAPTURE` | Fraudulent or unconfirmed local record | Reverse pending payment and alert operations |
| `STATUS_MISMATCH` | Chargeback initiated directly at bank | Recognize chargeback expense (`5020`) |

---

## 7. Incident Response & Troubleshooting

### Incident A: Invariant Imbalance Detected
1. Check `reconciliation_issues` table for recent unclosed entries.
2. Inspect `job_runs` table where `job_name = 'invariant_check'`.
3. Run query:
   ```sql
   SELECT direction, SUM(amount_minor) 
   FROM ledger_entries 
   GROUP BY direction;
   ```
4. Identify non-balanced `transaction_id`. Never delete ledger records. Post an offset `CORRECTION` transaction via `AdminFinanceService`.

### Incident B: Failed Host Payout
1. Open Admin Finance Console at `/admin/finance` -> Payouts tab.
2. Filter by `Status: FAILED`.
3. Inspect `failure_code` and `failure_message` from provider.
4. If invalid bank account details: notify host to update account via `/host/earnings`.
5. Click **Retry Transfer** once details are corrected.
