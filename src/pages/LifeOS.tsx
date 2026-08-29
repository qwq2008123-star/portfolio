import { Navigate, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";
import { OSProvider, useOS } from "../lifeos/store/OSContext";
import Shell from "../lifeos/components/Shell";
import Login from "../lifeos/pages/Login";
import Onboarding from "../lifeos/pages/Onboarding";
import Dashboard from "../lifeos/pages/Dashboard";
import ProfilePage from "../lifeos/pages/ProfilePage";
import SimulatorPage from "../lifeos/pages/SimulatorPage";
import DecisionsPage from "../lifeos/pages/DecisionsPage";
import CompanionPage from "../lifeos/pages/CompanionPage";
import NetworkPage from "../lifeos/pages/NetworkPage";

// ─── /life-os 路由中枢：认证门卫 + 应用壳 + 模块路由 ───

/** 已登录但未建档 → 强制进入 Onboarding（数据闭环的起点） */
function Gate({ children }: { children: ReactNode }) {
  const { state } = useOS();

  if (!state.account) return <Navigate to="/life-os/login" replace />;
  if (!state.profile) return <Navigate to="/life-os/onboarding" replace />;
  return children;
}

function RequireAccount({ children }: { children: ReactNode }) {
  const { state } = useOS();
  if (!state.account) return <Navigate to="/life-os/login" replace />;
  return children;
}

/** 布局路由：认证 + 应用壳 */
function AppLayout() {
  return (
    <Gate>
      <Shell />
    </Gate>
  );
}

export default function LifeOS() {
  return (
    <OSProvider>
      <Routes>
        <Route path="login" element={<Login />} />
        <Route
          path="onboarding"
          element={
            <RequireAccount>
              <Onboarding />
            </RequireAccount>
          }
        />
        <Route element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="simulator" element={<SimulatorPage />} />
          <Route path="decisions" element={<DecisionsPage />} />
          <Route path="companion" element={<CompanionPage />} />
          <Route path="network" element={<NetworkPage />} />
          <Route path="*" element={<Navigate to="/life-os" replace />} />
        </Route>
      </Routes>
    </OSProvider>
  );
}
