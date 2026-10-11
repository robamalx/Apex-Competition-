import './globals.css';
import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';

export const metadata: Metadata = {
  title: 'Apex Arena App',
  description: 'Full-stack application with Clerk authentication',
};

const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || 'pk_test_Y2xlcmstY29tbXVuaXR5LmNsa2Rldi5uZXQk';

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <ClerkProvider publishableKey={publishableKey}>
      <html lang="en">
        <body className="bg-slate-950 text-slate-100 min-h-screen">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}


