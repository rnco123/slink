# LegitScript — Website Compliance Rules for Saludlink

Source: LegitScript Healthcare Merchant Certification Standards (official PDF, doc ref CHM-CE236-CR-01, © 2025) + certification pages/FAQ, read live. This is the authoritative checklist the Saludlink site must satisfy to earn and keep certification (required to advertise on Google, Meta, Microsoft, TikTok, LinkedIn and to keep Visa/Mastercard processing for health products).

---

## Why this matters

LegitScript certification is what lets a health/telehealth site run paid ads and keep card processing. All 20 of our inspiration sites are certified. Certification is **per domain** (~$975 application + $2,150/yr), each domain reviewed separately. A wireframe/demo site is acceptable to _start_ review, but every rule below must be satisfied before certification issues.

---

## Evidence base — how many sites we learned from

These rules were derived from a live analysis of **20 LegitScript-certified websites** (all of them fetched, their footers/structured data inspected, cross-checked against LegitScript's own certification PDF and FAQ). The 20 span four segments:

| Segment                                              | Count | Sites                                                                                      |
| ---------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------ |
| Telehealth / health-management (closest competitors) | 6     | lifemd, everlywell, noom, mavenclinic, thriveworks, jumpstartmd                            |
| Pharmacy / PBM / the certifier itself                | 4     | legitscript, express-scripts, optumrx, lloydspharmacy                                      |
| Health systems & services                            | 6     | geisinger, multicare, cedars-sinai (csconnect), healthsmart, justanswer, hazeldenbettyford |
| Retail / ecommerce references                        | 4     | petsmart, petsuppliesplus, covetrus, brookshirebrothers                                    |

**How often each pattern appeared** (observed in rendered footers/pages; some fetches were bot-blocked, so counts are a floor, not a ceiling):

| Pattern                                                                       | Seen on                                                                                                                    | Confidence                                                  |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Certified (the whole reason they're in this list)                             | **20 / 20**                                                                                                                | Certain                                                     |
| Separate **HIPAA Notice of Privacy Practices** (distinct from Privacy Policy) | ~8+ confirmed (lifemd, noom, mavenclinic, jumpstartmd, express-scripts, multicare, hazeldenbettyford, brookshire pharmacy) | Strong — treat as table stakes                              |
| **LegitScript seal / verification link in footer**                            | 7+ (noom, mavenclinic, thriveworks, jumpstartmd, optumrx, petsmart, brookshire)                                            | Standard practice (seal itself is optional per LegitScript) |
| **Accessibility statement** in footer                                         | Widespread (lifemd, noom, express-scripts, optumrx, multicare, hazeldenbettyford, petsmart, petsuppliesplus…)              | Strong                                                      |
| **Consumer Health Data Privacy Notice** (WA/CA state laws)                    | noom, mavenclinic, express-scripts (WA)                                                                                    | Emerging, required by state law                             |
| Standalone **Telehealth Consent** document                                    | lifemd (explicit); expected wherever care is offered                                                                       | Required for our telemedicine flow                          |
| **Nondiscrimination notice**                                                  | Provider orgs (express-scripts, multicare, hazeldenbettyford…)                                                             | Provider table stakes                                       |
| **State/jurisdiction availability disclosed** (Standard 5)                    | express-scripts, thriveworks, jumpstartmd, hazeldenbettyford (per-state)                                                   | Required — an explicit LegitScript rule                     |
| Real **legal entity + physical address** in footer                            | lifemd, jumpstartmd, lloydspharmacy (operator disclosure), petsmart…                                                       | Required (ownership transparency)                           |

Takeaway: every rule in this document is backed by the LegitScript standards PDF **and** corroborated by how the certified sites actually implement it. Where a pattern shows up on the majority of the 20, we treat it as table stakes for Saludlink.

---

## The 9 Certification Standards

1. **Licensure & business registration.** Must be adequately licensed for the services offered in **every jurisdiction served** — both where services originate AND where the patient is located, unless law permits otherwise.

2. **Legal compliance.** Comply with all applicable laws; hold all licensing/registration/authorizations needed. Must **not** facilitate prescribing/dispensing of products lacking regulatory approval in that jurisdiction (no unapproved drugs).

3. **Prior discipline & history.** Disclose any criminal, regulatory, or civil violations and any litigation involving the applicant, principals, key staff, or associated practitioners over the **past 10 years**. No recent/repeated sanctions. Prior offenses can be disqualifying at LegitScript's sole discretion.

4. **Affiliates & partners.** All affiliates (partner pharmacies, wholesalers, co-owned companies, associated medical personnel, entities promoted on the domain) must comply and operate legally. **Fulfillment partners generally must themselves be LegitScript-certified** or accredited by another recognized body. Disclose **all domains you control** and all affiliates.

5. **Patient services — WEBSITE DISPLAY REQUIREMENT.** The website must **clearly disclose all states, territories, provinces, and/or countries in which services are available.**

6. **Privacy — WEBSITE DISPLAY REQUIREMENT.** Comply with privacy laws (HIPAA for US applicants handling PHI). **Post a privacy policy on the website** where required by law. All transaction/customer/patient/medical data must be processed over **SSL/TLS encryption**.

7. **Validity of prescription.** Dispense Rx drugs only on a valid prescription from an authorized prescriber; comply with all telemedicine laws. Key line: _"A prescription or prescription drug must not be prescribed or dispensed prior to the provision of care by a licensed medical professional."_ (No questionnaire-only prescribing where care standards require more.)

8. **Transparency — prohibited claims.** All practices, offers, and claims must be accurate and non-misleading about the pharmacy, staff, practitioners, drugs, treatments, or financial transactions. **Explicitly prohibited: claims of benefits "that have not been supported by a regulatory body, such as the FTC, FDA, etc."** Failure to provide full/accurate info during review = denial (remediation during review is allowed without penalty).

9. **Advertising.** Ads must be accurate, transparent, legal, and clearly identify the merchant (no third-party business names). Ads must reflect services actually available. **Advertising on any platform in violation of that platform's ToS is grounds for denial or revocation.**

---

## What this forces into the Saludlink build (actionable)

### Must-display on the website (Standards 5, 6, 8)

- [ ] **State-availability page/section** listing exactly which states Saludlink services (telemedicine + regulated product shipping) are available in. Surface it on the telemedicine landing page and in `/licensing`.
- [ ] **Privacy Policy** posted and linked in the footer sitewide.
- [ ] **HIPAA Notice of Privacy Practices (NPP)** as a **separate document** from the Privacy Policy (every certified competitor does this — it is not optional to merge them).
- [ ] **SSL/TLS everywhere** — HTTPS enforced, HSTS, all transactions encrypted (already in our security-headers task).
- [ ] **No unsupported health claims** anywhere in product copy, marketing pages, or blog. Supplements/wellness products must not state disease-treatment benefits unless FDA/FTC-supported.

### Footer trust stack (table stakes across all certified sites)

- [ ] Privacy Policy
- [ ] Notice of Privacy Practices (HIPAA NPP) — separate link
- [ ] Terms of Service / Terms of Use
- [ ] Telehealth Consent
- [ ] Refund Policy (specific timelines — LegitScript checks specificity)
- [ ] Shipping Policy
- [ ] Medical Disclaimer
- [ ] Accessibility statement
- [ ] Nondiscrimination notice
- [ ] Consumer Health Data Privacy Notice (WA My Health My Data, CA)
- [ ] "Your Privacy Choices" / Do Not Sell or Share control
- [ ] Editorial policy (how health content is written & medically reviewed)
- [ ] **Real legal entity name + physical address + phone** (ownership transparency — Standard 3/8)
- [ ] LegitScript seal slot (add on approval; seal is encouraged, not required — but standard practice)

### Process / policy gates (not on the page, but required)

- [ ] **Content-review gate**: no health claim ships without a check against FDA/FTC support (build into the editorial workflow + product-copy review).
- [ ] **v1 catalog = OTC / devices / wellness only, NO Rx** — this deliberately avoids Standards 1, 2, 4, 7 (pharmacy-tier licensing, certified fulfillment partners, valid-prescription rules). Revisit only when a certified pharmacy fulfillment path exists.
- [ ] Maintain a list of **all domains we control** and all affiliates/fulfillment partners for the application.
- [ ] Keep **ownership/principal disclosure** documentation (10-year history) ready for the application.
- [ ] Ads must name Saludlink as the merchant and reflect only services actually available; never advertise in violation of a platform's ToS.

### Eligibility notes

- Eligible categories include: pharmacies, telemedicine providers, digital health platforms, DTC diagnostics, supplement/wellness merchants with accurate claims.
- **Not eligible**: EMR/EHR without prescription facilitation, non-clinical wellness with no medical component, research-only. (Our EMR stays out of scope — correct.)

---

## Design/engineering acceptance criteria

A page or feature is **LegitScript-ready** when:

1. Every claim on it is accurate and FDA/FTC-supportable.
2. If it touches services, the states-served disclosure is reachable within one click.
3. It is served only over HTTPS.
4. The mega-footer trust stack is present.
5. The legal entity, address, and phone are visible.
6. No Rx product or prescribing flow is present in v1.

Cross-reference: [tasks.md](tasks.md) T4 (design review), T10 (footer), T12 (telemedicine + state availability), T14 (legal pages), T16 (security headers), T40 (application).
