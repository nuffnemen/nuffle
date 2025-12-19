import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

type Role = "ADMIN" | "HEAD_INSTRUCTOR" | "INSTRUCTOR" | "STUDENT" | null;

const PUBLIC_PATHS = new Set(["/", "/me", "/create-account"]);

const ROLE_RULES: { prefix: string; roles: Role[] }[] = [
  { prefix: "/student", roles: ["STUDENT"] },
  { prefix: "/instructor", roles: ["INSTRUCTOR", "HEAD_INSTRUCTOR", "ADMIN"] },
  { prefix: "/head", roles: ["HEAD_INSTRUCTOR", "ADMIN"] },
  { prefix: "/admin", roles: ["ADMIN"] },
];

function dashboardPath(role: Role) {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "HEAD_INSTRUCTOR":
      return "/head";
    case "INSTRUCTOR":
      return "/instructor";
    default:
      return "/student";
  }
}

function findRule(pathname: string) {
  return ROLE_RULES.find((rule) => pathname.startsWith(rule.prefix));
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return req.cookies.get(name)?.value;
        },
        set(name, value, options) {
          res.cookies.set({ name, value, ...options });
        },
        remove(name, options) {
          res.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const { data } = await supabase.auth.getUser();
  const authUser = data.user;

  const isPublic = PUBLIC_PATHS.has(pathname);

  if (!authUser) {
    if (isPublic) return res;
    return NextResponse.redirect(new URL("/", req.url));
  }

  const roleRes = await fetch(new URL("/api/session/role", req.url), {
    headers: { cookie: req.headers.get("cookie") ?? "" },
  }).catch(() => null);
  const roleJson = await roleRes?.json().catch(() => ({}));
  const role = (roleJson?.role ?? null) as Role;

  if (pathname === "/") {
    return NextResponse.redirect(new URL(dashboardPath(role), req.url));
  }

  const rule = findRule(pathname);
  if (rule && !rule.roles.includes(role)) {
    return NextResponse.redirect(new URL(dashboardPath(role), req.url));
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
