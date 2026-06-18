// 一次平行查詢所有 project 的 active sprint，解決 N+1 問題
import { useState, useEffect } from "react"
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Sprint } from "@/hooks/useSprints"

export function useAllActiveSprints(projectIds: string[]) {
  const [activeSprintMap, setActiveSprintMap] = useState<Record<string, Sprint | null>>({})
  const [loading, setLoading] = useState(true)
  const key = projectIds.join(",")

  useEffect(() => {
    if (projectIds.length === 0) {
      setActiveSprintMap({})
      setLoading(false)
      return
    }

    const fetchAll = async () => {
      setLoading(true)
      // Promise.all 讓所有 project 的查詢同時發出，不再串行等待
      const entries = await Promise.all(
        projectIds.map(async (projectId): Promise<[string, Sprint | null]> => {
          const snap = await getDocs(
            query(
              collection(db, "projects", projectId, "sprints"),
              where("status", "==", "active")
            )
          )
          if (snap.empty) return [projectId, null]
          const d = snap.docs[0]
          const data = d.data()
          return [projectId, {
            id: d.id,
            name: data.name ?? "",
            goal: data.goal ?? "",
            status: "active",
            startDate: data.startDate ? (data.startDate as Timestamp).toDate() : null,
            endDate: data.endDate ? (data.endDate as Timestamp).toDate() : null,
            createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : null,
          }]
        })
      )
      setActiveSprintMap(Object.fromEntries(entries))
      setLoading(false)
    }

    fetchAll()
  }, [key])

  return { activeSprintMap, loading }
}
