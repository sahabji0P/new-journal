"use client"

import { useApp } from "@/contexts/AppContext"
import { Button } from "../ui/button"
import { X, Download } from "lucide-react"
import { Dialog, DialogContent } from "../ui/dialog"
import { useState } from "react"
import Image from "next/image"

interface ReceiptViewerProps {
  transactionId: string
}

export function ReceiptViewer({ transactionId }: ReceiptViewerProps) {
  const { getReceiptsByTransaction, deleteReceipt } = useApp()
  const receipts = getReceiptsByTransaction(transactionId)
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null)

  if (receipts.length === 0) {
    return null
  }

  const handleDownload = (receipt: { imageData?: string; fileUrl?: string; fileName: string }) => {
    const url = receipt.imageData || receipt.fileUrl
    if (!url) return

    const link = document.createElement("a")
    link.href = url
    link.download = receipt.fileName || "receipt.jpg"
    link.click()
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-mono font-semibold">Receipts ({receipts.length})</p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {receipts.map(receipt => (
          <div key={receipt.id} className="relative group">
            {/*
              Stored receipts may come from inline data, blob URLs, or remote file URLs.
              Keep this resolved in one place so preview and click behavior stay aligned.
            */}
            {(() => {
              const previewSrc = receipt.thumbnailData || receipt.imageData || receipt.fileUrl
              if (!previewSrc) {
                return (
                  <div className="aspect-square rounded-lg border-2 border-dashed border-muted flex items-center justify-center text-xs text-muted-foreground">
                    No preview
                  </div>
                )
              }

              return (
                <div
                  className="relative aspect-square rounded-lg overflow-hidden border-2 border-muted hover:border-primary cursor-pointer transition-colors"
                  onClick={() => {
                    const imageUrl = receipt.imageData || receipt.fileUrl
                    if (imageUrl) setSelectedReceipt(imageUrl)
                  }}
                >
                  <Image
                    src={previewSrc}
                    alt={receipt.fileName}
                    fill
                    sizes="(max-width: 768px) 50vw, 33vw"
                    className="object-cover"
                    unoptimized
                  />
                </div>
              )
            })()}
            <div className="absolute top-1 right-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex gap-1">
              <Button
                size="sm"
                variant="secondary"
                className="h-6 w-6 p-0"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDownload(receipt)
                }}
              >
                <Download className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="h-6 w-6 p-0"
                onClick={(e) => {
                  e.stopPropagation()
                  if (confirm("Delete this receipt?")) {
                    deleteReceipt(receipt.id)
                  }
                }}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-mono truncate">
              {receipt.fileName}
            </p>
            <p className="text-xs text-muted-foreground font-mono">
              {((receipt.fileSize ?? 0) / 1024).toFixed(0)} KB
            </p>
          </div>
        ))}
      </div>

      {/* Full-size image viewer */}
      <Dialog open={!!selectedReceipt} onOpenChange={() => setSelectedReceipt(null)}>
        <DialogContent className="max-w-4xl p-2">
          <div className="relative">
            {selectedReceipt && (
              <Image
                src={selectedReceipt}
                alt="Receipt"
                width={1200}
                height={1600}
                className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
                unoptimized
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
