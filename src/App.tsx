import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import AppLayout from "@/components/layout/AppLayout"
import LoginPage from "@/pages/LoginPage"
import RegisterPage from "@/pages/RegisterPage"
import DashboardPage from "@/pages/DashboardPage"
import ProjectsPage from "@/pages/ProjectsPage"
import BacklogPage from "@/pages/BacklogPage"
import SprintPage from "@/pages/SprintPage"
import MembersPage from "@/pages/MembersPage"

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
          <Route path="/backlog" element={<BacklogPage />} />
          <Route path="/sprint" element={<SprintPage />} />
          <Route path="/members" element={<MembersPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}