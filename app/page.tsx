export const runtime = 'edge';

import Link from 'next/link';
import { SignedIn, SignedOut } from '@clerk/nextjs';

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-16 text-center">
      <div className="max-w-2xl mx-auto flex flex-col items-center justify-center space-y-6">
        <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight text-green-500">
          APEX ARENA
        </h1>
        
        <p className="text-gray-400 text-lg sm:text-xl max-w-lg font-medium leading-relaxed">
          The premier fantasy tournament and sports forecasting platform.
        </p>

        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
          <SignedOut>
            <Link
              href="/sign-in"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl border border-gray-700 hover:border-gray-500 bg-gray-900/60 hover:bg-gray-800 text-gray-200 font-semibold transition-all duration-200"
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold transition-all duration-200 shadow-lg shadow-green-600/25"
            >
              Create Account
            </Link>
          </SignedOut>

          <SignedIn>
            <Link
              href="/dashboard"
              className="w-full sm:w-auto px-10 py-3.5 rounded-xl bg-green-500 hover:bg-green-400 text-gray-950 font-black tracking-wide transition-all duration-200 shadow-xl shadow-green-500/20"
            >
              Enter Arena Dashboard
            </Link>
          </SignedIn>
        </div>
      </div>
    </main>
  );
}
