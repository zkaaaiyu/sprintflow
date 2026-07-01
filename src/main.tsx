//APP的啟動 負責把整個 App 掛進 HTML
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"  //用來建立根節點的
import { AuthProvider } from "@/contexts/AuthContext"  // 全域狀態容器（登入）
import { ThemeProvider } from "@/contexts/ThemeContext" // 全域狀態容器（主題）
import { Toaster } from "@/components/ui/sonner"
// @ts-ignore
import "@fontsource-variable/geist"
import "./index.css"
import App from "./App.tsx"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <ThemeProvider>
      <App />
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 2600,
          classNames: {
            toast: "bg-card border border-border shadow-lg rounded-xl font-sans justify-center",
            success: "border-l-[3px] border-l-green-500 !text-green-600",
            error: "border-l-[3px] border-l-destructive !text-destructive",
          }
        }}
      />
      </ThemeProvider>
    </AuthProvider>
  </StrictMode>
)