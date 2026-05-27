import { Download, UserMinus } from "lucide-react"
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
      <div className="divide-y divide-border">
        {members.map((member, i) => {
          const isMe = member.uid === user?.uid
          const isMemberOwner = member.uid === project.ownerId
          return (
            <div key={member.uid} className="grid grid-cols-[1fr_120px_130px_60px] items-center px-5 py-3.5">
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
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium w-fit ${
                isMemberOwner
                  ? "bg-orange-100 dark:bg-[#F97316]/15 text-[#F97316]"
                  : "bg-muted text-muted-foreground"
              }`}>
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
                    onClick={() => onRemoveMember(member.uid)}
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
    </div>
  )
}
