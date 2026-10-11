import './globals.css';
import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { ClerkProvider, Show, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';
import { AdminMenu } from '../src/components/AdminMenu';

export const metadata: Metadata = {
  title: 'Apex Arena App',
  description: 'Full-stack application with Clerk authentication',
};

const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || 'pk_test_Y2xlcmstY29tbXVuaXR5LmNsa2Rldi5uZXQk';

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { sessionClaims } = await auth();
  const metadataRole = (sessionClaims?.metadata as any)?.role || (sessionClaims?.publicMetadata as any)?.role;
  const isAdmin = metadataRole === 'admin' || metadataRole === 'ADMIN' || metadataRole === 'SUPER_ADMIN';

  return (
    <ClerkProvider publishableKey={publishableKey}>
      <html lang="en">
        <body className="bg-slate-950 text-slate-100 min-h-screen">
          <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur px-4 py-3 flex items-center justify-between sticky top-0 z-50">
            <div className="flex items-center gap-4">
              <a href="/" className="font-extrabold text-lg text-white tracking-wider">
                APEX<span className="text-emerald-400">ARENA</span>
              </a>
              {isAdmin && <AdminMenu href="/admin" />}
            </div>
            <div className="flex items-center gap-3">
              <Show when="signed-out">
                <SignInButton mode="modal">
                  <button className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors">
                    Sign In
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors">
                    Sign Up
                  </button>
                </SignUpButton>
              </Show>
              <Show when="signed-in">
                {isAdmin && <AdminMenu href="/admin" />}
                <UserButton />
              </Show>
            </div>
          </header>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}

