"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const VANGUARD_FUNDS = [
  { ticker: "VTI", name: "Vanguard Total Stock Market ETF" },
  { ticker: "VOO", name: "Vanguard S&P 500 ETF" },
  { ticker: "VGT", name: "Vanguard Information Technology ETF" },
  { ticker: "VYM", name: "Vanguard High Dividend Yield ETF" },
  { ticker: "BND", name: "Vanguard Total Bond Market ETF" },
  { ticker: "VXUS", name: "Vanguard Total International Stock ETF" },
  { ticker: "VNQ", name: "Vanguard Real Estate ETF" },
  { ticker: "VOOG", name: "Vanguard S&P 500 Growth ETF" },
];

const INTERVAL_OPTIONS = [
  { label: "Every 5 min", value: 5 },
  { label: "Every 15 min", value: 15 },
  { label: "Every 30 min", value: 30 },
  { label: "Every 1 hour", value: 60 },
];

async function fetchPriceFromFinnhub(ticker) {
  const apiKey = process.env.NEXT_PUBLIC_FINNHUB_API_KEY;
  if (!apiKey) throw new Error("Missing Finnhub API key — check Vercel environment variables");

  const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${apiKey}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);

  const quote = await res.json();

  if (!quote || quote.c === undefined || quote.c === null) throw new Error("No price data returned");
  if (quote.c === 0) throw new Error("Market may be closed or invalid ticker");

  return {
    price: Number(quote.c),
    change: Number(quote.d) || 0,
    changePercent: Number(quote.dp) || 0,
    high: Number(quote.h) || 0,
    low: Number(quote.l) || 0,
    prevClose: Number(quote.pc) || 0,
  };
}

export default function VanguardTracker() {
  const [selectedFund, setSelectedFund] = useState(VANGUARD_FUNDS[1]);
  const [priceData, setPriceData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [intervalVal, setIntervalVal] = useState(15);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [nextUpdate, setNextUpdate] = useState(null);
  const [countdown, setCountdown] = useState(null);

  const [alertEmail, setAlertEmail] = useState("");
  const [lowAlert, setLowAlert] = useState("");
  const [highAlert, setHighAlert] = useState("");
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const [alertHistory, setAlertHistory] = useState([]);
  const [sentAlerts, setSentAlerts] = useState({ low: false, high: false });
  const [sendingAlert, setSendingAlert] = useState(false);
  const [priceHistory, setPriceHistory] = useState([]);

  const timerRef = useRef(null);
  const countdownRef = useRef(null);

  const fetchPrice = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPriceFromFinnhub(selectedFund.ticker);
      setPriceData(data);
      setLastUpdated(new Date());
      const next = new Date(Date.now() + intervalVal * 60 * 1000);
      setNextUpdate(next);
      setPriceHistory((prev) => {
        const entry = {
          price: data.price,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        return [...prev.slice(-11), entry];
      });
    } catch (e) {
      setError(e.message || "Could not fetch price. Check your Finnhub API key.");
    } finally {
      setLoading(false);
    }
  }, [selectedFund, intervalVal]);

  useEffect(() => {
    if (!priceData || !alertsEnabled) return;
    const price = priceData.price;
    const newHistory = [];

    if (lowAlert && price <= parseFloat(lowAlert) && !sentAlerts.low) {
      const msg = `🔴 ${selectedFund.ticker} dropped to $${price.toFixed(2)} — below your $${lowAlert} alert`;
      newHistory.push({ type: "low", msg, time: new Date().toLocaleTimeString() });
      sendEmailAlert("low", price, lowAlert);
      setSentAlerts((s) => ({ ...s, low: true }));
    } else if (lowAlert && price > parseFloat(lowAlert)) {
      setSentAlerts((s) => ({ ...s, low: false }));
    }

    if (highAlert && price >= parseFloat(highAlert) && !sentAlerts.high) {
      const msg = `🟢 ${selectedFund.ticker} rose to $${price.toFixed(2)} — above your $${highAlert} alert`;
      newHistory.push({ type: "high", msg, time: new Date().toLocaleTimeString() });
      sendEmailAlert("high", price, highAlert);
      setSentAlerts((s) => ({ ...s, high: true }));
    } else if (highAlert && price < parseFloat(highAlert)) {
      setSentAlerts((s) => ({ ...s, high: false }));
    }

    if (newHistory.length > 0) {
      setAlertHistory((prev) => [...newHistory, ...prev].slice(0, 10));
    }
  }, [priceData]);

  async function sendEmailAlert(alertType, price, threshold) {
    if (!alertEmail) return;
    setSendingAlert(true);
    try {
      const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
      const templateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID;
      const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;

      const isLow = alertType === "low";
      const emoji = isLow ? "🔴" : "🟢";
      const direction = isLow ? "dropped below" : "risen above";

      await window.emailjs.send(serviceId, templateId, {
        to_email: alertEmail,
        subject: `${emoji} Vanguard Alert: ${selectedFund.ticker} has ${direction} $${threshold}`,
        ticker: selectedFund.ticker,
        price: Number(price).toFixed(2),
        threshold: Number(threshold).toFixed(2),
        direction,
        emoji,
        alert_type: isLow ? "LOW PRICE ALERT" : "HIGH PRICE ALERT",
        checked_at: new Date().toLocaleString("en-US"),
      }, publicKey);
    } catch (e) {
      console.error("Failed to send alert email:", e);
    } finally {
      setSendingAlert(false);
    }
  }

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(fetchPrice, intervalVal * 60 * 1000);
    return () => clearInterval(timerRef.current);
  }, [fetchPrice, intervalVal]);

  useEffect(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (!nextUpdate) return;
    countdownRef.current = setInterval(() => {
      const diff = Math.max(0, Math.floor((nextUpdate - Date.now()) / 1000));
      const m = Math.floor(diff / 60);
      const s = diff % 60;
      setCountdown(`${m}:${s.toString().padStart(2, "0")}`);
    }, 1000);
    return () => clearInterval(countdownRef.current);
  }, [nextUpdate]);

  useEffect(() => {
    fetchPrice();
    setSentAlerts({ low: false, high: false });
    setPriceHistory([]);
  }, [selectedFund]);

  const price = priceData?.price;
  const isUp = priceData?.change >= 0;

  const safePrices = priceHistory.length > 0 ? priceHistory.map((p) => p.price) : [0];
  const sparkMax = Math.max(...safePrices, 1);
  const sparkMin = Math.min(...safePrices, 0);
  const sparkRange = sparkMax - sparkMin || 1;
  const W = 200, H = 48;
  const pts = priceHistory
    .map((p, i) => {
      const x = priceHistory.length === 1 ? W / 2 : (i / (priceHistory.length - 1)) * W;
      const y = H - ((p.price - sparkMin) / sparkRange) * H;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0f1923 0%, #1a2a3a 50%, #0f1923 100%)",
      fontFamily: "'Georgia', 'Times New Roman', serif",
      color: "#e8dcc8",
      padding: 0,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Source+Sans+3:wght@300;400;500&display=swap');
        * { box-sizing: border-box; }
        input, select { outline: none; }
        input::placeholder { color: #4a5568; }
        .card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; }
        .btn-primary { background: #c9a84c; color: #0f1923; border: none; border-radius: 8px; padding: 10px 20px; cursor: pointer; font-weight: 600; font-size: 14px; transition: all 0.2s; font-family: 'Source Sans 3', sans-serif; }
        .btn-primary:hover { background: #e0be6a; transform: translateY(-1px); }
        .btn-secondary { background: transparent; color: #c9a84c; border: 1px solid #c9a84c; border-radius: 8px; padding: 9px 18px; cursor: pointer; font-size: 14px; transition: all 0.2s; font-family: 'Source Sans 3', sans-serif; }
        .btn-secondary:hover { background: rgba(201,168,76,0.1); }
        .fund-chip { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 8px 14px; cursor: pointer; font-size: 13px; transition: all 0.2s; font-family: 'Source Sans 3', sans-serif; white-space: nowrap; color: #e8dcc8; }
        .fund-chip:hover { border-color: #c9a84c; background: rgba(201,168,76,0.08); }
        .fund-chip.active { border-color: #c9a84c; background: rgba(201,168,76,0.15); color: #c9a84c; }
        .input-field { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; padding: 10px 14px; color: #e8dcc8; font-size: 14px; font-family: 'Source Sans 3', sans-serif; width: 100%; transition: border 0.2s; }
        .input-field:focus { border-color: #c9a84c; }
        select.input-field option { background: #1a2a3a; color: #e8dcc8; }
        .toggle { position: relative; display: inline-block; width: 44px; height: 24px; }
        .toggle input { opacity: 0; width: 0; height: 0; }
        .slider { position: absolute; inset: 0; background: rgba(255,255,255,0.1); border-radius: 24px; cursor: pointer; transition: 0.3s; }
        .slider:before { content: ''; position: absolute; height: 18px; width: 18px; left: 3px; bottom: 3px; background: white; border-radius: 50%; transition: 0.3s; }
        input:checked + .slider { background: #c9a84c; }
        input:checked + .slider:before { transform: translateX(20px); }
        .pulse { animation: pulse 2s infinite; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .tab-btn { padding: 8px 20px; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-family: 'Source Sans 3', sans-serif; transition: all 0.2s; }
        .tab-btn.active { background: rgba(201,168,76,0.2); color: #c9a84c; }
        .tab-btn:not(.active) { background: transparent; color: #6b7280; }
        .tab-btn:not(.active):hover { color: #9ca3af; }
        @media (max-width: 640px) {
          .grid-2 { grid-template-columns: 1fr !important; }
          .header { padding: 20px 16px 0 !important; }
          .main-grid { padding: 16px !important; }
          .price-num { font-size: 40px !important; }
          .fund-chips { gap: 6px !important; }
        }
      `}</style>

      <div className="header" style={{ padding: "32px 40px 0", maxWidth: 900, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#c9a84c" }} />
              <span style={{ fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: "#c9a84c", fontFamily: "'Source Sans 3', sans-serif", opacity: 0.8 }}>
                Vanguard Price Monitor
              </span>
            </div>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 700, margin: "4px 0 0", letterSpacing: -0.5 }}>
              Market Tracker
            </h1>
          </div>
          <div style={{ textAlign: "right", fontSize: 12, color: "#6b7280", fontFamily: "'Source Sans 3', sans-serif" }}>
            {lastUpdated && <div>Updated {lastUpdated.toLocaleTimeString()}</div>}
            {countdown && <div style={{ color: "#c9a84c", marginTop: 2 }}>Next check in {countdown}</div>}
          </div>
        </div>

        <div className="fund-chips" style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "20px 0 0" }}>
          {VANGUARD_FUNDS.map((f) => (
            <button key={f.ticker} className={`fund-chip ${selectedFund.ticker === f.ticker ? "active" : ""}`} onClick={() => setSelectedFund(f)}>
              <strong>{f.ticker}</strong>
            </button>
          ))}
        </div>
      </div>

      <div className="main-grid" style={{ maxWidth: 900, margin: "0 auto", padding: "20px 40px 40px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

        {/* Price Card */}
        <div className="card" style={{ padding: 28, gridColumn: "1 / -1" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontFamily: "'Source Sans 3', sans-serif", fontSize: 13, color: "#6b7280", marginBottom: 4 }}>
                {selectedFund.name}
              </div>
              <div className="price-num" style={{ fontFamily: "'Playfair Display', serif", fontSize: 58, fontWeight: 700, lineHeight: 1, color: "#e8dcc8", textShadow: "0 0 40px rgba(201,168,76,0.3)" }}>
                {loading ? (
                  <span style={{ fontSize: 28, color: "#4a5568" }} className="pulse">Fetching price...</span>
                ) : error ? (
                  <span style={{ fontSize: 18, color: "#ef4444" }}>{error}</span>
                ) : price ? (
                  `$${price.toFixed(2)}`
                ) : (
                  <span style={{ fontSize: 22, color: "#4a5568" }}>Press Refresh to start</span>
                )}
              </div>
              {priceData && !error && (
                <div style={{ marginTop: 8, fontFamily: "'Source Sans 3', sans-serif", fontSize: 15 }}>
                  <span style={{ color: isUp ? "#22c55e" : "#ef4444", fontWeight: 600 }}>
                    {isUp ? "▲" : "▼"} ${Math.abs(priceData.change || 0).toFixed(2)} ({Math.abs(priceData.changePercent || 0).toFixed(2)}%)
                  </span>
                  <span style={{ color: "#4a5568", marginLeft: 16, fontSize: 13 }}>
                    High: ${(priceData.high || 0).toFixed(2)} &nbsp;·&nbsp; Low: ${(priceData.low || 0).toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
              {alertsEnabled && alertEmail && (lowAlert || highAlert) && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.3)", borderRadius: 20, padding: "4px 12px", fontSize: 12, color: "#c9a84c", fontFamily: "'Source Sans 3', sans-serif" }}>
                  🔔 Alerts Active
                </div>
              )}
              <select className="input-field" style={{ width: "auto" }} value={intervalVal} onChange={(e) => setIntervalVal(Number(e.target.value))}>
                {INTERVAL_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <button className="btn-primary" onClick={fetchPrice} disabled={loading} style={{ opacity: loading ? 0.6 : 1 }}>
                {loading ? "Loading..." : "↻ Refresh Now"}
              </button>
            </div>
          </div>

          {priceHistory.length > 1 && (
            <div style={{ marginTop: 20, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 16 }}>
              <div style={{ fontSize: 11, color: "#4a5568", fontFamily: "'Source Sans 3', sans-serif", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Session History</div>
              <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: "block" }}>
                <defs>
                  <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={isUp ? "#22c55e" : "#ef4444"} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={isUp ? "#22c55e" : "#ef4444"} stopOpacity="0" />
                  </linearGradient>
                </defs>
                <polygon points={`0,${H} ${pts} ${W},${H}`} fill="url(#spark-fill)" />
                <polyline points={pts} fill="none" stroke={isUp ? "#22c55e" : "#ef4444"} strokeWidth="2" strokeLinejoin="round" />
              </svg>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#4a5568", fontFamily: "'Source Sans 3', sans-serif", marginTop: 4 }}>
                {priceHistory.map((p, i) => (i === 0 || i === priceHistory.length - 1 ? <span key={i}>{p.time}</span> : null))}
              </div>
            </div>
          )}
        </div>

        {/* Alert Settings */}
        <div className="card grid-2" style={{ padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, margin: 0 }}>Price Alerts</h2>
            <label className="toggle">
              <input type="checkbox" checked={alertsEnabled} onChange={(e) => setAlertsEnabled(e.target.checked)} />
              <span className="slider" />
            </label>
          </div>

          <div style={{ opacity: alertsEnabled ? 1 : 0.4, transition: "opacity 0.3s", pointerEvents: alertsEnabled ? "auto" : "none" }}>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: "#6b7280", fontFamily: "'Source Sans 3', sans-serif", display: "block", marginBottom: 6 }}>✉ Send alerts to this email</label>
              <input
                className="input-field"
                type="email"
                placeholder="dad@email.com"
                value={alertEmail}
                onChange={(e) => setAlertEmail(e.target.value)}
              />
              {alertEmail && (
                <p style={{ margin: "6px 0 0", fontSize: 11, color: "#4a5568", fontFamily: "'Source Sans 3', sans-serif" }}>
                  Alerts will be sent automatically — no action needed.
                </p>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 12, color: "#ef4444", fontFamily: "'Source Sans 3', sans-serif", display: "block", marginBottom: 6 }}>▼ Alert if price drops below ($)</label>
                <input className="input-field" type="number" placeholder="e.g. 240.00" value={lowAlert} onChange={(e) => setLowAlert(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#22c55e", fontFamily: "'Source Sans 3', sans-serif", display: "block", marginBottom: 6 }}>▲ Alert if price rises above ($)</label>
                <input className="input-field" type="number" placeholder="e.g. 260.00" value={highAlert} onChange={(e) => setHighAlert(e.target.value)} />
              </div>
            </div>

            {sendingAlert && (
              <div style={{ background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#c9a84c", fontFamily: "'Source Sans 3', sans-serif", marginBottom: 12 }} className="pulse">
                📨 Sending alert email...
              </div>
            )}

            {price && (lowAlert || highAlert) && (
              <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "12px 14px", fontSize: 12, fontFamily: "'Source Sans 3', sans-serif" }}>
                {lowAlert && (
                  <div style={{ color: price <= parseFloat(lowAlert) ? "#ef4444" : "#6b7280", marginBottom: 4 }}>
                    {price <= parseFloat(lowAlert) ? "🔴 TRIGGERED" : "✓ OK"} — Low threshold: ${parseFloat(lowAlert).toFixed(2)}
                  </div>
                )}
                {highAlert && (
                  <div style={{ color: price >= parseFloat(highAlert) ? "#22c55e" : "#6b7280" }}>
                    {price >= parseFloat(highAlert) ? "🟢 TRIGGERED" : "✓ OK"} — High threshold: ${parseFloat(highAlert).toFixed(2)}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Alert History */}
        <div className="card grid-2" style={{ padding: 24 }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, margin: "0 0 16px" }}>Alert History</h2>
          {alertHistory.length === 0 ? (
            <div style={{ color: "#4a5568", fontSize: 13, fontFamily: "'Source Sans 3', sans-serif", textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🔔</div>
              No alerts triggered yet.
              <br />Set thresholds and enable alerts to get started.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {alertHistory.map((a, i) => (
                <div key={i} style={{
                  background: a.type === "low" ? "rgba(239,68,68,0.08)" : "rgba(34,197,94,0.08)",
                  border: `1px solid ${a.type === "low" ? "rgba(239,68,68,0.2)" : "rgba(34,197,94,0.2)"}`,
                  borderRadius: 8, padding: "10px 12px", fontSize: 12, fontFamily: "'Source Sans 3', sans-serif",
                }}>
                  <div style={{ fontWeight: 500, marginBottom: 2 }}>{a.msg}</div>
                  <div style={{ color: "#4a5568" }}>{a.time}</div>
                </div>
              ))}
            </div>
          )}
          {alertHistory.length > 0 && (
            <button className="btn-secondary" style={{ marginTop: 12, width: "100%", fontSize: 12 }} onClick={() => setAlertHistory([])}>
              Clear History
            </button>
          )}
        </div>

        <div style={{ gridColumn: "1 / -1", textAlign: "center", fontFamily: "'Source Sans 3', sans-serif", fontSize: 11, color: "#374151", paddingTop: 4 }}>
          Prices fetched via live web search · Auto-refreshes per your interval · Alerts open your email or messaging app
        </div>
      </div>
    </div>
  );
}
