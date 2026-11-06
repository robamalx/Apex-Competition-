import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';

export const metadata: Metadata = {
  title: 'APEX ARENA — Fantasy Sports & Tournament Forecasting',
  description: 'The premier fantasy tournament and sports forecasting platform.',
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const publishableKey =
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
    'pk_test_aGFwcHktbW9vc2UtOTIyNi5jbGVyay5hY2NvdW50cy5kZXYk';

  return (
    <ClerkProvider publishableKey={publishableKey}>
      <html lang="en" className="dark">
        <body className="bg-gray-950 text-white min-h-screen antialiased">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
