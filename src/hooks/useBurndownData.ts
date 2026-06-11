import { useState, useEffect } from "react"
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"

export type BurndownPoint = {
  date: string        // 顯示用日期，如 "6/1"
  ideal: number       // 理想剩餘 SP
  actual: number | null  // 實際剩餘 SP（未來日期為 null）
}

export function useBurndownData(
  projectId: string,
  sprintId: string,
  startDate: Date | null,
  endDate: Date | null,
) {
  const [data, setData] = useState<BurndownPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!projectId || !sprintId || !startDate || !endDate) {
      setData([])
      setLoading(false)
      return
    }

    const fetchData = async () => {
      setLoading(true)

      // 取得該 sprint 所有任務
      const tasksSnap = await getDocs(
        query(
          collection(db, "projects", projectId, "tasks"),
          where("sprintId", "==", sprintId)
        )
      )

      const tasks = tasksSnap.docs.map((d) => ({
        storyPoints: d.data().storyPoints as number | null,
        status: d.data().status as string,
        doneAt: (d.data().doneAt as Timestamp)?.toDate() ?? null,
      }))

      // 若所有任務都沒設 SP，fallback 用任務數量（1 task = 1 point）
      const hasAnyPoints = tasks.some((t) => t.storyPoints != null && t.storyPoints > 0)
      const total = hasAnyPoints
        ? tasks.reduce((sum, t) => sum + (t.storyPoints ?? 0), 0)
        : tasks.length

      if (total === 0) {
        setData([])
        setLoading(false)
        return
      }

      // Sprint 總天數（做分母）
      const msPerDay = 1000 * 60 * 60 * 24
      const totalDays = Math.round((endDate.getTime() - startDate.getTime()) / msPerDay)

      // actual 只畫到今天或 endDate（取較早的）
      const today = new Date()
      today.setHours(23, 59, 59, 999)
      const actualEndDate = today < endDate ? today : endDate

      const points: BurndownPoint[] = []
      const cur = new Date(startDate)
      cur.setHours(0, 0, 0, 0)
      let dayIndex = 0

      while (cur <= endDate) {
        const dayEnd = new Date(cur)
        dayEnd.setHours(23, 59, 59, 999)

        // 理想剩餘 SP：線性從 total → 0
        const ideal = totalDays > 0
          ? Math.round(total * (totalDays - dayIndex) / totalDays)
          : 0

        // 實際剩餘 SP：只計算到今天
        let actual: number | null = null
        if (cur <= actualEndDate) {
          const completedSP = tasks.reduce((sum, t) => {
            // doneAt 有值 → 用時間判斷；沒有 doneAt 但狀態是 done → 視為一開始就完成（舊資料 fallback）
            const isDone = t.doneAt != null ? t.doneAt <= dayEnd : t.status === "done"
            if (isDone) return sum + (hasAnyPoints ? (t.storyPoints ?? 0) : 1)
            return sum
          }, 0)
          actual = Math.max(0, total - completedSP)
        }

        points.push({
          date: `${cur.getMonth() + 1}/${cur.getDate()}`,
          ideal,
          actual,
        })

        cur.setDate(cur.getDate() + 1)
        dayIndex++
      }

      setData(points)
      setLoading(false)
    }

    fetchData()
  }, [projectId, sprintId, startDate?.getTime(), endDate?.getTime()])

  return { data, loading }
}
