# 🛡️ eBay Buyer Guardian — Seller Risk Analyzer

> Spot risky eBay sellers instantly with color-coded risk badges. Free for listing pages, Pro adds search badges, custom rules & detailed breakdowns.

**[🌐 Live Landing Page](https://your-username.github.io/ebay-buyer-guardian/)** · **[⬇ Download Extension](https://github.com/your-username/ebay-buyer-guardian/releases/latest)** · **[⭐ Get Pro — $39 Lifetime](https://ebay-guardian.lemonsqueezy.com/checkout/buy/lifetime)**

---

## 🚀 What It Does

| Feature | Free | Pro |
|---|---|---|
| Listing page risk badges | ✅ | ✅ |
| Basic risk scoring | ✅ | ✅ |
| 25 seller history entries | ✅ | ✅ |
| Search page badges | ❌ | ✅ |
| Custom risk thresholds | ❌ | ✅ |
| Detailed risk reasons | ❌ | ✅ |
| 500 seller history entries | ❌ | ✅ |
| Export history (CSV) | ❌ | ✅ |
| Premium badge styling | ❌ | ✅ |

## 💰 Pricing

- **Free** — $0 forever, listing page badges + basic scoring
- **Pro Monthly** — $4.99/month, full feature set, cancel anytime
- **Pro Lifetime** — $39 one-time, pay once protect forever

Payments via [Lemon Squeezy](https://lemonsqueezy.com). Low refund rate (4/92 in comparable extensions).

## 🔧 Installation

1. Download the latest release ZIP from [Releases](https://github.com/your-username/ebay-buyer-guardian/releases/latest)
2. Unzip to a folder on your computer
3. Open Chrome → `chrome://extensions`
4. Enable **Developer Mode** (top-right toggle)
5. Click **"Load unpacked"** → Select the unzipped folder
6. Visit any eBay listing — risk badges appear automatically!

## 🏗️ Repository Structure

```
ebay-buyer-guardian/
├── index.html              # Landing page
├── assets/
│   ├── css/style.css       # All styles
│   ├── js/app.js           # Interactivity
│   └── images/             # Hero, logo, risk levels
├── extension/              # Chrome extension source
│   ├── manifest.json
│   ├── content.js
│   ├── background.js
│   ├── styles.css
│   ├── popup.html
│   ├── popup.js
│   ├── popup.css
│   └── icons/
└── README.md
```

## 🔒 Privacy

- **100% local analysis** — no seller data leaves your browser
- Free users make **zero external calls**
- Pro license validation is the only external call (Lemon Squeezy)
- No extra network requests to eBay → fewer CAPTCHAs

## 📦 Deploying the Landing Page

This is a static site — deploy anywhere:

**GitHub Pages:**
1. Push to `main` branch
2. Settings → Pages → Source: `main` / root
3. Your site is live at `https://your-username.github.io/ebay-buyer-guardian/`

**Netlify / Vercel:**
- Just point to the repo root — zero config needed.

## 🔑 Lemon Squeezy Setup

1. Create a store at [lemonsqueezy.com](https://lemonsqueezy.com)
2. Create two products: Monthly ($4.99/mo) and Lifetime ($39)
3. Update the checkout URLs in `index.html` and `extension/popup.html`
4. For server-side validation, set `LEMON_SQUEEZY_API_KEY` in your backend `.env`

## 📄 License

MIT — use freely, attribution appreciated.

---

*Not affiliated with eBay Inc. Built with ❤️ for safer online shopping.*
