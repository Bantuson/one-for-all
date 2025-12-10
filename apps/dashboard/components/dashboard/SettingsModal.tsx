'use client'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { Label } from '@/components/ui/Label'

interface SettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Customize your dashboard preferences
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Theme Settings */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Appearance</Label>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Switch between light and dark theme
              </span>
              <ThemeToggle />
            </div>
          </div>

          {/* Placeholder for future settings */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Notifications</Label>
            <p className="text-sm text-muted-foreground">
              Email and push notification preferences coming soon
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Language</Label>
            <p className="text-sm text-muted-foreground">
              Multi-language support coming soon
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
