'use client'

import Image from 'next/image'
import { Search, Bell, Settings, User } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useEffect, useState } from 'react'
import { SettingsDropdown } from './SettingsDropdown'
import { CommandPalette } from './CommandPalette'

interface DashboardHeaderProps {
  institution: {
    name: string
    slug: string
    logo_url?: string
  }
}

export function DashboardHeader({ institution }: DashboardHeaderProps) {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)

  // Ctrl+K keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setCommandPaletteOpen(true)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  return (
    <header className="h-16 border-b bg-white dark:bg-black flex items-center px-6 sticky top-0 z-50">
      {/* Left: One For All Logo */}
      <div className="flex items-center gap-4 w-64">
        <Image
          src="/images/oneforall-letterman.png"
          alt="One For All"
          width={120}
          height={40}
          priority
          className="object-contain"
        />
      </div>

      {/* Center: Search Bar */}
      <div className="flex-1 max-w-md mx-auto">
        <div className="relative" onClick={() => setCommandPaletteOpen(true)}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search"
            className="w-full pl-10 pr-20 py-1 text-sm border rounded-md bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-black transition-colors cursor-pointer"
            readOnly
          />
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-xs bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded border border-gray-300 dark:border-gray-700 font-mono">
            Ctrl K
          </kbd>
        </div>
      </div>

      {/* Right: Action Buttons (Letterman Colors) */}
      <div className="flex items-center gap-2 w-64 justify-end">
        {/* Usage - Blue */}
        <Button
          variant="ghost"
          size="icon"
          className="text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors"
          title="Usage & Analytics"
        >
          <Bell className="h-5 w-5" />
        </Button>

        {/* Profile - Yellow */}
        <Button
          variant="ghost"
          size="icon"
          className="text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-950 transition-colors"
          title="Profile"
        >
          <User className="h-5 w-5" />
        </Button>

        {/* Settings Dropdown - Black */}
        <SettingsDropdown>
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-950 transition-colors"
            title="Settings"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </SettingsDropdown>
      </div>

      {/* Command Palette */}
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        institutionSlug={institution.slug}
      />
    </header>
  )
}
