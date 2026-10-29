import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AgentSLA — Autonomous Multi-Agent Settlement Protocol',
  description: 'Programmable fiat escrow, semantic SLA verification, and PayPal settlements for AI agents',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0B0F19] text-gray-100 antialiased selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
