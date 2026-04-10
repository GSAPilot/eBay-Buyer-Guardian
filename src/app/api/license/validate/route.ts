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
 * Response: { valid: boolean, plan?: string, expiresAt?: number | null, error?: string }
 */
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

    // If no API key is configured, use the public validate endpoint
    // (no server-side API key needed, but less secure)
    const validateUrl = "https://api.lemonsqueezy.com/v1/licenses/validate";

    const response = await fetch(validateUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        // If we have a server-side API key, use it for authenticated validation
        ...(LEMON_SQUEEZY_API_KEY
          ? { Authorization: `Bearer ${LEMON_SQUEEZY_API_KEY}` }
          : {}),
      },
      body: JSON.stringify({
        license_key: trimmedKey,
        // Optionally include store_id for scoping
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

      // Determine plan type based on expiry
      const plan = expiresAt ? "monthly" : "lifetime";

      // Map Lemon Squeezy product variants to our tiers
      // Variant IDs would be set in Lemon Squeezy dashboard
      const variantId = data.license_key?.variant_id;
      let tier = "premium"; // default
      if (variantId) {
        // You can map variant IDs to tiers here
        // e.g., if (variantId === 12345) tier = "premium";
      }

      return NextResponse.json({
        valid: true,
        plan,
        tier,
        expiresAt,
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
