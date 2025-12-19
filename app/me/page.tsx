import { redirect } from "next/navigation";
import { dashboardPathForRole, getCurrentUser } from "@/lib/auth";

export default async function MePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  redirect(dashboardPathForRole(user.role));
}
