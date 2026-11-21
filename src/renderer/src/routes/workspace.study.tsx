import React from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { ArrowRight, BookOpen, FileText, HardDrive, LoaderCircle, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { noodleAPI, type Note } from '@/lib/noodle-api'
import { recommend } from '@/lib/study'
import { useUI } from '@/store/ui'

export const Route = createFileRoute('/workspace/study')({
  component: StudyView
})

// eslint-disable-next-line react-refresh/only-export-components -- TanStack route file exports both Route and local components by design
function StudyView(): React.ReactNode {
  const [task, setTask] = useState('')
  const [submitted, setSubmitted] = useState('')
  const [notes, setNotes] = useState<Note[]>([])
  const [ready, setReady] = useState(false)
  const [completed, setCompleted] = useState<number[]>([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const ui = useUI()
  const navigate = useNavigate()
  useEffect(() => {
    noodleAPI.notes
      .list()
      .then((data) => {
        setNotes(data)
        setReady(true)
      })
      .catch(() => setMessage('Could not load workspace materials.'))
  }, [])
  const results = recommend(submitted, notes)
  const materials = [...results.sources, ...results.manual].map((m) => m.note)
  const steps = [
    `Define the key topics and questions for: ${submitted}`,
    results.sources[0]
      ? `Read ${results.sources[0].note.title} and mark the concepts you need to master.`
      : 'Add a relevant reference or lecture source to your workspace.',
    results.manual[0]
      ? `Review ${results.manual[0].note.title} and list any gaps in your understanding.`
      : 'Write a short note summarizing what you already know.',
    'Practice representative problems without looking at your notes.',
    'Check your answers and revisit the topics you missed.'
  ]
  const openNote = (id: string): void => {
    ui.openNote(id)
    navigate({ to: '/workspace' })
  }
  const synthesize = async (): Promise<void> => {
    setMessage('')
    if (!ui.aiEnabled) {
      setMessage('Local mode is on. Configure a cloud API key to enable synthesis.')
      return
    }
    if (!window.noodleStudy) {
      setMessage(
        'Study-guide synthesis requires the desktop RAG connection. No materials were sent.'
      )
      return
    }
    setBusy(true)
    try {
      const guide = await window.noodleStudy.synthesize({
        task: submitted,
        materials: materials.map(({ id, title, content, pillar }) => ({
          id,
          title,
          content,
          pillar
        }))
      })
      const draft = await noodleAPI.notes.create('ai')
      await noodleAPI.notes.save({ ...draft, title: guide.title, content: guide.content })
      ui.openNote(draft.id)
      await navigate({ to: '/workspace' })
    } catch {
      setMessage('Synthesis did not complete. No study guide was saved.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto px-6 py-7 lg:px-9">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <HardDrive className="h-3.5 w-3.5" />
          Local task analysis
        </div>
        <h1 className="mt-3 text-2xl font-semibold">Study recommendations</h1>
        <form
          className="mt-6"
          onSubmit={(e) => {
            e.preventDefault()
            if (!task.trim()) return
            setSubmitted(task.trim())
            setCompleted([])
            setMessage('')
          }}
        >
          <label htmlFor="study-task" className="text-sm font-medium">
            What are you studying today?
          </label>
          <Textarea
            id="study-task"
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder="What are you studying today? (e.g., Prepare for my Calculus midterm on derivatives)"
            className="mt-3 min-h-28 resize-y rounded-md bg-card text-sm"
            disabled={busy}
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">
              Preview · sample notes · lexical cosine, not vector search
            </span>
            <Button type="submit" className="rounded-md" disabled={!task.trim() || !ready || busy}>
              <Sparkles />
              Analyze &amp; Recommend
            </Button>
          </div>
        </form>
        {submitted && (
          <div className="mt-8 grid gap-8 border-t border-border pt-7 lg:grid-cols-[1fr_0.9fr]">
            <div className="min-w-0">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <FileText className="h-4 w-4 text-cat-assignment" />
                Matched Source Materials
                <span className="ml-auto text-xs text-muted-foreground">
                  {results.sources.length}
                </span>
              </h2>
              <div className="mt-4 grid gap-3">
                {results.sources.map(({ note, score }) => (
                  <article key={note.id} className="rounded-md border border-border bg-card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <FileText className="h-5 w-5 shrink-0 text-cat-assignment" />
                      <span className="text-xs font-medium text-cat-projects">{score}% Match</span>
                    </div>
                    <h3 className="mt-3 break-words text-sm font-medium">{note.title}</h3>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">Local source</span>
                      <Button variant="ghost" size="sm" onClick={() => openNote(note.id)}>
                        Open
                        <ArrowRight />
                      </Button>
                    </div>
                  </article>
                ))}
                {!results.sources.length && (
                  <p className="border-b border-border py-5 text-sm text-muted-foreground">
                    No matching sources in this sample workspace.
                  </p>
                )}
              </div>
              <h2 className="mt-7 flex items-center gap-2 text-sm font-semibold">
                <BookOpen className="h-4 w-4 text-primary" />
                Suggested Manual Notes
              </h2>
              <div className="mt-3 divide-y divide-border">
                {results.manual.map(({ note }) => (
                  <Button
                    key={note.id}
                    variant="ghost"
                    className="h-auto min-h-12 w-full justify-between gap-3 whitespace-normal rounded-none px-0 text-left text-sm"
                    onClick={() => openNote(note.id)}
                  >
                    <span className="break-words">{note.title}</span>
                    <ArrowRight />
                  </Button>
                ))}
                {!results.manual.length && (
                  <p className="py-4 text-sm text-muted-foreground">
                    No matching manual notes yet.
                  </p>
                )}
              </div>
            </div>
            <section className="min-w-0 lg:border-l lg:border-border lg:pl-7">
              <h2 className="text-sm font-semibold">Study action plan</h2>
              <p className="mt-2 text-xs text-muted-foreground">
                Local checklist template · not AI-generated
              </p>
              <div className="mt-5 space-y-5">
                {steps.map((step, i) => (
                  <label
                    key={i}
                    className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed"
                  >
                    <Checkbox
                      className="mt-1"
                      checked={completed.includes(i)}
                      onCheckedChange={(checked) =>
                        setCompleted((list) =>
                          checked ? [...list, i] : list.filter((n) => n !== i)
                        )
                      }
                    />
                    <span
                      className={completed.includes(i) ? 'text-muted-foreground line-through' : ''}
                    >
                      {step}
                    </span>
                  </label>
                ))}
              </div>
              <div className="mt-6 border-t border-border pt-4">
                <span className="text-xs text-muted-foreground">
                  {completed.length} of {steps.length} complete · {materials.length} matched
                  materials
                </span>
                <Button
                  className="mt-4 h-auto min-h-10 w-full whitespace-normal rounded-md"
                  disabled={busy || !materials.length}
                  onClick={() => void synthesize()}
                >
                  {busy ? (
                    <LoaderCircle className="animate-spin motion-reduce:animate-none" />
                  ) : (
                    <Sparkles />
                  )}
                  Synthesize Study Guide
                </Button>
              </div>
            </section>
          </div>
        )}
        {message && (
          <p
            role="status"
            className="mt-5 border-l-2 border-primary bg-primary/5 p-3 text-sm text-muted-foreground"
          >
            {message}
          </p>
        )}
      </div>
    </div>
  )
}
