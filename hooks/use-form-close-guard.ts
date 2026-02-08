"use client"

import { useCallback, useRef } from "react"

const DEFAULT_MESSAGE =
  "You have unsaved changes. Press OK to discard them or Cancel to stay on this form."

export function useFormCloseGuard<T>() {
  const snapshotRef = useRef<string>("")

  const rememberSnapshot = useCallback((value: T) => {
    snapshotRef.current = JSON.stringify(value)
  }, [])

  const clearSnapshot = useCallback(() => {
    snapshotRef.current = ""
  }, [])

  const hasUnsavedChanges = useCallback((value: T) => {
    if (!snapshotRef.current) return false
    return JSON.stringify(value) !== snapshotRef.current
  }, [])

  const confirmClose = useCallback(
    (value: T, message: string = DEFAULT_MESSAGE) => {
      if (!hasUnsavedChanges(value)) return true
      return window.confirm(message)
    },
    [hasUnsavedChanges]
  )

  return {
    rememberSnapshot,
    clearSnapshot,
    hasUnsavedChanges,
    confirmClose,
  }
}
