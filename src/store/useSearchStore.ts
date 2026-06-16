// Command Palette 的 UI 狀態（開關 + 輸入框內容），不存放任何資料本身
import { create } from "zustand"

interface SearchStore {
  isOpen: boolean
  query: string
  open: () => void
  close: () => void
  setQuery: (q: string) => void
}

// create() 回傳一個 hook：在元件內呼叫可讀取/訂閱 state，呼叫 getState() 則可在元件外（如事件監聽）直接讀取
export const useSearchStore = create<SearchStore>((set) => ({
  isOpen: false,
  query: "",
  open: () => set({ isOpen: true }),
  // 關閉時順手清空 query，下次打開不會殘留上次的搜尋字
  close: () => set({ isOpen: false, query: "" }),
  setQuery: (q) => set({ query: q }),
}))
