import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { to, ticker, price, alertType, threshold } = await request.json();

    if (!to || !ticker || !price || !alertType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing Resend API key" }, { status: 500 });
    }

    const isLow = alertType === "low";
    const emoji = isLow ? "🔴" : "🟢";
    const direction = isLow ? "dropped below" : "risen above";
    const color = isLow ? "#ef4444" : "#22c55e";
    const subject = `${emoji} Vanguard Alert: ${ticker} has ${direction} $${threshold}`;

    const html = `
      <div style="font-family: Georgia, serif; max-width: 520px; margin: 0 auto; background: #0f1923; color: #e8dcc8; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #1a2a3a, #0f1923); padding: 32px 32px 24px;">
          <p style="margin: 0 0 4px; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: #c9a84c;">Vanguard Price Monitor</p>
          <h1 style="margin: 0; font-size: 28px; color: #e8dcc8;">${emoji} Price Alert</h1>
        </div>
        <div style="padding: 24px 32px;">
          <p style="margin: 0 0 20px; font-size: 16px; color: #9ca3af;">
            <strong style="color: #e8dcc8;">${ticker}</strong> has ${direction} your alert threshold.
          </p>
          <div style="display: flex; gap: 16px; margin-bottom: 24px;">
            <div style="flex: 1; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 16px;">
              <p style="margin: 0 0 4px; font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">Current Price</p>
              <p style="margin: 0; font-size: 32px; font-weight: 700; color: ${color};">$${Number(price).toFixed(2)}</p>
            </div>
            <div style="flex: 1; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 16px;">
              <p style="margin: 0 0 4px; font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">Your Threshold</p>
              <p style="margin: 0; font-size: 32px; font-weight: 700; color: #c9a84c;">$${Number(threshold).toFixed(2)}</p>
            </div>
          </div>
          <p style="margin: 0; font-size: 12px; color: #4a5568;">Sent at ${new Date().toLocaleString("en-US", { timeZone: "America/New_York" })} ET</p>
        </div>
      </div>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: "Vanguard Tracker <alerts@resend.dev>",
        to: [to],
        subject,
        html,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({ error: data.message || "Failed to send email" }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data.id });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
