# Sources

All decline/return codes in this taxonomy are mapped from publicly documented code systems. Native descriptions are paraphrased from these sources. Retrieved June 2026.

| Rail | Code system | Source |
|------|------------|--------|
| `iso20022` | ExternalStatusReason1Code (pacs.002 status reasons) | [ISO 20022 External Code Sets](https://www.iso20022.org/catalogue-messages/additional-content-messages/external-code-sets), [iso20022payments.com — Reject & Return](https://www.iso20022payments.com/cbpr/reject-return/) |
| `ach` | NACHA return codes R01–R85 | [Modern Treasury — ACH Return Code Reference](https://www.moderntreasury.com/learn/ach-return-code-reference), [ACHQ — Complete NACHA reason code reference](https://achq.com/resources/ach-return-codes) |
| `upi` | NPCI UPI Error and Response Codes v2.9 | [NPCI UPI Error and Response Codes v2.9 (PDF)](https://dth95m2xtyv8v.cloudfront.net/tesseract/assets/upi-tpap-sdk/UPI_Error_and_Response_Codes_2_9-HHLrJ.pdf) |
| `card` | ISO 8583 Field 39 response codes (Visa/Mastercard) | [Visa Developer — Request & Response Codes](https://developer.visa.com/request_response_codes), [Mastercard — Network Response Codes](https://developer.mastercard.com/mastercard-send-funding/documentation/response-error-codes/network-response-codes/), [EBANX — ISO 8583 Response Codes](https://docs.ebanx.com/docs/pay-in/dev-tools/response-codes/iso8583-codes) |
| `fps` | UK Faster Payments — ISO 20022 (post-migration) + Confirmation of Payee outcomes | [Pay.UK — FPS ISO 20022 Standards Library](https://www.wearepay.uk/what-we-do/payment-systems/faster-payment-system/faster-payment-system-iso20022-standards-library/), [NatWest — FPS reject and reason codes](https://www.natwest.com/support-centre/bank-accounts-and-supporting-information/general/what-are-the-faster-payment-reject-and-reason-codes.html) |
| `fast` | Singapore FAST — ISO 20022 native | [World Bank FPS Case Study — Singapore FAST (PDF)](https://fastpayments.worldbank.org/sites/default/files/2021-10/World_Bank_FPS_Singapore_FAST_Case_Study.pdf), [Standard Chartered SG — FAST FAQs](https://www.sc.com/sg/help/faqs/fast-and-inter-bank-giro/) |

## Notes on rail-specific handling

- **FPS and FAST run on ISO 20022 natively.** Their entries in this taxonomy are the subset of ISO `ExternalStatusReason` codes most commonly seen on each rail, plus rail-specific mechanisms (e.g. UK Confirmation of Payee outcomes). `iso20022_equivalent` is the code itself.
- **Card codes vary slightly by network.** Where Visa and Mastercard meanings diverge for the same Field 39 value, the description notes it.
- **UPI descriptions** are paraphrased from the NPCI v2.9 public document. NPCI revises this list; check the latest version before production use.
- **Leg assignment** reflects the typical role of each rail in an India-outbound cross-border flow (e.g. UPI = collection leg, ACH/FPS/FAST = disbursement leg). Codes that can occur on either side are marked `any`.

## Corrections

Found a mapping that doesn't match your reject files? Open an issue or PR — this taxonomy improves with practitioner corrections.
