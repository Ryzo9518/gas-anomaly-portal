import * as React from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AppLayout } from "@/shell/AppLayout";
import { useAuthStore } from "@/state/authStore";

import { DashboardRoute } from "@/routes/dashboard.route";
import { LoginRoute } from "@/routes/login.route";
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

export function Router() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
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
