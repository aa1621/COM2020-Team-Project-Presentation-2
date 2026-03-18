import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import PageShell from "../components/PageShell";
import { loginDemo } from "../api/auth";
import { useAuth } from "../auth/AuthProvider";

export default function LoginPage() {
  const { isAuthenticated, setUser } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isAuthenticated) {
    return <Navigate to="/app/dashboard" replace />;
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password) {
      setError("Please enter your username and password.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await loginDemo(username.trim(), password);
      setUser(res.user);
      navigate("/app/dashboard");
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
              autoComplete="current-password"
            />

            <button
              type="submit"
              className="w-full rounded-xl bg-gray-900 px-4 py-3 text-sm font-medium text-white hover:bg-gray-800"
              disabled={submitting}
            >
              {submitting ? "Signing in..." : "Sign in"}
            </button>

            {error && (
              <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                {error}
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
