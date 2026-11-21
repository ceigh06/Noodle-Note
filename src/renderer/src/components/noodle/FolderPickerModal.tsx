import { useState } from 'react'
import {
  Check,
  ChevronRight,
  Folder,
  FolderOpen,
  HardDrive,
  Home,
  Search,
  Clock,
  Star
} from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type FsNode = { name: string; children?: FsNode[] }

const TREE: FsNode = {
  name: 'home',
  children: [
    {
      name: 'Documents',
      children: [
        {
          name: 'University',
          children: [{ name: 'Semester 5' }, { name: 'Thesis' }]
        },
        { name: 'Research' }
      ]
    },
    { name: 'Desktop', children: [{ name: 'Course Notes' }] },
    { name: 'Downloads' },
    { name: 'Projects', children: [{ name: 'Deep Learning Notes' }] }
  ]
}

const FAVORITES = [
  { label: 'Home', segments: [] as string[] },
  { label: 'Documents', segments: ['Documents'] },
  { label: 'Desktop', segments: ['Desktop'] },
  { label: 'Downloads', segments: ['Downloads'] },
  { label: 'Projects', segments: ['Projects'] }
]

function resolve(segments: string[]): FsNode | null {
  let node: FsNode = TREE
  for (const seg of segments) {
    const next = node.children?.find((c) => c.name === seg)
    if (!next) return null
    node = next
  }
  return node
}

const toPath = (segments: string[]): string => `~${segments.length ? '/' + segments.join('/') : ''}`

interface FolderPickerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPick: (path: string) => void
}

export function FolderPickerModal({
  open,
  onOpenChange,
  onPick
}: FolderPickerModalProps): React.ReactNode {
  const [segments, setSegments] = useState<string[]>([])
  const [selected, setSelected] = useState<string | null>(null)

  const cwd = resolve(segments) ?? TREE
  const children = cwd.children ?? []
  const selectedPath = selected ? toPath([...segments, selected]) : toPath(segments)
  const canOpen = !!selected && !!cwd.children?.some((c) => c.name === selected && c.children)

  const close = (next: boolean): void => {
    if (!next) {
      setSegments([])
      setSelected(null)
    }
    onOpenChange(next)
  }

  const enter = (name: string): void => {
    setSegments((s) => [...s, name])
    setSelected(null)
  }

  const pick = (): void => {
    onPick(selectedPath)
    setSegments([])
    setSelected(null)
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent
        showCloseButton={false}
        className="max-w-2xl gap-0 overflow-hidden rounded-2xl border-border bg-popover p-0 shadow-float"
      >
        <DialogTitle className="sr-only">Choose your workspace folder</DialogTitle>
        <DialogDescription className="sr-only">
          Simulated system folder picker. Pick a root directory for your Noodle workspace.
        </DialogDescription>

        <div className="flex items-center gap-2 border-b border-border bg-card px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-destructive/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-primary/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/50" />
          <span className="ml-3 flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground">
            <FolderOpen className="h-3.5 w-3.5" /> Choose your workspace folder
          </span>
        </div>

        <div className="flex h-[22rem]">
          <aside className="hidden w-44 shrink-0 flex-col gap-1 border-r border-border bg-card/50 p-3 sm:flex">
            <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Favorites
            </p>
            {FAVORITES.map((f) => {
              const active = f.segments.join('/') === segments.join('/')
              return (
                <button
                  key={f.label}
                  onClick={() => {
                    setSegments(f.segments)
                    setSelected(null)
                  }}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition',
                    active
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
                  )}
                >
                  {f.label === 'Home' ? (
                    <Home className="h-3.5 w-3.5" />
                  ) : (
                    <Star className="h-3.5 w-3.5" />
                  )}
                  {f.label}
                </button>
              )
            })}
            <p className="px-2 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Locations
            </p>
            <div className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground">
              <HardDrive className="h-3.5 w-3.5" /> MacBook SSD
            </div>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-center gap-1 border-b border-border px-4 py-2.5 text-xs text-muted-foreground">
              <button
                onClick={() => {
                  setSegments([])
                  setSelected(null)
                }}
                className="rounded px-1.5 py-0.5 hover:bg-accent hover:text-foreground"
              >
                home
              </button>
              {segments.map((seg, i) => (
                <span key={i} className="flex items-center gap-1">
                  <ChevronRight className="h-3 w-3" />
                  <button
                    onClick={() => {
                      setSegments(segments.slice(0, i + 1))
                      setSelected(null)
                    }}
                    className="rounded px-1.5 py-0.5 hover:bg-accent hover:text-foreground"
                  >
                    {seg}
                  </button>
                </span>
              ))}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {children.length === 0 && (
                <p className="grid h-full place-items-center text-xs text-muted-foreground">
                  This folder is empty.
                </p>
              )}
              {children.map((c) => {
                const on = selected === c.name
                return (
                  <button
                    key={c.name}
                    onClick={() => setSelected(c.name)}
                    onDoubleClick={() => enter(c.name)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition',
                      on ? 'bg-accent text-accent-foreground' : 'text-foreground hover:bg-accent/50'
                    )}
                  >
                    <Folder
                      className={cn(
                        'h-4 w-4 shrink-0',
                        on ? 'text-primary' : 'text-muted-foreground'
                      )}
                    />
                    <span className="flex-1 truncate font-medium">{c.name}</span>
                    {on && <Check className="h-3.5 w-3.5 text-primary" />}
                  </button>
                )
              })}
            </div>

            <div className="relative border-t border-border px-4 py-2">
              <Search className="absolute left-7 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search folders…"
                className="h-8 rounded-full border-border bg-background pl-9 text-xs"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-border bg-card px-4 py-3">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate font-mono">{selectedPath}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => close(false)}>
            Cancel
          </Button>
          {canOpen && (
            <Button size="sm" variant="secondary" onClick={() => enter(selected!)}>
              Open
            </Button>
          )}
          <Button size="sm" className="font-semibold" onClick={pick}>
            Use this folder
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
