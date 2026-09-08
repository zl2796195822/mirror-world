import { DEVELOPMENT_USER, isDevelopmentAuthEnabled } from "./config";

export type AuthUser = {
  id: string;
  email: string;
  status: string;
};

export interface AuthAdapter {
  getUserForSession(sessionValue: string): Promise<AuthUser | null>;
  getDevelopmentUser(): Promise<AuthUser | null>;
}

const developmentAuthAdapter: AuthAdapter = {
  async getUserForSession(sessionValue) {
    if (!isDevelopmentAuthEnabled()) {
      return null;
    }

    return sessionValue === DEVELOPMENT_USER.id ? DEVELOPMENT_USER : null;
  },

  async getDevelopmentUser() {
    return isDevelopmentAuthEnabled() ? DEVELOPMENT_USER : null;
  },
};

export const authAdapter = developmentAuthAdapter;
