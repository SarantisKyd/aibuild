---
name: Stripe webhook secret sourcing
description: Where the Stripe webhook signing secret comes from in this project, and why DB/schema-based sync was removed.
---

The webhook signing secret is read only from `process.env.STRIPE_WEBHOOK_SECRET` and passed directly to `stripe.webhooks.constructEvent`. There is no DB-backed or `stripe-replit-sync`-based lookup for it.

**Why:** an earlier approach stored/synced Stripe config via a `stripe` DB schema (`initStripe()` + `StripeSync`), which caused startup failures like `relation "stripe.accounts" does not exist` and made the secret's source of truth ambiguous. Reading directly from the env var is simpler and matches how the secret is actually provisioned (Replit secret).

**How to apply:** if webhooks stop verifying or you see schema errors mentioning `stripe.*` tables, check for reintroduced DB-sync code rather than assuming the env var is wrong. Server logs a warning at startup if `STRIPE_WEBHOOK_SECRET` is unset — check startup logs first.
