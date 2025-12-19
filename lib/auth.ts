export const runtime = "nodejs";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export async function getCurrentEmail() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  const { data } = await supabase.auth.getUser();
  return data.user?.email ?? null;
}

export async function getCurrentUser() {
  const email = await getCurrentEmail();
  if (!email) return null;
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: { email, role: Role.STUDENT },
    });
  }
  return user;
}

export async function getCurrentRole() {
  const user = await getCurrentUser();
  return user?.role ?? null;
}

export function dashboardPathForRole(role: Role) {
  switch (role) {
    case Role.ADMIN:
      return "/admin";
    case Role.HEAD_INSTRUCTOR:
      return "/head";
    case Role.INSTRUCTOR:
      return "/instructor";
    case Role.STUDENT:
    default:
      return "/student";
  }
}

export async function requireRoles(allowed: Role[]) {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  if (!allowed.includes(user.role)) {
    redirect(dashboardPathForRole(user.role));
  }

  return user;
}
