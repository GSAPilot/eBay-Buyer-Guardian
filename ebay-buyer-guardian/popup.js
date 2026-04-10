/* ============================================================
   eBay Buyer Guardian — Popup Script v1.1.0
   Handles settings, history, licensing, and tab navigation.
   ============================================================ */

(function () {
  "use strict";

  const STORAGE_KEY_RULES = "ebg_rules";
  const STORAGE_KEY_HISTORY = "ebg_history";
  const STORAGE_KEY_LICENSE = "ebg_license";

  const DEFAULT_RULES = {
    minFeedbackPercent: 98.0,
    minAccountAgeYears: 1,
    minFeedbackCount: 50,
    enabled: true,
  };

  // License validation is handled by the background service worker
  // which routes through our server API for security

  /* ---------- DOM refs ---------- */
  const tabBtns = document.querySelectorAll(".tab");
  const tabContents = document.querySelectorAll(".tab-content");

  const tierBadge = document.getElementById("tier-badge");
  const ruleEnabled = document.getElementById("rule-enabled");
  const ruleFeedbackPct = document.getElementById("rule-feedback-pct");
  const feedbackPctVal = document.getElementById("feedback-pct-val");
  const ruleFeedbackCount = document.getElementById("rule-feedback-count");
  const feedbackCountVal = document.getElementById("feedback-count-val");
  const ruleAccountAge = document.getElementById("rule-account-age");
  const accountAgeVal = document.getElementById("account-age-val");
  const btnReset = document.getElementById("btn-reset-rules");
  const rulesSaved = document.getElementById("rules-saved");
  const rulesPremiumGate = document.getElementById("rules-premium-gate");
  const rulesGotoUpgrade = document.getElementById("rules-goto-upgrade");
  const settingFeedbackPct = document.getElementById("setting-feedback-pct");
  const settingFeedbackCount = document.getElementById("setting-feedback-count");
  const settingAccountAge = document.getElementById("setting-account-age");

  const historyList = document.getElementById("history-list");
  const historyCount = document.getElementById("history-count");
  const btnClearHistory = document.getElementById("btn-clear-history");
  const btnExportHistory = document.getElementById("btn-export-history");
  const historyLimitMsg = document.getElementById("history-limit-msg");
  const historyGotoUpgrade = document.getElementById("history-goto-upgrade");

  const premiumStatus = document.getElementById("premium-status");
  const licenseKeyInput = document.getElementById("license-key-input");
  const btnActivate = document.getElementById("btn-activate-license");
  const licenseStatusDiv = document.getElementById("license-status");

  /* ---------- State ---------- */
  let isPremium = false;

  /* ---------- Tab switching ---------- */
  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabBtns.forEach((b) => b.classList.remove("active"));
      tabContents.forEach((c) => c.classList.remove("active"));
      btn.classList.add("active");
      document
        .getElementById(`tab-${btn.dataset.tab}`)
        .classList.add("active");

      if (btn.dataset.tab === "history") loadHistory();
      if (btn.dataset.tab === "upgrade") refreshPremiumStatus();
    });
  });

  // Navigation helpers
  rulesGotoUpgrade.addEventListener("click", (e) => {
    e.preventDefault();
    switchTab("upgrade");
  });
  historyGotoUpgrade.addEventListener("click", (e) => {
    e.preventDefault();
    switchTab("upgrade");
  });

  function switchTab(name) {
    tabBtns.forEach((b) => {
      b.classList.remove("active");
      if (b.dataset.tab === name) b.classList.add("active");
    });
    tabContents.forEach((c) => c.classList.remove("active"));
    document.getElementById(`tab-${name}`).classList.add("active");
    if (name === "history") loadHistory();
    if (name === "upgrade") refreshPremiumStatus();
  }

  /* ---------- Premium state ---------- */
  function getLicense() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(STORAGE_KEY_LICENSE, (data) => {
        const lic = data[STORAGE_KEY_LICENSE];
        if (!lic || !lic.key) return resolve({ active: false, tier: "free" });
        if (lic.expiresAt && Date.now() > lic.expiresAt) {
          return resolve({ active: false, tier: "free", expired: true });
        }
        return resolve({
          active: true,
          tier: lic.tier || "premium",
          plan: lic.plan || "lifetime",
          expiresAt: lic.expiresAt || null,
        });
      });
    });
  }

  function updatePremiumUI(premium) {
    isPremium = premium.active;

    if (isPremium) {
      tierBadge.textContent = "Pro ⭐";
      tierBadge.className = "tier-badge tier-pro";

      premiumStatus.innerHTML = `
        <div class="premium-status-icon">⭐</div>
        <div class="premium-status-text">
          <strong>Pro Plan Active</strong>
          <p>${premium.plan === "lifetime" ? "Lifetime license" : "Monthly subscription"}</p>
        </div>
      `;
      premiumStatus.classList.add("premium-active");

      // Unlock rules
      rulesPremiumGate.style.display = "none";
      ruleFeedbackPct.disabled = false;
      ruleFeedbackCount.disabled = false;
      ruleAccountAge.disabled = false;
      btnReset.disabled = false;

      // Unlock export
      btnExportHistory.style.display = "inline-block";
      historyLimitMsg.style.display = "none";
    } else {
      tierBadge.textContent = "Free";
      tierBadge.className = "tier-badge tier-free";

      premiumStatus.innerHTML = `
        <div class="premium-status-icon">🔒</div>
        <div class="premium-status-text">
          <strong>Free Plan</strong>
          <p>Upgrade to unlock all features</p>
        </div>
      `;
      premiumStatus.classList.remove("premium-active");

      // Lock rules
      rulesPremiumGate.style.display = "flex";
      ruleFeedbackPct.disabled = true;
      ruleFeedbackCount.disabled = true;
      ruleAccountAge.disabled = true;
      btnReset.disabled = true;

      btnExportHistory.style.display = "none";
      historyLimitMsg.style.display = "block";
    }
  }

  async function refreshPremiumStatus() {
    const lic = await getLicense();
    updatePremiumUI(lic);
  }

  /* ---------- License activation ---------- */
  btnActivate.addEventListener("click", async () => {
    const key = licenseKeyInput.value.trim();
    if (!key) {
      licenseStatusDiv.textContent = "Please enter a license key.";
      licenseStatusDiv.className = "license-status license-error";
      return;
    }

    btnActivate.disabled = true;
    btnActivate.textContent = "Validating…";
    licenseStatusDiv.textContent = "";
    licenseStatusDiv.className = "license-status";

    try {
      const result = await validateLicense(key);

      if (result.valid) {
        const licenseData = {
          key: key,
          tier: "premium",
          plan: result.plan || "lifetime",
          expiresAt: result.expiresAt || null,
          validatedAt: Date.now(),
        };

        chrome.storage.sync.set({ [STORAGE_KEY_LICENSE]: licenseData }, () => {
          updatePremiumUI({ active: true, ...licenseData });
          licenseStatusDiv.textContent = "✓ License activated! Pro features unlocked.";
          licenseStatusDiv.className = "license-status license-success";
          licenseKeyInput.value = "";

          // Notify content scripts
          notifyLicenseChange();
        });
      } else {
        licenseStatusDiv.textContent = result.error || "Invalid license key. Please check and try again.";
        licenseStatusDiv.className = "license-status license-error";
      }
    } catch (err) {
      licenseStatusDiv.textContent = "Validation failed. Check your connection and try again.";
      licenseStatusDiv.className = "license-status license-error";
    }

    btnActivate.disabled = false;
    btnActivate.textContent = "Activate";
  });

  async function validateLicense(key) {
    // Route validation through the background service worker
    // which calls our server API first (secure), then falls back to
    // direct Lemon Squeezy validation, then offline key format check
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { type: "EBG_VALIDATE_LICENSE", key },
        (response) => {
          if (chrome.runtime.lastError) {
            // If background worker is unavailable, try direct validation
            directValidateLicense(key).then(resolve).catch(reject);
            return;
          }
          if (response) {
            resolve(response);
          } else {
            reject(new Error("No response from background worker."));
          }
        }
      );
    });
  }

  // Fallback direct validation (only used if background worker fails)
  async function directValidateLicense(key) {
    try {
      const response = await fetch("https://api.lemonsqueezy.com/v1/licenses/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
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
          expiresAt: expiresAt,
        };
      } else {
        return { valid: false, error: data.error || "Invalid license key." };
      }
    } catch (err) {
      // Offline grace period for lifetime keys
      if (key.startsWith("EBG-") && key.length >= 20) {
        return { valid: true, plan: "lifetime", expiresAt: null };
      }
      throw err;
    }
  }

  function notifyLicenseChange() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: "EBG_LICENSE_UPDATED",
        }).catch(() => {});
      }
    });
  }

  /* ---------- Load rules ---------- */
  function loadRules() {
    chrome.storage.sync.get(STORAGE_KEY_RULES, (data) => {
      const rules = data[STORAGE_KEY_RULES] || DEFAULT_RULES;
      ruleEnabled.checked = rules.enabled;
      ruleFeedbackPct.value = rules.minFeedbackPercent;
      feedbackPctVal.textContent = rules.minFeedbackPercent.toFixed(1) + "%";
      ruleFeedbackCount.value = rules.minFeedbackCount;
      feedbackCountVal.textContent = rules.minFeedbackCount;
      ruleAccountAge.value = rules.minAccountAgeYears;
      accountAgeVal.textContent = rules.minAccountAgeYears;
    });
  }

  /* ---------- Save rules ---------- */
  function saveRules() {
    if (!isPremium) return; // Free users can't save custom rules

    const rules = {
      enabled: ruleEnabled.checked,
      minFeedbackPercent: parseFloat(ruleFeedbackPct.value),
      minAccountAgeYears: parseInt(ruleAccountAge.value, 10),
      minFeedbackCount: parseInt(ruleFeedbackCount.value, 10),
    };
    chrome.storage.sync.set({ [STORAGE_KEY_RULES]: rules }, () => {
      showSaved();
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, {
            type: "EBG_RULES_UPDATED",
            rules,
          }).catch(() => {});
        }
      });
    });
  }

  function showSaved() {
    rulesSaved.classList.add("show");
    setTimeout(() => rulesSaved.classList.remove("show"), 1500);
  }

  /* ---------- Bind inputs ---------- */
  ruleEnabled.addEventListener("change", () => {
    // enabled toggle works for all users
    const rules = { enabled: ruleEnabled.checked };
    chrome.storage.sync.get(STORAGE_KEY_RULES, (data) => {
      const existing = data[STORAGE_KEY_RULES] || DEFAULT_RULES;
      chrome.storage.sync.set(
        { [STORAGE_KEY_RULES]: { ...existing, enabled: ruleEnabled.checked } },
        () => {
          showSaved();
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]?.id) {
              chrome.tabs.sendMessage(tabs[0].id, {
                type: "EBG_RULES_UPDATED",
                rules: { ...existing, enabled: ruleEnabled.checked },
              }).catch(() => {});
            }
          });
        }
      );
    });
  });

  ruleFeedbackPct.addEventListener("input", () => {
    feedbackPctVal.textContent = parseFloat(ruleFeedbackPct.value).toFixed(1) + "%";
  });
  ruleFeedbackPct.addEventListener("change", saveRules);

  ruleFeedbackCount.addEventListener("input", () => {
    feedbackCountVal.textContent = ruleFeedbackCount.value;
  });
  ruleFeedbackCount.addEventListener("change", saveRules);

  ruleAccountAge.addEventListener("input", () => {
    accountAgeVal.textContent = ruleAccountAge.value;
  });
  ruleAccountAge.addEventListener("change", saveRules);

  btnReset.addEventListener("click", () => {
    chrome.storage.sync.set({ [STORAGE_KEY_RULES]: DEFAULT_RULES }, () => {
      loadRules();
      showSaved();
    });
  });

  /* ---------- History ---------- */
  function loadHistory() {
    chrome.storage.sync.get(STORAGE_KEY_HISTORY, (data) => {
      const hist = data[STORAGE_KEY_HISTORY] || {};
      const entries = Object.values(hist).sort(
        (a, b) => b.timestamp - a.timestamp
      );

      historyCount.textContent = `${entries.length} seller${entries.length !== 1 ? "s" : ""}`;

      if (entries.length === 0) {
        historyList.innerHTML =
          '<div class="empty-state">No sellers analyzed yet.<br/>Visit an eBay listing to get started!</div>';
        return;
      }

      historyList.innerHTML = entries
        .map((e) => {
          const timeStr = timeAgo(e.timestamp);
          const dotClass = `history-dot-${e.riskLevel}`;
          const fbPct = e.feedbackPercent !== null ? `${e.feedbackPercent}%` : "—";
          const fbCnt =
            e.feedbackCount !== null
              ? e.feedbackCount.toLocaleString()
              : "—";
          const age =
            e.accountAge !== null ? `${e.accountAge}yr` : "—";

          return `
          <div class="history-item">
            <div class="history-dot ${dotClass}"></div>
            <div class="history-info">
              <div class="history-name" title="${escapeHtml(e.username || "Unknown")}">${escapeHtml(e.username || "Unknown")}</div>
              <div class="history-details">FB: ${fbPct} · Count: ${fbCnt} · Age: ${age}</div>
            </div>
            <div class="history-time">${timeStr}</div>
          </div>`;
        })
        .join("");
    });
  }

  btnClearHistory.addEventListener("click", () => {
    if (confirm("Clear all seller history?")) {
      chrome.storage.sync.set({ [STORAGE_KEY_HISTORY]: {} }, loadHistory);
    }
  });

  // Export history as CSV (Premium)
  btnExportHistory.addEventListener("click", () => {
    if (!isPremium) return;
    chrome.storage.sync.get(STORAGE_KEY_HISTORY, (data) => {
      const hist = data[STORAGE_KEY_HISTORY] || {};
      const entries = Object.values(hist).sort(
        (a, b) => b.timestamp - a.timestamp
      );

      if (entries.length === 0) return;

      const header = "Username,Feedback %,Feedback Count,Account Age,Risk Level,Date\n";
      const rows = entries
        .map((e) =>
          [
            `"${(e.username || "").replace(/"/g, '""')}"`,
            e.feedbackPercent ?? "",
            e.feedbackCount ?? "",
            e.accountAge ?? "",
            e.riskLevel ?? "",
            e.timestamp ? new Date(e.timestamp).toISOString() : "",
          ].join(",")
        )
        .join("\n");

      const csv = header + rows;
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ebg-seller-history-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    });
  });

  /* ---------- Helpers ---------- */
  function timeAgo(ts) {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "now";
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `${days}d`;
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  /* ---------- Init ---------- */
  async function init() {
    const lic = await getLicense();
    updatePremiumUI(lic);
    loadRules();
  }

  init();
})();
