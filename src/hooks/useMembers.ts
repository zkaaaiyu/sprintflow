//根據用戶 ID 列表查詢用戶資料
import { useState, useEffect } from "react"
import { collection, query, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"

export type UserProfile = {
  uid: string
  displayName: string
  email: string
  photoURL: string | null
}

export function useMembers(memberIds: string[]) {
  const [members, setMembers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (memberIds.length === 0) {
      setMembers([])
      setLoading(false)
      return
    }

    const fetchMembers = async () => {
      const q = query(
        collection(db, "users"),
        where("uid", "in", memberIds)  // 找 uid 等於 memberIds 的
      )
      const snap = await getDocs(q)
      setMembers(snap.docs.map((d) => d.data() as UserProfile))
      setLoading(false)
    }

    fetchMembers()
  }, [memberIds.join(",")]) //把陣列轉化為字串進行比對  避免無限重查

  return { members, loading }
}