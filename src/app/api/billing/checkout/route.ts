import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getTenantContextApi } from "@/lib/tenant";

export async function POST(req: Request) {
  const auth = await getTenantContextApi();
  if (auth.error || !auth.context) {
    return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status });
  }

  try {
    const { plan } = await req.json();
    if (!plan || !["starter", "professional", "business"].includes(plan)) {
      return NextResponse.json({ error: "Invalid subscription plan selected." }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Create a dynamic, inline recurring price to simplify testing
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `Fielum ${plan.toUpperCase()}`,
              description: `Suscripción recurrente mensual al plan ${plan.toUpperCase()} de Fielum.`,
            },
            unit_amount: plan === "starter" ? 2900 : plan === "professional" ? 7900 : 14900,
            recurring: {
              interval: "month",
            },
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      metadata: {
        companyId: auth.context.companyId,
        plan,
      },
      success_url: `${appUrl}/?billing=success`,
      cancel_url: `${appUrl}/?billing=cancel`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
