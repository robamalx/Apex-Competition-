import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_Y2xlcmstY29tbXVuaXR5LmNsa2Rldi5uZXQk';
}
if (!process.env.CLERK_SECRET_KEY) {
  process.env.CLERK_SECRET_KEY = 'sk_test_dummy_secret_key_for_development_environment_123456789';
}

// Define the routes you want to protect
const isProtectedRoute = createRouteMatcher(["/dashboard(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  // Next.js 15 requires auth to be awaited
  if (isProtectedRoute(req)) {
    await auth.protect();
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
