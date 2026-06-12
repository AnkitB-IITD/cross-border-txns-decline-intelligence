# Schema

Every entry in `data/taxonomy.json` (and `taxonomy.csv`) has 9 fields.

| Field | Type | Description |
|-------|------|-------------|
| `code` | string | The native code as it appears on the rail (e.g. `R03`, `AC01`, `U30`, `51`, `ANNM`) |
| `rail` | enum | `iso20022` \| `upi` \| `ach` \| `card` \| `fps` \| `fast` |
| `native_description` | string | Meaning per the rail's own specification (paraphrased; see `data/sources.md`) |
| `leg` | enum | Where in a cross-border flow this failure typically occurs: `collection` \| `fx` \| `correspondent` \| `disbursement` \| `any` |
| `category` | enum | Root-cause family: `funds` \| `compliance` \| `data_quality` \| `technical` \| `limits_regulatory` |
| `retryability` | enum | `retryable` (retry as-is, often transient) \| `retryable_after_fix` (something must change first) \| `terminal` (do not retry) |
| `owner` | enum | Who can act on it: `payer` \| `merchant_ops` \| `compliance` \| `banking_partner` \| `internal_eng` |
| `customer_message` | string | Suggested plain-English message for the end user |
| `iso20022_equivalent` | string | Nearest ISO 20022 ExternalStatusReason code — the cross-rail mapping key |

## Design notes

**Why `iso20022_equivalent` is the spine.** ISO 20022 is the one code system every modern rail converges toward (SWIFT CBPR+, SEPA, UK FPS, SG FAST, FedNow all use it). Mapping every rail's native codes to their nearest ISO equivalent gives you a single normalized dimension to aggregate on — `AM04` means "insufficient funds" whether the native code was ACH `R01`, UPI `Z9`, or card `51`.

**Why `leg` matters.** A cross-border payment is typically 2–4 chained legs (collection → FX → correspondent → disbursement). The terminal status a customer sees often comes from a different leg than the one that actually failed. Tagging codes by their typical leg lets you attribute failures to the right part of the chain.

**Why `retryability` is three-valued, not boolean.** "Retryable" conflates two very different operational responses: retry-as-is (transient — issuer down, cut-off missed) and retry-after-fix (an account number, a limit, a KYC document must change first). Collapsing them produces either wasted retries or abandoned recoverable payments.

**Why `owner` exists.** The single most expensive thing in decline ops is mis-routing: a compliance hold sitting in an engineering queue, or a bad beneficiary account number sitting with compliance. Every code maps to the team that can actually act.

## Category definitions

| Category | Meaning | Examples |
|----------|---------|----------|
| `funds` | Not enough money, anywhere in the chain | ACH R01, UPI Z9, card 51, ISO AM04 |
| `compliance` | AML/CFT, sanctions, fraud, regulatory information requirements | ISO RR01–RR04, ACH R16 (OFAC), UPI K1, card 59 |
| `data_quality` | Wrong/missing account numbers, names, identifiers | ISO AC01, ACH R03/R04, UPI U29, card 14 |
| `technical` | System failures, timeouts, format errors, duplicates | UPI U28/XY/XZ, card 91, ISO FF01/TM01 |
| `limits_regulatory` | Transaction/account limits, account state restrictions, scheme rules | ISO AG01, ACH R20, UPI U03, card 57/61 |
