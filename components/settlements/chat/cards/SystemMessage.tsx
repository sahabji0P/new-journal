"use client"

interface SystemMessageProps {
  content: string
  createdAt: string
}

export function SystemMessage({ content, createdAt }: SystemMessageProps) {
  const time = new Date(createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })

  return (
    <div className="flex justify-center py-1.5">
      <div className="rounded-lg bg-muted/60 px-3 py-1 text-center">
        <p className="text-xs text-muted-foreground">{content}</p>
        <p className="mt-0.5 text-[10px] text-muted-foreground/70">{time}</p>
      </div>
    </div>
  )
}
