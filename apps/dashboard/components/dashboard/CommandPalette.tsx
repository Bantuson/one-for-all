'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/Dialog'
import { VisuallyHidden } from '@/components/ui/VisuallyHidden'
import { Search, Folder, User, Settings, FileText, Plus } from 'lucide-react'
import { TrafficLightsFilename } from '@/components/ui/TrafficLights'
import { cn } from '@/lib/utils'

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  institutionSlug: string
}

interface SearchResult {
  id: string
  type: 'course' | 'applicant' | 'setting' | 'action'
  icon: React.ReactNode
  path: string
  command: string
}

const QUICK_COMMANDS = [
  { command: 'add --course', label: 'Add course' },
  { command: 'add --campus', label: 'Add campus' },
  { command: 'export --csv', label: 'Export data' },
  { command: 'help', label: 'Help' },
]

const MOCK_RESULTS: SearchResult[] = [
  {
    id: '1',
    type: 'course',
    icon: <Folder className="h-4 w-4" />,
    path: 'courses/bsc-computer-science',
    command: 'cd',
  },
  {
    id: '2',
    type: 'applicant',
    icon: <User className="h-4 w-4" />,
    path: 'applicants/john-smith-2024',
    command: 'view',
  },
  {
    id: '3',
    type: 'setting',
    icon: <Settings className="h-4 w-4" />,
    path: 'settings/notifications',
    command: 'open',
  },
]

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Reset on close
  useEffect(() => {
    if (!open) {
      setSearchQuery('')
      setSelectedIndex(0)
    }
  }, [open])

  // Filter results based on query
  const filteredResults = searchQuery
    ? MOCK_RESULTS.filter(r =>
        r.path.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : MOCK_RESULTS

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(i => Math.min(i + 1, filteredResults.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(i => Math.max(i - 1, 0))
      } else if (e.key === 'Escape') {
        onOpenChange(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, filteredResults.length, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideCloseButton
        className="sm:max-w-lg p-0 gap-0 overflow-hidden top-[15%] translate-y-0 !bg-card ![background-image:none] border-border"
      >
        <VisuallyHidden>
          <DialogTitle>Command Palette</DialogTitle>
        </VisuallyHidden>

        {/* Header with Traffic Lights */}
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <TrafficLightsFilename
            status="active"
            filename="search.cmd"
            rightContent={
              <span className="text-xs text-muted-foreground font-mono">⌘K to close</span>
            }
          />
        </div>

        {/* Search Input - grep style */}
        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="text-syntax-dollar font-mono">$</span>
            <span className="text-syntax-command font-mono">grep -i</span>
            <span className="text-syntax-string font-mono">"</span>
            <input
              type="text"
              placeholder="search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent outline-none text-sm font-mono text-syntax-string placeholder:text-muted-foreground"
              autoFocus
            />
            <span className="text-syntax-string font-mono">"</span>
            <span className="text-syntax-command font-mono">--all</span>
          </div>
        </div>

        {/* Results section */}
        <div className="max-h-[300px] overflow-y-auto">
          {/* Section header */}
          <div className="px-4 py-2">
            <span className="text-xs font-mono text-syntax-comment">
              // {searchQuery ? 'Search results' : 'Recent searches'}
            </span>
          </div>

          {/* Results list */}
          <div className="pb-2">
            {filteredResults.map((result, index) => (
              <button
                key={result.id}
                className={cn(
                  'w-full px-4 py-2 flex items-center justify-between',
                  'hover:bg-muted/50 transition-colors',
                  index === selectedIndex && 'bg-muted'
                )}
                onClick={() => {
                  // Handle selection
                  onOpenChange(false)
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground">{result.icon}</span>
                  <span className="font-mono text-sm text-foreground">{result.path}</span>
                </div>
                <span className="font-mono text-xs text-primary">
                  $ {result.command} &rarr;
                </span>
              </button>
            ))}

            {searchQuery && filteredResults.length === 0 && (
              <div className="px-4 py-4 text-center">
                <p className="text-sm font-mono text-syntax-comment">
                  // No results for "{searchQuery}"
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Quick commands footer */}
        <div className="px-4 py-3 border-t border-border bg-muted/20">
          <div className="flex items-center gap-1">
            <span className="text-xs font-mono text-syntax-comment mr-2">// Commands:</span>
            {QUICK_COMMANDS.map((cmd, i) => (
              <button
                key={i}
                className="px-2 py-1 text-xs font-mono text-syntax-command hover:text-primary hover:bg-muted rounded transition-colors"
                onClick={() => {
                  // Handle command
                }}
              >
                $ {cmd.command}
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
