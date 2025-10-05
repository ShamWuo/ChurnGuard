# Pricing suggestions

This file lists suggested tiers and quick rationale you can use when selling the product.

1) Starter — Free / Trial
- Price: $0 for 14 days trial, then $9/mo
- Limits: 5k events/month, single admin seat
- Target: small SaaS shops who want to monitor failed payments
- Value prop: easy setup, immediate visibility into dunning

2) Growth
- Price: $49/mo
- Limits: 50k events/month, 3 admin seats, 30 day retention
- Extras: Email templates, CSV export, API access
- Target: growing SaaS businesses that need automated recovery

3) Business
- Price: $199/mo
- Limits: 250k events/month, 10 admin seats, 90 day retention
- Extras: Priority support, SSO integration, custom webhook rules
- Target: SMBs with recurring revenue > $10k/mo

4) Enterprise (custom)
- Price: Custom
- Limits: Unlimited events, SLA, extended retention
- Extras: Dedicated onboarding, data export / HIPAA/ISO considerations

Billing model notes
- Meter by events processed (CSP reports / failed invoice events) and seats.
- Offer an annual discount (2 months free) and a 14-day free trial.
- Use Stripe for checkout and billing portal; map plan to `STRIPE_PRICE_ID` in env.

Promotions
- Launch promotion: first 100 customers 50% off for 6 months.
- Partner discounts for agencies and integrators.
