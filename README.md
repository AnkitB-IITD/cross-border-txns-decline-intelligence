# Cross-Border Txns Decline Intelligence

**A unified, open taxonomy of payment decline and return codes across 6 payment rails — mapped to leg, root cause, retryability, and operational owner — plus a decline-intelligence dashboard built on it.**

## The problem

A cross-border payment is not one transaction. It's 2–4 chained legs — collection, FX, correspondent, disbursement — each running on a different rail, in a different country, under a different compliance regime, speaking a different failure language:

- The **ISO 20022** spine has ~300 `ExternalStatusReason` codes
- **NACHA** (US ACH) has return codes R01–R85
- **NPCI** (India UPI) has its own U/Z/X response codes
- **Card networks** use ISO 8583 Field 39 codes
- UK **FPS** and Singapore **FAST** use ISO 20022 subsets plus local mechanisms

When a payment fails, the terminal code the customer sees often comes from a *different leg* than the one that actually failed. And every cross-border fintech rebuilds the same internal mapping — code → what happened → can we retry → who fixes it — from scratch, badly, under deadline.

**This is the public version of that mapping.**

## What's here

| File | Contents |
|------|----------|
| [`data/taxonomy.json`](data/taxonomy.json) | 166 decline codes across 6 rails, each mapped to 9 fields |
| [`data/taxonomy.csv`](data/taxonomy.csv) | Same data, spreadsheet-friendly |
| [`data/sources.md`](data/sources.md) | Where every code list came from |
| [`docs/schema.md`](docs/schema.md) | Field definitions and design rationale |
| [`dashboard/`](dashboard/) | Decline Intelligence demo — a dashboard that runs on this taxonomy |

## Coverage (v0.1)

| Rail | Codes | Notes |
|------|-------|-------|
| ISO 20022 `ExternalStatusReason` | 41 | The cross-rail spine (pacs.002 reject/return reasons) |
| NACHA ACH (US) | 30 | Including IAT international codes R80–R85 |
| NPCI UPI (India) | 33 | From the public v2.9 error code document |
| ISO 8583 cards (Visa/MC) | 32 | Field 39 response codes |
| UK Faster Payments | 15 | ISO subset + Confirmation of Payee outcomes |
| Singapore FAST | 15 | ISO 20022 native subset |

## The schema

Every code maps to:

```
code · rail · native_description
→ leg            which part of the chain (collection / fx / correspondent / disbursement)
→ category       root cause (funds / compliance / data_quality / technical / limits_regulatory)
→ retryability   retryable / retryable_after_fix / terminal
→ owner          who can act (payer / merchant_ops / compliance / banking_partner / internal_eng)
→ customer_message   what to actually tell the user
→ iso20022_equivalent   the cross-rail normalization key
```

Example — the same root cause, three rails:

| Native code | Rail | ISO equivalent | Category | Retryability |
|-------------|------|----------------|----------|--------------|
| `R01` | ACH | `AM04` | funds | retryable |
| `Z9` | UPI | `AM04` | funds | retryable_after_fix |
| `51` | Card | `AM04` | funds | retryable_after_fix |

Normalize on `iso20022_equivalent` and you can aggregate failure analytics across every rail you operate on.

## Three things the mapping makes visible

1. **Most "technical" declines are retryable; most "compliance" declines are not.** Routing them to the same retry queue wastes the first and spams regulators with the second.
2. **The disbursement leg fails on data quality; the collection leg fails on funds and auth.** Different legs need different fixes — beneficiary validation up front vs. balance checks and retry windows.
3. **Generic codes (`05 Do not honor`, `MS03 Reason not specified`) are an ops tax.** They're the codes where the issuer tells you nothing — track their share by partner bank and you have a data-driven case for your next partner-bank conversation.

## Demo dashboard

The [`dashboard/`](dashboard/) folder contains a static **Decline Intelligence** demo built on this taxonomy: corridor health, leg-level failure drill-down, and an ops routing queue — using simulated transaction data (assumptions documented in the source).

Open `dashboard/index.html` in a browser, or serve the repo root and navigate to `/dashboard/`.

## Limitations

- Descriptions are paraphrased from public documentation — always verify against the current official spec before production use (rails revise their code lists).
- `leg` assignments reflect a typical India-outbound flow; your corridor mix may differ.
- This is v0.1 of a mapping that improves with corrections from people who see real reject files. **If your data disagrees with this taxonomy, please open an issue.**

## Author

Built by **Ankit Beniwal** — fintech PM (payments infrastructure at ICICI Bank: payment gateways, UPI, merchant acquiring, RBI/DFS regulatory work).

- LinkedIn: [linkedin.com/in/ankitb-iitd](https://linkedin.com/in/ankitb-iitd)
- GitHub: [github.com/AnkitB-IITD](https://github.com/AnkitB-IITD)

## License

MIT — use it, fork it, ship it internally. Attribution appreciated.
