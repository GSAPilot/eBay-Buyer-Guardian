import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/license/test
 *
 * Test endpoint that simulates what a REAL license validation response
 * would look like when Lemon Squeezy returns a valid license.
 * This helps verify our response parsing and plan mapping logic
 * without needing a real purchase.
 *
 * Request body: { simulate: "monthly" | "lifetime" | "expired" | "disabled" }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { simulate } = body;

    // These are the actual Lemon Squeezy API response structures
    // based on their documentation: https://docs.lemonsqueezy.com/api/license-keys

    if (simulate === "monthly") {
      // Simulate a valid monthly subscription license key response from LS
      const lsResponse = {
        valid: true,
        license_key: {
          id: 99999,
          status: "active",
          key: "XXXX-XXXX-XXXX-XXXX",
          expires_at: "2027-04-10T00:00:00.000000Z",
          variant_id: 1512373, // Monthly variant
          customer_email: "test@example.com",
          activation_limit: 5,
          activation_usage: 1,
        },
        meta: {
          activation_id: 12345,
          instance_id: 67890,
        },
      };

      // Process through our logic (same as the real validate route)
      const status = lsResponse.license_key?.status || "active";
      const expiresAt = lsResponse.license_key?.expires_at
        ? new Date(lsResponse.license_key.expires_at).getTime()
        : null;
      const variantId = lsResponse.license_key?.variant_id;

      const VARIANT_MONTHLY = 1512373;
      const VARIANT_LIFETIME = 1512404;

      let plan: "monthly" | "lifetime" = "monthly";
      let tier = "premium";

      if (variantId === VARIANT_LIFETIME) {
        plan = "lifetime";
      } else if (variantId === VARIANT_MONTHLY) {
        plan = "monthly";
      } else {
        plan = expiresAt ? "monthly" : "lifetime";
      }

      return NextResponse.json({
        simulation: true,
        rawLemonSqueezyResponse: lsResponse,
        processedResponse: {
          valid: true,
          plan,
          tier,
          expiresAt,
          variantId: variantId || null,
          customerEmail: lsResponse.license_key?.customer_email || null,
        },
      });
    }

    if (simulate === "lifetime") {
      // Simulate a valid lifetime license key response from LS
      const lsResponse = {
        valid: true,
        license_key: {
          id: 99998,
          status: "active",
          key: "YYYY-YYYY-YYYY-YYYY",
          expires_at: null, // Lifetime keys have no expiry
          variant_id: 1512404, // Lifetime variant
          customer_email: "lifetime@example.com",
          activation_limit: 5,
          activation_usage: 1,
        },
        meta: {
          activation_id: 12346,
          instance_id: 67891,
        },
      };

      const status = lsResponse.license_key?.status || "active";
      const expiresAt = lsResponse.license_key?.expires_at
        ? new Date(lsResponse.license_key.expires_at).getTime()
        : null;
      const variantId = lsResponse.license_key?.variant_id;

      const VARIANT_MONTHLY = 1512373;
      const VARIANT_LIFETIME = 1512404;

      let plan: "monthly" | "lifetime" = "monthly";
      let tier = "premium";

      if (variantId === VARIANT_LIFETIME) {
        plan = "lifetime";
      } else if (variantId === VARIANT_MONTHLY) {
        plan = "monthly";
      } else {
        plan = expiresAt ? "monthly" : "lifetime";
      }

      return NextResponse.json({
        simulation: true,
        rawLemonSqueezyResponse: lsResponse,
        processedResponse: {
          valid: true,
          plan,
          tier,
          expiresAt,
          variantId: variantId || null,
          customerEmail: lsResponse.license_key?.customer_email || null,
        },
      });
    }

    if (simulate === "expired") {
      const lsResponse = {
        valid: true,
        license_key: {
          id: 99997,
          status: "expired",
          key: "ZZZZ-ZZZZ-ZZZZ-ZZZZ",
          expires_at: "2024-01-01T00:00:00.000000Z",
          variant_id: 1512373,
          customer_email: "expired@example.com",
        },
        meta: {},
      };

      const status = lsResponse.license_key?.status || "active";
      const isExpired =
        status === "expired" || status === "disabled" || status === "invalid";

      return NextResponse.json({
        simulation: true,
        rawLemonSqueezyResponse: lsResponse,
        processedResponse: isExpired
          ? {
              valid: false,
              error: `License is ${status}. ${
                status === "expired"
                  ? "Please renew your subscription."
                  : "Contact support if you believe this is an error."
              }`,
            }
          : { valid: true, plan: "monthly", tier: "premium" },
      });
    }

    if (simulate === "disabled") {
      const lsResponse = {
        valid: true,
        license_key: {
          id: 99996,
          status: "disabled",
          key: "WWWW-WWWW-WWWW-WWWW",
          expires_at: null,
          variant_id: 1512404,
          customer_email: "disabled@example.com",
        },
        meta: {},
      };

      const status = lsResponse.license_key?.status || "active";

      return NextResponse.json({
        simulation: true,
        rawLemonSqueezyResponse: lsResponse,
        processedResponse: {
          valid: false,
          error: `License is ${status}. Contact support if you believe this is an error.`,
        },
      });
    }

    return NextResponse.json({
      error: "Specify a simulation type: monthly, lifetime, expired, or disabled",
      usage: 'POST { "simulate": "monthly" | "lifetime" | "expired" | "disabled" }',
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid request. Send JSON with 'simulate' field." },
      { status: 400 }
    );
  }
}

/**
 * GET /api/license/test
 *
 * Returns a comprehensive diagnostic report of the license validation system.
 */
export async function GET() {
  const LEMON_SQUEEZY_API_KEY = process.env.LEMON_SQUEEZY_API_KEY;
  const LEMON_SQUEEZY_STORE_ID = process.env.LEMON_SQUEEZY_STORE_ID;

  // Test connectivity to Lemon Squeezy API
  let lsConnectivity = "unknown";
  let lsResponseTime = 0;
  try {
    const start = Date.now();
    const resp = await fetch("https://api.lemonsqueezy.com/v1/licenses/validate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(LEMON_SQUEEZY_API_KEY
          ? { Authorization: `Bearer ${LEMON_SQUEEZY_API_KEY}` }
          : {}),
      },
      body: JSON.stringify({
        license_key: "connectivity-test-key-00000000",
        ...(LEMON_SQUEEZY_STORE_ID
          ? { store_id: parseInt(LEMON_SQUEEZY_STORE_ID, 10) }
          : {}),
      }),
    });
    lsResponseTime = Date.now() - start;
    const data = await resp.json();

    if (data.error === "license_key not found.") {
      lsConnectivity = "healthy"; // This is the expected error for non-existent keys
    } else {
      lsConnectivity = `unexpected_response: ${JSON.stringify(data)}`;
    }
  } catch (e) {
    lsConnectivity = `error: ${e instanceof Error ? e.message : "unknown"}`;
  }

  return NextResponse.json({
    status: "diagnostic_complete",
    timestamp: new Date().toISOString(),
    environment: {
      apiKeyConfigured: !!LEMON_SQUEEZY_API_KEY,
      apiKeyPrefix: LEMON_SQUEEZY_API_KEY
        ? `${LEMON_SQUEEZY_API_KEY.substring(0, 10)}...`
        : null,
      storeIdConfigured: !!LEMON_SQUEEZY_STORE_ID,
      storeId: LEMON_SQUEEZY_STORE_ID || null,
    },
    lemonSqueezyConnectivity: {
      status: lsConnectivity,
      responseTimeMs: lsResponseTime,
      validationMode: LEMON_SQUEEZY_API_KEY ? "authenticated" : "public",
    },
    variantMapping: {
      monthly: { id: 1512373, price: "$4.99/month", productId: 963040 },
      lifetime: { id: 1512404, price: "$39.00 one-time", productId: 963062 },
    },
    testInstructions: {
      simulateEndpoint: "POST /api/license/test with { simulate: 'monthly' | 'lifetime' | 'expired' | 'disabled' }",
      validateEndpoint: "POST /api/license/validate with { key: 'YOUR_LICENSE_KEY' }",
      note: "License keys are only generated when a purchase is made through Lemon Squeezy checkout.",
    },
  });
}
