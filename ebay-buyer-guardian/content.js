/* ============================================================
   eBay Buyer Guardian — Content Script
   Runs on ebay.com listing & search pages.
   Parses seller info, scores risk, injects badge + tooltip.
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

  /* ---------- Storage helpers ---------- */
  function loadRules() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(STORAGE_KEY_RULES, (data) => {
        resolve(data[STORAGE_KEY_RULES] || DEFAULT_RULES);
      });
    });
  }

  function saveHistory(entry) {
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
      // Keep last 200 sellers
      const keys = Object.keys(hist);
      if (keys.length > 200) {
        keys.sort((a, b) => hist[a].timestamp - hist[b].timestamp);
        keys.slice(0, keys.length - 200).forEach((k) => delete hist[k]);
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

    // Try multiple selectors that eBay uses for seller info
    const selectors = {
      // Seller name
      username: [
        '[data-testid="x-seller-name"] a',
        '.seller-persona__name a',
        '.seller-persona__name',
        '#si-fb a',
        'a[data-testid="x-seller-name"]',
        '.d-stores-info-categories__container__info__section a',
        'span[class*="seller"] a',
        // Broader fallbacks
        '.ux-layout-section--seller .ux-textspans a',
        '#RightSummaryPanel .ux-textspans a',
      ],
    };

    // Parse seller username
    for (const sel of selectors.username) {
      const el = document.querySelector(sel);
      if (el && el.textContent.trim()) {
        seller.username = el.textContent.trim();
        break;
      }
    }

    // Parse feedback percentage — look for patterns like "99.8%" or "99.8% positive feedback"
    const pageText = document.querySelector(
      '.ux-layout-section--seller, #RightSummaryPanel, .seller-persona'
    );
    if (pageText) {
      const text = pageText.textContent;

      // Feedback percent
      const fbMatch = text.match(/(\d{1,3}(?:[.,]\d+)?)\s*%/);
      if (fbMatch) {
        seller.feedbackPercent = parseFloat(fbMatch[1].replace(",", "."));
      }

      // Feedback count — e.g. "12,345 feedback" or "(12,345)"
      const fcMatch = text.match(
        /[\(\s](\d[\d,]+)\s*(?:feedback|reviews|ratings)/i
      );
      if (fcMatch) {
        seller.feedbackCount = parseInt(fcMatch[1].replace(/,/g, ""), 10);
      }

      // Join year — e.g. "Joined in 2015" or "Member since: 2015"
      const jyMatch = text.match(
        /(?:joined|member\s+since|since)[^\d]*(\d{4})/i
      );
      if (jyMatch) {
        seller.joinYear = parseInt(jyMatch[1], 10);
        seller.accountAge = new Date().getFullYear() - seller.joinYear;
      }
    }

    // Fallback: scan the entire page for seller section text
    if (!seller.feedbackPercent) {
      const allText = document.body.innerText;
      const fbMatch = allText.match(
        /(\d{1,3}(?:[.,]\d+)?)\s*%\s*positive\s*(?:feedback|rating)/i
      );
      if (fbMatch) {
        seller.feedbackPercent = parseFloat(fbMatch[1].replace(",", "."));
      }
    }

    // Fallback for feedback count
    if (!seller.feedbackCount) {
      const allText = document.body.innerText;
      const fcMatch = allText.match(
        /(\d[\d,]+)\s*(?:feedback|reviews|ratings)/i
      );
      if (fcMatch) {
        seller.feedbackCount = parseInt(fcMatch[1].replace(/,/g, ""), 10);
      }
    }

    // Fallback for join year
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

    // Try to get username from breadcrumb or page title as last resort
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
    // Each result card
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

      // Seller name in search results
      const sellerEl =
        card.querySelector(".s-item__seller-info-text") ||
        card.querySelector(".s-item__seller a") ||
        card.querySelector("[class*='seller']");
      if (sellerEl) {
        const text = sellerEl.textContent.trim();
        // Extract name before feedback info
        const nameMatch = text.match(/^(.+?)(?:\s*\()/);
        seller.username = nameMatch
          ? nameMatch[1].trim()
          : text.split("(")[0].trim();

        // Feedback % in parentheses
        const fbMatch = text.match(/(\d{1,3}(?:[.,]\d+)?)\s*%/);
        if (fbMatch) {
          seller.feedbackPercent = parseFloat(fbMatch[1].replace(",", "."));
        }

        // Feedback count
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
  function scoreRisk(seller, rules) {
    if (!rules.enabled) return { level: "disabled", score: -1, reasons: [] };

    let score = 0;
    const reasons = [];

    // Feedback percentage check
    if (seller.feedbackPercent !== null) {
      if (seller.feedbackPercent < rules.minFeedbackPercent - 5) {
        score += 3;
        reasons.push(
          `Feedback ${seller.feedbackPercent}% is critically low (threshold: ${rules.minFeedbackPercent}%)`
        );
      } else if (seller.feedbackPercent < rules.minFeedbackPercent) {
        score += 2;
        reasons.push(
          `Feedback ${seller.feedbackPercent}% is below threshold (${rules.minFeedbackPercent}%)`
        );
      } else if (seller.feedbackPercent < rules.minFeedbackPercent + 0.5) {
        score += 1;
        reasons.push(
          `Feedback ${seller.feedbackPercent}% is borderline safe`
        );
      }
    } else {
      score += 1;
      reasons.push("Feedback percentage not found");
    }

    // Feedback count check
    if (seller.feedbackCount !== null) {
      if (seller.feedbackCount < rules.minFeedbackCount / 5) {
        score += 3;
        reasons.push(
          `Only ${seller.feedbackCount} feedback — very low (threshold: ${rules.minFeedbackCount})`
        );
      } else if (seller.feedbackCount < rules.minFeedbackCount) {
        score += 1;
        reasons.push(
          `${seller.feedbackCount} feedback is below threshold (${rules.minFeedbackCount})`
        );
      }
    } else {
      score += 1;
      reasons.push("Feedback count not found");
    }

    // Account age check
    if (seller.accountAge !== null) {
      if (seller.accountAge < 1) {
        score += 3;
        reasons.push(
          `Account is less than 1 year old (joined ${seller.joinYear})`
        );
      } else if (seller.accountAge < rules.minAccountAgeYears) {
        score += 2;
        reasons.push(
          `Account is only ${seller.accountAge} year(s) old (threshold: ${rules.minAccountAgeYears})`
        );
      }
    } else {
      // No penalty for missing join date — not always visible
      reasons.push("Account age not found");
    }

    let level;
    if (score >= 5) level = "red";
    else if (score >= 2) level = "yellow";
    else level = "green";

    return { level, score, reasons };
  }

  /* ---------- Badge injection ---------- */
  function createBadge(risk, seller) {
    const badge = document.createElement("span");
    badge.className = `ebg-badge ebg-badge-${risk.level}`;
    badge.setAttribute("data-ebg", "true");

    const icon = risk.level === "green" ? "✓" : risk.level === "yellow" ? "⚠" : "✕";
    badge.textContent = icon;

    // Tooltip
    const tooltip = document.createElement("div");
    tooltip.className = "ebg-tooltip";

    let html = `<strong>eBay Buyer Guardian</strong>`;
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

    if (risk.reasons.length) {
      html += `<div class="ebg-reasons">`;
      risk.reasons.forEach((r) => {
        html += `<div class="ebg-reason">• ${r}</div>`;
      });
      html += `</div>`;
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

    return badge;
  }

  /* ---------- Inject badge on listing page ---------- */
  function injectListingBadge(seller, risk) {
    // Remove existing badge if any
    const existing = document.querySelector('[data-ebg="true"]');
    if (existing) existing.remove();

    // Find seller name element to place badge next to it
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

    // Fallback: find the seller section header
    if (!target) {
      target = document.querySelector(
        '.ux-layout-section--seller, #RightSummaryPanel'
      )?.firstElementChild;
    }

    const badge = createBadge(risk, seller);

    if (target) {
      // If target is a link, inject after its parent
      const container =
        target.closest(".ux-textspans") || target.parentElement || target;
      container.style.position = "relative";
      container.classList.add("ebg-seller-container");
      badge.style.marginLeft = "8px";
      badge.style.verticalAlign = "middle";
      badge.style.display = "inline-block";
      target.insertAdjacentElement("afterend", badge);
    } else {
      // Float badge in top-right corner as last resort
      badge.style.position = "fixed";
      badge.style.top = "80px";
      badge.style.right = "20px";
      badge.style.zIndex = "999999";
      document.body.appendChild(badge);
    }
  }

  /* ---------- Inject badges on search results ---------- */
  function injectSearchBadges(sellers, rules) {
    sellers.forEach((seller) => {
      if (!seller.element) return;
      // Remove existing
      const existing = seller.element.querySelector('[data-ebg="true"]');
      if (existing) existing.remove();

      const risk = scoreRisk(seller, rules);
      const badge = createBadge(risk, seller);

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

      // Save to history
      saveHistory({
        username: seller.username,
        feedbackPercent: seller.feedbackPercent,
        feedbackCount: seller.feedbackCount,
        accountAge: seller.accountAge,
        riskLevel: risk.level,
        url: location.href,
      });
    });
  }

  /* ---------- Main ---------- */
  async function run() {
    const rules = await loadRules();
    if (!rules.enabled) return;

    const pageType = getPageType();

    if (pageType === "listing") {
      const seller = parseListingSeller();
      if (seller.username || seller.feedbackPercent) {
        const risk = scoreRisk(seller, rules);
        injectListingBadge(seller, risk);
        saveHistory({
          username: seller.username,
          feedbackPercent: seller.feedbackPercent,
          feedbackCount: seller.feedbackCount,
          accountAge: seller.accountAge,
          riskLevel: risk.level,
          url: location.href,
        });
      }
    } else if (pageType === "search") {
      const sellers = parseSearchSellers();
      injectSearchBadges(sellers, rules);
    }
  }

  // Run on load
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }

  // Re-run on SPA navigation (eBay uses pushState)
  let lastUrl = location.href;
  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      // Clean old badges
      document
        .querySelectorAll('[data-ebg="true"]')
        .forEach((el) => el.remove());
      setTimeout(run, 1500); // Wait for page to render
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
