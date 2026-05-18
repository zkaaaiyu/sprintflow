import { useParams } from "react-router-dom"

export default function ProjectDetailPage() {
  const { projectId } = useParams()
  return (
    <div className="p-8 text-2xl text-muted-foreground">
      Project Detail — {projectId}
    </div>
  )
}