'use client'

import { Search, Activity, Settings, User } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useEffect, useState } from 'react'
import { SettingsDropdown } from './SettingsDropdown'
import { CommandPalette } from './CommandPalette'
import { TrafficLights } from '@/components/ui/TrafficLights'
import { cn } from '@/lib/utils'

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
    <header className="border-b border-border sticky top-0 z-50 bg-card">
      {/* Main header row */}
      <div className="h-14 px-6 flex items-center">
        {/* Left: Logo with traffic lights - dual-tone */}
        <div className="flex items-center gap-4 w-72">
          <div className="flex items-center gap-3 px-3 py-1.5 rounded-md bg-muted/50 border border-border/50">
            <TrafficLights status="active" size="sm" />
            <span className="font-mono text-sm">
              <span className="text-syntax-export">export</span>
              <span className="text-syntax-key ml-1">oneforall</span>
            </span>
          </div>
        </div>

        {/* Center: Search Bar */}
        <div className="flex-1 max-w-lg mx-auto">
          <div
            className="relative cursor-pointer group"
            onClick={() => setCommandPaletteOpen(true)}
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <div
              className={cn(
                'w-full pl-10 pr-20 py-2 text-sm rounded-md',
                'border border-input bg-background',
                'font-mono text-muted-foreground',
                'group-hover:border-primary/50 transition-colors'
              )}
            >
              <span className="text-muted-foreground"><span className="text-traffic-green">//</span> Search courses, applications...</span>
            </div>
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 text-xs bg-muted text-muted-foreground rounded border border-border font-mono">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Right: Action Buttons - Traffic Light Colors */}
        <div className="flex items-center gap-1 w-72 justify-end">
          {/* Usage/Stats - RED */}
          <Button
            variant="ghost"
            size="icon"
            className="text-traffic-red hover:text-traffic-red hover:bg-traffic-red/10 transition-colors"
            title="Usage"
          >
            <Activity className="h-5 w-5" />
          </Button>

          {/* Profile - YELLOW */}
          <Button
            variant="ghost"
            size="icon"
            className="text-traffic-yellow hover:text-traffic-yellow hover:bg-traffic-yellow/10 transition-colors"
            title="Profile"
          >
            <User className="h-5 w-5" />
          </Button>

          {/* Settings Dropdown - GREEN */}
          <SettingsDropdown>
            <Button
              variant="ghost"
              size="icon"
              className="text-traffic-green hover:text-traffic-green hover:bg-traffic-green/10 transition-colors"
              title="Settings"
            >
              <Settings className="h-5 w-5" />
            </Button>
          </SettingsDropdown>
        </div>
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
