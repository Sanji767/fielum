import Stripe from "stripe";

// Lazy-initialize Stripe so the build doesn't crash when the key is absent
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    _stripe = new Stripe(key, {
      apiVersion: "2025-01-27" as Stripe.LatestApiVersion,
    });
  }
  return _stripe;
}

// Keep backward-compatible default export for existing imports
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripe() as Record<string | symbol, unknown>)[prop];
  },
});
