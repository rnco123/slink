# Legal review notes — attorney handoff

**Status: DRAFT — for counsel review before launch (before the coming-soon wall is removed).**

This document accompanies the 10 policy pages that live in code at
`apps/medusa/src/scripts/seed-content.ts` (the `LEGAL` array) and render at
`saludlinkusa.com/legal/<slug>` in English and Spanish. They are working drafts
prepared by the team as a diligence pass — **not legal advice** — and each page
carries a visible "Draft — pending counsel" banner. This memo lists what was
done, what still needs a lawyer, and the open business facts.

## Business context the drafts assume

- Saludlink, Inc. runs a **commerce website** (`saludlinkusa.com`) selling
  **over-the-counter** wellness/self-care products only — **no prescriptions**.
- The commerce site is designed to **not** collect, store, or process PHI.
- **Clinical care** is delivered through a **separate, licensed telehealth
  service** that the site links to.
- The company states it is **HIPAA-ready** (PHI firewall, audit logging, admin
  session timeout, encryption in transit).
- Bilingual (English/Spanish); single public contact: `support@saludlinkusa.com`.
- Pursuing **LegitScript** healthcare merchant certification.

## Pages included

Privacy Policy · Notice of Privacy Practices (HIPAA) · Terms of Service ·
Consent to Telehealth · Refund Policy · Shipping Policy · Medical Disclaimer ·
Accessibility · Editorial Policy · Nondiscrimination.

## Grounded in LegitScript standards

- **Standard 6 (Privacy):** Privacy Policy + HIPAA Notice of Privacy Practices.
- **Standard 8 (Transparency):** no product benefit claims unsupported by the
  FDA/FTC — reflected in Terms, Medical Disclaimer, and Editorial Policy.
- **Standard 9 (Advertising):** accurate, non-misleading language throughout.

## MUST be resolved before publish (only you/counsel can)

1. **HIPAA status label.** Confirm whether Saludlink is a HIPAA **covered
   entity** or **business associate** for the telehealth services. The NPP is
   drafted assuming covered-entity obligations and flags this inline. This also
   drives the AWS/vendor **BAAs** (roadmap task 39).
2. **Real business facts.** Replace the placeholder legal entity address and
   phone (currently `[123 Example St]`, `[City, ST 00000]`, `[1-800-000-0000]`)
   with the real registered details. **LegitScript Standard 8 requires accurate,
   verifiable business contact information** — placeholders will block
   certification and should not go live.
3. **Counsel sign-off on `[bracketed]` items** (see below).

## `[bracketed]` items awaiting counsel

- **Terms of Service:** warranty disclaimer, limitation of liability,
  indemnification, governing law/venue, binding arbitration + class-action
  waiver; plus severability / entire-agreement / assignment / force-majeure /
  termination boilerplate.
- **Notice of Privacy Practices:** covered-entity vs. business-associate
  confirmation; the **effective date**; any provider-specific additions.
- **Consent to Telehealth:** state-specific informed-consent language and
  acknowledgments (varies by state; provider + counsel).
- **Privacy Policy:** exact CCPA/CPRA verification steps, response timelines, and
  any other state-specific disclosures.
- **Nondiscrimination:** final §1557 notice, tagline languages, and coordinator
  details, confirmed against applicable requirements.

## Items already addressed in this pass

- **No fake medical review.** Articles and policies do **not** claim "medically
  reviewed by" a clinician; the Editorial Policy states plainly that content is
  written and cited but not clinician-reviewed.
- **Subscription marketing removed.** The homepage previously advertised
  "subscribe to replenish automatically," but no recurring-billing feature
  exists; the copy was corrected to avoid a misleading claim. **If subscriptions
  are added later,** Terms + Refund must add auto-renewal disclosures compliant
  with California's Automatic Renewal Law and the FTC "Click-to-Cancel" rule.
- **Electronic communications.** Terms now address transactional email,
  opt-in marketing email (CAN-SPAM), and SMS only with prior express consent
  (TCPA) with STOP opt-out.
- **CCPA/CPRA structure.** Privacy Policy now enumerates categories of personal
  information, honors Global Privacy Control (GPC), and describes authorized
  agents + appeals (exact procedures still to be finalized by counsel).
- **HIPAA NPP completeness.** The Notice enumerates treatment/payment/operations
  uses, the full set of legally permitted disclosures, authorization-required
  uses, all individual rights (including the mandatory out-of-pocket restriction),
  breach notification, and HHS OCR complaint routing.

## How content is maintained (for your reviewers)

The source of truth is the repository (`seed-content.ts`), which syncs to the
live database on deploy. This gives a **git history of every wording change** —
useful for tracking counsel's edits and demonstrating change control.
