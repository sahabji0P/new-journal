"use client"

import dynamic from "next/dynamic"
import { usePathname } from "next/navigation"

const SaathiChat = dynamic(
  () => import("./chat/SaathiChat").then(mod => mod.SaathiChat),
  { ssr: false }
)

export function LazySaathiChat() {
  const pathname = usePathname() ?? ""

  if (pathname === "/dashboard") {
    return null
  }

  return <SaathiChat />
}
