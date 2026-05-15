import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import DashboardPage from "./pages/DashboardPage"
import ProjectsPage from "@/pages/ProjectsPage"
import BacklogPage from "@/pages/BacklogPage"
import SprintPage from "@/pages/SprintPage"
import MembersPage from "@/pages/MembersPage"
import Sidebar from "./components/layout/sidebar"
export default function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen">
        {/* 渲染sider bar組件 */}
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <Routes>  {/* 路由配置 */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/backlog" element={<BacklogPage />} />
            <Route path="/sprint" element={<SprintPage />} />
            <Route path="/members" element={<MembersPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}