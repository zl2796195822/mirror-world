export const DEV_AUTH_COOKIE = "mirror_dev_session";

export const DEVELOPMENT_USER = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "dev@mirror.local",
  status: "ACTIVE",
} as const;

export function isDevelopmentAuthEnabled() {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.MIRROR_DEV_AUTH === "true"
  );
}
