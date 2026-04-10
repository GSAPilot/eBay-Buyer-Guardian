/* ============================================================
   eBay Buyer Guardian — Content Script v2.0.0
   Runs on ebay.com listing & search pages.
   Parses seller info, scores risk, injects badge + tooltip.
   Updated for eBay's 2025 DOM structure.
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

  /* ---------- Seller parsing — Listing page (2025 eBay DOM) ---------- */
  function parseListingSeller() {
    const seller = {
      username: null,
      feedbackPercent: null,
      feedbackCount: null,
      accountAge: null,
      joinYear: null,
    };

    // === Seller name ===
    // Primary: About seller link inside sellercard
    const aboutSellerLink = document.querySelector(
      '.x-sellercard-atf__info__about-seller a'
    );
    if (aboutSellerLink && aboutSellerLink.textContent.trim()) {
      seller.username = aboutSellerLink.textContent.trim();
    }

    // Fallback: store link in about-seller section
    if (!seller.username) {
      const storeLink = document.querySelector(
        '.x-sellercard-atf__info__about-seller a[href*="/str/"]'
      );
      if (storeLink) seller.username = storeLink.textContent.trim();
    }

    // Fallback: any link with _ssn in clientPresentationMetadata
    if (!seller.username) {
      const ssnLink = document.querySelector(
        '[data-clientpresentationmetadata*="_ssn"]'
      );
      if (ssnLink) {
        try {
          const meta = JSON.parse(
            ssnLink.getAttribute("data-clientpresentationmetadata") || "{}"
          );
          if (meta._ssn) seller.username = meta._ssn;
        } catch (e) {}
      }
    }

    // Fallback: href with /usr/ or /str/
    if (!seller.username) {
      const sellerLink = document.querySelector(
        '.x-sellercard-atf a[href*="/usr/"], .x-sellercard-atf a[href*="/str/"]'
      );
      if (sellerLink) {
        const href = sellerLink.getAttribute("href") || "";
        const m = href.match(/\/usr\/([^?/]+)/) || href.match(/\/str\/([^?/]+)/);
        if (m) seller.username = decodeURIComponent(m[1]);
      }
    }

    // === Feedback percent ===
    // Primary: data-testid="x-sellercard-atf__data-item" containing "positive"
    const dataItems = document.querySelectorAll(
      '[data-testid="x-sellercard-atf__data-item"]'
    );
    for (const item of dataItems) {
      const text = item.textContent;
      const fbMatch = text.match(/(\d{1,3}(?:[.,]\d+)?)\s*%\s*positive/i);
      if (fbMatch) {
        seller.feedbackPercent = parseFloat(fbMatch[1].replace(",", "."));
        break;
      }
    }

    // Fallback: full sellercard text
    if (!seller.feedbackPercent) {
      const sellercard = document.querySelector(".x-sellercard-atf");
      if (sellercard) {
        const text = sellercard.textContent;
        const fbMatch = text.match(/(\d{1,3}(?:[.,]\d+)?)\s*%\s*positive/i);
        if (fbMatch) {
          seller.feedbackPercent = parseFloat(fbMatch[1].replace(",", "."));
        }
      }
    }

    // Fallback: body text
    if (!seller.feedbackPercent) {
      const bodyText = document.body.innerText;
      const fbMatch = bodyText.match(
        /(\d{1,3}(?:[.,]\d+)?)\s*%\s*positive\s*(?:feedback|rating)?/i
      );
      if (fbMatch) {
        seller.feedbackPercent = parseFloat(fbMatch[1].replace(",", "."));
      }
    }

    // === Feedback count ===
    // Primary: about-seller section "(14913)" or "(18.6K)"
    if (!seller.feedbackCount) {
      const aboutSeller = document.querySelector(
        '[data-testid="x-sellercard-atf__about-seller"]'
      );
      if (aboutSeller) {
        const text = aboutSeller.textContent;
        const fcMatch = text.match(/\(([\d,.]+[KkMm]?)\)/);
        if (fcMatch) {
          seller.feedbackCount = parseShorthandNumber(fcMatch[1]);
        }
      }
    }

    // Fallback: BTF seller card "56K items sold" or "(18.6K)"
    if (!seller.feedbackCount) {
      const btfCard = document.querySelector(
        '[data-testid="x-evo-btf-seller-card-river"]'
      );
      if (btfCard) {
        const text = btfCard.textContent;
        const fcMatch = text.match(/\(([\d,.]+[KkMm]?)\)/);
        if (fcMatch) {
          seller.feedbackCount = parseShorthandNumber(fcMatch[1]);
        }
      }
    }

    // Fallback: general body text
    if (!seller.feedbackCount) {
      const bodyText = document.body.innerText;
      const fcMatch = bodyText.match(
        /(\d[\d,]*)\s*(?:feedback|reviews|ratings|items sold)/i
      );
      if (fcMatch) {
        seller.feedbackCount = parseInt(fcMatch[1].replace(/,/g, ""), 10);
      }
    }

    // === Account age / join year ===
    // Primary: BTF seller card "Joined May 2008"
    const btfCard = document.querySelector(
      '[data-testid="x-evo-btf-seller-card-river"]'
    );
    if (btfCard) {
      const text = btfCard.textContent;
      const jyMatch = text.match(/(?:Joined|member\s+since|since)\s+\w+\s+(\d{4})/i);
      if (jyMatch) {
        seller.joinYear = parseInt(jyMatch[1], 10);
        seller.accountAge = new Date().getFullYear() - seller.joinYear;
      }
    }

    // Fallback: body text search
    if (!seller.joinYear) {
      const bodyText = document.body.innerText;
      const jyMatch = bodyText.match(
        /(?:joined|member\s+since)[^\d]*(\d{4})/i
      );
      if (jyMatch) {
        seller.joinYear = parseInt(jyMatch[1], 10);
        seller.accountAge = new Date().getFullYear() - seller.joinYear;
      }
    }

    console.log("[EBG] Listing seller parsed:", seller);
    return seller;
  }

  /* ---------- Parse shorthand numbers like "18.6K", "1.2M" ---------- */
  function parseShorthandNumber(str) {
    if (!str) return null;
    str = str.trim().replace(/,/g, "");
    const multipliers = { K: 1000, k: 1000, M: 1000000, m: 1000000 };
    const lastChar = str.slice(-1);
    if (multipliers[lastChar]) {
      const num = parseFloat(str.slice(0, -1));
      return Math.round(num * multipliers[lastChar]);
    }
    const num = parseInt(str, 10);
    return isNaN(num) ? null : num;
  }

  /* ---------- Seller parsing — Search results (2025 eBay DOM) ---------- */
  function parseSearchSellers() {
    const sellers = [];

    // eBay 2025 uses .s-card instead of .s-item
    const cards = document.querySelectorAll(".s-card");

    cards.forEach((card) => {
      const seller = {
        username: null,
        feedbackPercent: null,
        feedbackCount: null,
        accountAge: null,
        joinYear: null,
        element: card,
      };

      // Primary: secondary attributes section contains "sellername 99.6% positive (5.5K)"
      const secondaryAttr = card.querySelector(
        ".su-card-container__attributes__secondary"
      );
      if (secondaryAttr) {
        const text = secondaryAttr.textContent.trim();
        parseSellerInfoString(text, seller);
      }

      // Fallback: attribute row with seller info
      if (!seller.username) {
        const attrRow = card.querySelector(".s-card__attribute-row");
        if (attrRow) {
          const text = attrRow.textContent.trim();
          parseSellerInfoString(text, seller);
        }
      }

      // Fallback: any element with seller text pattern
      if (!seller.username) {
        const allSpans = card.querySelectorAll(".su-styled-text");
        for (const span of allSpans) {
          const text = span.textContent.trim();
          if (text.match(/\d+\.\d+%\s*positive/i)) {
            // The seller name is likely in a sibling or parent element
            const parent = span.closest(".s-card__attribute-row") || span.parentElement;
            if (parent) {
              parseSellerInfoString(parent.textContent.trim(), seller);
            }
            break;
          }
        }
      }

      if (seller.username || seller.feedbackPercent) {
        sellers.push(seller);
      }
    });

    console.log("[EBG] Search sellers parsed:", sellers.length, sellers.slice(0, 3));
    return sellers;
  }

  /* ---------- Parse seller info string like "sarahcell 99.6% positive (5.5K)" ---------- */
  function parseSellerInfoString(text, seller) {
    // Pattern: "sellername 99.6% positive (5.5K)" or "sellername  99.3% positive (38.5K)"
    const fullMatch = text.match(
      /^([a-zA-Z0-9_\-\.]+)\s+(\d{1,3}(?:[.,]\d+)?)\s*%\s*positive\s*\(([^)]+)\)/i
    );
    if (fullMatch) {
      seller.username = fullMatch[1].trim();
      seller.feedbackPercent = parseFloat(fullMatch[2].replace(",", "."));
      seller.feedbackCount = parseShorthandNumber(fullMatch[3].trim());
      return;
    }

    // Fallback: just "99.6% positive" without name
    const fbMatch = text.match(/(\d{1,3}(?:[.,]\d+)?)\s*%\s*positive/i);
    if (fbMatch && !seller.feedbackPercent) {
      seller.feedbackPercent = parseFloat(fbMatch[1].replace(",", "."));
    }

    // Fallback: just "(5.5K)" without other info
    const fcMatch = text.match(/\(([\d,.]+[KkMm]?)\)/);
    if (fcMatch && !seller.feedbackCount) {
      seller.feedbackCount = parseShorthandNumber(fcMatch[1].trim());
    }
  }

  /* ---------- Risk scoring ---------- */
  function scoreRisk(seller, rules, isPremium) {
    if (!rules.enabled) return { level: "disabled", score: -1, reasons: [] };

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

    badge.addEventListener("mouseenter", () => {
      tooltip.classList.add("ebg-tooltip-visible");
    });
    badge.addEventListener("mouseleave", () => {
      tooltip.classList.remove("ebg-tooltip-visible");
    });

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

    // Primary: next to the seller name in the about-seller section
    let target = document.querySelector(
      ".x-sellercard-atf__info__about-seller"
    );

    // Fallback: next to the sellercard info section
    if (!target) {
      target = document.querySelector(".x-sellercard-atf__info");
    }

    // Fallback: the sellercard itself
    if (!target) {
      target = document.querySelector(".x-sellercard-atf");
    }

    // Fallback: old-style selectors
    if (!target) {
      const anchors = [
        '[data-testid="x-seller-name"]',
        ".seller-persona__name",
        "#si-fb",
        '.ux-layout-section--seller .ux-textspans a',
        "#RightSummaryPanel .ux-textspans a",
        'a[href*="/usr/"]',
      ];
      for (const sel of anchors) {
        const el = document.querySelector(sel);
        if (el) {
          target = el;
          break;
        }
      }
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
      // Last resort: fixed position badge
      badge.style.position = "fixed";
      badge.style.top = "80px";
      badge.style.right = "20px";
      badge.style.zIndex = "999999";
      document.body.appendChild(badge);
    }

    console.log("[EBG] Listing badge injected, risk:", risk.level);
  }

  /* ---------- Inject badges on search results ---------- */
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

      // Primary: secondary attributes section (contains seller info on 2025 eBay)
      let sellerEl =
        seller.element.querySelector(
          ".su-card-container__attributes__secondary"
        ) ||
        seller.element.querySelector(".s-card__attribute-row") ||
        seller.element.querySelector(".s-card__footer");

      // Fallback: any element containing the seller name
      if (!sellerEl && seller.username) {
        const allSpans = seller.element.querySelectorAll("span, div");
        for (const el of allSpans) {
          if (el.textContent.includes(seller.username)) {
            sellerEl = el;
            break;
          }
        }
      }

      if (sellerEl) {
        sellerEl.classList.add("ebg-seller-container");
        sellerEl.style.position = "relative";
        sellerEl.appendChild(badge);
      } else {
        // Append to the card footer as last resort
        const footer = seller.element.querySelector(".s-card__footer");
        if (footer) {
          footer.classList.add("ebg-seller-container");
          footer.style.position = "relative";
          footer.appendChild(badge);
        }
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

    console.log("[EBG] Search badges injected for", sellers.length, "sellers");
  }

  /* ---------- Inject search upsell banner (Free users) ---------- */
  function injectSearchUpsell() {
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
    if (!rules.enabled) {
      console.log("[EBG] Extension disabled by user rules");
      return;
    }

    const license = await getLicense();
    const isPremium = license.active;
    const pageType = getPageType();

    console.log("[EBG] Running on page type:", pageType, "Premium:", isPremium);

    if (pageType === "listing") {
      // On listing pages, seller info may be lazy-loaded
      // Try parsing immediately, then retry after a delay
      let seller = parseListingSeller();

      if (!seller.username && !seller.feedbackPercent) {
        // Wait for lazy-loaded content and try again
        console.log("[EBG] Seller info not found, retrying in 2s...");
        await new Promise((r) => setTimeout(r, 2000));
        seller = parseListingSeller();
      }

      if (!seller.username && !seller.feedbackPercent) {
        // One more retry after longer delay
        console.log("[EBG] Seller info still not found, retrying in 4s...");
        await new Promise((r) => setTimeout(r, 4000));
        seller = parseListingSeller();
      }

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
      } else {
        console.log("[EBG] Could not find seller info on listing page");
      }
    } else if (pageType === "search") {
      if (isPremium) {
        let sellers = parseSearchSellers();
        if (sellers.length === 0) {
          // Wait for lazy-loaded search results
          console.log("[EBG] No search sellers found, retrying in 2s...");
          await new Promise((r) => setTimeout(r, 2000));
          sellers = parseSearchSellers();
        }
        if (sellers.length > 0) {
          injectSearchBadges(sellers, rules, isPremium);
        } else {
          console.log("[EBG] Could not find seller info on search page");
        }
      } else {
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

  // Re-run on SPA navigation (eBay uses client-side routing)
  let lastUrl = location.href;
  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      document
        .querySelectorAll('[data-ebg="true"], #ebg-search-upsell')
        .forEach((el) => el.remove());
      // Delay to allow new page content to load
      setTimeout(run, 2000);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // Also listen for late-loading seller cards (MutationObserver for sellercard)
  const sellercardObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Check if a sellercard was just added
          if (
            node.matches?.(".x-sellercard-atf") ||
            node.querySelector?.(".x-sellercard-atf")
          ) {
            console.log("[EBG] Sellercard detected via DOM mutation, re-running");
            // Don't re-run if we already have a badge
            if (!document.querySelector('[data-ebg="true"]')) {
              run();
            }
          }
        }
      }
    }
  });
  sellercardObserver.observe(document.body, { childList: true, subtree: true });

  // Listen for license updates from popup
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "EBG_LICENSE_UPDATED") {
      document
        .querySelectorAll('[data-ebg="true"], #ebg-search-upsell')
        .forEach((el) => el.remove());
      run();
    }
    if (message.type === "EBG_RULES_UPDATED") {
      document
        .querySelectorAll('[data-ebg="true"], #ebg-search-upsell')
        .forEach((el) => el.remove());
      run();
    }
  });
})();
