# Apex Arena — Foundational Cloudflare Pages & Next.js App Router Architecture

Implement the foundational Next.js App Router, Tailwind CSS, Clerk authentication, and Cloudflare Pages architecture for **Apex Arena** — a premier fantasy tournament and sports forecasting platform.

## User Review & Critical Decisions

> [!IMPORTANT]
> The foundational architecture directly targets Cloudflare Pages Edge runtime with Clerk authentication:
> - **Edge Runtime Compatibility**: Every dynamic page route will explicitly declare `export const runtime = 'edge';` to prevent Cloudflare Pages compilation and bundle failures.
> - **Cloudflare Environment (`wrangler.toml`)**: Node.js compatibility flags and Clerk public environment keys defined without exposing server-only secrets.
> - **Route Protection (`middleware.ts`)**: Clerk route matcher configured to protect `/dashboard(.*)` and `/admin(.*)` while keeping root `/` and authentication callbacks public.

- **Confirmed Decision 1**: Standard Cloudflare Pages configuration with `compatibility_flags = ["nodejs_compat"]`.
- **Confirmed Decision 2**: Clerk authentication provider in `app/layout.tsx` with explicit `publishableKey` fallback to ensure seamless client hydration in Edge environments.
- **Confirmed Decision 3**: Responsive landing page in `app/page.tsx` with conditional `<SignedIn>` / `<SignedOut>` authentication flows and green high-contrast visual styling.

---

## 1. Overview & Core Concept

- **What It Does**: Establishes the core skeleton for Apex Arena, providing Cloudflare deployment configuration, authentication routing guards, global theme scaffolding, and a hero landing page with active session awareness.
- **Target Audience**: Sports forecasting enthusiasts and fantasy tournament players.
- **Key Value**: Provides an instantaneous, rock-solid Cloudflare Edge runtime foundation with zero-latency authentication state evaluation.

---

## 2. User Experience & Visual Design

- **Landing Page Presentation (`app/page.tsx`)**:
  - **Hero Header**: "APEX ARENA" headline rendered in bold athletic typography (`text-green-500 font-extrabold text-4xl sm:text-6xl tracking-wider`).
  - **Tagline**: "The premier fantasy tournament and sports forecasting platform." rendered in high-legibility zinc/gray (`text-gray-400 text-base sm:text-lg max-w-md`).
  - **Guest Experience (`<SignedOut>`)**: Two distinct action buttons:
    - *Sign In* (`/sign-in`): Subtle border button (`border border-gray-700 hover:border-gray-500 text-gray-200 px-6 py-2.5 rounded-lg`).
    - *Create Account* (`/sign-up`): High-emphasis emerald CTA (`bg-green-600 hover:bg-green-500 text-white font-bold px-6 py-2.5 rounded-lg`).
  - **Member Experience (`<SignedIn>`)**: Single direct action button:
    - *Enter Arena Dashboard* (`/dashboard`): Bold green action card (`bg-green-500 hover:bg-green-400 text-gray-950 font-black px-8 py-3 rounded-xl shadow-lg shadow-green-500/20`).

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Edge Runtime (`export const runtime = 'edge'`)**
  - *Chosen Approach*: Enforce Edge runtime on all dynamic routes.
  - *Why*: Cloudflare Pages builds run within V8 isolate workers; Node.js server runtimes cause immediate build breakages on Pages.
- **Decision 2: Clerk Middleware Route Matcher**
  - *Chosen Approach*: Use `@clerk/nextjs/server` with `clerkMiddleware` and `createRouteMatcher(['/dashboard(.*)', '/admin(.*)'])`.
  - *Why*: Accurately isolates authenticated tournament surfaces from the public marketing front door without unnecessary redirects for public visitors.
- **Decision 3: Publishable Key Fallback on `<ClerkProvider>`**
  - *Chosen Approach*: Pass `publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}` directly to the provider in `app/layout.tsx`.
  - *Why*: Guarantees that Cloudflare Edge worker environments always have access to the public key even when standard process env injection differs slightly between SSR and client hydration.

---

## 4. Technical Architecture & File Delivery Plan

```
┌─────────────────────────────────────────────────────────────┐
│                      wrangler.toml                          │
│     Cloudflare Pages Config + nodejs_compat + Public Vars   │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                      middleware.ts                          │
│     Clerk Edge Auth Middleware: Protect /dashboard, /admin  │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                     app/layout.tsx                          │
│     Root Layout + ClerkProvider + Dark Theme (bg-gray-950)  │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                      app/page.tsx                           │
│     Edge Landing Page + SignedIn/SignedOut Conditional CTAs │
└─────────────────────────────────────────────────────────────┘
```

### Proposed Changes

#### Foundational Files to Generate:
1. `wrangler.toml`:
   - Configures Pages build for `apex-arena`.
   - Declares `compatibility_flags = ["nodejs_compat"]` and `compatibility_date = "2024-09-23"`.
   - Defines `[vars]` block with `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, sign-in, and redirect URLs.
2. `middleware.ts`:
   - Protects `/dashboard` and `/admin` routes using Clerk's `createRouteMatcher`.
   - Excludes static files, Next internals, and public endpoints.
3. `app/layout.tsx`:
   - Wraps children in `<ClerkProvider publishableKey={...}>`.
   - Configures HTML metadata and applies `bg-gray-950 text-white min-h-screen`.
4. `app/page.tsx`:
   - Declares `export const runtime = 'edge';`.
   - Implements centered layout with athletic typography, `<SignedOut>` links, and `<SignedIn>` dashboard entry.

---

## Verification Plan

### Automated Build Verification:
- Run `compile_applet` to verify zero TypeScript errors and Next.js / Clerk bundle validity.
- Ensure all imports (`@clerk/nextjs`, `next/link`) resolve cleanly with existing dependencies.
