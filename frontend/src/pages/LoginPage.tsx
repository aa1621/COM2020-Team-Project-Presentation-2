import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import PageShell from "../components/PageShell";
import { login } from "../api/auth";
import { useAuth } from "../auth/AuthProvider";

export default function LoginPage() {
  const { isAuthenticated, setAuthState } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const signupMessage =
    typeof location.state === "object" &&
    location.state &&
    "message" in location.state &&
    typeof location.state.message === "string"
      ? location.state.message
      : null;
  const nextPath = (() => {
    const params = new URLSearchParams(location.search);
    const next = params.get("next");
    return next && next.startsWith("/") ? next : "/app/dashboard";
  })();

  if (isAuthenticated) {
    return <Navigate to="/app/dashboard" replace />;
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!identifier.trim() || !password) {
      setError("Please enter your username or email and password.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await login({
        identifier: identifier.trim().toLowerCase(),
        password,
      });

      if (!res.session?.access_token) {
        throw new Error("Login succeeded but no session token was returned.");
      }

      setAuthState({
        user: {
          ...res.user,
          group_id: res.user.group_id ?? null,
        },
        session: res.session,
      });
      navigate(nextPath, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50/40 to-white p-6">
      <div className="mx-auto max-w-md rounded-2xl border border-gray-100 bg-white/80 p-6 shadow-sm">
        <PageShell
          title="Log in"
          subtitle="Pick up where you left off and keep your carbon challenge going."
        >
          <form className="space-y-3" onSubmit={onSubmit}>
            <div className="space-y-1.5">
              <label htmlFor="login-identifier" className="text-sm font-medium text-[rgb(var(--app-ink))]">
                Username or email
              </label>
              <input
                id="login-identifier"
                className="app-input"
                placeholder="Username or email"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoComplete="username"
                aria-invalid={Boolean(error && !identifier.trim())}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="login-password" className="text-sm font-medium text-[rgb(var(--app-ink))]">
                Password
              </label>
              <input
                id="login-password"
                className="app-input"
                placeholder="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                aria-invalid={Boolean(error && !password)}
              />
            </div>

            <button
              type="submit"
              className="app-button-primary w-full"
              disabled={submitting}
            >
              {submitting ? "Signing in..." : "Sign in"}
            </button>

            {error && (
              <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert" aria-live="polite">
                {error}
              </div>
            )}
            {signupMessage && !error && (
              <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700" role="status" aria-live="polite">
                {signupMessage}
              </div>
            )}

            <p className="text-xs text-gray-500">
              Need an account?{" "}
              <Link to="/signup" className="font-medium text-emerald-700 hover:text-emerald-600">
                Create one here
              </Link>
              .
            </p>
          </form>
        </PageShell>
      </div>
    </div>
  );
}
