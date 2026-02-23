"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FieldLabel } from "@/components/ui/field"

interface CreateGroupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  groupName: string
  onGroupNameChange: (name: string) => void
  groupDescription: string
  onGroupDescriptionChange: (desc: string) => void
  onSubmit: () => void
}

export function CreateGroupDialog({
  open,
  onOpenChange,
  groupName,
  onGroupNameChange,
  groupDescription,
  onGroupDescriptionChange,
  onSubmit,
}: CreateGroupDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-mono">Create Group</DialogTitle>
          <DialogDescription>
            Create a shared settlement group and invite members.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid gap-2">
            <FieldLabel>Group Name*</FieldLabel>
            <Input
              placeholder="Trip to Goa"
              value={groupName}
              onChange={(e) => onGroupNameChange(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <FieldLabel>Description (optional)</FieldLabel>
            <Input
              placeholder="Friends travel split"
              value={groupDescription}
              onChange={(e) => onGroupDescriptionChange(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!groupName.trim()} onClick={onSubmit}>
            Create Group
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
