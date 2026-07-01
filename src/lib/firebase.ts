// firebase 資料庫連線初始化
import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth" // 身份驗證 服務
import { getFirestore } from "firebase/firestore" // Firestore 資料庫 服務
import { getStorage } from "firebase/storage" // 雲端檔案儲存 服務

//建立 Firebase 配置物件
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// 建立 Firebase App 實體 把配置物件丟到firebase app初始化裡面 會返回一個app物件
const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)  // 導出身份認證服務
export const db = getFirestore(app) // 導出資料庫服務
export const storage = getStorage(app)  // 導出雲端存儲服務