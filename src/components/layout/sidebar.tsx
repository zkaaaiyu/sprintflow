import { NavLink } from "react-router-dom"
import { LayoutDashboard, FolderKanban, ListTodo, Timer, Users } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", to: "/dashboard" },
  { icon: FolderKanban, label: "Projects", to: "/projects" },
  { icon: ListTodo, label: "Backlog", to: "/backlog" },
  { icon: Timer, label: "Sprint", to: "/sprint" },
  { icon: Users, label: "Members", to: "/members" },
]

export default function Sidebar() {
  return (
    <aside className="w-64 h-screen bg-[#F5F3EF] border-r border-border flex flex-col shrink-0">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-border">
        <span className="text-xl font-bold text-[#F97316]">SprintFlow</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-orange-100 text-[#F97316]"
                  : "text-gray-600 hover:bg-orange-50 hover:text-[#F97316]"
              )
            }
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}