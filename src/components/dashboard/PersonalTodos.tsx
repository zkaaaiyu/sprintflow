//dashboard 右下角個人待辦清單
import { useState } from "react"
import { usePersonalTodos } from "@/hooks/usePersonalTodos"
import { Plus, Trash2 } from "lucide-react"
import { BRAND } from "@/lib/colors"

export default function PersonalTodos() {
  const { todos, createTodo, toggleTodo, updateTodo, deleteTodo } = usePersonalTodos() //呼叫usePersonalTodos 拿到所有待辦事項陣列 以及操作函式
  const [adding, setAdding] = useState(false) //否處於新增的狀態（顯示輸入匡）
  const [inputVal, setInputVal] = useState("")
  // 行內編輯：記錄正在編輯的 todo id 與暫存文字
  const [editingId, setEditingId] = useState<string | null>(null) //記錄在編輯哪一個輸入匡
  const [editVal, setEditVal] = useState("")

  const startEdit = (id: string, title: string) => {
    setEditingId(id)
    setEditVal(title)
  }

  const commitEdit = async (id: string) => {
    if (editVal.trim()) await updateTodo(id, editVal.trim())
    setEditingId(null)
  }

  const handleCreate = async () => {
    const trimmed = inputVal.trim()
    setAdding(false)
    setInputVal("")
    if (!trimmed) return
    await createTodo(trimmed)
  }

  return (
    <div>
      <div className="mb-4">
        <h3 className="font-semibold text-sm" style={{ color: BRAND }}>My Todos</h3>
      </div>

      {/* 待辦清單 */}
      <div className="space-y-1">
        {todos.length === 0 && !adding && ( //沒todo項目也沒有在新增顯示No todos yet
          <p className="text-xs text-muted-foreground py-2">No todos yet</p>
        )}

        {todos.map((todo) => (
          <div
            key={todo.id}
            className="group flex items-center gap-3 py-2 px-1 rounded-lg hover:bg-accent/50 hover:scale-[1.02] transition-all"
          >
            {/* 圓形打勾按鈕 */}
            <button
              onClick={() => toggleTodo(todo.id, todo.done)} //傳入哪一個todo項目跟目前的狀態 取反
              className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all group-hover:border-brand"
              style={{
                borderColor: todo.done ? BRAND : undefined,
                backgroundColor: todo.done ? BRAND : "transparent",
              }}
            >
              {todo.done && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>

            {/* 標題：編輯中顯示 input，否則顯示可點擊文字 */}
            {editingId === todo.id ? (
              <input
                autoFocus
                value={editVal}
                onChange={(e) => setEditVal(e.target.value)}
                onBlur={() => commitEdit(todo.id)}
                onKeyDown={(e) => {
                  if (e.nativeEvent.isComposing) return // IME 組字中，不觸發
                  if (e.key === "Enter") commitEdit(todo.id)
                  if (e.key === "Escape") setEditingId(null)
                }}
                className="flex-1 text-sm bg-transparent outline-none border-b border-foreground/20"
                // bg-transparent：背景透明，看起來像直接編輯文字
                // border-b：只有下邊框，像底線式輸入框
              />
            ) : (
              // hover 時底線提示可點擊，完成的 todo 劃線
              <span
                onClick={() => !todo.done && startEdit(todo.id, todo.title)}
                className={`text-sm flex-1 transition-colors
                  ${todo.done
                    ? "line-through text-muted-foreground cursor-default"
                    : "cursor-pointer hover:underline decoration-foreground/20 underline-offset-2"
                  }`}
              >
                {todo.title}
              </span>
            )}

            {/* 刪除（hover 才顯示） */}
            <button
              onClick={() => deleteTodo(todo.id)}
              className="opacity-0 group-hover:opacity-50 hover:!opacity-100 text-muted-foreground hover:text-destructive transition-all shrink-0"
              //分為父元素hover(group hover)跟按鈕本身hover
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        {/* 輸入框（adding 模式）*/}
        {adding && (
          <div className="flex items-center gap-3 py-2 px-1">
            <div className="w-5 h-5 rounded-full border-2 border-dashed border-border shrink-0" />
            <input
              autoFocus
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onBlur={handleCreate}
              onKeyDown={(e) => {
                if (e.nativeEvent.isComposing) return // IME 組字中，不觸發
                if (e.key === "Enter") handleCreate()
                if (e.key === "Escape") { setAdding(false); setInputVal("") }
              }}
              placeholder="New todo..."
              className="flex-1 text-sm bg-transparent outline-none"
            />
          </div>
        )}
      </div>

      {/* 新增按鈕 */}
      {!adding && (
        <button
          onClick={() => setAdding(true)}
          className="mt-3 flex items-center gap-2 px-1 transition-opacity hover:opacity-70"
        >
          <Plus className="w-4 h-4" style={{ color: BRAND }} />
          <span className="text-sm" style={{ color: BRAND }}>New Reminder</span>
        </button>
      )}
    </div>
  )
}
