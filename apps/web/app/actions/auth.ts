"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { authAdapter } from "../../lib/auth/adapter";
import {
  DEV_AUTH_COOKIE,
  isDevelopmentAuthEnabled,
} from "../../lib/auth/config";

export async function signInAsDevelopmentUser() {
  const user = await authAdapter.getDevelopmentUser();

  if (!isDevelopmentAuthEnabled() || !user) {
    redirect("/login?state=unavailable");
  }

  const cookieStore = await cookies();
  cookieStore.set(DEV_AUTH_COOKIE, user.id, {
    httpOnly: true,
    maxAge: 60 * 60 * 8,
    path: "/",
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });

  redirect("/world");
}

export async function signOut() {
  const cookieStore = await cookies();
  cookieStore.delete(DEV_AUTH_COOKIE);
  redirect("/login");
}
