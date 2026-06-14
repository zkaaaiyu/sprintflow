import { useState } from "react"
import { Download, UserMinus } from "lucide-react"
import { useMembers } from "@/hooks/useMembers"
import { useAuth } from "@/contexts/AuthContext"
import type { Project } from "@/hooks/useWorkspace"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

const AVATAR_COLORS = ["#F97316", "#3B82F6", "#10B981", "#8B5CF6", "#EF4444"]

export default function TeamTab({ project, onRemoveMember }: {
  project: Project
  onRemoveMember: (uid: string) => void
}) {
  const { user } = useAuth()
  const { members, loading } = useMembers(project.memberIds)
  const isOwner = project.ownerId === user?.uid
  const [confirmUid, setConfirmUid] = useState<string | null>(null)

  const confirmTarget = members.find((m) => m.uid === confirmUid)

  if (loading) return <div className="text-muted-foreground text-sm py-8 text-center">載入中...</div>

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
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border border-border text-muted-foreground hover:bg-accent transition-colors">
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

      {/* Rows */}
      <div>
        {members.map((member, i) => {
          const isMe = member.uid === user?.uid
          const isMemberOwner = member.uid === project.ownerId
          return (
            <div key={member.uid} className="grid grid-cols-[1fr_120px_130px_60px] items-center px-5 py-3.5 hover:bg-accent transition-colors">
              {/* Member */}
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
                    style={{ backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                  >
                    {member.displayName?.[0]?.toUpperCase() ?? "U"}
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium">
                    {member.displayName || "未命名用戶"}
                    {isMe && (
                      <span className="ml-1.5 text-xs text-muted-foreground font-normal">(You)</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">{member.email}</p>
                </div>
              </div>

              {/* Role */}
              <span
                className="text-xs px-2.5 py-0.5 rounded-full font-medium w-fit"
                style={isMemberOwner
                  ? { backgroundColor: "var(--brand)", color: "white" }
                  : { backgroundColor: "var(--muted)", color: "var(--muted-foreground)" }
                }
              >
                {isMemberOwner ? "Owner" : "Member"}
              </span>

              {/* Joined Date */}
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
        <DialogContent className="sm:max-w-sm rounded-2xl p-8">
          <DialogHeader className="mb-4">
            <DialogTitle>移除成員</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-6">
            確定要將 <span className="font-semibold text-foreground">{confirmTarget?.displayName || confirmTarget?.email}</span> 從專案中移除嗎？
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setConfirmUid(null)}>取消</Button>
            <Button
              variant="destructive"
              className="rounded-full px-6"
              onClick={() => {
                if (confirmUid) onRemoveMember(confirmUid)
                setConfirmUid(null)
              }}
            >
              確認移除
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
