import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import PageShell from "../components/PageShell";
import { signup } from "../api/auth";
import { useAuth } from "../auth/AuthProvider";

function getPasswordValidationError(password: string) {
  if (password.length < 8) {
    return "Password must be at least 8 characters long.";
  }

  if (!/[a-z]/.test(password)) {
    return "Password must include a lowercase letter.";
  }

  if (!/[A-Z]/.test(password)) {
    return "Password must include an uppercase letter.";
  }

  if (!/\d/.test(password)) {
    return "Password must include a number.";
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    return "Password must include a symbol.";
  }

  return null;
}

export default function SignupPage() {
  const { isAuthenticated, setAuthState } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
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

    if (!displayName.trim() || !email.trim() || !username.trim() || !password) {
      setError("Please enter your display name, email, username, and password.");
      return;
    }

    const passwordError = getPasswordValidationError(password);

    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await signup({
        email: email.trim().toLowerCase(),
        username: username.trim(),
        display_name: displayName.trim(),
        password,
      });

      if (res.session?.access_token) {
        setAuthState({
          user: {
            ...res.user,
            group_id: res.user.group_id ?? null,
          },
          session: res.session,
        });
        navigate("/app/dashboard");
        return;
      }

      navigate("/login", {
        replace: true,
        state: {
          message: "Account created. Please log in with your new username or email.",
        },
      });
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
            <div className="space-y-1.5">
              <label htmlFor="signup-display-name" className="text-sm font-medium text-[rgb(var(--app-ink))]">
                Display name
              </label>
              <input
                id="signup-display-name"
                className="app-input"
                placeholder="Display name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoComplete="nickname"
                aria-invalid={Boolean(error && !displayName.trim())}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="signup-email" className="text-sm font-medium text-[rgb(var(--app-ink))]">
                Email
              </label>
              <input
                id="signup-email"
                className="app-input"
                placeholder="Email address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                aria-invalid={Boolean(error && !email.trim())}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="signup-username" className="text-sm font-medium text-[rgb(var(--app-ink))]">
                Username
              </label>
              <input
                id="signup-username"
                className="app-input"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                aria-invalid={Boolean(error && !username.trim())}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="signup-password" className="text-sm font-medium text-[rgb(var(--app-ink))]">
                Password
              </label>
              <input
                id="signup-password"
                className="app-input"
                placeholder="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                aria-invalid={Boolean(error && password.length > 0 && getPasswordValidationError(password))}
              />
              <p className="text-xs text-gray-500">
                Use at least 8 characters with upper and lower case letters, a number, and a symbol.
              </p>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="signup-confirm-password" className="text-sm font-medium text-[rgb(var(--app-ink))]">
                Confirm password
              </label>
              <input
                id="signup-confirm-password"
                className="app-input"
                placeholder="Confirm password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                aria-invalid={Boolean(error && confirmPassword.length > 0 && password !== confirmPassword)}
              />
            </div>
            <button
              type="submit"
              className="app-button-primary w-full"
              disabled={submitting}
            >
              {submitting ? "Creating account..." : "Create account"}
            </button>

            {error && (
              <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert" aria-live="polite">
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
