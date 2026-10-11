import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

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
