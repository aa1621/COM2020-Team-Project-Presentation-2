import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

export default function HomePage() {
  const { user } = useAuth();

  if (user) {
    return <Navigate to="/app/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(187,247,208,0.8),_transparent_35%),linear-gradient(180deg,_#f7fee7_0%,_#ffffff_55%,_#f9fafb_100%)] text-gray-900">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8">
        <header className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">
              Campus Carbon
            </div>
            <div className="text-xs text-gray-500">Student sustainability tracker</div>
          </div>
          <div className="flex gap-3">
            <Link
              to="/login"
              className="rounded-xl border border-gray-200 bg-white/80 px-4 py-2 text-sm text-gray-700 hover:bg-white"
            >
              Log in
            </Link>
            <Link
              to="/signup"
              className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              Create account
            </Link>
          </div>
        </header>

        <main className="grid flex-1 items-center gap-12 py-12 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="space-y-8">
            <div className="space-y-5">
              <div className="inline-flex rounded-full border border-emerald-200 bg-white/70 px-4 py-2 text-xs font-medium text-emerald-800">
                University of Exeter group project
              </div>
              <h1 className="max-w-3xl text-5xl font-semibold leading-tight tracking-tight text-gray-950">
                Log low-carbon actions, join a group, and see your progress in one place.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-gray-600">
                Use the dashboard to track recent activity, join groups and challenges, earn
                badges, and level up your pet as you keep logging actions.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/signup"
                className="rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-medium text-white hover:bg-emerald-500"
              >
                Start your account
              </Link>
              <Link
                to="/login"
                className="rounded-2xl border border-gray-200 bg-white px-6 py-3 text-sm font-medium text-gray-800 hover:bg-gray-50"
              >
                I already have an account
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/70 bg-white/75 p-5 shadow-sm">
                <div className="text-xs font-medium uppercase tracking-wide text-emerald-700">
                  Missions
                </div>
                <div className="mt-2 text-sm text-gray-700">
                  Log actions like cycling, vegetarian meals, and low-waste choices.
                </div>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/75 p-5 shadow-sm">
                <div className="text-xs font-medium uppercase tracking-wide text-emerald-700">
                  Teams
                </div>
                <div className="mt-2 text-sm text-gray-700">
                  Join a group and compete on shared points and carbon savings.
                </div>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/75 p-5 shadow-sm">
                <div className="text-xs font-medium uppercase tracking-wide text-emerald-700">
                  Transparency
                </div>
                <div className="mt-2 text-sm text-gray-700">
                  See the assumptions and confidence behind each carbon estimate.
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-emerald-100 bg-white/80 p-6 shadow-xl shadow-emerald-100/40 backdrop-blur">
            <div className="rounded-[1.5rem] bg-gray-950 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-emerald-300">
                    In the app
                  </div>
                  <div className="mt-2 text-2xl font-semibold">What you can do</div>
                </div>
                <div className="rounded-2xl bg-white/10 px-3 py-2 text-xs text-emerald-100">
                  Real data
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-white/10 p-4">
                  <div className="text-xs text-gray-300">Dashboard</div>
                  <div className="mt-2 text-lg font-medium">Review your recent activity</div>
                  <div className="mt-1 text-xs text-gray-300">See actions, badges, charts, and your pet status</div>
                </div>
                <div className="rounded-2xl bg-emerald-500/15 p-4">
                  <div className="text-xs text-emerald-100">Challenges</div>
                  <div className="mt-2 text-lg font-medium">Join personal or group tasks</div>
                  <div className="mt-1 text-xs text-emerald-100/80">Some submissions can include notes or image evidence</div>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3 text-sm">
                  <span>Groups</span>
                  <span className="font-medium text-emerald-200">Join one, invite people, or leave</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3 text-sm">
                  <span>Leaderboards</span>
                  <span className="font-medium text-emerald-200">Compare users and groups by points</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3 text-sm">
                  <span>Pet and shop</span>
                  <span className="font-medium text-emerald-200">Buy items, equip them, and keep the pet active</span>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
