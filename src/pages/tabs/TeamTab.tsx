import { X, Copy } from "lucide-react"
import { toast } from "sonner"
import { useMembers } from "@/hooks/useMembers"
import { useAuth } from "@/contexts/AuthContext"
import type { Project } from "@/hooks/useWorkspace"

const AVATAR_COLORS = ["#F97316", "#3B82F6", "#10B981", "#8B5CF6", "#EF4444"]

export default function TeamTab({ project, onRemoveMember }: {
  project: Project
  onRemoveMember: (uid: string) => void
}) {
  const { user } = useAuth()
  const { members, loading } = useMembers(project.memberIds)
  const isOwner = project.ownerId === user?.uid

  const handleCopyInvite = () => {
    const url = `${window.location.origin}/join/${project.inviteCode}`
    navigator.clipboard.writeText(url)
    toast.success("邀請連結已複製")
  }

  if (loading) return <div className="text-muted-foreground text-sm py-8 text-center">載入中...</div>

  return (
    <div className="space-y-4">
      {/* 成員列表 */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Members · {project.memberIds.length}
          </h3>
        </div>
        <div className="divide-y divide-border">
          {members.map((member, i) => (
            <div key={member.uid} className="flex items-center justify-between px-5 py-3.5">
              <div className="flex items-center gap-3">
                {member.photoURL ? (
                  <img
                    src={member.photoURL}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="w-9 h-9 rounded-full object-cover"
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
                  <p className="text-sm font-medium">{member.displayName || "未命名用戶"}</p>
                  <p className="text-xs text-muted-foreground">{member.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                  project.ownerId === member.uid
                    ? "bg-orange-100 dark:bg-[#F97316]/15 text-[#F97316]"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {project.ownerId === member.uid ? "Owner" : "Member"}
                </span>
                {isOwner && project.ownerId !== member.uid && (
                  <button
                    onClick={() => onRemoveMember(member.uid)}
                    className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 邀請連結 */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Invite Link</h3>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-muted rounded-xl px-3 py-2.5 text-sm text-muted-foreground font-mono truncate">
            {`${window.location.origin}/join/${project.inviteCode}`}
          </div>
          <button
            onClick={handleCopyInvite}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-[#F97316] text-white rounded-xl text-sm font-medium hover:bg-[#ea6c0a] transition-colors shrink-0"
          >
            <Copy className="w-3.5 h-3.5" />
            複製
          </button>
        </div>
      </div>
    </div>
  )
}
