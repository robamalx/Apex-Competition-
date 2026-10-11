import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_Y2xlcmstY29tbXVuaXR5LmNsa2Rldi5uZXQk';
}
if (!process.env.CLERK_SECRET_KEY) {
  process.env.CLERK_SECRET_KEY = 'sk_test_dummy_secret_key_for_development_environment_123456789';
}

// Define protected route matchers
const isProtectedRoute = createRouteMatcher(["/dashboard(.*)"]);
const isAdminRoute = createRouteMatcher(["/admin(.*)", "/api/admin(.*)"]);
const isStaffRoute = createRouteMatcher(["/staff(.*)", "/api/staff(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  // Next.js 15 requires auth to be awaited
  if (isProtectedRoute(req)) {
    await auth.protect();
  }

  // Admin route protection using Clerk publicMetadata / sessionClaims
  if (isAdminRoute(req)) {
    const authData = await auth();
    if (!authData.userId) {
      await auth.protect();
    }
    const role =
      (authData.sessionClaims?.metadata as any)?.role ||
      (authData.sessionClaims?.publicMetadata as any)?.role ||
      (authData.sessionClaims as any)?.role;

    const isAdmin = role === 'admin' || role === 'ADMIN' || role === 'SUPER_ADMIN';
    if (!isAdmin) {
      if (req.nextUrl.pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }
      return NextResponse.redirect(new URL('/', req.url));
    }
  }

  // Staff route protection using Clerk publicMetadata / sessionClaims
  if (isStaffRoute(req)) {
    const authData = await auth();
    if (!authData.userId) {
      await auth.protect();
    }
    const role =
      (authData.sessionClaims?.metadata as any)?.role ||
      (authData.sessionClaims?.publicMetadata as any)?.role ||
      (authData.sessionClaims as any)?.role;

    const staffRoles = [
      'admin',
      'staff',
      'ADMIN',
      'SUPER_ADMIN',
      'COMPETITION_PUBLISHER',
      'WALLET_MANAGER',
      'PAYMENT_VERIFIER',
      'ADVERTISEMENT_MANAGER',
      'CUSTOMER_SUPPORT'
    ];
    const isStaff = staffRoles.includes(String(role));

    if (!isStaff) {
      if (req.nextUrl.pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Forbidden: Staff access required' }, { status: 403 });
      }
      return NextResponse.redirect(new URL('/', req.url));
    }
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
    // Required by Clerk for proxy health and syncing
    '/__clerk/:path*'
  ],
};
