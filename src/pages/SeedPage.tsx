import { useState } from "react"
import { collection, doc, setDoc, addDoc, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useNavigate } from "react-router-dom"

const ago = (days: number) => {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(10, 0, 0, 0)
  return Timestamp.fromDate(d)
}
const from = (days: number) => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  d.setHours(10, 0, 0, 0)
  return Timestamp.fromDate(d)
}
const code = () => Math.random().toString(36).substring(2, 8).toUpperCase()

export default function SeedPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [seeding, setSeeding] = useState(false)
  const [done, setDone] = useState(false)
  const [log, setLog] = useState<string[]>([])

  const push = (msg: string) => setLog((prev) => [...prev, msg])

  const run = async () => {
    if (!user) return
    setSeeding(true)
    setLog([])
    const uid = user.uid
    const name = user.displayName ?? "使用者"
    const photo = user.photoURL ?? null

    try {
      // ═══════════════════════════════════
      //  PROJECT A — SprintFlow
      // ═══════════════════════════════════
      push("建立專案 A：SprintFlow…")
      const pARef = doc(collection(db, "projects"))
      const pAId = pARef.id
      await setDoc(pARef, {
        name: "SprintFlow",
        description: "打造全端專案管理平台，支援即時協作、拖拉式看板任務管理與 Sprint 規劃功能。",
        color: "#B3795F",
        ownerId: uid,
        memberIds: [uid],
        roles: { [uid]: "owner" },
        inviteCode: code(),
        joinedAt: { [uid]: ago(60) },
        createdAt: ago(60),
        updatedAt: ago(1),
      })

      // Sprint A1 — 已完成
      push("  Sprint A1（已完成）…")
      const sA1Ref = doc(collection(db, "projects", pAId, "sprints"))
      const sA1Id = sA1Ref.id
      await setDoc(sA1Ref, {
        projectId: pAId,
        name: "Sprint 1 — 基礎建設",
        goal: "完成專案初始化、Firebase 身份驗證設定，以及側邊欄、導覽列等核心版面配置。",
        status: "completed",
        startDate: ago(56),
        endDate: ago(43),
        createdAt: ago(58),
      })

      const tasksA1: Array<{
        title: string; description: string; priority: string
        storyPoints: number; labels: string[]; dueDate: Timestamp; doneAt: Timestamp
      }> = [
        {
          title: "設定 Firebase 身份驗證",
          description: "配置 Firebase Auth 的 Email/密碼登入與 Google OAuth 功能。建立 AuthContext，讓登入狀態能夠在全應用程式中共享存取。",
          priority: "high", storyPoints: 3, labels: ["auth", "backend"],
          dueDate: ago(50), doneAt: ago(52),
        },
        {
          title: "設計側邊欄與頂部導覽列",
          description: "打造可收合的左側導覽欄與固定頂部 Navbar，包含麵包屑導航、深色模式切換，以及用戶頭像下拉選單。",
          priority: "medium", storyPoints: 5, labels: ["ui", "layout"],
          dueDate: ago(48), doneAt: ago(49),
        },
        {
          title: "設定 Tailwind CSS 與 Shadcn/ui",
          description: "安裝並配置 Tailwind CSS 自訂品牌色彩 Token。套用 Shadcn/ui 元件庫，統一深色與淺色主題的視覺一致性。",
          priority: "medium", storyPoints: 2, labels: ["setup", "frontend"],
          dueDate: ago(55), doneAt: ago(56),
        },
        {
          title: "規劃 Firestore 資料結構",
          description: "設計並記錄 projects、sprints、tasks、users 集合架構與欄位定義。撰寫 Firestore 安全規則，限制只有成員可以讀寫。",
          priority: "high", storyPoints: 3, labels: ["backend", "database"],
          dueDate: ago(52), doneAt: ago(51),
        },
        {
          title: "建立登入與註冊頁面",
          description: "製作響應式登入與註冊表單，包含欄位格式驗證、錯誤提示訊息與按鈕載入狀態。處理登入後的頁面跳轉流程。",
          priority: "high", storyPoints: 3, labels: ["auth", "frontend"],
          dueDate: ago(47), doneAt: ago(46),
        },
      ]

      for (const t of tasksA1) {
        const tRef = doc(collection(db, "projects", pAId, "tasks"))
        await setDoc(tRef, {
          projectId: pAId, sprintId: sA1Id,
          title: t.title, description: t.description,
          priority: t.priority, status: "done",
          storyPoints: t.storyPoints, labels: t.labels,
          assigneeId: uid, dueDate: t.dueDate, doneAt: t.doneAt,
          order: tasksA1.indexOf(t) + 1,
          createdBy: uid, createdAt: ago(58),
        })
      }

      // Sprint A2 — 進行中
      push("  Sprint A2（進行中）…")
      const sA2Ref = doc(collection(db, "projects", pAId, "sprints"))
      const sA2Id = sA2Ref.id
      await setDoc(sA2Ref, {
        projectId: pAId,
        name: "Sprint 2 — 看板核心功能",
        goal: "實作拖拉式看板、Firestore 即時同步，以及任務篩選與 Sprint 進度追蹤功能。",
        status: "active",
        startDate: ago(14),
        endDate: from(14),
        createdAt: ago(16),
      })

      const a2Done = [
        {
          title: "整合 dnd-kit 實作拖拉排序",
          description: "引入 @dnd-kit 套件，實現任務卡片在欄位內的排序以及跨欄拖拉。處理拖到空欄位、拖拉取消等邊界情況，確保體驗流暢。",
          priority: "high", storyPoints: 8, labels: ["frontend", "feature"],
          dueDate: ago(8), doneAt: ago(11), order: 1,
          comments: [
            { content: "碰撞偵測用 closestCorners 比 closestCenter 更適合這個版面，拖到空欄位時判斷更準確。", createdAt: ago(12) },
            { content: "已合併！拖拉時的半透明 Overlay 視覺回饋很好。取消拖拉的 snap-back 動畫也很自然。", createdAt: ago(11) },
          ],
          activities: [{ field: "status", from: "in_progress", to: "done", createdAt: ago(11) }],
        },
        {
          title: "建立 KanbanColumn 與 TaskCard 元件",
          description: "製作可重用的 KanbanColumn 元件，欄頂顯示任務數量與故事點數小計。設計 TaskCard 展示優先級標籤、指派人頭像、截止日期與逾期警示。",
          priority: "high", storyPoints: 5, labels: ["frontend", "ui"],
          dueDate: ago(7), doneAt: ago(8), order: 2,
          comments: [
            { content: "故事點數要顯示在卡片上嗎？這樣 Sprint 規劃時可以快速掌握各欄的工作量。", createdAt: ago(9) },
            { content: "好主意，在卡片右上角加了一個小的 SP Badge，不影響視覺乾淨度。", createdAt: ago(8) },
          ],
          activities: [{ field: "status", from: "review", to: "done", createdAt: ago(8) }],
        },
        {
          title: "任務狀態即時同步 Firestore",
          description: "使用 onSnapshot 監聽器讓看板在多個分頁與多位成員間即時同步。實作樂觀更新（Optimistic UI）讓拖拉操作感覺更流暢。",
          priority: "urgent", storyPoints: 5, labels: ["backend", "realtime"],
          dueDate: ago(5), doneAt: ago(5), order: 3,
          comments: [
            { content: "跨兩個瀏覽器分頁測試，同步延遲穩定在 300ms 以內。與拖拉功能搭配運作完全沒有問題。", createdAt: ago(5) },
          ],
          activities: [{ field: "status", from: "in_progress", to: "done", createdAt: ago(5) }],
        },
      ]

      for (const t of a2Done) {
        const tRef = doc(collection(db, "projects", pAId, "tasks"))
        const tId = tRef.id
        await setDoc(tRef, {
          projectId: pAId, sprintId: sA2Id,
          title: t.title, description: t.description,
          priority: t.priority, status: "done",
          storyPoints: t.storyPoints, labels: t.labels,
          assigneeId: uid, dueDate: t.dueDate, doneAt: t.doneAt,
          order: t.order, createdBy: uid, createdAt: ago(14),
        })
        for (const c of t.comments) {
          await addDoc(collection(db, "projects", pAId, "tasks", tId, "comments"), {
            content: c.content, authorId: uid, authorName: name,
            authorPhotoURL: photo, createdAt: c.createdAt,
          })
        }
        for (const a of t.activities) {
          await addDoc(collection(db, "projects", pAId, "tasks", tId, "activities"), {
            type: "status_changed", field: a.field,
            fromValue: a.from, toValue: a.to,
            changedBy: uid, changedByName: name, changedByPhotoURL: photo,
            createdAt: a.createdAt,
          })
        }
        await addDoc(collection(db, "activities"), {
          projectId: pAId, taskId: tId, taskTitle: t.title,
          field: "status", fromValue: "in_progress", toValue: "done",
          changedBy: uid, changedByName: name, changedByPhotoURL: photo,
          createdAt: t.doneAt,
        })
      }

      const a2Rest = [
        {
          title: "任務詳情 Modal 完整版",
          description: "建立完整的任務詳情 Modal，包含可編輯標題、描述、優先級選擇器、成員指派、截止日期選擇、標籤輸入與故事點數設定。",
          priority: "high", status: "in_progress", storyPoints: 5,
          labels: ["frontend", "feature"], dueDate: from(4), order: 4,
          comments: [
            { content: "標籤輸入的多選自動完成正在處理中，預計這週末前可以送 Review。", createdAt: ago(2) },
          ],
        },
        {
          title: "依成員與優先級篩選任務",
          description: "在看板上方新增篩選列，不符合條件的卡片淡出，符合條件的完整顯示。篩選條件可以疊加（AND 邏輯）。",
          priority: "medium", status: "in_progress", storyPoints: 3,
          labels: ["frontend", "feature"], dueDate: from(6), order: 5,
          comments: [],
        },
        {
          title: "Sprint 標題進度條與 SP 統計",
          description: "在 Sprint 標頭顯示任務完成百分比與故事點數分佈，任務移入「完成」欄時即時更新數值。",
          priority: "medium", status: "review", storyPoints: 2,
          labels: ["frontend", "ui"], dueDate: from(3), order: 6,
          comments: [
            { content: "PR 已送出。SP 計算邏輯需要確認 storyPoints 為 null 的任務要怎麼處理，目前暫時當作 0。", createdAt: ago(1) },
          ],
        },
        {
          title: "任務標籤與標記系統",
          description: "讓使用者可以建立並指派彩色標籤給任務。標籤可作為看板的篩選條件之一。",
          priority: "low", status: "todo", storyPoints: 2,
          labels: ["frontend", "feature"], dueDate: from(10), order: 7,
          comments: [],
        },
        {
          title: "從 Backlog 將任務加入 Sprint",
          description: "在每個看板欄位底部新增「從 Backlog 選取」功能，彈出可搜尋的任務清單，支援多選批次加入目前 Sprint。",
          priority: "medium", status: "todo", storyPoints: 3,
          labels: ["feature"], dueDate: from(8), order: 8,
          comments: [],
        },
        {
          title: "逾期任務視覺警示",
          description: "截止日已過的任務卡片邊框改為紅色，並將剩餘天數文字替換為「已逾期」紅色標籤。",
          priority: "low", status: "todo", storyPoints: 1,
          labels: ["ui"], dueDate: from(12), order: 9,
          comments: [],
        },
      ]

      for (const t of a2Rest) {
        const tRef = doc(collection(db, "projects", pAId, "tasks"))
        const tId = tRef.id
        await setDoc(tRef, {
          projectId: pAId, sprintId: sA2Id,
          title: t.title, description: t.description,
          priority: t.priority, status: t.status,
          storyPoints: t.storyPoints, labels: t.labels,
          assigneeId: uid, dueDate: t.dueDate,
          order: t.order, createdBy: uid, createdAt: ago(13),
        })
        for (const c of t.comments) {
          await addDoc(collection(db, "projects", pAId, "tasks", tId, "comments"), {
            content: c.content, authorId: uid, authorName: name,
            authorPhotoURL: photo, createdAt: c.createdAt,
          })
        }
      }

      // Sprint A3 — 規劃中
      push("  Sprint A3（規劃中）…")
      const sA3Ref = doc(collection(db, "projects", pAId, "sprints"))
      await setDoc(sA3Ref, {
        projectId: pAId,
        name: "Sprint 3 — 儀表板與優化",
        goal: "建立跨專案儀表板與燃燒圖、實作 ⌘+K 全域搜尋指令列，並完成上線前的 UI 動畫打磨。",
        status: "planning",
        startDate: from(15),
        endDate: from(29),
        createdAt: ago(3),
      })

      // Backlog A
      push("  Backlog A…")
      const backlogA = [
        {
          title: "建立跨專案儀表板頁面",
          description: "製作總覽儀表板，包含各 Sprint 進度卡片、我的任務清單、逾期任務提醒、燃燒圖表以及最近活動紀錄。",
          priority: "high", storyPoints: 8, labels: ["feature", "frontend"], order: 1,
        },
        {
          title: "實作 ⌘+K 全域搜尋指令列",
          description: "按下 ⌘+K 開啟全域搜尋覆蓋層，可即時搜尋專案、Sprint 與任務。支援鍵盤上下鍵導航與 Enter 跳轉。",
          priority: "medium", storyPoints: 5, labels: ["feature", "ux"], order: 2,
        },
        {
          title: "新增燃燒圖表元件",
          description: "折線圖呈現 Sprint 期間每日故事點數完成速率與理想燃燒軌跡的對比，依 doneAt 時間戳記計算每日進度。",
          priority: "medium", storyPoints: 5, labels: ["analytics", "frontend"], order: 3,
        },
      ]
      for (const t of backlogA) {
        const tRef = doc(collection(db, "projects", pAId, "tasks"))
        await setDoc(tRef, {
          projectId: pAId, sprintId: null,
          title: t.title, description: t.description,
          priority: t.priority, status: "todo",
          storyPoints: t.storyPoints, labels: t.labels,
          assigneeId: null, dueDate: null,
          order: t.order, createdBy: uid, createdAt: ago(7),
        })
      }

      // ═══════════════════════════════════
      //  PROJECT B — 瑞昇科技官網改版
      // ═══════════════════════════════════
      push("建立專案 B：瑞昇科技官網改版…")
      const pBRef = doc(collection(db, "projects"))
      const pBId = pBRef.id
      await setDoc(pBRef, {
        name: "瑞昇科技官網改版",
        description: "全面翻新公司行銷官網，提升使用者體驗與網站效能，並整合 CMS 內容管理系統與 SEO 優化。",
        color: "#4A5270",
        ownerId: uid,
        memberIds: [uid],
        roles: { [uid]: "owner" },
        inviteCode: code(),
        joinedAt: { [uid]: ago(45) },
        createdAt: ago(45),
        updatedAt: ago(2),
      })

      // Sprint B1 — 已完成
      push("  Sprint B1（已完成）…")
      const sB1Ref = doc(collection(db, "projects", pBId, "sprints"))
      const sB1Id = sB1Ref.id
      await setDoc(sB1Ref, {
        projectId: pBId,
        name: "Sprint 1 — 設計系統",
        goal: "建立視覺設計語言、可重用元件庫與品牌規範，作為後續所有頁面開發的基礎。",
        status: "completed",
        startDate: ago(42),
        endDate: ago(29),
        createdAt: ago(44),
      })

      const b1Tasks = [
        {
          title: "定義色彩系統與字型規範",
          description: "研究品牌識別，確立主色、輔助色與強調色的 Token 定義。選擇標題與內文字型組合，並在 Figma 中建立完整的 Design Token 文件。",
          priority: "high", storyPoints: 2, labels: ["design"], doneAt: ago(40),
        },
        {
          title: "建立可重用 UI 元件庫",
          description: "製作 Button、Card、Badge、Input、Modal、Tooltip 等基礎元件，遵循新設計系統規範。撰寫 Props 說明與使用範例文件。",
          priority: "high", storyPoints: 8, labels: ["frontend", "design"], doneAt: ago(35),
          comments: [
            { content: "共完成 12 個元件，每個都有淺色與深色模式的 Story。Button 的 variant 涵蓋 primary / secondary / ghost / destructive。", createdAt: ago(36) },
          ],
        },
        {
          title: "設計首頁 Hero 區塊與導覽列草稿",
          description: "完成首頁 Hero Banner 與固定頂部導覽列的高保真 Figma 稿件。提供兩個版面配置方案供利害關係人選擇。",
          priority: "medium", storyPoints: 3, labels: ["design", "ui"], doneAt: ago(33),
        },
        {
          title: "初始化 Next.js 專案與 TypeScript",
          description: "建立 Next.js 14 專案，配置 TypeScript、Tailwind CSS 與 ESLint。設定 Vercel 自動部署流程，包含 Preview 環境。",
          priority: "medium", storyPoints: 2, labels: ["setup", "devops"], doneAt: ago(38),
        },
      ]

      for (const t of b1Tasks) {
        const tRef = doc(collection(db, "projects", pBId, "tasks"))
        const tId = tRef.id
        await setDoc(tRef, {
          projectId: pBId, sprintId: sB1Id,
          title: t.title, description: t.description,
          priority: t.priority, status: "done",
          storyPoints: t.storyPoints, labels: t.labels,
          assigneeId: uid, dueDate: ago(30), doneAt: t.doneAt,
          order: b1Tasks.indexOf(t) + 1,
          createdBy: uid, createdAt: ago(44),
        })
        if ("comments" in t && t.comments) {
          for (const c of t.comments) {
            await addDoc(collection(db, "projects", pBId, "tasks", tId, "comments"), {
              content: c.content, authorId: uid, authorName: name,
              authorPhotoURL: photo, createdAt: c.createdAt,
            })
          }
        }
        await addDoc(collection(db, "projects", pBId, "tasks", tId, "activities"), {
          type: "status_changed", field: "status",
          fromValue: "in_progress", toValue: "done",
          changedBy: uid, changedByName: name, changedByPhotoURL: photo,
          createdAt: t.doneAt,
        })
      }

      // Sprint B2 — 進行中
      push("  Sprint B2（進行中）…")
      const sB2Ref = doc(collection(db, "projects", pBId, "sprints"))
      const sB2Id = sB2Ref.id
      await setDoc(sB2Ref, {
        projectId: pBId,
        name: "Sprint 2 — 核心頁面開發",
        goal: "完成首頁、產品介紹頁與部落格頁面，整合 CMS，並確保所有頁面達到完整的手機響應式體驗。",
        status: "active",
        startDate: ago(10),
        endDate: from(18),
        createdAt: ago(12),
      })

      const b2Done = [
        {
          title: "實作首頁 Hero 區塊",
          description: "完成動態 Hero Banner，包含主標題、副標題、雙 CTA 按鈕與產品截圖。使用 Framer Motion 加入滾動觸發的進場動畫效果。",
          priority: "high", storyPoints: 5, labels: ["frontend", "animation"],
          dueDate: ago(5), doneAt: ago(7), order: 1,
          comments: [
            { content: "視差捲動效果在 iPhone Safari 上有點卡頓，要不要在手機版改用靜態圖片？", createdAt: ago(8) },
            { content: "好主意，手機版停用視差效果，另外加了 prefers-reduced-motion 的支援。順暢很多。", createdAt: ago(7) },
          ],
          activities: [{ field: "status", from: "review", to: "done", createdAt: ago(7) }],
        },
        {
          title: "固定導覽列與手機版漢堡選單",
          description: "Navbar 滾動時從透明轉為毛玻璃效果。手機版漢堡圖示觸發側滑抽屜選單。當前頁面的導覽項目高亮顯示。",
          priority: "high", storyPoints: 3, labels: ["frontend", "ui"],
          dueDate: ago(3), doneAt: ago(4), order: 2,
          comments: [
            { content: "已部署至 Staging。backdrop-filter 毛玻璃效果目前瀏覽器支援率達 96%，可以放心上線。", createdAt: ago(4) },
          ],
          activities: [{ field: "status", from: "in_progress", to: "done", createdAt: ago(4) }],
        },
        {
          title: "方案定價區塊與比較表",
          description: "三個定價方案卡片（入門版 / 專業版 / 企業版），含月付 / 年付切換開關（顯示節省金額）。下方附加功能比較表格。",
          priority: "medium", storyPoints: 3, labels: ["frontend", "ui"],
          dueDate: ago(1), doneAt: ago(2), order: 3,
          comments: [
            { content: "計費切換動畫用 CSS counter animation 處理，效能比 JavaScript 好。數字跳動的感覺很自然。", createdAt: ago(2) },
          ],
          activities: [{ field: "status", from: "in_progress", to: "done", createdAt: ago(2) }],
        },
      ]

      for (const t of b2Done) {
        const tRef = doc(collection(db, "projects", pBId, "tasks"))
        const tId = tRef.id
        await setDoc(tRef, {
          projectId: pBId, sprintId: sB2Id,
          title: t.title, description: t.description,
          priority: t.priority, status: "done",
          storyPoints: t.storyPoints, labels: t.labels,
          assigneeId: uid, dueDate: t.dueDate, doneAt: t.doneAt,
          order: t.order, createdBy: uid, createdAt: ago(10),
        })
        for (const c of t.comments) {
          await addDoc(collection(db, "projects", pBId, "tasks", tId, "comments"), {
            content: c.content, authorId: uid, authorName: name,
            authorPhotoURL: photo, createdAt: c.createdAt,
          })
        }
        for (const a of t.activities) {
          await addDoc(collection(db, "projects", pBId, "tasks", tId, "activities"), {
            type: "status_changed", field: a.field,
            fromValue: a.from, toValue: a.to,
            changedBy: uid, changedByName: name, changedByPhotoURL: photo,
            createdAt: a.createdAt,
          })
        }
        await addDoc(collection(db, "activities"), {
          projectId: pBId, taskId: tId, taskTitle: t.title,
          field: "status", fromValue: "in_progress", toValue: "done",
          changedBy: uid, changedByName: name, changedByPhotoURL: photo,
          createdAt: t.doneAt,
        })
      }

      const b2Rest = [
        {
          title: "整合 Contentful CMS 部落格系統",
          description: "透過 Contentful Content Delivery API 串接 CMS，設定部落格文章的內容型別（標題、內文、封面圖、作者、SEO 欄位）。建立文章列表與詳情頁面。",
          priority: "high", status: "in_progress", storyPoints: 5,
          labels: ["backend", "cms"], dueDate: from(5), order: 4,
          comments: [
            { content: "SDK 連線成功，可以拉到文章資料。目前卡在 Rich Text Renderer，嵌入圖片搭配 Next.js Image 優化有點麻煩。", createdAt: ago(1) },
          ],
        },
        {
          title: "撰寫 SEO Meta 標籤與結構化資料",
          description: "為所有頁面加入 title、description、Open Graph 與 Twitter Card meta 標籤。為部落格文章實作 JSON-LD Article Schema，提升搜尋結果的呈現效果。",
          priority: "medium", status: "in_progress", storyPoints: 2,
          labels: ["seo"], dueDate: from(7), order: 5,
          comments: [],
        },
        {
          title: "手機響應式 QA 完整稽核",
          description: "系統性測試 iPhone 14、Pixel 7 與 iPad Pro 三種裝置。記錄所有版面問題、觸控目標尺寸不足（< 44px）與字型縮放異常。本 Sprint 修復所有嚴重問題。",
          priority: "urgent", status: "review", storyPoints: 3,
          labels: ["qa", "mobile"], dueDate: from(2), order: 6,
          comments: [
            { content: "稽核完成，共發現 6 個問題：2 個嚴重（375px 寬度導覽列溢出、Hero 文字被截斷），4 個輕微（間距不一致）。修復 PR 已送出。", createdAt: ago(1) },
          ],
        },
        {
          title: "串接 Google Analytics 4 與自訂事件",
          description: "整合 GA4，設定自訂事件追蹤 CTA 按鈕點擊、捲動深度里程碑（25/50/75/100%）與聯絡表單送出。在 GA4 後台設定轉換目標。",
          priority: "medium", status: "todo", storyPoints: 2,
          labels: ["analytics"], dueDate: from(12), order: 7,
          comments: [],
        },
        {
          title: "客戶見證輪播元件",
          description: "自動播放的見證輪播，滑鼠懸停暫停，支援手動切換。內容從 Contentful 拉取。加入 Review Schema 標記，有機會在搜尋結果顯示星級評分。",
          priority: "low", status: "todo", storyPoints: 3,
          labels: ["frontend", "ui"], dueDate: from(15), order: 8,
          comments: [],
        },
      ]

      for (const t of b2Rest) {
        const tRef = doc(collection(db, "projects", pBId, "tasks"))
        const tId = tRef.id
        await setDoc(tRef, {
          projectId: pBId, sprintId: sB2Id,
          title: t.title, description: t.description,
          priority: t.priority, status: t.status,
          storyPoints: t.storyPoints, labels: t.labels,
          assigneeId: uid, dueDate: t.dueDate,
          order: t.order, createdBy: uid, createdAt: ago(9),
        })
        for (const c of t.comments) {
          await addDoc(collection(db, "projects", pBId, "tasks", tId, "comments"), {
            content: c.content, authorId: uid, authorName: name,
            authorPhotoURL: photo, createdAt: c.createdAt,
          })
        }
      }

      // Sprint B3 — 規劃中
      push("  Sprint B3（規劃中）…")
      const sB3Ref = doc(collection(db, "projects", pBId, "sprints"))
      await setDoc(sB3Ref, {
        projectId: pBId,
        name: "Sprint 3 — 上線準備",
        goal: "Lighthouse 效能優化（目標 90 分以上）、無障礙稽核、Cookie 同意機制，以及最終上線前 QA 驗收。",
        status: "planning",
        startDate: from(19),
        endDate: from(33),
        createdAt: ago(1),
      })

      // Backlog B
      push("  Backlog B…")
      const backlogB = [
        {
          title: "Lighthouse 效能優化",
          description: "讓所有頁面 Lighthouse 效能分數達到 90 分以上。優化圖片載入（next/image）、實作延遲載入，並透過 Code Splitting 縮減 JS Bundle 體積。",
          priority: "high", storyPoints: 5, labels: ["performance"], order: 1,
        },
        {
          title: "使用 Vercel Edge 設定 A/B 測試",
          description: "透過 Vercel Edge Middleware 分流流量，測試 Hero 區塊文案與 CTA 按鈕顏色的不同變體。在 GA4 追蹤各變體的轉換率。",
          priority: "medium", storyPoints: 3, labels: ["analytics", "backend"], order: 2,
        },
        {
          title: "實作 GDPR Cookie 同意橫幅",
          description: "建立符合 GDPR 規範的 Cookie 同意機制，提供分類細項控制（分析、行銷、功能性）。在用戶同意分析類別前封鎖 GA4 追蹤。",
          priority: "low", storyPoints: 2, labels: ["compliance"], order: 3,
        },
      ]
      for (const t of backlogB) {
        const tRef = doc(collection(db, "projects", pBId, "tasks"))
        await setDoc(tRef, {
          projectId: pBId, sprintId: null,
          title: t.title, description: t.description,
          priority: t.priority, status: "todo",
          storyPoints: t.storyPoints, labels: t.labels,
          assigneeId: null, dueDate: null,
          order: t.order, createdBy: uid, createdAt: ago(5),
        })
      }

      push("✓ 全部完成！")
      setDone(true)
      toast.success("Demo 資料建立完成！")
    } catch (e) {
      console.error(e)
      toast.error("建立失敗，請查看 Console")
    } finally {
      setSeeding(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-lg w-full space-y-6">
        <div>
          <h1 className="text-2xl font-bold">建立 Demo 資料</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            建立 2 個專案 × 各 3 個 Sprint，包含真實感的任務內容、留言與活動紀錄。
          </p>
        </div>

        {!done ? (
          <Button
            onClick={run}
            disabled={seeding}
            className="bg-brand hover:bg-brand-hover text-white w-full"
          >
            {seeding ? "建立中…" : "開始建立 Demo 資料"}
          </Button>
        ) : (
          <Button onClick={() => navigate("/projects")} className="w-full">
            前往工作區 →
          </Button>
        )}

        {log.length > 0 && (
          <div className="bg-muted rounded-xl p-4 text-xs font-mono space-y-1 max-h-60 overflow-y-auto">
            {log.map((line, i) => (
              <p key={i} className={line.startsWith("✓") ? "text-green-600 font-semibold" : "text-muted-foreground"}>
                {line}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
