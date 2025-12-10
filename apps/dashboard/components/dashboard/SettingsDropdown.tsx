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
      <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
        <DropdownMenuLabel>Settings</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Appearance */}
        <div className="px-2 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {theme === 'dark' ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
              <span className="text-sm">Appearance</span>
            </div>
            <ThemeToggle />
          </div>
        </div>

        {/* Notifications */}
        <div className="px-2 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="text-sm">Notifications</span>
            </div>
            <button
              onClick={toggleNotifications}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                notificationsEnabled ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  notificationsEnabled ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>

        <DropdownMenuSeparator />

        {/* Sign Out */}
        <DropdownMenuItem
          onClick={handleSignOut}
          className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950 cursor-pointer"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
