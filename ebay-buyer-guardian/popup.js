/* ============================================================
   eBay Buyer Guardian — Popup Script
   Handles settings, history, and tab navigation.
   ============================================================ */

(function () {
  "use strict";

  const STORAGE_KEY_RULES = "ebg_rules";
  const STORAGE_KEY_HISTORY = "ebg_history";
  const DEFAULT_RULES = {
    minFeedbackPercent: 98.0,
    minAccountAgeYears: 1,
    minFeedbackCount: 50,
    enabled: true,
  };

  /* ---------- DOM refs ---------- */
  const tabBtns = document.querySelectorAll(".tab");
  const tabContents = document.querySelectorAll(".tab-content");

  const ruleEnabled = document.getElementById("rule-enabled");
  const ruleFeedbackPct = document.getElementById("rule-feedback-pct");
  const feedbackPctVal = document.getElementById("feedback-pct-val");
  const ruleFeedbackCount = document.getElementById("rule-feedback-count");
  const feedbackCountVal = document.getElementById("feedback-count-val");
  const ruleAccountAge = document.getElementById("rule-account-age");
  const accountAgeVal = document.getElementById("account-age-val");
  const btnReset = document.getElementById("btn-reset-rules");
  const rulesSaved = document.getElementById("rules-saved");

  const historyList = document.getElementById("history-list");
  const historyCount = document.getElementById("history-count");
  const btnClearHistory = document.getElementById("btn-clear-history");

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
    });
  });

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
    const rules = {
      enabled: ruleEnabled.checked,
      minFeedbackPercent: parseFloat(ruleFeedbackPct.value),
      minAccountAgeYears: parseInt(ruleAccountAge.value, 10),
      minFeedbackCount: parseInt(ruleFeedbackCount.value, 10),
    };
    chrome.storage.sync.set({ [STORAGE_KEY_RULES]: rules }, () => {
      showSaved();
      // Notify content script
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
  ruleEnabled.addEventListener("change", saveRules);

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
  loadRules();
})();
