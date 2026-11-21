import React from 'react'
import { createFileRoute, Outlet, useRouterState, Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import {
  FileText,
  PenLine,
  Sparkles,
  Search,
  Plus,
  PanelLeftClose,
  PanelLeft,
  NotebookPen,
  Lock,
  MoreHorizontal,
  Minimize2,
  FolderOpen,
  KeyRound
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  noodleAPI,
  categories,
  categoryStyles,
  formatStamp,
  type Note,
  type Pillar
} from '@/lib/noodle-api'
import { useUI } from '@/store/ui'
import { NoteEditor } from '@/components/noodle/NoteEditor'
import { KeySetupWizard } from '@/components/noodle/KeySetupWizard'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/workspace')({
  component: App
})

const pillars: { id: Pillar; label: string; hint: string; icon: typeof FileText }[] = [
  { id: 'sources', label: 'Sources', hint: 'PDFs, slides, references', icon: FileText },
  { id: 'manual', label: 'Manual Notes', hint: 'Your vault · AI read-only', icon: PenLine },
  { id: 'ai', label: 'AI Directory', hint: 'Guides & gap analyses', icon: Sparkles }
]

// eslint-disable-next-line react-refresh/only-export-components -- TanStack route file exports both Route and local components by design
function App(): React.ReactNode {
  const ui = useUI()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const toolActive = pathname !== '/workspace'
  const [notes, setNotes] = useState<Note[]>([])

  useEffect(() => {
    noodleAPI.notes
      .list()
      .then(setNotes)
      .catch(() => setNotes([]))
  }, [pathname])

  const active = notes.find((n) => n.id === ui.activeNoteId) ?? null
  const upsert = (n: Note): void =>
    setNotes((list) =>
      list.some((x) => x.id === n.id) ? list.map((x) => (x.id === n.id ? n : x)) : [n, ...list]
    )

  const addNote = async (): Promise<void> => {
    try {
      const n = await noodleAPI.notes.create(ui.pillar === 'sources' ? 'manual' : ui.pillar)
      upsert(n)
      ui.openNote(n.id)
    } catch {
      return
    }
  }

  if (ui.miniMode && !toolActive) {
    return (
      <TooltipProvider>
        <div className="grid min-h-screen place-items-center bg-background p-6">
          <div className="h-[80vh] w-full max-w-xl">
            {active ? (
              <NoteEditor key={active.id} note={active} onSaved={upsert} />
            ) : (
              <div className="grid h-full place-items-center rounded-2xl border border-border bg-card shadow-float">
                <div className="text-center">
                  <NotebookPen className="mx-auto h-8 w-8 text-primary" />
                  <p className="mt-3 text-sm text-muted-foreground">No note open</p>
                  <div className="mt-4 flex justify-center gap-2">
                    <Button size="sm" onClick={addNote}>
                      New note
                    </Button>
                    <Button size="sm" variant="secondary" onClick={ui.toggleMini}>
                      Back
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </TooltipProvider>
    )
  }

  return (
    <TooltipProvider>
      <div className="flex h-screen overflow-hidden bg-background text-foreground">
        <Sidebar notes={notes} />
        <main className="flex min-w-0 flex-1 flex-col">
          <TopBar onAdd={addNote} />
          <div className="min-h-0 flex-1">
            {toolActive ? (
              <Outlet />
            ) : ui.view === 'editor' && active ? (
              <NoteEditor key={active.id} note={active} onSaved={upsert} />
            ) : (
              <Dashboard notes={notes} />
            )}
          </div>
        </main>
      </div>
    </TooltipProvider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components -- TanStack route file exports both Route and local components by design
function Sidebar({ notes }: { notes: Note[] }): React.ReactNode {
  const {
    pillar,
    setPillar,
    sidebarCollapsed,
    toggleSidebar,
    category,
    setCategory,
    workspacePath
  } = useUI()
  const studyActive = useRouterState({ select: (s) => s.location.pathname === '/workspace/study' })
  const synthesizerActive = useRouterState({
    select: (s) => s.location.pathname === '/workspace/synthesizer'
  })
  return (
    <aside
      className={cn(
        'flex shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-all',
        sidebarCollapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex h-16 items-center gap-2 px-4">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary font-display text-lg font-semibold text-primary-foreground">
          n
        </div>
        {!sidebarCollapsed && <span className="font-display text-xl font-semibold">Noodle</span>}
        <button
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
          className="ml-auto text-muted-foreground hover:text-foreground"
        >
          {sidebarCollapsed ? (
            <PanelLeft className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
      </div>
      <nav className="space-y-1 px-2">
        {!sidebarCollapsed && (
          <p className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Workspace
          </p>
        )}
        <Button
          asChild
          variant="ghost"
          className={cn(
            'h-10 w-full justify-start rounded-md px-3',
            studyActive && 'bg-sidebar-accent text-primary'
          )}
        >
          <Link to="/workspace/study" aria-label="Study recommendations">
            <Sparkles className="h-4 w-4" />
            {!sidebarCollapsed && 'Study recommendations'}
          </Link>
        </Button>
        <Button
          asChild
          variant="ghost"
          className={cn(
            'h-10 w-full justify-start rounded-md px-3',
            synthesizerActive && 'bg-sidebar-accent text-primary'
          )}
        >
          <Link to="/workspace/synthesizer" aria-label="The Synthesizer">
            <Sparkles className="h-4 w-4" />
            {!sidebarCollapsed && 'The Synthesizer'}
          </Link>
        </Button>
        {pillars.map((p) => {
          const count = notes.filter((n) => n.pillar === p.id).length
          const on = pillar === p.id && !studyActive && !synthesizerActive
          return (
            <Tooltip key={p.id}>
              <TooltipTrigger asChild>
                <Link
                  to="/workspace"
                  onClick={() => setPillar(p.id)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition',
                    on
                      ? 'bg-sidebar-accent text-foreground'
                      : 'text-muted-foreground hover:bg-sidebar-accent/60'
                  )}
                >
                  <p.icon className={cn('h-4 w-4 shrink-0', on && 'text-primary')} />
                  {!sidebarCollapsed && (
                    <>
                      <span className="flex-1">
                        <span className="flex items-center gap-1.5 text-sm font-medium">
                          {p.label}{' '}
                          {p.id === 'manual' && <Lock className="h-3 w-3 text-muted-foreground" />}
                        </span>
                        <span className="block text-[11px] text-muted-foreground">{p.hint}</span>
                      </span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums">
                        {count}
                      </span>
                    </>
                  )}
                </Link>
              </TooltipTrigger>
              {sidebarCollapsed && (
                <TooltipContent side="right">
                  {p.label} · {count}
                </TooltipContent>
              )}
            </Tooltip>
          )
        })}
      </nav>
      {!sidebarCollapsed && (
        <div className="mt-6 px-2">
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Categories
          </p>
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(category === c ? null : c)}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-3 py-1.5 text-sm transition',
                category === c
                  ? 'bg-sidebar-accent text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <span className={cn('h-2 w-2 rounded-full', categoryStyles[c].bg)} />
              {c}
            </button>
          ))}
        </div>
      )}
      {workspacePath && !sidebarCollapsed && (
        <div className="mt-auto border-t border-sidebar-border p-4">
          <p className="flex items-center gap-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            <FolderOpen className="h-3 w-3" /> Root folder
          </p>
          <p className="truncate font-mono text-[11px] text-muted-foreground" title={workspacePath}>
            {workspacePath}
          </p>
        </div>
      )}
    </aside>
  )
}

// eslint-disable-next-line react-refresh/only-export-components -- TanStack route file exports both Route and local components by design
function TopBar({ onAdd }: { onAdd: () => void }): React.ReactNode {
  const { search, setSearch, aiEnabled, setAi, toggleMini, workspacePath } = useUI()
  const [keySetupOpen, setKeySetupOpen] = useState(false)
  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-border px-6">
      <div className="relative max-w-md flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search notes, sources, guides…"
          className="rounded-full border-border bg-card pl-9"
        />
      </div>
      {workspacePath && (
        <div
          className="hidden items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground lg:flex"
          title={workspacePath}
        >
          <FolderOpen className="h-3.5 w-3.5" />
          <span className="max-w-44 truncate font-mono">{workspacePath}</span>
        </div>
      )}
      <div className="ml-auto flex items-center gap-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Configure cloud API key"
              onClick={() => setKeySetupOpen(true)}
            >
              <KeyRound className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Configure cloud API key</TooltipContent>
        </Tooltip>
        <label className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold">
          <Sparkles
            className={cn('h-3.5 w-3.5', aiEnabled ? 'text-primary' : 'text-muted-foreground')}
          />
          AI {aiEnabled ? 'ON' : 'OFF'}
          <Switch checked={aiEnabled} onCheckedChange={setAi} />
        </label>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={toggleMini} aria-label="Mini notebook">
              <Minimize2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Mini notebook</TooltipContent>
        </Tooltip>
        <Button onClick={onAdd} className="gap-1.5 rounded-full font-semibold">
          <Plus className="h-4 w-4" /> Add New Note
        </Button>
        <div className="flex items-center gap-2">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-secondary text-xs font-semibold">SD</AvatarFallback>
          </Avatar>
          <span className="hidden text-sm font-medium lg:block">Steve Dean</span>
        </div>
      </div>
      <KeySetupWizard open={keySetupOpen} onOpenChange={setKeySetupOpen} />
    </header>
  )
}

// eslint-disable-next-line react-refresh/only-export-components -- TanStack route file exports both Route and local components by design
function Dashboard({ notes }: { notes: Note[] }): React.ReactNode {
  const { pillar, category, setCategory, search, openNote } = useUI()
  const current = pillars.find((p) => p.id === pillar) ?? {
    label: 'Manual Notes',
    hint: 'Your vault · AI read-only'
  }
  const list = useMemo(
    () =>
      notes.filter(
        (n) =>
          n.pillar === pillar &&
          (!category || n.category === category) &&
          (!search || (n.title + n.content).toLowerCase().includes(search.toLowerCase()))
      ),
    [notes, pillar, category, search]
  )

  return (
    <div className="h-full overflow-y-auto px-8 py-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-4xl font-semibold">{current.label}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{current.hint}</p>
        </div>
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        <button
          onClick={() => setCategory(null)}
          className={cn(
            'rounded-full border px-4 py-1.5 text-xs font-semibold transition',
            !category
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border text-muted-foreground hover:text-foreground'
          )}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(category === c ? null : c)}
            className={cn(
              'flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold transition',
              category === c
                ? cn(categoryStyles[c].border, 'bg-card text-foreground')
                : 'border-border text-muted-foreground hover:text-foreground'
            )}
          >
            <span className={cn('h-1.5 w-1.5 rounded-full', categoryStyles[c].bg)} /> {c}
          </button>
        ))}
      </div>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((n) => {
          const s = categoryStyles[n.category]
          const snippet = n.content
            .replace(/<h1>.*?<\/h1>/, '')
            .replace(/<[^>]+>/g, ' ')
            .trim()
          return (
            <article
              key={n.id}
              onClick={() => openNote(n.id)}
              className="group relative cursor-pointer overflow-hidden rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-foreground/15 hover:shadow-float"
            >
              <div className={cn('absolute inset-x-0 top-0 h-1', s.bg)} />
              <div className="flex items-start justify-between gap-3">
                <span
                  className={cn(
                    'rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground',
                    s.bg
                  )}
                >
                  {n.category}
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <button
                      aria-label="More"
                      className="text-muted-foreground opacity-0 transition group-hover:opacity-100"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuItem onClick={() => openNote(n.id)}>Open</DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        openNote(n.id)
                        useUI.getState().toggleMini()
                      }}
                    >
                      Open in mini notebook
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold leading-snug">{n.title}</h3>
              <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{snippet}</p>
              <p className={cn('mt-5 text-[10px] font-semibold tracking-widest', s.text)}>
                {formatStamp(n.updatedAt)}
              </p>
            </article>
          )
        })}
        {list.length === 0 && (
          <p className="col-span-full py-20 text-center text-sm text-muted-foreground">
            Nothing here yet.
          </p>
        )}
      </div>
    </div>
  )
}
