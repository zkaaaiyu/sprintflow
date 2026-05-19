import { useState, useEffect } from "react"
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore"
import { db } from "@/lib/firebase"

export type SprintStatus = "planning" | "active" | "completed"

export type Sprint = {
  id: string
  name: string
  goal: string
  status: SprintStatus
  startDate: Date | null
  endDate: Date | null
  createdAt: Date | null
}

export function useSprints(projectId: string) {
  const [sprints, setSprints] = useState<Sprint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!projectId) return

    const q = query(
      collection(db, "projects", projectId, "sprints"),
      orderBy("createdAt", "asc")
    )

    const unsubscribe = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        startDate: (d.data().startDate as Timestamp)?.toDate() ?? null,
        endDate: (d.data().endDate as Timestamp)?.toDate() ?? null,
        createdAt: (d.data().createdAt as Timestamp)?.toDate() ?? null,
      })) as Sprint[]
      setSprints(list)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [projectId])

  const createSprint = async (name: string, goal: string, startDate: Date, endDate: Date) => {
    await addDoc(collection(db, "projects", projectId, "sprints"), {
      name,
      goal,
      status: "planning" as SprintStatus,
      startDate: Timestamp.fromDate(startDate),
      endDate: Timestamp.fromDate(endDate),
      createdAt: serverTimestamp(),
    })
  }

  return { sprints, loading, createSprint }
}