"use client"

import { useApp } from "@/contexts/AppContext"
import { Button } from "../ui/button"
import { X, Download } from "lucide-react"
import { Dialog, DialogContent } from "../ui/dialog"
import { useState } from "react"

interface ReceiptViewerProps {
  transactionId: number
}

export function ReceiptViewer({ transactionId }: ReceiptViewerProps) {
  const { getReceiptsByTransaction, deleteReceipt } = useApp()
  const receipts = getReceiptsByTransaction(transactionId)
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null)

  if (receipts.length === 0) {
    return null
  }

  const handleDownload = (receipt: { imageData: string; fileName: string }) => {
    const link = document.createElement("a")
    link.href = receipt.imageData
    link.download = receipt.fileName || "receipt.jpg"
    link.click()
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-mono font-semibold">Receipts ({receipts.length})</p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {receipts.map(receipt => (
          <div key={receipt.id} className="relative group">
            <div
              className="aspect-square rounded-lg overflow-hidden border-2 border-muted hover:border-primary cursor-pointer transition-colors"
              onClick={() => setSelectedReceipt(receipt.imageData)}
            >
              <img
                src={receipt.thumbnailData || receipt.imageData}
                alt={receipt.fileName}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
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
              {(receipt.fileSize / 1024).toFixed(0)} KB
            </p>
          </div>
        ))}
      </div>

      {/* Full-size image viewer */}
      <Dialog open={!!selectedReceipt} onOpenChange={() => setSelectedReceipt(null)}>
        <DialogContent className="max-w-4xl p-2">
          <div className="relative">
            {selectedReceipt && (
              <img
                src={selectedReceipt}
                alt="Receipt"
                className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
