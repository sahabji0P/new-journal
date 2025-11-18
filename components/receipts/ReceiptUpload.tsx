"use client"

import { useState, useRef } from "react"
import { useApp } from "@/contexts/AppContext"
import { Button } from "../ui/button"
import { Upload, Image as ImageIcon } from "lucide-react"
import { toast } from "sonner"

interface ReceiptUploadProps {
  transactionId: number
  onUploadComplete?: () => void
}

export function ReceiptUpload({ transactionId, onUploadComplete }: ReceiptUploadProps) {
  const { addReceipt } = useApp()
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file")
      return
    }

    // Check file size (max 2MB for localStorage)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image size must be less than 2MB")
      return
    }

    try {
      // Convert to base64
      const reader = new FileReader()
      reader.onload = (e) => {
        const imageData = e.target?.result as string

        // Create thumbnail (optional - for now we'll use the same image)
        addReceipt({
          transactionId,
          imageData,
          fileName: file.name,
          fileSize: file.size,
          uploadDate: new Date().toISOString(),
        })

        onUploadComplete?.()
      }
      reader.readAsDataURL(file)
    } catch {
      toast.error("Failed to upload receipt")
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
        isDragging
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25 hover:border-primary/50"
      }`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <ImageIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
      <p className="text-sm font-mono text-muted-foreground mb-4">
        Drag & drop receipt image here, or click to upload
      </p>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        className="hidden"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        className="gap-2"
      >
        <Upload className="w-4 h-4" />
        Choose File
      </Button>
      <p className="text-xs text-muted-foreground mt-2 font-mono">
        Max size: 2MB • Formats: JPG, PNG, GIF
      </p>
    </div>
  )
}
