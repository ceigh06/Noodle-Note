import React from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  Check,
  FileText,
  GripVertical,
  Layers,
  LoaderCircle,
  PenLine,
  Plus,
  Search,
  ShieldAlert,
  Sparkles,
  Trash2,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { noodleAPI, type Note } from '@/lib/noodle-api'
import {
  addToBin,
  outputFormats,
  pillarLabels,
  synthesizeDocument,
  vaultDragType,
  type OutputFormat
} from '@/lib/synthesizer'
import { useUI } from '@/store/ui'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/workspace/synthesizer')({
  component: Synthesizer
})

const pillarIcons = { sources: FileText, manual: PenLine, ai: Sparkles }
const pillarColors = {
  sources: 'text-cat-assignment',
  manual: 'text-primary',
  ai: 'text-cat-projects'
}

// eslint-disable-next-line react-refresh/only-export-components -- TanStack route file exports both Route and local components by design
function Synthesizer(): React.ReactNode {
  const [notes, setNotes] = useState<Note[]>([])
  const [ready, setReady] = useState(false)
  const [query, setQuery] = useState('')
  const [ids, setIds] = useState<string[]>([])
  const [format, setFormat] = useState<OutputFormat>('Study Guide')
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [saved, setSaved] = useState<Note | null>(null)
  const ui = useUI()
  const navigate = useNavigate()
  useEffect(() => {
    noodleAPI.notes
      .list()
      .then((list) => {
        setNotes(list)
        setReady(true)
      })
      .catch(() => setMessage('Could not load My Vault.'))
  }, [])
  const visible = useMemo(
    () =>
      notes.filter((note) =>
        `${note.title} ${pillarLabels[note.pillar]} ${note.content.replace(/<[^>]*>/g, ' ')}`
          .toLowerCase()
          .includes(query.toLowerCase())
      ),
    [notes, query]
  )
  const selected = ids.flatMap((id) => {
    const note = notes.find((n) => n.id === id)
    return note ? [note] : []
  })
  const add = (id: string): void => {
    if (busy) return
    setIds((list) => addToBin(list, id, notes))
    setMessage('')
    setSaved(null)
  }
  const synthesize = async (): Promise<void> => {
    setBusy(true)
    setMessage('')
    setSaved(null)
    try {
      const document = await synthesizeDocument({
        notes: selected,
        format,
        aiEnabled: ui.aiEnabled,
        bridge: window.noodleStudy
      })
      setNotes((list) => [document, ...list])
      setSaved(document)
    } catch (error) {
      setMessage(
        error instanceof Error && !window.noodleStudy
          ? error.message
          : 'Synthesis could not complete. Check your desktop connection and try again.'
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-5">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <Layers className="h-5 w-5 text-primary" />
            The Synthesizer
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {selected.length} selected · New output in AI Directory
          </p>
        </div>
        <span className="text-xs text-muted-foreground">Local vault · cloud synthesis</span>
      </header>
      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[minmax(240px,0.85fr)_minmax(0,1.15fr)]">
        <section
          aria-label="My Vault"
          className="flex min-h-0 flex-col border-b border-border md:border-b-0 md:border-r"
        >
          <div className="shrink-0 px-5 pt-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">My Vault</h2>
              <span className="text-xs text-muted-foreground">{notes.length} materials</span>
            </div>
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search My Vault"
                placeholder="Search notes and sources…"
                className="rounded-md bg-card pl-9"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-3 max-h-72 flex-1 overflow-y-auto px-3 pb-4 md:max-h-none">
            {visible.map((note) => {
              const Icon = pillarIcons[note.pillar]
              const included = ids.includes(note.id)
              return (
                <div
                  key={note.id}
                  draggable={!busy}
                  onDragStart={(e) => {
                    if (busy) {
                      e.preventDefault()
                      return
                    }
                    e.dataTransfer.setData(vaultDragType, note.id)
                    e.dataTransfer.effectAllowed = 'copy'
                  }}
                  className="group flex cursor-grab items-center gap-2 rounded-md border border-transparent px-2 py-3 active:cursor-grabbing hover:border-border hover:bg-card"
                  data-note-id={note.id}
                >
                  <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                  <Icon className={cn('h-4 w-4 shrink-0', pillarColors[note.pillar])} />
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-medium">{note.title}</p>
                    <p className={cn('mt-1 text-[11px]', pillarColors[note.pillar])}>
                      {pillarLabels[note.pillar]}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 shrink-0"
                    aria-label={
                      included ? `${note.title} already in bin` : `Add ${note.title} to bin`
                    }
                    title={included ? 'Already in bin' : 'Add to bin'}
                    disabled={included || busy}
                    onClick={() => add(note.id)}
                  >
                    {included ? <Check /> : <Plus />}
                  </Button>
                </div>
              )
            })}
            {!ready && !message && (
              <p className="p-4 text-xs text-muted-foreground">Loading vault…</p>
            )}
            {ready && !visible.length && (
              <p className="p-4 text-sm text-muted-foreground">No matching materials.</p>
            )}
          </div>
        </section>
        <section aria-label="The Synthesis Bin" className="flex min-h-0 flex-col p-5 lg:p-6">
          <div className="mb-4 flex shrink-0 items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">
              The Synthesis Bin{' '}
              <span className="ml-1 text-muted-foreground">({selected.length})</span>
            </h2>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-muted-foreground"
              disabled={!ids.length || busy}
              onClick={() => {
                setIds([])
                setSaved(null)
                setMessage('')
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear
            </Button>
          </div>
          <div
            aria-label="Synthesis drop zone"
            onDragOver={(e) => {
              e.preventDefault()
              if (!busy && e.dataTransfer.types.includes(vaultDragType)) {
                e.dataTransfer.dropEffect = 'copy'
                setDragging(true)
              }
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false)
            }}
            onDrop={(e) => {
              e.preventDefault()
              setDragging(false)
              add(e.dataTransfer.getData(vaultDragType))
            }}
            className={cn(
              'min-h-40 flex-1 overflow-y-auto rounded-lg border-2 border-dashed p-4 transition-colors',
              dragging ? 'border-primary bg-primary/10' : 'border-border bg-card/30'
            )}
          >
            {!selected.length ? (
              <div className="flex h-full min-h-32 flex-col items-center justify-center gap-4 text-center">
                <div className="grid h-12 w-12 place-items-center rounded-lg border border-border bg-card">
                  <Layers className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="max-w-64 text-sm leading-relaxed text-muted-foreground">
                  Drag notes, PDFs, or source cards here to synthesize...
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap content-start gap-2">
                {selected.map((note) => {
                  const Icon = pillarIcons[note.pillar]
                  return (
                    <div
                      key={note.id}
                      className="flex max-w-full items-center gap-2 rounded-md border border-border bg-card py-2 pl-3 pr-1"
                    >
                      <Icon className={cn('h-4 w-4 shrink-0', pillarColors[note.pillar])} />
                      <div className="min-w-0">
                        <p className="break-words text-xs font-medium">{note.title}</p>
                        <p className={cn('mt-0.5 text-[10px]', pillarColors[note.pillar])}>
                          {pillarLabels[note.pillar]}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        aria-label={`Remove ${note.title} from bin`}
                        title="Remove from bin"
                        disabled={busy}
                        onClick={() => {
                          setIds((list) => list.filter((id) => id !== note.id))
                          setSaved(null)
                        }}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          <div className="mt-5 shrink-0 space-y-4">
            <div>
              <label id="output-format-label" className="mb-2 block text-xs font-medium">
                Output format
              </label>
              <Select
                value={format}
                onValueChange={(value) => {
                  const next = outputFormats.find((f) => f === value)
                  if (next) {
                    setFormat(next)
                    setSaved(null)
                  }
                }}
                disabled={busy}
              >
                <SelectTrigger
                  aria-labelledby="output-format-label"
                  className="w-full rounded-md bg-card"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {outputFormats.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-start gap-2 border-l-2 border-primary bg-primary/5 p-3 text-xs leading-relaxed text-muted-foreground">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p>
                ⚠️ Local excerpts from selected notes will be transmitted securely to your
                configured Cloud API for synthesis.
              </p>
            </div>
            <Button
              className="w-full rounded-md"
              disabled={!selected.length || busy}
              onClick={() => void synthesize()}
            >
              {busy ? (
                <LoaderCircle className="animate-spin motion-reduce:animate-none" />
              ) : (
                <Sparkles />
              )}
              {busy ? 'Synthesizing…' : 'Synthesize Document'}
            </Button>
            {message && (
              <p role="status" className="text-xs leading-relaxed text-muted-foreground">
                {message}
              </p>
            )}
            {saved && (
              <div
                role="status"
                className="flex flex-wrap items-center gap-2 text-xs text-cat-projects"
              >
                <Check className="h-4 w-4" />
                <span className="min-w-0 flex-1 break-words">
                  Saved to AI Directory: {saved.title}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    ui.setPillar('ai')
                    ui.openNote(saved.id)
                    void navigate({ to: '/workspace' })
                  }}
                >
                  Open
                  <ArrowRight />
                </Button>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
