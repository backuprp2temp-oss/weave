import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";

export async function getCurrentSession() {
  const session = await getServerSession(authOptions);
  return session;
}

export async function requireAuth() {
  const session = await getCurrentSession();
  if (!session?.user) {
    redirect("/login");
  }
  return session;
}

export async function isAuthenticated() {
  const session = await getCurrentSession();
  return !!session?.user;
}

export function getGitHubToken(session: any): string {
  if (!session?.accessToken) {
    throw new Error("Not authenticated");
  }
  return session.accessToken as string;
}
