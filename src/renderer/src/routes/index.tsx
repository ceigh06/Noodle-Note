import React from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import {
  FileText,
  PenLine,
  ShieldCheck,
  FolderOpen,
  Sparkles,
  HardDrive,
  Check,
  ChevronRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FolderPickerModal } from '@/components/noodle/FolderPickerModal'
import { KeySetupWizard } from '@/components/noodle/KeySetupWizard'
import { useUI } from '@/store/ui'

export const Route = createFileRoute('/')({
  component: Landing
})

// eslint-disable-next-line react-refresh/only-export-components -- TanStack route file exports both Route and local components by design
function Landing(): React.ReactNode {
  const navigate = useNavigate()
  const setWorkspacePath = useUI((s) => s.setWorkspacePath)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [keySetupOpen, setKeySetupOpen] = useState(false)

  const pick = (path: string): void => {
    setWorkspacePath(path)
    setPickerOpen(false)
    navigate({ to: '/workspace' })
  }

  return (
    <div className="flex h-dvh min-h-[540px] flex-col overflow-hidden bg-background text-foreground">
      <header className="flex h-11 shrink-0 items-center gap-2 border-b border-border bg-card px-4 select-none">
        <span className="grid h-6 w-6 place-items-center rounded-md bg-primary font-display text-base font-semibold text-primary-foreground">
          n
        </span>
        <span className="text-xs font-semibold">Noodle</span>
        <ChevronRight className="h-3 w-3 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Workspace Setup</span>
      </header>
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-5 py-7 sm:flex">
          <span className="font-display text-2xl font-semibold">Noodle</span>
          <span className="mt-1 text-xs text-muted-foreground">Academic notes</span>
          <div className="mt-10 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Getting started
          </div>
          <div className="mt-3 flex items-center gap-3 rounded-md bg-sidebar-accent px-3 py-2.5 text-sm">
            <FolderOpen className="h-4 w-4 text-primary" />
            Workspace folder
          </div>
          <div className="mt-2 flex items-center gap-3 px-3 py-2.5 text-sm text-muted-foreground">
            <NotebookIcon />
            Your notes
          </div>
          <div className="mt-auto flex items-center gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
            <HardDrive className="h-3.5 w-3.5" /> Local workspace
          </div>
        </aside>
        <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
          <div className="flex flex-1 items-center justify-center px-6 py-10">
            <section className="w-full max-w-md">
              <div className="mb-7 flex h-16 w-16 items-center justify-center rounded-lg border border-border bg-card">
                <FolderOpen className="h-8 w-8 text-primary" strokeWidth={1.4} />
              </div>
              <h1 className="text-2xl font-semibold">Set up your workspace</h1>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Choose a home for your academic notes.
              </p>
              <div className="mt-8 border-y border-border py-3">
                {[
                  {
                    icon: FileText,
                    title: 'Sources',
                    detail: 'Papers, PDFs & references',
                    color: 'text-cat-assignment'
                  },
                  {
                    icon: PenLine,
                    title: 'Manual Notes',
                    detail: 'Your writing · AI read-only',
                    color: 'text-primary'
                  },
                  {
                    icon: Sparkles,
                    title: 'AI Outputs',
                    detail: 'Study guides & synthesis',
                    color: 'text-cat-projects'
                  }
                ].map(({ icon: Icon, title, detail, color }) => (
                  <div key={title} className="flex items-center gap-3 py-3">
                    <Icon className={`h-4 w-4 shrink-0 ${color}`} />
                    <span className="min-w-0 flex-1 text-sm font-medium">{title}</span>
                    <span className="text-right text-xs text-muted-foreground">{detail}</span>
                  </div>
                ))}
              </div>
              <Button
                className="mt-7 h-10 w-full gap-2 rounded-md text-sm font-semibold"
                onClick={() => setPickerOpen(true)}
              >
                <FolderOpen className="h-4 w-4" />
                Select Workspace Folder
              </Button>
              <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5" />
                Folder picker preview · no disk access yet
              </div>
              <Button
                variant="ghost"
                className="mt-5 w-full rounded-md text-xs text-muted-foreground"
                onClick={() => setKeySetupOpen(true)}
              >
                <Sparkles className="h-4 w-4" />
                Configure cloud API key
              </Button>
            </section>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-2 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Check className="h-3 w-3" />
              Ready for setup
            </span>
            <span>No workspace selected</span>
          </div>
        </main>
      </div>
      <FolderPickerModal open={pickerOpen} onOpenChange={setPickerOpen} onPick={pick} />
      <KeySetupWizard open={keySetupOpen} onOpenChange={setKeySetupOpen} />
    </div>
  )
}

// eslint-disable-next-line react-refresh/only-export-components -- TanStack route file exports both Route and local components by design
function NotebookIcon(): React.ReactNode {
  return <PenLine className="h-4 w-4" />
}
