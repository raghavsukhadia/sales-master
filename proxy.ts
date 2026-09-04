import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/database.types";

// Paths behind the (dashboard) route group. Route groups don't appear in
// the URL, so these are listed explicitly rather than derived from the
// filesystem.
const PROTECTED_PATHS = [
  "/dashboard",
  "/dealers",
  "/salesmen",
  "/distributors",
  "/visits",
  "/followups",
  "/followups-management",
  "/opportunities",
  "/log-visit",
  "/record-visit",
  "/visit-history",
];

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not add logic between createServerClient and getUser(): getUser()
  // is what actually refreshes/validates the session against Supabase, and
  // anything in between risks running against a stale session.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtectedPath = PROTECTED_PATHS.some(
    (path) => request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(`${path}/`),
  );

  if (isProtectedPath && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Role (admin/manager vs salesman) is checked in the (dashboard) layout,
  // not here -- that keeps a DB lookup out of every single request this
  // proxy touches, matching CLAUDE.md §42's performance guidance.
  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
