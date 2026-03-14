import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
} from "react-router-dom";
import { ProtectedApp } from "@/components/protected-app";
import HomePage from "@/app/page";
import PricingPage from "@/app/pricing/page";
import LoginPage from "@/app/login/page";
import SignupPage from "@/app/signup/page";
import ForgotPasswordPage from "@/app/forgot-password/page";
import ResetPasswordPage from "@/app/reset-password/page";
import DashboardPage from "@/app/app/dashboard/page";
import OrganizationsPage from "@/app/app/organizations/page";
import ProjectsPage from "@/app/app/projects/page";
import ProjectDetailsPage from "@/app/app/projects/[id]/page";
import TasksPage from "@/app/app/tasks/page";
import ClientsPage from "@/app/app/clients/page";
import MembersPage from "@/app/app/members/page";
import BillingPage from "@/app/app/billing/page";
import AuditPage from "@/app/app/audit/page";
import ProfilePage from "@/app/app/profile/page";

function ProtectedLayout() {
  return (
    <ProtectedApp>
      <Outlet />
    </ProtectedApp>
  );
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        <Route
          path="/dashboard"
          element={<Navigate to="/app/dashboard" replace />}
        />

        <Route path="/app" element={<ProtectedLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="organizations" element={<OrganizationsPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="projects/:id" element={<ProjectDetailsPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="clients" element={<ClientsPage />} />
          <Route path="members" element={<MembersPage />} />
          <Route path="billing" element={<BillingPage />} />
          <Route path="audit" element={<AuditPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
