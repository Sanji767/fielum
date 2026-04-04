import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const payload = await req.text();
  const sig = req.headers.get("stripe-signature");

  let event;

  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (webhookSecret && sig) {
      event = stripe.webhooks.constructEvent(payload, sig, webhookSecret);
    } else {
      // In local testing without stripe-cli signature checks can be bypassed
      event = JSON.parse(payload);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: `Webhook Signature error: ${msg}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const companyId = session.metadata?.companyId;
        const plan = session.metadata?.plan || "starter";

        if (companyId) {
          // Calculate billing period end (30 days from now)
          const currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

          await prisma.subscription.upsert({
            where: { companyId },
            update: {
              stripeCustomerId: session.customer,
              stripeSubId: session.subscription,
              plan,
              status: "active",
              currentPeriodEnd,
            },
            create: {
              companyId,
              stripeCustomerId: session.customer,
              stripeSubId: session.subscription,
              plan,
              status: "active",
              currentPeriodEnd,
            },
          });

          // Update Company status to active
          await prisma.company.update({
            where: { id: companyId },
            data: { status: "active" },
          });
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object;
        // Find subscription by stripe ID
        const sub = await prisma.subscription.findFirst({
          where: { stripeSubId: subscription.id },
        });

        if (sub) {
          await prisma.subscription.update({
            where: { id: sub.id },
            data: {
              status: subscription.status, // active, past_due, trialing, unpaid
              currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            },
          });

          // Update Company status
          await prisma.company.update({
            where: { id: sub.companyId },
            data: {
              status: subscription.status === "active" ? "active" : "suspended",
            },
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const sub = await prisma.subscription.findFirst({
          where: { stripeSubId: subscription.id },
        });

        if (sub) {
          await prisma.subscription.update({
            where: { id: sub.id },
            data: {
              status: "cancelled",
            },
          });

          await prisma.company.update({
            where: { id: sub.companyId },
            data: { status: "cancelled" },
          });
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Webhook handler failed";
    return NextResponse.json({ error: `Webhook Handler error: ${msg}` }, { status: 500 });
  }
}
