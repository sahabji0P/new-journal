"use client"

import dynamic from "next/dynamic"

const SaathiChat = dynamic(
  () => import("./chat/SaathiChat").then(mod => mod.SaathiChat),
  { ssr: false }
)

export function LazySaathiChat() {
  return <SaathiChat />
}
