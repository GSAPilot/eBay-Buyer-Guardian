/* ============================================================
   eBay Buyer Guardian — Background Service Worker v1.1.0
   Handles extension lifecycle, messaging, and license validation.
   Routes license validation through our server API for security.
   ============================================================ */

const STORAGE_KEY_LICENSE = "ebg_license";

// Our server-side validation endpoint (more secure than calling
// Lemon Squeezy directly, as it keeps API keys server-side)
const LICENSE_API_URL = "https://ebaybuyerguardian.lemonsqueezy.com";

// Fallback: if our API is unreachable, validate directly with Lemon Squeezy
const LEMON_SQUEEZY_VALIDATE_URL = "https://api.lemonsqueezy.com/v1/licenses/validate";

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "EBG_GET_RULES") {
    chrome.storage.sync.get("ebg_rules", (data) => {
      sendResponse(data.ebg_rules || null);
    });
    return true; // async response
  }

  if (message.type === "EBG_RULES_UPDATED") {
    // Forward to all eBay tabs
    chrome.tabs.query({ url: "https://*.ebay.com/*" }, (tabs) => {
      tabs.forEach((tab) => {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, message).catch(() => {});
        }
      });
    });
  }

  if (message.type === "EBG_LICENSE_UPDATED") {
    // Forward to all eBay tabs
    chrome.tabs.query({ url: "https://*.ebay.com/*" }, (tabs) => {
      tabs.forEach((tab) => {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, message).catch(() => {});
        }
      });
    });
  }

  if (message.type === "EBG_OPEN_POPUP") {
    // Can't programmatically open popup, show a notification as fallback
    chrome.notifications?.create?.({
      type: "basic",
      iconUrl: "icons/icon128.png",
      title: "eBay Buyer Guardian",
      message: "Click the extension icon to upgrade to Pro and unlock all features!",
    });
  }

  if (message.type === "EBG_VALIDATE_LICENSE") {
    validateLicense(message.key)
      .then(sendResponse)
      .catch((err) => sendResponse({ valid: false, error: err.message }));
    return true; // async response
  }
});

/**
 * Validate a license key.
 * Strategy: Try our server API first (keeps API keys secure).
 * Fallback: Validate directly with Lemon Squeezy if our API is down.
 * Last resort: Offline key format check for lifetime keys.
 */
async function validateLicense(key) {
  // 1. Try our server API first
  try {
    const response = await fetch(`${LICENSE_API_URL}/api/license/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });

    if (response.ok) {
      const data = await response.json();
      return data; // Already in our expected format
    }
  } catch (e) {
    console.warn("[EBG] Server API unreachable, falling back to direct validation");
  }

  // 2. Fallback: Direct Lemon Squeezy validation
  try {
    const response = await fetch(LEMON_SQUEEZY_VALIDATE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({ license_key: key }),
    });
    const data = await response.json();

    if (data.valid) {
      const status = data.license_key?.status || "active";
      const expiresAt = data.license_key?.expires_at
        ? new Date(data.license_key.expires_at).getTime()
        : null;

      if (status === "expired" || status === "disabled" || status === "invalid") {
        return { valid: false, error: `License is ${status}.` };
      }

      return {
        valid: true,
        plan: expiresAt ? "monthly" : "lifetime",
        expiresAt,
      };
    } else {
      return { valid: false, error: data.error || "Invalid license key." };
    }
  } catch (err) {
    // 3. Last resort: offline grace period for lifetime keys with specific format
    if (key.startsWith("EBG-") && key.length >= 20) {
      return { valid: true, plan: "lifetime", expiresAt: null };
    }
    throw new Error("License validation unavailable. Check your connection.");
  }
}

// Periodically re-validate monthly licenses (every 24h)
chrome.alarms?.create?.("ebg-license-check", { periodInMinutes: 1440 });

chrome.alarms?.onAlarm?.addListener?.((alarm) => {
  if (alarm.name === "ebg-license-check") {
    chrome.storage.sync.get(STORAGE_KEY_LICENSE, async (data) => {
      const lic = data[STORAGE_KEY_LICENSE];
      if (!lic || !lic.key) return;

      // Only re-validate monthly subscriptions
      if (lic.plan === "monthly") {
        try {
          const result = await validateLicense(lic.key);
          if (!result.valid) {
            // License expired or invalid — deactivate
            chrome.storage.sync.set({
              [STORAGE_KEY_LICENSE]: { ...lic, active: false },
            });
            // Notify tabs
            chrome.tabs.query({ url: "https://*.ebay.com/*" }, (tabs) => {
              tabs.forEach((tab) => {
                if (tab.id) {
                  chrome.tabs.sendMessage(tab.id, {
                    type: "EBG_LICENSE_UPDATED",
                  }).catch(() => {});
                }
              });
            });
          } else if (result.expiresAt) {
            chrome.storage.sync.set({
              [STORAGE_KEY_LICENSE]: { ...lic, expiresAt: result.expiresAt },
            });
          }
        } catch (e) {
          // Network error — keep current state, try again next alarm
        }
      }
    });
  }
});

// Set up context menu
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus?.create?.({
    id: "ebg-analyze",
    title: "Analyze this seller with Buyer Guardian",
    contexts: ["link"],
    documentUrlPatterns: ["https://*.ebay.com/*"],
  });
});

chrome.contextMenus?.onClicked?.addListener?.((info, tab) => {
  if (info.menuItemId === "ebg-analyze" && tab?.id) {
    chrome.tabs.sendMessage(tab.id, {
      type: "EBG_ANALIZE_LINK",
      url: info.linkUrl,
    });
  }
});
