// 全域搜尋面板（⌘K / Navbar 搜尋圖示觸發）
import { useNavigate } from "react-router-dom"
import { Command as CommandPrimitive } from "cmdk" // 導入專門做 Command Palette 的 UI 套件，處理鍵盤導航、選取高亮等
import {
  Command,
  CommandDialog,
  CommandList,
  CommandEmpty,
  CommandGroup,
} from "@/components/ui/command"
import { useSearchStore } from "@/store/useSearchStore"
import { useGlobalSearchData, type SearchTask } from "@/hooks/useGlobalSearchData"
import { useGlobalSearch } from "@/hooks/useGlobalSearch"
import { PRIORITY_CONFIG } from "@/lib/priority"
import { Search, ListChecks, Layers, Zap, ChevronRight } from "lucide-react"

const ITEM_CLASS =
  "flex items-center gap-3 rounded-xl px-3 py-2.5 cursor-default select-none outline-hidden data-[selected=true]:bg-muted [&_svg]:shrink-0"

// icon 圓圈：淺色品牌色底 + 品牌色 icon，對應圖片裡 project/task/sprint 前面的圓形圖示
function IconBubble({ icon: Icon }: { icon: typeof ListChecks }) {
  return (
    <span
      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
      style={{ backgroundColor: "var(--brand-subtle-bg)" }}
    >
      <Icon className="w-4 h-4" style={{ color: "var(--brand)" }} />
    </span>
  )
}

export default function CommandPalette() {
  const navigate = useNavigate()
  const { isOpen, query, close, setQuery } = useSearchStore() // 從useSearchStore拿到狀態跟函式

  // isOpen 傳進去：只有第一次打開時才會真正打 Firestore 撈資料
  const { searchProjects, searchSprints, searchTasks } = useGlobalSearchData(isOpen)
  
  // 把 query 和資料傳給 Fuse.js 搜尋，拿到過濾後的結果
  const { tasks, projects, sprints } = useGlobalSearch(query, { searchProjects, searchSprints, searchTasks })

  const hasResults = tasks.length > 0 || projects.length > 0 || sprints.length > 0 

  //查詢結果跳轉

  const goToProject = (projectId: string) => {
    navigate(`/projects/${projectId}`)
    close()
  }

  const goToSprint = (projectId: string, sprintId: string) => {
    navigate(`/projects/${projectId}/sprints/${sprintId}`)
    close()
  }


  const goToTask = (task: SearchTask) => {
    if (task.sprintId) { //先跳到對應的sprint或是backlog
      navigate(`/projects/${task.projectId}/sprints/${task.sprintId}?openTask=${task.id}`)
    } else {
      navigate(`/projects/${task.projectId}?openTask=${task.id}`, { state: { tab: "backlog" } })
    }
    close()
  }

  return (
    <CommandDialog //CommandDialog(shadcn)-> 整個面板的外殼負責「背景遮罩 + 置中浮層 + ESC 關閉」
      open={isOpen}
      onOpenChange={(open) => !open && close()}
      className="top-[8%] sm:max-w-2xl rounded-3xl! border-0 shadow-2xl"
    >
      {/* shouldFilter=false：過濾邏輯已經交給 useGlobalSearch 的 Fuse.js 處理，不要讓 cmdk 自己再篩一次 */}
      {/* command -> shadcn 提供搜尋的核心容器，管理「目前哪個 Item 被選中」的狀態*/}
      <Command shouldFilter={false} className="p-0 bg-transparent rounded-3xl!"> 
        {/* 搜尋輸入列：放大版，左邊放大鏃 icon，右邊放 ESC 提示 */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border/60">
          <Search className="w-5 h-5 text-muted-foreground shrink-0" />
          <CommandPrimitive.Input // cmdk 提供的輸入匡
            value={query}
            onValueChange={setQuery}
            placeholder="Search tasks, projects, or commands..."
            autoFocus
            className="flex-1 bg-transparent outline-none text-base placeholder:text-muted-foreground/60"
          />
          <kbd className="text-[11px] font-medium text-muted-foreground bg-muted px-2 py-1 rounded-md shrink-0 whitespace-nowrap">
            ESC to close
          </kbd>
        </div>

        {/* max-h 用 vh 而不是固定 px：不管視窗高度多少，列表超出時都會在這裡滾動，不會把面板撐出畫面外 */}
        {/*  搜尋結果的捲動區域  */}
        <CommandList className="max-h-[55vh] p-2"> 
          {!query.trim() ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Start typing to search across your projects
            </div>
          ) : !hasResults ? (
            <CommandEmpty className="py-10">No results found.</CommandEmpty>
          ) : null}

          {tasks.length > 0 && (
            <CommandGroup //把結果進行分組 把相關的 Item 包在一起
              heading="Tasks"
              className="**:[[cmdk-group-heading]]:uppercase **:[[cmdk-group-heading]]:tracking-wider"
            >
              {tasks.map((task) => {
                const p = PRIORITY_CONFIG[task.priority]
                return (
                  <CommandPrimitive.Item //自動處理：鍵盤上下鍵選取、Enter 觸發 onSelect、滑鼠 hover 高亮 data-[selected=true]：cmdk 在這個元素上標記「目前選中」
                    key={task.id}
                    value={task.id}
                    onSelect={() => goToTask(task)}
                    className={ITEM_CLASS}
                  >
                    <IconBubble icon={ListChecks} />
                    <div className="flex flex-col flex-1 min-w-0 gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{task.title}</span>
                        <span className="flex items-center gap-1 shrink-0">
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: p.bg }}
                          />
                          <span className="text-[11px] text-muted-foreground">{p.label}</span>
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground truncate">
                        in {task.projectName} · {task.sprintName ?? "Backlog"}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">Jump to</span>
                  </CommandPrimitive.Item>
                )
              })}
            </CommandGroup>
          )}

          {projects.length > 0 && (
            <CommandGroup
              heading="Projects"
              className="**:[[cmdk-group-heading]]:uppercase **:[[cmdk-group-heading]]:tracking-wider"
            >
              {projects.map((project) => (
                <CommandPrimitive.Item
                  key={project.id}
                  value={project.id}
                  onSelect={() => goToProject(project.id)}
                  className={ITEM_CLASS}
                >
                  <IconBubble icon={Layers} />
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-sm font-medium truncate">{project.name}</span>
                    {project.description && (
                      <span className="text-xs text-muted-foreground truncate">{project.description}</span>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </CommandPrimitive.Item>
              ))}
            </CommandGroup>
          )}

          {sprints.length > 0 && (
            <CommandGroup
              heading="Sprints"
              className="**:[[cmdk-group-heading]]:uppercase **:[[cmdk-group-heading]]:tracking-wider"
            >
              {sprints.map((sprint) => (
                <CommandPrimitive.Item
                  key={sprint.id}
                  value={sprint.id}
                  onSelect={() => goToSprint(sprint.projectId, sprint.id)}
                  className={ITEM_CLASS}
                >
                  <IconBubble icon={Zap} />
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-sm font-medium truncate">{sprint.name}</span>
                    <span className="text-xs text-muted-foreground truncate">in {sprint.projectName}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </CommandPrimitive.Item>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  )
}
