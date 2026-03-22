"use client"

import { useState, useRef } from "react"
import { Camera, Loader2, Upload, CheckCircle2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { toast } from "@/lib/toast"
import type { ScanTarget } from "@/lib/types"

interface ScannerProps {
  target: ScanTarget
  onExtracted: (data: Record<string, unknown>) => void
  onClose: () => void
}

const targetLabels: Record<ScanTarget, string> = {
  investment_statement: "Investment Statement",
  insurance_policy: "Insurance Policy",
  identity_document: "Identity Document",
  device_invoice: "Device Invoice",
  vehicle_rc: "Vehicle RC",
  vehicle_invoice: "Vehicle Invoice",
  general: "Document",
}

export function Scanner({ target, onExtracted, onClose }: ScannerProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isExtracting, setIsExtracting] = useState(false)
  const [isDone, setIsDone] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleExtract = async () => {
    if (!imagePreview) return

    setIsExtracting(true)

    try {
      const response = await fetch("/api/investments/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: imagePreview,
          target,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          (errorData as { error?: string }).error || "Failed to extract information"
        )
      }

      const result = await response.json()
      const data = (result as { data?: Record<string, unknown> }).data ?? result

      setIsDone(true)
      toast.success("Information extracted successfully")
      onExtracted(data as Record<string, unknown>)

      // Brief delay so the user sees the success state
      setTimeout(() => {
        onClose()
      }, 600)
    } catch (error) {
      toast.error(
        "Failed to extract information",
        { description: error instanceof Error ? error.message : "Please try again." }
      )
    } finally {
      setIsExtracting(false)
    }
  }

  const reset = () => {
    setImagePreview(null)
    setIsDone(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Scan {targetLabels[target]}</DialogTitle>
          <DialogDescription>
            Take a photo or upload an image to automatically extract information.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* File input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />

          {!imagePreview ? (
            <div className="grid gap-2">
              {/* Mobile camera capture */}
              <Button
                variant="outline"
                className="h-32 w-full flex-col gap-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="size-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Take Photo or Upload Image
                </span>
              </Button>

              {/* Desktop file selection */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.removeAttribute("capture")
                    fileInputRef.current.click()
                    // Restore capture for next time
                    setTimeout(() => {
                      fileInputRef.current?.setAttribute("capture", "environment")
                    }, 100)
                  }
                }}
              >
                <Upload className="size-4 mr-2" />
                Choose from files
              </Button>
            </div>
          ) : (
            <div className="grid gap-3">
              {/* Image preview */}
              <div className="relative rounded-lg border overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreview}
                  alt="Document preview"
                  className="w-full max-h-64 object-contain bg-muted"
                />
              </div>

              {isExtracting && (
                <div className="flex items-center justify-center gap-2 py-2">
                  <Loader2 className="size-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">
                    Extracting information...
                  </span>
                </div>
              )}

              {isDone && (
                <div className="flex items-center justify-center gap-2 py-2">
                  <CheckCircle2 className="size-4 text-emerald-500" />
                  <span className="text-sm text-emerald-600 dark:text-emerald-400">
                    Extraction complete
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {imagePreview && !isDone && (
            <>
              <Button variant="outline" onClick={reset} disabled={isExtracting}>
                Retake
              </Button>
              <Button onClick={handleExtract} disabled={isExtracting}>
                {isExtracting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Extracting...
                  </>
                ) : (
                  "Extract"
                )}
              </Button>
            </>
          )}
          {!imagePreview && (
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
