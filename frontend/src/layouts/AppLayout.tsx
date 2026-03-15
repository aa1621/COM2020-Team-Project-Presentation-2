import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen px-4 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto max-w-7xl">
        <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen((open) => !open)} />

        <main className="min-w-0 pl-14 sm:pl-20">
          <div className="app-card mb-5 px-4 py-3">
            <div>
              <div className="text-sm font-semibold text-[rgb(var(--app-ink))]">Campus Carbon</div>
              <div className="text-xs app-muted">Climate actions, challenges, and pet progress</div>
            </div>
          </div>

          <div className="space-y-7">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
