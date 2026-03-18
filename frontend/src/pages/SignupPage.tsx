import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import PageShell from "../components/PageShell";
import { signup } from "../api/auth";
import { useAuth } from "../auth/AuthProvider";
import { ensureGamificationState } from "../gamification/store";

export default function SignupPage() {
  const { isAuthenticated, setUser } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isAuthenticated) {
    return <Navigate to="/app/dashboard" replace />;
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password) {
      setError("Please enter a username and password.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await signup({
        username: username.trim(),
        display_name: displayName.trim() || undefined,
        password,
      });
      setUser(res.user);
      ensureGamificationState(res.user.user_id);
      navigate("/app/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create account.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/60 via-white to-gray-50 p-6">
      <div className="mx-auto max-w-md rounded-2xl border border-gray-100 bg-white/85 p-6 shadow-sm">
        <PageShell
          title="Create account"
          subtitle="Set up your player profile and jump straight into the challenge."
        >
          <form className="space-y-3" onSubmit={onSubmit}>
            <input
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm"
              placeholder="Display name (optional)"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoComplete="nickname"
            />
            <input
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
            <input
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm"
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
            <input
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm"
              placeholder="Confirm password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
            <button
              type="submit"
              className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white hover:bg-emerald-500"
              disabled={submitting}
            >
              {submitting ? "Creating account..." : "Create account"}
            </button>

            {error && (
              <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <p className="text-xs text-gray-500">
              Already registered?{" "}
              <Link to="/login" className="font-medium text-emerald-700 hover:text-emerald-600">
                Log in here
              </Link>
              .
            </p>
          </form>
        </PageShell>
      </div>
    </div>
  );
}
