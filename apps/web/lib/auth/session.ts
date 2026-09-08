import { cookies } from "next/headers";

import { authAdapter } from "./adapter";
import { DEV_AUTH_COOKIE } from "./config";

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const sessionValue = cookieStore.get(DEV_AUTH_COOKIE)?.value;

  return sessionValue ? authAdapter.getUserForSession(sessionValue) : null;
}
