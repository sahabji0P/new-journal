import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { FileText } from "lucide-react"

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ReportPreviewProps {
  reportType: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ReportPreview(_props: ReportPreviewProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="size-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold mb-1">Report Preview</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          PDF preview will be available when @react-pdf/renderer is integrated.
          Currently, reports are exported as CSV.
        </p>
      </CardContent>
    </Card>
  )
}
