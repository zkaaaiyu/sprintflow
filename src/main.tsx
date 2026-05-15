import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { AuthProvider } from "@/contexts/AuthContext"
import { Toaster } from "@/components/ui/sonner"
import "./index.css"
import App from "./App.tsx"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
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
    </AuthProvider>
  </StrictMode>
)