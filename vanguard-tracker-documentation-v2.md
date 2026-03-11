# Vanguard Price Tracker — Full Documentation
**Version:** 2.0.0  
**Last Updated:** March 2026  
**Built for:** Personal ETF price monitoring with automatic email alerts  
**Total monthly cost:** $0

---

## Table of Contents

1. [What It Does](#1-what-it-does)
2. [How It Works — Technical Overview](#2-how-it-works--technical-overview)
3. [File Structure](#3-file-structure)
4. [File-by-File Breakdown](#4-file-by-file-breakdown)
5. [Tracked ETFs](#5-tracked-etfs)
6. [Features In Detail](#6-features-in-detail)
7. [The Email Alert System](#7-the-email-alert-system)
8. [localStorage — Persistent Settings](#8-localstorage--persistent-settings)
9. [State Management](#9-state-management)
10. [The Sparkline Chart](#10-the-sparkline-chart)
11. [Color Palette & Design System](#11-color-palette--design-system)
12. [Typography](#12-typography)
13. [Data Flow Diagram](#13-data-flow-diagram)
14. [Environment Variables](#14-environment-variables)
15. [Third-Party Services](#15-third-party-services)
16. [Deployment Stack](#16-deployment-stack)
17. [Known Limitations](#17-known-limitations)
18. [How to Make Changes](#18-how-to-make-changes)
19. [Changelog — What Changed from v1](#19-changelog--what-changed-from-v1)

---

## 1. What It Does

The Vanguard Price Tracker is a personal web application that monitors live ETF prices and automatically sends email alerts when prices cross user-defined thresholds. It is designed to be simple enough for a non-technical user to set up once and leave running.

**Core capabilities:**
- Displays the live price of any of 8 popular Vanguard ETFs
- Auto-refreshes on a user-chosen schedule (every 5, 15, 30, or 60 minutes)
- Shows daily price change in dollars and percentage
- Shows the trading day's high and low
- Draws a sparkline chart of prices within the current browser session
- Automatically sends a formatted email when price crosses a low or high threshold — no button pressing required
- Remembers all settings (email, thresholds, fund choice, interval) between visits using localStorage
- Logs all triggered alerts in an on-screen history panel

---

## 2. How It Works — Technical Overview

The app is built with **Next.js 15** (a React framework) and deployed on **Vercel** (free hosting). When a user visits the URL:

1. The browser downloads and runs the React app
2. Settings are immediately loaded from `localStorage` — email, thresholds, and fund choice are pre-filled from the last visit
3. The app immediately calls the **Finnhub API** to fetch the current price of the stored fund (defaults to VOO on first visit)
4. A JavaScript timer runs in the background and re-fetches on the chosen interval
5. Every time a new price arrives, it checks whether the price crossed any alert thresholds
6. If a threshold is crossed, the app calls **EmailJS** directly from the browser, which sends a formatted email to the address stored in settings — fully automatically, no user action needed

All price data comes from **Finnhub.io**. Email delivery is handled by **EmailJS**, which sends through a Gmail account connected during setup. No backend server is needed for either feature.

---

## 3. File Structure

```
vanguard-tracker/
│
├── app/                          ← Next.js App Router directory
│   ├── layout.js                 ← Root HTML wrapper — loads EmailJS script
│   ├── page.js                   ← Entry point — loads the main component
│   └── VanguardTracker.js        ← Entire app: UI, logic, state, styles
│
├── public/                       ← Static assets (empty, auto-created)
│
├── .env.local.example            ← Template showing which env vars are needed
├── .gitignore                    ← Prevents secrets and build files going to GitHub
├── next.config.js                ← Next.js configuration (default/minimal)
├── package.json                  ← Project metadata and dependencies
└── SETUP_INSTRUCTIONS.txt        ← Step-by-step deployment guide
```

**Notable change from v1:** The `app/api/send-alert/route.js` backend endpoint (used by Resend) has been removed. Email is now sent entirely from the browser via EmailJS — no API route needed.

---

## 4. File-by-File Breakdown

### `app/layout.js`
The root HTML wrapper for the entire app. Does two things:

1. Sets the browser tab title and meta description
2. Loads the **EmailJS browser SDK** from a CDN using a `<script>` tag

```javascript
<script
  src="https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js"
  async
/>
```

The `async` attribute means it loads in the background without blocking the page render. The SDK makes `window.emailjs` available globally, which `VanguardTracker.js` calls when an alert fires.

---

### `app/page.js`
A minimal entry point. Its only job is to import and render `<VanguardTracker />`. Kept as a separate file so Next.js can treat it as a server component shell wrapping the client component.

---

### `app/VanguardTracker.js`
The heart of the application. This single file contains everything:

- All UI (fund buttons, price card, alert panel, history panel, sparkline)
- All business logic (price fetching, alert checking, email sending, timers)
- All state (both in-memory and persisted to localStorage)
- All styling (inline styles + a `<style>` block of CSS class definitions)

Marked `"use client"` at the top — required because it uses browser-only APIs including `localStorage`, `setInterval`, `window.emailjs`, and React hooks.

---

### `package.json`
Defines the project and its three dependencies:

| Package | Version | Purpose |
|---------|---------|---------|
| next | 15.2.6 | Web framework — routing, builds, server rendering |
| react | ^18 | UI library |
| react-dom | ^18 | Connects React to the browser DOM |

EmailJS is NOT listed here because it is loaded via CDN script tag in `layout.js`, not installed as an npm package. This keeps the bundle smaller.

Scripts:
- `npm run dev` — run locally for development (not needed for deployment)
- `npm run build` — compile for production (Vercel runs this automatically)
- `npm start` — run the production build locally

---

### `.env.local.example`
A template showing all four environment variables required. The actual values are stored in Vercel's dashboard — never in code files. Contents:

```
NEXT_PUBLIC_FINNHUB_API_KEY       = your Finnhub key
NEXT_PUBLIC_EMAILJS_SERVICE_ID    = your EmailJS service ID
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID   = your EmailJS template ID
NEXT_PUBLIC_EMAILJS_PUBLIC_KEY    = your EmailJS public key
```

---

### `.gitignore`
Prevents these from being committed to GitHub:
- `node_modules/` — installed packages (too large, regenerated on deploy)
- `.next/` — compiled build output (regenerated by Vercel)
- `.env.local` — your actual secret keys (never commit this)

---

## 5. Tracked ETFs

Eight Vanguard ETFs are available. VOO is the default on first visit.

| Ticker | Full Name | What It Tracks |
|--------|-----------|----------------|
| **VTI** | Vanguard Total Stock Market ETF | Every publicly traded US company |
| **VOO** | Vanguard S&P 500 ETF | The 500 largest US companies |
| **VGT** | Vanguard Information Technology ETF | US tech sector |
| **VYM** | Vanguard High Dividend Yield ETF | US high-dividend stocks |
| **BND** | Vanguard Total Bond Market ETF | US investment-grade bonds |
| **VXUS** | Vanguard Total International Stock ETF | All non-US stocks |
| **VNQ** | Vanguard Real Estate ETF | US real estate investment trusts |
| **VOOG** | Vanguard S&P 500 Growth ETF | Growth-oriented S&P 500 stocks |

The selected fund is saved to localStorage under the key `vt_ticker`, so the last-viewed fund is automatically restored on next visit.

---

## 6. Features In Detail

### Fund Selector
A row of pill-shaped buttons at the top. Clicking a fund:
- Highlights it in gold
- Saves the selection to localStorage immediately
- Immediately fetches the current price
- Clears the sparkline history (since it's a different fund)
- Resets the sent-alert flags so thresholds can trigger fresh for the new fund

### Price Display
Large serif-font price with three states:
- **Loading** — pulsing "Fetching price..." message
- **Error** — red error text describing what went wrong
- **Success** — price, daily change (colored ▲/▼), and day high/low

### Refresh Controls
- **Interval dropdown** — 5 min, 15 min (default), 30 min, 1 hour — saved to localStorage
- **Refresh Now button** — triggers an immediate fetch, disabled while loading
- **Countdown display** — live second-by-second countdown to the next auto-refresh (top right, gold)
- **Last updated timestamp** — shows exact time of the most recent successful fetch

### Auto-Refresh Timer
Each time a fetch completes or the interval changes, a `setInterval` is set for the next refresh. The old interval is always cleared first using `clearInterval(timerRef.current)` to prevent duplicate timers from stacking up. The countdown display runs on a separate 1-second `setInterval` stored in `countdownRef`.

### "Alerts Active" Badge
A gold badge appears in the top-right of the price card when all three conditions are true simultaneously: alerts are toggled on, an email address is entered, and at least one threshold is set. It disappears if any condition is unmet.

---

## 7. The Email Alert System

### Overview
When a price threshold is crossed, the app calls EmailJS directly from the browser. EmailJS routes the message through the Gmail account that was connected during setup. The email lands in the recipient's inbox automatically — no user interaction required.

### How Alerts Are Checked
A `useEffect` runs every time `priceData` updates. It checks two conditions:

**Low Alert:**
1. Is `lowAlert` set AND is `price <= lowAlert` AND has the low alert not already been sent (`sentAlerts.low === false`)?
2. If yes → call `sendEmailAlert("low", price, lowAlert)` → mark `sentAlerts.low = true`
3. If price rises back above the threshold → reset `sentAlerts.low = false` so it can fire again

**High Alert:** Same pattern with reversed comparison.

The `sentAlerts` flags act as a "latch" — once an alert fires, it won't fire again until the price moves back through the threshold. This prevents the app from sending a new email on every single refresh once a threshold is crossed.

### The `sendEmailAlert` Function
```javascript
async function sendEmailAlert(alertType, price, threshold) {
  if (!alertEmail) return;
  setSendingAlert(true);
  try {
    await window.emailjs.send(serviceId, templateId, {
      to_email: alertEmail,
      subject: `🔴 Vanguard Alert: VOO has dropped below $240`,
      ticker: "VOO",
      price: "238.45",
      threshold: "240.00",
      direction: "dropped below",
      emoji: "🔴",
      alert_type: "LOW PRICE ALERT",
      checked_at: "3/11/2026, 2:34:00 PM",
    }, publicKey);
  } finally {
    setSendingAlert(false);
  }
}
```

While an email is sending, a pulsing gold "📨 Sending alert email..." banner appears in the alert panel. It disappears when the send completes.

### EmailJS Template Variables
The template in the EmailJS dashboard uses these placeholders, all populated by the app:

| Variable | Example Value | Description |
|----------|---------------|-------------|
| `{{to_email}}` | dad@gmail.com | Recipient address (from the email input box) |
| `{{subject}}` | 🔴 Vanguard Alert: VOO... | Full email subject line |
| `{{ticker}}` | VOO | The ETF ticker symbol |
| `{{price}}` | 238.45 | Current price at time of alert |
| `{{threshold}}` | 240.00 | The threshold that was crossed |
| `{{direction}}` | dropped below | "dropped below" or "risen above" |
| `{{emoji}}` | 🔴 | 🔴 for low alerts, 🟢 for high alerts |
| `{{alert_type}}` | LOW PRICE ALERT | Display label for the email |
| `{{checked_at}}` | 3/11/2026, 2:34 PM | Timestamp of the price check |

### Alert History Panel
Every triggered alert is logged to the on-screen history panel (right card, bottom). Entries are color-coded red (low) or green (high) and show the message and timestamp. The panel holds a maximum of 10 entries. A "Clear History" button removes all entries. Note: history is in-memory only and does not persist between sessions.

---

## 8. localStorage — Persistent Settings

All user preferences are saved to the browser's `localStorage` automatically whenever they change. On the next visit, they are loaded back before the first render so the app looks exactly as the user left it.

### What Is Saved

| localStorage Key | What It Stores | Default |
|-----------------|----------------|---------|
| `vt_email` | Alert email address | "" (empty) |
| `vt_low` | Low price threshold | "" (empty) |
| `vt_high` | High price threshold | "" (empty) |
| `vt_enabled` | Alerts toggle on/off | "false" |
| `vt_ticker` | Selected ETF ticker | "VOO" |
| `vt_interval` | Refresh interval in minutes | "15" |

### How It Works in Code
Each persisted setting has two parts — a raw React state variable and a wrapper setter function:

```javascript
// Raw state — initialized by reading from localStorage
const [alertEmail, setAlertEmailRaw] = useState(() => {
  try { return localStorage.getItem("vt_email") || ""; } catch { return ""; }
});

// Wrapper setter — updates both React state AND localStorage simultaneously
function setAlertEmail(v) {
  setAlertEmailRaw(v);
  try { localStorage.setItem("vt_email", v); } catch {}
}
```

The `try/catch` blocks are defensive — localStorage can fail in private browsing mode on some browsers. If it fails, the app still works, just without persistence for that session.

For `selectedFund` and `intervalVal`, the raw stored value is the ticker string or number, and the actual objects are derived:

```javascript
const selectedFund = VANGUARD_FUNDS.find(f => f.ticker === selectedFundTicker) || VANGUARD_FUNDS[1];
const intervalVal = intervalValStored;
```

### What Is NOT Saved
- Price data and price history (resets every session — always fetches fresh on load)
- Alert history log (in-memory only)
- Sent-alert flags (resets every session — prevents stale latch state)
- Last updated / countdown timers (recalculated each session)

### Clearing Saved Settings
If your dad ever wants to reset everything, he can open his browser's developer tools, go to Application → Local Storage → find the site URL, and delete the `vt_*` keys. Or he can just clear all site data for the URL from his browser settings.

---

## 9. State Management

All state is local to the `VanguardTracker` component using React's built-in hooks. No external state library is used.

### Complete State Reference

| Variable | Type | Persisted | Default | Purpose |
|----------|------|-----------|---------|---------|
| `priceData` | Object / null | No | null | Latest price data from Finnhub |
| `loading` | Boolean | No | false | Whether a fetch is in progress |
| `error` | String / null | No | null | Error message if fetch failed |
| `lastUpdated` | Date / null | No | null | Timestamp of last successful fetch |
| `nextUpdate` | Date / null | No | null | Timestamp of next auto-refresh |
| `countdown` | String / null | No | null | Formatted countdown e.g. "14:32" |
| `alertEmail` | String | ✅ `vt_email` | "" | Email address for alerts |
| `lowAlert` | String | ✅ `vt_low` | "" | Low price threshold |
| `highAlert` | String | ✅ `vt_high` | "" | High price threshold |
| `alertsEnabled` | Boolean | ✅ `vt_enabled` | false | Master alerts toggle |
| `selectedFundTicker` | String | ✅ `vt_ticker` | "VOO" | Active ETF ticker |
| `intervalValStored` | Number | ✅ `vt_interval` | 15 | Refresh interval in minutes |
| `alertHistory` | Array | No | [] | Log of triggered alerts (max 10) |
| `sentAlerts` | Object | No | {low:false, high:false} | Prevents duplicate alert sends |
| `sendingAlert` | Boolean | No | false | Whether an email is being sent |
| `priceHistory` | Array | No | [] | Price/time pairs for sparkline |

### Refs

| Ref | Purpose |
|-----|---------|
| `timerRef` | Holds `setInterval` ID for the auto-refresh timer |
| `countdownRef` | Holds `setInterval` ID for the 1-second countdown display |

Refs are used instead of state for timers because updating them doesn't trigger a re-render.

---

## 10. The Sparkline Chart

A custom SVG line chart drawn without any chart library. Appears below the main price card once at least 2 price readings have been collected in the current session.

**How it renders:**
1. Up to 12 price/time entries are stored in `priceHistory`
2. Min and max of those prices define the Y-axis scale
3. Each point maps to an SVG (x, y) coordinate
4. A `<polyline>` draws the connecting line
5. A `<polygon>` fills the area below the line with a fading gradient
6. Line and fill color: green when today's price change is positive, red when negative

**Crash protection:** When `priceHistory` is empty, `Math.max(...[])` returns `-Infinity` and crashes. This is guarded with:
```javascript
const safePrices = priceHistory.length > 0 ? priceHistory.map(p => p.price) : [0];
```

**Timestamps:** Only the first and last time labels are shown below the chart to avoid crowding.

---

## 11. Color Palette & Design System

The app uses a **dark navy financial terminal** aesthetic — serious, warm, and trustworthy. Every color is intentional.

### Core Colors

| Name | Hex / Value | Used For |
|------|-------------|----------|
| Deep Navy | `#0f1923` | Page background (gradient start/end) |
| Navy Blue | `#1a2a3a` | Page background (gradient midpoint) |
| Warm Cream | `#e8dcc8` | Primary text, price number |
| Gold | `#c9a84c` | Active states, primary button, badge, accents |
| Gold Hover | `#e0be6a` | Button hover state |
| Muted Gray | `#6b7280` | Secondary text, form labels |
| Dark Gray | `#4a5568` | Placeholder text, disabled states, footnotes |
| Card BG | `rgba(255,255,255,0.04)` | Card background (frosted glass effect) |
| Card Border | `rgba(255,255,255,0.08)` | Card border |

### Semantic / Dynamic Colors

| Name | Hex | Used For |
|------|-----|----------|
| Gain Green | `#22c55e` | Positive change, high alert triggered |
| Loss Red | `#ef4444` | Negative change, low alert triggered, errors |
| Alert Gold BG | `rgba(201,168,76,0.12)` | "Alerts Active" badge background |
| Alert Gold Border | `rgba(201,168,76,0.3)` | "Alerts Active" badge border |
| Sending Gold BG | `rgba(201,168,76,0.08)` | "Sending email..." banner background |

### Page Background Gradient
```css
background: linear-gradient(135deg, #0f1923 0%, #1a2a3a 50%, #0f1923 100%);
```
A 135° diagonal gradient — same deep navy at both ends, slightly lighter in the center. Creates depth without distraction.

### Card Style (Frosted Glass)
```css
background: rgba(255,255,255,0.04);
border: 1px solid rgba(255,255,255,0.08);
border-radius: 16px;
```

### Price Glow
```css
text-shadow: 0 0 40px rgba(201,168,76,0.3);
```
Subtle gold luminous glow on the main price number.

### Animations
- `.pulse` — fades opacity between 1 and 0.4 on a 2-second loop. Used on the "Fetching price..." loading text and the "📨 Sending alert email..." banner.

---

## 12. Typography

Two Google Fonts loaded via `@import` inside the component's `<style>` block:

| Font | Classification | Used For |
|------|---------------|----------|
| **Playfair Display** | Serif, weights 400/600/700 | Page headline, card section titles, main price |
| **Source Sans 3** | Sans-serif, weights 300/400/500 | All body text, labels, buttons, inputs, notes |

The pairing creates an editorial financial feel — Playfair Display gives authority and warmth; Source Sans 3 keeps body content clean and readable at small sizes.

### Font Size Scale

| Size | Used For |
|------|----------|
| 58px (40px mobile) | Main price display |
| 32px | "Market Tracker" page headline |
| 28px | Loading/error state in price area |
| 20px | Card section titles ("Price Alerts", "Alert History") |
| 18px | Error message text |
| 15px | Price change row |
| 14px | Inputs, buttons, body text |
| 13px | Fund full name subtitle, alert history text |
| 12px | Form labels, alert history message text |
| 11px | "VANGUARD PRICE MONITOR" eyebrow label, footer note, persistence hint, sparkline timestamps |
| 10px | Sparkline time labels |

---

## 13. Data Flow Diagram

```
━━━━━━━━━━━━━━━━━━━━━ PAGE LOAD ━━━━━━━━━━━━━━━━━━━━━

localStorage → Restore: email, thresholds, fund, interval, alerts toggle
                    ↓
           Fetch price for stored fund (immediate)
                    ↓
           Start auto-refresh timer

━━━━━━━━━━━━━━━━━━━━━ EACH REFRESH ━━━━━━━━━━━━━━━━━━━

setLoading(true) → show "Fetching price..."
        ↓
GET https://finnhub.io/api/v1/quote?symbol=VOO&token=KEY
        ↓
Finnhub returns: { c, d, dp, h, l, pc }
        ↓
setPriceData({ price, change, changePercent, high, low })
        ↓
    ┌───────────────────────────────────┐
    │  priceHistory gains a new entry   │
    │  (sparkline updates)              │
    │                                   │
    │  Alert check runs:                │
    │   price <= lowAlert?              │
    │     → sendEmailAlert("low")       │
    │       → window.emailjs.send(...)  │
    │         → Email to dad's inbox ✅  │
    │                                   │
    │   price >= highAlert?             │
    │     → sendEmailAlert("high")      │
    │       → window.emailjs.send(...)  │
    │         → Email to dad's inbox ✅  │
    │                                   │
    │  nextUpdate timestamp set         │
    │  countdown timer restarts         │
    └───────────────────────────────────┘

━━━━━━━━━━━━━━━━━━ USER CHANGES A SETTING ━━━━━━━━━━━━

User types email / changes threshold / toggles alerts
        ↓
Wrapper setter called (e.g. setAlertEmail)
        ↓
   ┌─────────────────────────────┐
   │  React state updated        │
   │  → UI re-renders            │
   │                             │
   │  localStorage.setItem(...)  │
   │  → Persisted for next visit │
   └─────────────────────────────┘
```

---

## 14. Environment Variables

All four variables must be added to Vercel → Settings → Environment Variables.

| Variable | Where to Get It | Scope |
|----------|----------------|-------|
| `NEXT_PUBLIC_FINNHUB_API_KEY` | finnhub.io → Dashboard | Browser (NEXT_PUBLIC_ prefix) |
| `NEXT_PUBLIC_EMAILJS_SERVICE_ID` | emailjs.com → Email Services | Browser |
| `NEXT_PUBLIC_EMAILJS_TEMPLATE_ID` | emailjs.com → Email Templates | Browser |
| `NEXT_PUBLIC_EMAILJS_PUBLIC_KEY` | emailjs.com → Account → API Keys | Browser |

All four use the `NEXT_PUBLIC_` prefix, making them available in browser-side code. This is necessary because both Finnhub and EmailJS are called directly from the browser — there is no server-side code making these calls.

**Security note:** Because these keys are in the browser, they are technically visible in the page source. For a personal family app this is acceptable — none of these keys can spend money, and the worst case of exposure is someone consuming your free quota. See the "Key Exposure Risk" section in the original documentation for full detail.

---

## 15. Third-Party Services

### Finnhub (stock data)
- **Website:** finnhub.io
- **Purpose:** Provides real-time ETF price data
- **How it's called:** Direct HTTP GET from the browser
- **Endpoint:** `GET https://finnhub.io/api/v1/quote?symbol={TICKER}&token={KEY}`
- **Response fields used:**

| Field | Meaning |
|-------|---------|
| `c` | Current price |
| `d` | Change in dollars vs. previous close |
| `dp` | Change as a percentage |
| `h` | Day high |
| `l` | Day low |
| `pc` | Previous close price |

- **Free tier:** 60 requests/minute — checking every 15 minutes uses ~4 calls/hour, far within limits
- **Data delay:** Up to 15 minutes on the free tier — fine for daily monitoring, not suitable for active trading
- **When market is closed:** Returns the last closing price. If the price is exactly 0 (rare), the app shows an error message

### EmailJS (email sending)
- **Website:** emailjs.com
- **Purpose:** Sends alert emails directly from the browser without a backend server
- **How it works:** EmailJS connects to a Gmail (or other) account you authorize. When called, it sends an email through that connected account to any address specified in the template's `to_email` field
- **How it's called:** `window.emailjs.send(serviceId, templateId, templateParams, publicKey)`
- **SDK loaded via:** CDN script tag in `layout.js` — makes `window.emailjs` globally available
- **Free tier:** 200 emails/month — more than enough for daily threshold alerts
- **No recipient restrictions:** Unlike Resend's free tier, EmailJS can send to any email address — your dad just types his address in the box and that's where alerts go

---

## 16. Deployment Stack

| Layer | Service | Plan | Cost |
|-------|---------|------|------|
| Code hosting | GitHub | Free | $0 |
| Web hosting | Vercel | Hobby (free) | $0 |
| Stock price data | Finnhub | Free | $0 |
| Email delivery | EmailJS | Free (200/month) | $0 |
| Fonts | Google Fonts | Free | $0 |
| Domain | Vercel subdomain (*.vercel.app) | Free | $0 |
| **Total** | | | **$0/month** |

### How Vercel Deploys
1. A file is changed on GitHub
2. Vercel detects the push automatically (if connected) or you click Redeploy
3. Vercel runs `npm run build` (~30 seconds)
4. Compiled app is distributed to Vercel's global CDN
5. The URL is live instantly after build completes

---

## 17. Known Limitations

**Tab must be open for auto-refresh to work**
The app runs entirely in the browser. When the tab is closed, the phone is locked, or the screen turns off, the JavaScript timers pause. Prices will not be checked and alerts will not fire while the tab is closed. For best results, leave it open on a tablet or computer during market hours. Once the tab is reopened, it fetches a fresh price immediately.

**Finnhub free tier data is delayed ~15 minutes**
The free plan provides data that may lag the actual market price by up to 15 minutes. Fine for daily monitoring of long-term holdings.

**EmailJS free tier caps at 200 emails/month**
At one alert per threshold crossing, this is unlikely to be hit in normal use. If both low and high alerts fire once per trading day every day, that's ~40 emails/month — well under the limit.

**Alert history doesn't persist between sessions**
The on-screen alert log resets when the tab is closed. This is by design — the log is an in-session reference only.

**Market hours**
Outside trading hours (nights, weekends, US holidays), Finnhub returns the last closing price rather than a live price. The price displayed will be accurate but stale.

**No account system**
Settings are stored in the browser's localStorage, not in a database. This means settings are device-specific. If your dad uses the tracker on his phone AND his computer, each device has its own separate settings. They don't sync.

---

## 18. How to Make Changes

All meaningful changes happen in `app/VanguardTracker.js` on GitHub (pencil icon → edit → commit).

### Add a new ETF
Find the `VANGUARD_FUNDS` array at the top and add an entry:
```javascript
{ ticker: "VEA", name: "Vanguard FTSE Developed Markets ETF" },
```

### Change the default fund (for first-time visitors)
The default is determined by the localStorage fallback. Find this line and change `"VOO"` to any ticker:
```javascript
try { return localStorage.getItem("vt_ticker") || "VOO"; } catch { return "VOO"; }
```

### Add a new refresh interval
Find `INTERVAL_OPTIONS` and add an entry:
```javascript
{ label: "Every 2 hours", value: 120 },
```

### Change the default refresh interval
Find this line and change `15` to desired minutes:
```javascript
try { return Number(localStorage.getItem("vt_interval")) || 15; } catch { return 15; }
```

### Change a color
Search for the hex value (e.g. `#c9a84c` for gold) and replace globally in the file. The gold accent color appears in ~12 places.

### Reset a user's saved settings
The user can clear localStorage by opening their browser settings → clear site data for the tracker URL. Or in browser dev tools: Application → Local Storage → delete `vt_*` keys.

---

## 19. Changelog — What Changed from v1

### Removed
- `app/api/send-alert/route.js` — the Resend backend API route is gone entirely
- Resend API key and dependency — no longer needed
- SMS/text alert option — removed to simplify; email-only now
- Email/SMS tab switcher UI — replaced with a single clean email input

### Added
- **EmailJS integration** — emails sent directly from the browser, no backend needed, works with any recipient email address
- **localStorage persistence** — 6 settings now survive tab close/reopen: email, low threshold, high threshold, alerts toggle, selected fund, refresh interval
- **Persisting setter functions** — wrapper functions (e.g. `setAlertEmail`) update both React state and localStorage simultaneously
- **"Sending email..." banner** — pulsing gold indicator while an email is in flight
- **EmailJS CDN script** in `layout.js` — loads the browser SDK globally
- Hint text under the email field: "Alerts will be sent automatically — no action needed"

### Changed
- `sendEmailAlert()` — switched from calling `/api/send-alert` to calling `window.emailjs.send()` directly
- State initialization — all persisted states now use lazy initializer functions that read from localStorage
- "Alerts Active" badge condition — no longer checks for phone number, only email

*Documentation written March 2026.*
