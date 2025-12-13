'use client'

import { useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { Moon, Sun, Bell, LogOut } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useClerk } from '@clerk/nextjs'

interface SettingsDropdownProps {
  children: React.ReactNode
}

export function SettingsDropdown({ children }: SettingsDropdownProps) {
  const { theme } = useTheme()
  const { signOut } = useClerk()
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)

  const handleSignOut = () => {
    signOut({ redirectUrl: '/' })
  }

  const toggleNotifications = () => {
    setNotificationsEnabled(!notificationsEnabled)
    // TODO: Implement actual notification settings
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-64 bg-card border-border font-mono bg-[radial-gradient(rgba(255,255,255,0.08)_1.4px,transparent_1.4px)] dark:bg-[radial-gradient(rgba(255,255,255,0.15)_1.4px,transparent_1.4px)] bg-[length:32px_32px]"
      >
        {/* Header */}
        <div className="px-3 py-2 border-b border-border">
          <p className="text-xs text-muted-foreground">
            <span className="text-traffic-green">//</span> Settings
          </p>
        </div>

        {/* Appearance */}
        <div className="px-3 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <span className="text-traffic-green">$</span>
              <span>theme --toggle</span>
              {theme === 'dark' ? (
                <Moon className="h-3 w-3 ml-1" />
              ) : (
                <Sun className="h-3 w-3 ml-1" />
              )}
            </div>
            <ThemeToggle />
          </div>
        </div>

        {/* Notifications */}
        <div className="px-3 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <span className="text-traffic-green">$</span>
              <span>notify --enable</span>
              <Bell className="h-3 w-3 ml-1" />
            </div>
            <button
              onClick={toggleNotifications}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                notificationsEnabled ? 'bg-traffic-green' : 'bg-muted'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                  notificationsEnabled ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>

        <DropdownMenuSeparator className="bg-border" />

        {/* Sign Out */}
        <DropdownMenuItem
          onClick={handleSignOut}
          className="text-traffic-red focus:text-traffic-red focus:bg-traffic-red/10 cursor-pointer px-3"
        >
          <span className="text-traffic-green mr-2">$</span>
          <span>exit --session</span>
          <LogOut className="h-3 w-3 ml-2" />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
