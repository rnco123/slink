# Stripe Payments — Setup Notes (Medusa v2)

Saludlink uses Stripe via `@medusajs/payment-stripe`, wired in `medusa-config.ts`.
The provider is only registered when `STRIPE_API_KEY` is set, so the backend
still boots without Stripe configured.

## Webhook endpoint

Medusa exposes a built-in Stripe webhook route. Point your Stripe webhook at:

```
POST {MEDUSA_BACKEND_URL}/hooks/payment/stripe
```

Some Medusa v2 builds namespace the provider id in the path
(`/hooks/payment/stripe_stripe`). Confirm the exact path for 2.16 in the admin
or the `@medusajs/payment-stripe` docs before going live.
<!-- verify against Medusa v2 docs — exact webhook path (stripe vs stripe_stripe). -->

Local development (Stripe CLI):

```bash
stripe login
stripe listen --forward-to localhost:9000/hooks/payment/stripe
```

`stripe listen` prints a signing secret (`whsec_...`). Put it in `.env` as
`STRIPE_WEBHOOK_SECRET` so Medusa can verify inbound event signatures.

## Environment variables

```
STRIPE_API_KEY=sk_test_...          # secret key (test mode for dev)
STRIPE_WEBHOOK_SECRET=whsec_...      # from `stripe listen` or the dashboard
```

## Test-mode setup steps

1. Create a Stripe account and stay in **Test mode** (toggle, top-right).
2. Copy the **Secret key** (`sk_test_...`) → `STRIPE_API_KEY`.
3. Start the backend, then run `stripe listen --forward-to
   localhost:9000/hooks/payment/stripe` and copy the `whsec_...` →
   `STRIPE_WEBHOOK_SECRET`. Restart the backend.
4. Ensure the US region's `payment_providers` includes the Stripe provider
   (`pp_stripe_stripe`). The seed uses `pp_system_default` so it runs before
   Stripe is keyed — add Stripe to the region in the admin, or update the seed,
   once `STRIPE_API_KEY` is set.
5. Test cards: `4242 4242 4242 4242` (success), `4000 0027 6000 3184` (3DS
   authentication required). Any future expiry, any CVC/ZIP.

## Production

- Use live keys from AWS Secrets Manager (never commit them).
- Register the production webhook in the Stripe Dashboard
  (Developers → Webhooks) pointing at the live backend URL, and use the
  dashboard-provided signing secret.
- Subscribe at minimum to `payment_intent.succeeded`,
  `payment_intent.payment_failed`, and `payment_intent.amount_capturable_updated`.
