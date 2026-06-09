import * as React from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AppLayout } from "@/shell/AppLayout";
import { useAuthStore } from "@/state/authStore";

import { DashboardRoute } from "@/routes/dashboard.route";
import { LoginRoute } from "@/routes/login.route";
import { ClientLogin } from "@/features/login/ClientLogin";
import { AuthCallbackRoute } from "@/routes/authCallback.route";
import { ClientVerifyRoute } from "@/routes/clientVerify.route";
import { UploadRoute } from "@/routes/upload.route";
import { ReportRoute } from "@/routes/report.route";
import { FindingsRoute } from "@/routes/findings.route";
import { FindingDetailRoute } from "@/routes/findingDetail.route";
import { EngagementRoute } from "@/routes/engagement.route";

// V1 audit portal routes — full clickable set landed.
// Routable:  /login · /dashboard · /upload · /report · /findings · /findings/:rank · /engagement
// Coming:    /admin/* (Jera-side surface, Phase 1)

function RequireAuth() {
  const actor = useAuthStore((s) => s.actor);
  if (!actor) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}

// Admin-only gate (R1). Non-admins are redirected to the dashboard with no
// error surface — the absence of the admin nav is the only signal (a 403 page
// would advertise the route). The backend independently enforces admin access
// on every admin API route; this is UI gating only. Used by the Unit 9 admin
// route.
export function RequireAdmin() {
  const actor = useAuthStore((s) => s.actor);
  if (!actor) {
    return <Navigate to="/login" replace />;
  }
  if (!actor.isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
}

// Client-portal build (VITE_AUTH=client) uses the passwordless client login;
// otherwise the staff Microsoft login. Build-time literal so the unused login
// surface tree-shakes out.
const IS_CLIENT_PORTAL = import.meta.env.VITE_AUTH === "client";

export function Router() {
  return (
    <Routes>
      <Route
        path="/login"
        element={IS_CLIENT_PORTAL ? <ClientLogin /> : <LoginRoute />}
      />
      <Route path="/auth/callback" element={<AuthCallbackRoute />} />
      <Route path="/auth/verify" element={<ClientVerifyRoute />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardRoute />} />
          <Route path="/upload" element={<UploadRoute />} />
          <Route path="/report" element={<ReportRoute />} />
          <Route path="/findings" element={<FindingsRoute />} />
          <Route path="/findings/:rank" element={<FindingDetailRoute />} />
          <Route path="/engagement" element={<EngagementRoute />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
