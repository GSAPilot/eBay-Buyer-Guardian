import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/validate-license
 * Server-side Lemon Squeezy license validation.
 * Keeps the API key server-side instead of exposing it in the extension.
 *
 * Body: { key: string }
 * Response: { valid: boolean, plan?: string, expiresAt?: number, error?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { key } = body;

    if (!key || typeof key !== "string") {
      return NextResponse.json(
        { valid: false, error: "License key is required." },
        { status: 400 }
      );
    }

    // Lemon Squeezy API key from environment variable
    const lsApiKey = process.env.LEMON_SQUEEZY_API_KEY;

    if (!lsApiKey) {
      // Fallback: validate without server-side key using the public validate endpoint
      const response = await fetch(
        "https://api.lemonsqueezy.com/v1/licenses/validate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ license_key: key }),
        }
      );

      const data = await response.json();

      if (data.valid) {
        const status = data.license_key?.status || "active";
        const expiresAt = data.license_key?.expires_at
          ? new Date(data.license_key.expires_at).getTime()
          : null;

        if (
          status === "expired" ||
          status === "disabled" ||
          status === "invalid"
        ) {
          return NextResponse.json({
            valid: false,
            error: `License is ${status}.`,
          });
        }

        return NextResponse.json({
          valid: true,
          plan: expiresAt ? "monthly" : "lifetime",
          expiresAt,
        });
      } else {
        return NextResponse.json({
          valid: false,
          error: data.error || "Invalid license key.",
        });
      }
    }

    // With API key: use the more powerful license key endpoint
    const response = await fetch(
      `https://api.lemonsqueezy.com/v1/license-keys/${key}`,
      {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${lsApiKey}`,
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json({
        valid: false,
        error: "License key not found.",
      });
    }

    const data = await response.json();
    const attributes = data.data?.attributes;

    if (!attributes) {
      return NextResponse.json({
        valid: false,
        error: "Invalid response from license server.",
      });
    }

    const status = attributes.status;
    const expiresAt = attributes.expires_at
      ? new Date(attributes.expires_at).getTime()
      : null;

    if (status === "expired" || status === "disabled" || status === "invalid") {
      return NextResponse.json({
        valid: false,
        error: `License is ${status}.`,
      });
    }

    return NextResponse.json({
      valid: true,
      plan: expiresAt ? "monthly" : "lifetime",
      expiresAt,
    });
  } catch (error) {
    console.error("[validate-license] Error:", error);
    return NextResponse.json(
      { valid: false, error: "License validation failed. Please try again." },
      { status: 500 }
    );
  }
}
