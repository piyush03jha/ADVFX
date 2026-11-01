export const AUTH_COOKIE_NAME = "forma_session";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
};
