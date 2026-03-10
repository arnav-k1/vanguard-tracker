export const metadata = {
  title: "Vanguard Price Tracker",
  description: "Live Vanguard ETF price monitor with custom alerts",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
