import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import AppLayout from "@/components/layout/AppLayout"
import LoginPage from "@/pages/LoginPage"
import RegisterPage from "@/pages/RegisterPage"
import DashboardPage from "@/pages/DashboardPage"
import ProjectsPage from "@/pages/ProjectsPage"
import ProjectDetailPage from "./pages/ProjectDetailPage"
import SprintKanbanPage from "./pages/SprintKanbanPage"
import SettingsPage from "./pages/SettingsPage"
import SeedPage from "./pages/SeedPage"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:projectId" element={<ProjectDetailPage />} />  {/*  :projectId params 查詢參數的佔位符 */}
          <Route path="/projects/:projectId/sprints/:sprintId" element={<SprintKanbanPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/seed" element={<SeedPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}