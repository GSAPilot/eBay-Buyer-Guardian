/* ============================================================
   eBay Buyer Guardian — Background Service Worker
   Handles extension lifecycle and messaging.
   ============================================================ */

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
