import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/license/validate
 *
 * Validates a Lemon Squeezy license key server-side.
 * This is more secure than client-side validation because:
 * - The Lemon Squeezy API key stays on the server
 * - We can add rate limiting and abuse prevention
 * - We can enrich the response with plan-specific metadata
 *
 * Request body: { key: string }
 * Response: { valid: boolean, plan?: string, tier?: string, expiresAt?: number | null, error?: string }
 */

// Lemon Squeezy Variant IDs for eBay Buyer Guardian
const VARIANT_MONTHLY = 1512373; // $4.99/month subscription
const VARIANT_LIFETIME = 1512404; // $39.00 one-time

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { key } = body;

    if (!key || typeof key !== "string") {
      return NextResponse.json(
        { valid: false, error: "License key is required." },
        { status: 400 }
      );
    }

    // Basic format check before hitting the API
    const trimmedKey = key.trim();
    if (trimmedKey.length < 8) {
      return NextResponse.json(
        { valid: false, error: "License key format is invalid." },
        { status: 400 }
      );
    }

    const LEMON_SQUEEZY_API_KEY = process.env.LEMON_SQUEEZY_API_KEY;
    const LEMON_SQUEEZY_STORE_ID = process.env.LEMON_SQUEEZY_STORE_ID;

    // Validate against Lemon Squeezy API
    const validateUrl = "https://api.lemonsqueezy.com/v1/licenses/validate";

    const response = await fetch(validateUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        // Use authenticated validation if API key is available
        ...(LEMON_SQUEEZY_API_KEY
          ? { Authorization: `Bearer ${LEMON_SQUEEZY_API_KEY}` }
          : {}),
      },
      body: JSON.stringify({
        license_key: trimmedKey,
        // Scope to our store if store_id is configured
        ...(LEMON_SQUEEZY_STORE_ID
          ? { store_id: parseInt(LEMON_SQUEEZY_STORE_ID, 10) }
          : {}),
      }),
    });

    const data = await response.json();

    if (data.valid) {
      const status = data.license_key?.status || "active";
      const expiresAt = data.license_key?.expires_at
        ? new Date(data.license_key.expires_at).getTime()
        : null;

      // Check for invalid statuses
      if (
        status === "expired" ||
        status === "disabled" ||
        status === "invalid"
      ) {
        return NextResponse.json({
          valid: false,
          error: `License is ${status}. ${
            status === "expired"
              ? "Please renew your subscription."
              : "Contact support if you believe this is an error."
          }`,
        });
      }

      // Determine plan type based on Lemon Squeezy variant ID
      const variantId = data.license_key?.variant_id;
      let plan: "monthly" | "lifetime" = "monthly"; // default
      let tier = "premium";

      if (variantId === VARIANT_LIFETIME) {
        plan = "lifetime";
        tier = "premium";
      } else if (variantId === VARIANT_MONTHLY) {
        plan = "monthly";
        tier = "premium";
      } else {
        // Fallback: infer plan from expiry for unknown variants
        plan = expiresAt ? "monthly" : "lifetime";
      }

      return NextResponse.json({
        valid: true,
        plan,
        tier,
        expiresAt,
        variantId: variantId || null,
        // Include customer email for display (optional)
        customerEmail: data.license_key?.customer_email || null,
      });
    } else {
      return NextResponse.json({
        valid: false,
        error: data.error || "Invalid license key. Please check and try again.",
      });
    }
  } catch (error) {
    console.error("[License API] Validation error:", error);
    return NextResponse.json(
      {
        valid: false,
        error: "License validation service unavailable. Please try again later.",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/license/validate
 *
 * Diagnostic endpoint — checks if the server is properly configured
 * to validate licenses with Lemon Squeezy. Does NOT expose any secrets.
 */
export async function GET() {
  const hasApiKey = !!process.env.LEMON_SQUEEZY_API_KEY;
  const hasStoreId = !!process.env.LEMON_SQUEEZY_STORE_ID;

  return NextResponse.json({
    status: "operational",
    configured: hasApiKey && hasStoreId,
    details: {
      apiKeySet: hasApiKey,
      storeIdSet: hasStoreId,
      storeId: hasStoreId ? process.env.LEMON_SQUEEZY_STORE_ID : null,
      variantMonthly: VARIANT_MONTHLY,
      variantLifetime: VARIANT_LIFETIME,
    },
    message:
      hasApiKey && hasStoreId
        ? "License validation is fully configured with authenticated Lemon Squeezy API access."
        : "Missing environment variables. Set LEMON_SQUEEZY_API_KEY and LEMON_SQUEEZY_STORE_ID for authenticated validation.",
  });
}
