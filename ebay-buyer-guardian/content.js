/* ============================================================
   eBay Buyer Guardian — Content Script v1.1.0
   Runs on ebay.com listing & search pages.
   Parses seller info, scores risk, injects badge + tooltip.
   Freemium: search badges, custom rules, detailed reasons = Premium.
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

  const FREE_HISTORY_LIMIT = 25;

  /* ---------- Premium check ---------- */
  function getLicense() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(STORAGE_KEY_LICENSE, (data) => {
        const lic = data[STORAGE_KEY_LICENSE];
        if (!lic || !lic.key) return resolve({ active: false, tier: "free" });
        // Check expiry for monthly subscriptions
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

  /* ---------- Storage helpers ---------- */
  function loadRules() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(STORAGE_KEY_RULES, (data) => {
        resolve(data[STORAGE_KEY_RULES] || DEFAULT_RULES);
      });
    });
  }

  function saveHistory(entry, isPremium) {
    chrome.storage.sync.get(STORAGE_KEY_HISTORY, (data) => {
      const hist = data[STORAGE_KEY_HISTORY] || {};
      hist[entry.username] = {
        username: entry.username,
        feedbackPercent: entry.feedbackPercent,
        feedbackCount: entry.feedbackCount,
        accountAge: entry.accountAge,
        riskLevel: entry.riskLevel,
        timestamp: Date.now(),
        url: entry.url,
      };
      // Free: keep last 25; Premium: keep last 500
      const limit = isPremium ? 500 : FREE_HISTORY_LIMIT;
      const keys = Object.keys(hist);
      if (keys.length > limit) {
        keys.sort((a, b) => hist[a].timestamp - hist[b].timestamp);
        keys.slice(0, keys.length - limit).forEach((k) => delete hist[k]);
      }
      chrome.storage.sync.set({ [STORAGE_KEY_HISTORY]: hist });
    });
  }

  /* ---------- Page type detection ---------- */
  function getPageType() {
    const url = location.href;
    if (/\/itm\//.test(url)) return "listing";
    if (/\/sch\//.test(url)) return "search";
    return "other";
  }

  /* ---------- Seller parsing — Listing page ---------- */
  function parseListingSeller() {
    const seller = {
      username: null,
      feedbackPercent: null,
      feedbackCount: null,
      accountAge: null,
      joinYear: null,
    };

    const selectors = {
      username: [
        '[data-testid="x-seller-name"] a',
        '.seller-persona__name a',
        '.seller-persona__name',
        '#si-fb a',
        'a[data-testid="x-seller-name"]',
        '.d-stores-info-categories__container__info__section a',
        'span[class*="seller"] a',
        '.ux-layout-section--seller .ux-textspans a',
        '#RightSummaryPanel .ux-textspans a',
      ],
    };

    for (const sel of selectors.username) {
      const el = document.querySelector(sel);
      if (el && el.textContent.trim()) {
        seller.username = el.textContent.trim();
        break;
      }
    }

    const pageText = document.querySelector(
      '.ux-layout-section--seller, #RightSummaryPanel, .seller-persona'
    );
    if (pageText) {
      const text = pageText.textContent;
      const fbMatch = text.match(/(\d{1,3}(?:[.,]\d+)?)\s*%/);
      if (fbMatch) {
        seller.feedbackPercent = parseFloat(fbMatch[1].replace(",", "."));
      }
      const fcMatch = text.match(
        /[\(\s](\d[\d,]+)\s*(?:feedback|reviews|ratings)/i
      );
      if (fcMatch) {
        seller.feedbackCount = parseInt(fcMatch[1].replace(/,/g, ""), 10);
      }
      const jyMatch = text.match(
        /(?:joined|member\s+since|since)[^\d]*(\d{4})/i
      );
      if (jyMatch) {
        seller.joinYear = parseInt(jyMatch[1], 10);
        seller.accountAge = new Date().getFullYear() - seller.joinYear;
      }
    }

    if (!seller.feedbackPercent) {
      const allText = document.body.innerText;
      const fbMatch = allText.match(
        /(\d{1,3}(?:[.,]\d+)?)\s*%\s*positive\s*(?:feedback|rating)/i
      );
      if (fbMatch) {
        seller.feedbackPercent = parseFloat(fbMatch[1].replace(",", "."));
      }
    }
    if (!seller.feedbackCount) {
      const allText = document.body.innerText;
      const fcMatch = allText.match(
        /(\d[\d,]+)\s*(?:feedback|reviews|ratings)/i
      );
      if (fcMatch) {
        seller.feedbackCount = parseInt(fcMatch[1].replace(/,/g, ""), 10);
      }
    }
    if (!seller.joinYear) {
      const allText = document.body.innerText;
      const jyMatch = allText.match(
        /(?:joined|member\s+since)[^\d]*(\d{4})/i
      );
      if (jyMatch) {
        seller.joinYear = parseInt(jyMatch[1], 10);
        seller.accountAge = new Date().getFullYear() - seller.joinYear;
      }
    }

    if (!seller.username) {
      const sellerLink = document.querySelector(
        'a[href*="/usr/"], a[href*="/str/"]'
      );
      if (sellerLink) {
        const href = sellerLink.getAttribute("href") || "";
        const m = href.match(/\/usr\/([^?/]+)/);
        if (m) seller.username = decodeURIComponent(m[1]);
        else seller.username = sellerLink.textContent.trim();
      }
    }

    return seller;
  }

  /* ---------- Seller parsing — Search results ---------- */
  function parseSearchSellers() {
    const sellers = [];
    const cards = document.querySelectorAll(
      '.srp-results .s-item, .srp-river-answer .s-item'
    );

    cards.forEach((card) => {
      const seller = {
        username: null,
        feedbackPercent: null,
        feedbackCount: null,
        accountAge: null,
        joinYear: null,
        element: card,
      };

      const sellerEl =
        card.querySelector(".s-item__seller-info-text") ||
        card.querySelector(".s-item__seller a") ||
        card.querySelector("[class*='seller']");
      if (sellerEl) {
        const text = sellerEl.textContent.trim();
        const nameMatch = text.match(/^(.+?)(?:\s*\()/);
        seller.username = nameMatch
          ? nameMatch[1].trim()
          : text.split("(")[0].trim();

        const fbMatch = text.match(/(\d{1,3}(?:[.,]\d+)?)\s*%/);
        if (fbMatch) {
          seller.feedbackPercent = parseFloat(fbMatch[1].replace(",", "."));
        }
        const fcMatch = text.match(/(\d[\d,]+)\s*(?:feedback|reviews)/i);
        if (fcMatch) {
          seller.feedbackCount = parseInt(fcMatch[1].replace(/,/g, ""), 10);
        }
      }

      if (seller.username) sellers.push(seller);
    });

    return sellers;
  }

  /* ---------- Risk scoring ---------- */
  function scoreRisk(seller, rules, isPremium) {
    if (!rules.enabled) return { level: "disabled", score: -1, reasons: [] };

    // Free users always use default thresholds
    const effectiveRules = isPremium
      ? rules
      : { ...DEFAULT_RULES, enabled: rules.enabled };

    let score = 0;
    const reasons = [];

    if (seller.feedbackPercent !== null) {
      if (seller.feedbackPercent < effectiveRules.minFeedbackPercent - 5) {
        score += 3;
        reasons.push(
          `Feedback ${seller.feedbackPercent}% is critically low (threshold: ${effectiveRules.minFeedbackPercent}%)`
        );
      } else if (seller.feedbackPercent < effectiveRules.minFeedbackPercent) {
        score += 2;
        reasons.push(
          `Feedback ${seller.feedbackPercent}% is below threshold (${effectiveRules.minFeedbackPercent}%)`
        );
      } else if (seller.feedbackPercent < effectiveRules.minFeedbackPercent + 0.5) {
        score += 1;
        reasons.push(
          `Feedback ${seller.feedbackPercent}% is borderline safe`
        );
      }
    } else {
      score += 1;
      reasons.push("Feedback percentage not found");
    }

    if (seller.feedbackCount !== null) {
      if (seller.feedbackCount < effectiveRules.minFeedbackCount / 5) {
        score += 3;
        reasons.push(
          `Only ${seller.feedbackCount} feedback — very low (threshold: ${effectiveRules.minFeedbackCount})`
        );
      } else if (seller.feedbackCount < effectiveRules.minFeedbackCount) {
        score += 1;
        reasons.push(
          `${seller.feedbackCount} feedback is below threshold (${effectiveRules.minFeedbackCount})`
        );
      }
    } else {
      score += 1;
      reasons.push("Feedback count not found");
    }

    if (seller.accountAge !== null) {
      if (seller.accountAge < 1) {
        score += 3;
        reasons.push(
          `Account is less than 1 year old (joined ${seller.joinYear})`
        );
      } else if (seller.accountAge < effectiveRules.minAccountAgeYears) {
        score += 2;
        reasons.push(
          `Account is only ${seller.accountAge} year(s) old (threshold: ${effectiveRules.minAccountAgeYears})`
        );
      }
    } else {
      reasons.push("Account age not found");
    }

    let level;
    if (score >= 5) level = "red";
    else if (score >= 2) level = "yellow";
    else level = "green";

    return { level, score, reasons };
  }

  /* ---------- Badge injection ---------- */
  function createBadge(risk, seller, isPremium) {
    const badge = document.createElement("span");
    badge.className = `ebg-badge ebg-badge-${risk.level}${isPremium ? " ebg-premium" : ""}`;
    badge.setAttribute("data-ebg", "true");

    const icon = risk.level === "green" ? "✓" : risk.level === "yellow" ? "⚠" : "✕";
    badge.textContent = icon;

    // Tooltip
    const tooltip = document.createElement("div");
    tooltip.className = "ebg-tooltip";

    let html = `<strong>eBay Buyer Guardian</strong>`;
    if (isPremium) html += ` <span class="ebg-premium-tag">PRO</span>`;
    html += `<div class="ebg-tooltip-seller">${seller.username || "Unknown Seller"}</div>`;

    if (seller.feedbackPercent !== null)
      html += `<div>Feedback: <span class="ebg-val">${seller.feedbackPercent}%</span></div>`;
    if (seller.feedbackCount !== null)
      html += `<div>Feedback count: <span class="ebg-val">${seller.feedbackCount.toLocaleString()}</span></div>`;
    if (seller.accountAge !== null)
      html += `<div>Account age: <span class="ebg-val">${seller.accountAge} year(s)</span></div>`;
    if (seller.joinYear)
      html += `<div>Joined: <span class="ebg-val">${seller.joinYear}</span></div>`;

    html += `<div class="ebg-risk-label ebg-risk-${risk.level}">Risk: ${risk.level.toUpperCase()}</div>`;

    // Detailed reasons = Premium feature
    if (isPremium && risk.reasons.length) {
      html += `<div class="ebg-reasons">`;
      risk.reasons.forEach((r) => {
        html += `<div class="ebg-reason">• ${r}</div>`;
      });
      html += `</div>`;
    } else if (!isPremium && risk.reasons.length) {
      html += `<div class="ebg-upsell">🔒 Detailed reasons — <a href="#" class="ebg-upsell-link" data-ebg-upsell="true">Upgrade to Pro</a></div>`;
    }

    tooltip.innerHTML = html;
    badge.appendChild(tooltip);

    // Hover behavior
    badge.addEventListener("mouseenter", () => {
      tooltip.classList.add("ebg-tooltip-visible");
    });
    badge.addEventListener("mouseleave", () => {
      tooltip.classList.remove("ebg-tooltip-visible");
    });

    // Upsell link click
    badge.addEventListener("click", (e) => {
      if (e.target.getAttribute("data-ebg-upsell") === "true") {
        e.preventDefault();
        chrome.runtime.sendMessage({ type: "EBG_OPEN_POPUP" });
      }
    });

    return badge;
  }

  /* ---------- Inject badge on listing page ---------- */
  function injectListingBadge(seller, risk, isPremium) {
    const existing = document.querySelector('[data-ebg="true"]');
    if (existing) existing.remove();

    const anchors = [
      '[data-testid="x-seller-name"]',
      ".seller-persona__name",
      "#si-fb",
      '.ux-layout-section--seller .ux-textspans a',
      "#RightSummaryPanel .ux-textspans a",
      'a[href*="/usr/"]',
    ];

    let target = null;
    for (const sel of anchors) {
      const el = document.querySelector(sel);
      if (el) {
        target = el;
        break;
      }
    }

    if (!target) {
      target = document.querySelector(
        '.ux-layout-section--seller, #RightSummaryPanel'
      )?.firstElementChild;
    }

    const badge = createBadge(risk, seller, isPremium);

    if (target) {
      const container =
        target.closest(".ux-textspans") || target.parentElement || target;
      container.style.position = "relative";
      container.classList.add("ebg-seller-container");
      badge.style.marginLeft = "8px";
      badge.style.verticalAlign = "middle";
      badge.style.display = "inline-block";
      target.insertAdjacentElement("afterend", badge);
    } else {
      badge.style.position = "fixed";
      badge.style.top = "80px";
      badge.style.right = "20px";
      badge.style.zIndex = "999999";
      document.body.appendChild(badge);
    }
  }

  /* ---------- Inject badges on search results (Premium) ---------- */
  function injectSearchBadges(sellers, rules, isPremium) {
    sellers.forEach((seller) => {
      if (!seller.element) return;
      const existing = seller.element.querySelector('[data-ebg="true"]');
      if (existing) existing.remove();

      const risk = scoreRisk(seller, rules, isPremium);
      const badge = createBadge(risk, seller, isPremium);

      badge.style.marginLeft = "6px";
      badge.style.display = "inline-block";
      badge.style.verticalAlign = "middle";

      const sellerEl =
        seller.element.querySelector(".s-item__seller-info-text") ||
        seller.element.querySelector(".s-item__seller") ||
        seller.element.querySelector("[class*='seller']");

      if (sellerEl) {
        sellerEl.classList.add("ebg-seller-container");
        sellerEl.style.position = "relative";
        sellerEl.appendChild(badge);
      }

      saveHistory(
        {
          username: seller.username,
          feedbackPercent: seller.feedbackPercent,
          feedbackCount: seller.feedbackCount,
          accountAge: seller.accountAge,
          riskLevel: risk.level,
          url: location.href,
        },
        isPremium
      );
    });
  }

  /* ---------- Inject search upsell banner (Free users on search pages) ---------- */
  function injectSearchUpsell() {
    // Remove existing
    const existing = document.getElementById("ebg-search-upsell");
    if (existing) existing.remove();

    const banner = document.createElement("div");
    banner.id = "ebg-search-upsell";
    banner.className = "ebg-search-upsell";
    banner.innerHTML = `
      <div class="ebg-upsell-inner">
        <span class="ebg-upsell-icon">🛡️</span>
        <span><strong>eBay Buyer Guardian</strong> — Seller risk badges on search results are a <em>Pro</em> feature.</span>
        <a href="#" class="ebg-upsell-btn" data-ebg-upsell="true">Upgrade to Pro</a>
        <button class="ebg-upsell-close" data-ebg-close="true">✕</button>
      </div>
    `;
    document.body.appendChild(banner);

    banner.querySelector('[data-ebg-close="true"]').addEventListener("click", (e) => {
      e.preventDefault();
      banner.remove();
    });

    banner.querySelector('[data-ebg-upsell="true"]').addEventListener("click", (e) => {
      e.preventDefault();
      chrome.runtime.sendMessage({ type: "EBG_OPEN_POPUP" });
    });
  }

  /* ---------- Main ---------- */
  async function run() {
    const rules = await loadRules();
    if (!rules.enabled) return;

    const license = await getLicense();
    const isPremium = license.active;
    const pageType = getPageType();

    if (pageType === "listing") {
      const seller = parseListingSeller();
      if (seller.username || seller.feedbackPercent) {
        const risk = scoreRisk(seller, rules, isPremium);
        injectListingBadge(seller, risk, isPremium);
        saveHistory(
          {
            username: seller.username,
            feedbackPercent: seller.feedbackPercent,
            feedbackCount: seller.feedbackCount,
            accountAge: seller.accountAge,
            riskLevel: risk.level,
            url: location.href,
          },
          isPremium
        );
      }
    } else if (pageType === "search") {
      if (isPremium) {
        const sellers = parseSearchSellers();
        injectSearchBadges(sellers, rules, isPremium);
      } else {
        // Show a subtle upsell banner for free users
        injectSearchUpsell();
      }
    }
  }

  // Run on load
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }

  // Re-run on SPA navigation
  let lastUrl = location.href;
  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      document
        .querySelectorAll('[data-ebg="true"], #ebg-search-upsell')
        .forEach((el) => el.remove());
      setTimeout(run, 1500);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // Listen for license updates from popup
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "EBG_LICENSE_UPDATED") {
      // Re-run with new license state
      document
        .querySelectorAll('[data-ebg="true"], #ebg-search-upsell')
        .forEach((el) => el.remove());
      run();
    }
  });
})();
