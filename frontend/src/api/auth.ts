import { apiFetch } from "./client";

export type AuthSessionPayload = {
  access_token: string;
  refresh_token: string;
  expires_at: number | null;
};

export type AuthResponse = {
  user: {
    user_id: string;
    username: string;
    display_name: string | null;
    role: string | null;
    email?: string | null;
    group_id?: string | null;
  };
  session: AuthSessionPayload | null;
  message?: string;
};

export type LoginRequest = {
  identifier: string;
  password: string;
};

export type SignupRequest = {
  email: string;
  username: string;
  display_name: string;
  password: string;
};

export function login(body: LoginRequest) {
  return apiFetch<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function signup(body: SignupRequest) {
  return apiFetch<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function logout() {
  return apiFetch<{ message: string }>("/auth/logout", {
    method: "POST",
  });
}
