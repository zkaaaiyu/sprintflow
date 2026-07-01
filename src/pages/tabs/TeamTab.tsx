import { useState } from "react"
import { Download, UserMinus, AlertCircle } from "lucide-react"
import { useMembers } from "@/hooks/useMembers"
import { useAuth } from "@/contexts/AuthContext"
import type { Project } from "@/hooks/useWorkspace"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { avatarColor } from "@/lib/utils"

export default function TeamTab({ project, onRemoveMember }: {
  project: Project
  onRemoveMember: (uid: string) => void
}) {
  const { user } = useAuth()
  const { members, loading } = useMembers(project.memberIds)
  const isOwner = project.ownerId === user?.uid
  const [confirmUid, setConfirmUid] = useState<string | null>(null) // 記錄「要移除哪個成員」的 uid

  const confirmTarget = members.find((m) => m.uid === confirmUid)// 從 members 裡找出要被移除的那個人的完整資料用來顯示displayname 

  if (loading) return <div className="text-muted-foreground text-sm py-8 text-center">Loading...</div>

  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden min-h-[calc(100vh-180px)]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <span className="font-semibold text-sm">Project Collaborators</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            {members.length} Members
          </span>
        </div>
        <button
          onClick={() => toast.info("Coming soon")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border border-border text-muted-foreground hover:bg-accent transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Export List
        </button>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_120px_130px_60px] px-5 py-2.5 border-b border-border bg-muted/30">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Member</span>
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Role</span>
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Joined Date</span>
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">Actions</span>
      </div>

      {/* 成員列表 */}
      <div>
        {members.map((member, i) => {
          const isMe = member.uid === user?.uid //如果是自己
          const isMemberOwner = member.uid === project.ownerId //如果是owner
          return (
            <div key={member.uid} className="grid grid-cols-[1fr_120px_130px_60px] items-center px-5 py-3.5 hover:bg-accent transition-colors">
              {/* 成員顯示 */}
              <div className="flex items-center gap-3">
                {member.photoURL ? (
                  <img
                    src={member.photoURL}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="w-9 h-9 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm text-white font-semibold shrink-0"
                    style={{ backgroundColor: avatarColor(member.uid) }}
                  >
                    {member.displayName?.[0]?.toUpperCase() ?? "U"}
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium">
                    {member.displayName || "Unnamed User"}
                    {isMe && (
                      <span className="ml-1.5 text-xs text-muted-foreground font-normal">(You)</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">{member.email}</p>
                </div>
              </div>

              {/* 顯示角色 */}
              <span
                className="text-xs px-2.5 py-0.5 rounded-full font-medium w-fit"
                style={isMemberOwner
                  ? { backgroundColor: "var(--brand)", color: "white" }
                  : { backgroundColor: "var(--muted)", color: "var(--muted-foreground)" }
                }
              >
                {isMemberOwner ? "Owner" : "Member"}
              </span>

              {/* 加入時間 */}
              <span className="text-sm text-muted-foreground">
                {project.joinedAt?.[member.uid]
                  ? project.joinedAt[member.uid]!.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
                  : "—"}
              </span>

              {/* Actions */}
              <div className="flex justify-end">
                {isOwner && !isMemberOwner ? (
                  <button
                    onClick={() => setConfirmUid(member.uid)}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <UserMinus className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="w-7" />
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* 確認移除成員 */}
      <Dialog open={!!confirmUid} onOpenChange={(o) => { if (!o) setConfirmUid(null) }}>
        <DialogContent className="sm:max-w-sm rounded-3xl p-8">
          <DialogHeader className="mb-4">
            <AlertCircle className="w-7 h-7 text-destructive mb-3" />
            <DialogTitle className="text-xl font-bold text-destructive">Remove Member</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-4">
            <span className="font-semibold text-foreground">{confirmTarget?.displayName || confirmTarget?.email}</span> will be removed from this project.
          </p>
          <blockquote className="border-l-2 border-destructive pl-3 mb-6">
            <p className="text-sm font-semibold">This action cannot be undone.</p>
          </blockquote>
          <div className="flex gap-3">
            <Button variant="ghost" className="flex-1 rounded-full" onClick={() => setConfirmUid(null)}>Cancel</Button>
            <Button
              className="flex-1 rounded-full bg-destructive hover:opacity-90 text-white"
              onClick={() => {
                if (confirmUid) onRemoveMember(confirmUid)
                setConfirmUid(null)
              }}
            >
              Remove
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
