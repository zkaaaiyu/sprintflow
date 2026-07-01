# SprintFlow

多人協作任務管理平台，結合敏捷開發流程，以 React 與 Firebase 建構，支援看板管理、Sprint 規劃與即時同步。

**線上 Demo**：[sprintflow-eta.vercel.app](https://sprintflow-eta.vercel.app)

> Demo 帳號 — Email：`sprintflowdemo@gmail.com` ／ 密碼：`Sprintflow2026`

## Dashboard 
<img width="1470" height="834" alt="截圖 2026-07-01 晚上8 35 46" src="https://github.com/user-attachments/assets/81269e11-de76-44fc-aa4d-615869af197d" />

## Kanban
<img width="1469" height="834" alt="截圖 2026-07-01 晚上8 36 45" src="https://github.com/user-attachments/assets/f588b00d-3d58-4a38-b54f-5518b61050e8" />

## Task detil
<img width="1470" height="837" alt="截圖 2026-07-01 晚上8 37 22" src="https://github.com/user-attachments/assets/efd77ce9-8dd7-4d3a-96d9-8936afe0ba6f" />

---

## 功能介紹

### 身份驗證
- Email / 密碼 註冊與登入
- Google 第三方登入
- 忘記密碼（Email 重設連結）
- 個人設定：修改顯示名稱、上傳頭像（含裁切工具）

### Sidebar
- 可收合（icon 模式 / 完整模式）
- 每個 Project 下方可展開顯示進行中的 Sprint 快速連結

### Navbar
- 麵包屑導航，顯示目前所在頁面層級
- 通知鈴鐺：顯示跨專案的最近活動紀錄，有未讀時顯示紅點，需要點擊閱讀才會標記已讀（僅顯示近 7 天、加入專案後的紀錄）
- 使用者頭像下拉選單：快速前往個人設定、登出、dark mode 切換
- 搜尋功能：Command Palette

### Workspace
- 個人工作區，以卡片網格顯示所有加入的專案
- 卡片資訊：顏色標記、名稱、描述、成員頭像
- 建立新專案或透過邀請碼加入既有專案

### 專案管理
- 建立、編輯、刪除專案，可自訂名稱、描述、顏色
- 專案內三個分頁：**Sprints**、**Backlog**、**Team**

### Sprint 規劃
- 每個專案可建立多個 Sprint，設定名稱、目標、起訖日期
- Sprint 狀態：Planning / Active / Completed
- Timeline 形式瀏覽，不同階段的sprint用不同標籤表示
- 完成的 Sprint 仍可點進去看板瀏覽（唯讀模式、拖拉停用、不能修改任務資料）

### Kanban 看板
- 四欄：**To Do** / **In Progress** / **Review** / **Done**
- 支援跨欄拖拉排序（直向及橫向拖拉變更狀態或是順序）
- Firestore 即時同步，所有成員變更立即可見
- 欄頭顯示任務數量與故事點數總計
- 依指派成員或優先級篩選，不符合的卡片淡出
- 逾期任務卡片在左下角給予警示
- 可直接在看板新增任務，或從 Backlog 選取移入

### Backlog
- 網格卡片排列，顯示未排入 Sprint 的任務池
- 新增任務或將任務移入指定 Sprint
- 故事點數標記（1 / 2 / 3 / 5 / 8 / 13）

### 任務詳情
- 標題、描述
- 優先級：Low / Medium / High / Urgent
- 指派成員
- 截止日期（日曆選擇器）
- 故事點數
- 在 Sprint 與 Backlog 之間移動
- 留言串（即時更新）
- 活動紀錄（狀態變更、編輯歷程）

### 成員管理
- 角色：Owner / Member 兩層
- 透過邀請碼邀請成員加入
- 移除成員（僅 Owner 可操作）

### Dashboard
- 跨專案總覽
- **Active Sprints 摘要**：所有進行中 Sprint 的進度條
- **燃盡圖（Burndown Chart）**：故事點數完成趨勢
- **甜甜圈圖（Donut Chart）**：任務狀態分布
- **我的待辦**：個人待辦清單，可以隨手記下個人待辦事項
- **即將到期**：7 天內截止的任務
- **活動串流**：跨專案的最近操作紀錄
- **月曆面板**：方便查看當前日期（後續會更新行事曆頁面豐富實用性）


### 個人設定
- **個人資料**：修改顯示名稱、上傳頭像（含裁切工具，裁切後直接同步至 Firebase Storage）
- **安全性**：更改密碼（需輸入舊密碼驗證；Google 登入帳號此項自動停用）
- **外觀**：Light / Dark 主題切換
- **語言**：顯示語言選擇（目前支援英文，其他語言規劃中）
- **通知**：Email 通知、截止日提醒設定（後續版本中推出）
- **危險區域**：登出、刪除帳號（Email 帳號需輸入密碼二次確認，不可復原）

### Command Palette
- `⌘ K` 開啟全域搜尋
- 即時搜尋所有專案的任務標題
- 鍵盤導航（↑ ↓ Enter）
- 直接跳轉至對應任務


---

## 技術棧

| 類別 | 技術 |
|------|------|
| 框架 | React 19 + Vite |
| 語言 | TypeScript |
| 樣式 | Tailwind CSS + Shadcn/ui |
| 動畫 | Framer Motion |
| 拖拉 | dnd-kit |
| 圖表 | Recharts |
| 搜尋 | Fuse.js |
| 後端 | Firebase（Auth + Firestore） |
| 部署 | Vercel |

---

## 專案結構

```
src/
├── components/
│   ├── dashboard/     # Dashboard 各元件
│   ├── layout/        # Sidebar、Navbar、AppLayout
│   ├── search/        # Command Palette
│   ├── shared/        # MemberAvatar、ConfirmDialog
│   ├── ui/            # Shadcn 基礎元件
│   └── TaskDetailModal.tsx
├── contexts/          # AuthContext、ThemeContext、SidebarContext
├── hooks/             # Firebase 資料 hooks
├── lib/               # Firebase 設定、utils、常數
└── pages/
    ├── tabs/          # SprintsTab、BacklogTab、TeamTab
    ├── DashboardPage.tsx
    ├── LoginPage.tsx
    ├── ProjectDetailPage.tsx
    ├── ProjectsPage.tsx
    ├── RegisterPage.tsx
    ├── SettingsPage.tsx
    └── SprintKanbanPage.tsx
```

---

## 資料庫結構（Firestore）

```
projects/{projectId}
  ├── name, description, color
  ├── ownerId, memberIds[], roles{}
  └── inviteCode

sprints/{sprintId}
  ├── projectId, name, goal
  ├── status: planning | active | completed
  └── startDate, endDate

tasks/{taskId}
  ├── projectId, sprintId（null = Backlog）
  ├── title, description
  ├── priority: low | medium | high | urgent
  ├── status: todo | in_progress | review | done
  ├── storyPoints, assigneeId, dueDate, labels[]
  ├── comments/{commentId}
  └── activities/{activityId}
```

---

## 本地開發

```bash
# Clone 專案
git clone https://github.com/zkaaaiyu/sprintflow.git
cd sprintflow

# 安裝套件
npm install

# 設定環境變數
cp .env.example .env.local
# 在 .env.local 填入你的 Firebase 設定

# 啟動開發伺服器
npm run dev
```

### 環境變數

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```
