import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";

import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ProfilePage from "./pages/ProfilePage";
import GroupsPage from "./pages/GroupsPage";
import ChallengesPage from "./pages/ChallengesPage";
import LogActionPage from "./pages/LogActionPage";
import LeaderboardsPage from "./pages/LeaderboardsPage";
import HomePage from "./pages/HomePage";
import ModerationPage from "./pages/ModerationPage";
import RequireAuth from "./auth/RequireAuth";
import SignupPage from "./pages/SignupPage";
import PetsPage from "./pages/PetsPage";
import ShopPage from "./pages/ShopPage";

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/home" element={<HomePage />} />
      <Route path="/" element={<HomePage />} />

      {/* Protected - RequireAuth redirects to /login if not authenticated */}
      <Route element={<RequireAuth />}>
        <Route path="/app" element={<AppLayout />}>
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="groups" element={<GroupsPage />} />
          <Route path="challenges" element={<ChallengesPage />} />
          <Route path="moderation" element={<ModerationPage />} />
          <Route path="log-action" element={<LogActionPage />} />
          <Route path="leaderboards" element={<LeaderboardsPage />} />
          <Route path="pets" element={<PetsPage />} />
          <Route path="shop" element={<ShopPage />} />
          <Route index element={<Navigate to="/app/dashboard" replace />} />
        </Route>
      </Route>

      {/* was going to redirect / to login but homepage works better for first-time visitors */}
      {/*<Route path="/" element={<Navigate to="/login" replace />} /> */}
      <Route path="*" element={<div className="p-6">Not found</div>} />
    </Routes>
  );
}
