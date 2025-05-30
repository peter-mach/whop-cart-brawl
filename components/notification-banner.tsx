"use client"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Bell, X } from "lucide-react"

interface NotificationBannerProps {
  message: string
  onDismiss: () => void
}

export function NotificationBanner({ message, onDismiss }: NotificationBannerProps) {
  return (
    <Alert className="border-blue-200 bg-blue-50">
      <Bell className="h-4 w-4 text-blue-600" />
      <AlertDescription className="flex items-center justify-between">
        <span className="text-blue-800">{message}</span>
        <Button variant="ghost" size="sm" onClick={onDismiss} className="h-6 w-6 p-0 text-blue-600 hover:bg-blue-100">
          <X className="h-4 w-4" />
        </Button>
      </AlertDescription>
    </Alert>
  )
}
