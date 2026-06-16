// useGlobalSearch — 用 Fuse.js 對 useGlobalSearchData 撈回來的資料做模糊搜尋
import { useMemo } from "react"
import Fuse from "fuse.js"
import type { SearchProject, SearchSprint, SearchTask } from "@/hooks/useGlobalSearchData"

// 每組（task / project / sprint）最多顯示幾筆結果
const RESULT_LIMIT = 5

export function useGlobalSearch(
  query: string,
  data: { searchProjects: SearchProject[]; searchSprints: SearchSprint[]; searchTasks: SearchTask[] }
) {
  // useMemo 包住 Fuse 實例：資料陣列沒變就不重建索引，避免每次打字都重新建立
  const projectFuse = useMemo(
    () => new Fuse(data.searchProjects, { keys: ["name", "description"], threshold: 0.4 }),
    [data.searchProjects]
  )
  const sprintFuse = useMemo(
    () => new Fuse(data.searchSprints, { keys: ["name"], threshold: 0.4 }),
    [data.searchSprints]
  )
  const taskFuse = useMemo(
    () => new Fuse(data.searchTasks, { keys: ["title", "description", "labels"], threshold: 0.4 }),
    [data.searchTasks]
  )

  return useMemo(() => {
    const trimmed = query.trim()
    // 空字串不顯示「最近搜尋」之類的東西，直接回傳空結果
    if (!trimmed) return { tasks: [], projects: [], sprints: [] }

    return {
      // Fuse.search() 回傳 { item, score, ... }[]，這裡只需要 item 本身
      tasks: taskFuse.search(trimmed).slice(0, RESULT_LIMIT).map((r) => r.item),
      projects: projectFuse.search(trimmed).slice(0, RESULT_LIMIT).map((r) => r.item),
      sprints: sprintFuse.search(trimmed).slice(0, RESULT_LIMIT).map((r) => r.item),
    }
  }, [query, taskFuse, projectFuse, sprintFuse])
}
