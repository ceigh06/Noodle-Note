import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import { useEffect, useRef, useState } from 'react'
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Quote,
  ImagePlus,
  Undo2,
  Redo2,
  ArrowLeft,
  Minimize2,
  Maximize2,
  Check
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { noodleAPI, categoryStyles, formatStamp, type Note } from '@/lib/noodle-api'
import { useUI } from '@/store/ui'
import { cn } from '@/lib/utils'

function Tool({
  label,
  active,
  onClick,
  children
}: {
  label: string
  active?: boolean | undefined
  onClick: () => void
  children: React.ReactNode
}): React.ReactNode {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          aria-label={label}
          className={cn(
            'grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground',
            active && 'bg-accent text-primary'
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

const ImageWithPath = Image.extend({
  addAttributes() {
    return { ...this.parent?.(), 'data-path': { default: null } }
  }
})

export function NoteEditor({
  note,
  onSaved
}: {
  note: Note
  onSaved: (n: Note) => void
}): React.ReactNode {
  const { miniMode, toggleMini, closeNote } = useUI()
  const [dragging, setDragging] = useState(false)
  const [saved, setSaved] = useState(true)
  const fileRef = useRef<HTMLInputElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions: [StarterKit, ImageWithPath],
      content: note.content,
      editorProps: { attributes: { class: 'noodle-prose' } },
      onUpdate: ({ editor }) => {
        setSaved(false)
        clearTimeout(timer.current)
        timer.current = setTimeout(async () => {
          const firstLine = editor.getText().split('\n').find(Boolean) ?? 'Untitled note'
          const n = await noodleAPI.notes.save({
            ...note,
            title: firstLine.slice(0, 80),
            content: editor.getHTML()
          })
          onSaved(n)
          setSaved(true)
        }, 600)
      }
    },
    [note.id]
  )

  useEffect(() => () => clearTimeout(timer.current), [])

  const insertFiles = async (files: FileList | null, ed: Editor | null): Promise<void> => {
    if (!files || !ed) return
    for (const f of Array.from(files).filter((f) => f.type.startsWith('image/'))) {
      const { relativePath, previewUrl } = await noodleAPI.assets.import(f)
      ed.chain().focus().setImage({ src: previewUrl, alt: relativePath, title: relativePath }).run()
    }
  }

  const e = editor
  const cat = categoryStyles[note.category]

  return (
    <div
      className={cn(
        'flex h-full flex-col',
        miniMode && 'rounded-2xl border border-border bg-card shadow-float overflow-hidden'
      )}
    >
      <div className="sticky top-0 z-10 flex items-center gap-1 border-b border-border bg-card/90 px-3 py-2 backdrop-blur">
        {!miniMode && (
          <Button
            variant="ghost"
            size="sm"
            onClick={closeNote}
            className="mr-2 gap-1 text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Notes
          </Button>
        )}
        <Tool label="Undo" onClick={() => e?.chain().focus().undo().run()}>
          <Undo2 className="h-4 w-4" />
        </Tool>
        <Tool label="Redo" onClick={() => e?.chain().focus().redo().run()}>
          <Redo2 className="h-4 w-4" />
        </Tool>
        <span className="mx-1 h-5 w-px bg-border" />
        <Tool
          label="Heading 1"
          active={e?.isActive('heading', { level: 1 })}
          onClick={() => e?.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          <Heading1 className="h-4 w-4" />
        </Tool>
        <Tool
          label="Heading 2"
          active={e?.isActive('heading', { level: 2 })}
          onClick={() => e?.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="h-4 w-4" />
        </Tool>
        <Tool
          label="Bold"
          active={e?.isActive('bold')}
          onClick={() => e?.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </Tool>
        <Tool
          label="Italic"
          active={e?.isActive('italic')}
          onClick={() => e?.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </Tool>
        <span className="mx-1 h-5 w-px bg-border" />
        <Tool
          label="Bullet list"
          active={e?.isActive('bulletList')}
          onClick={() => e?.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </Tool>
        <Tool
          label="Numbered list"
          active={e?.isActive('orderedList')}
          onClick={() => e?.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" />
        </Tool>
        <Tool
          label="Quote"
          active={e?.isActive('blockquote')}
          onClick={() => e?.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="h-4 w-4" />
        </Tool>
        <Tool label="Insert image" onClick={() => fileRef.current?.click()}>
          <ImagePlus className="h-4 w-4" />
        </Tool>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(ev) => insertFiles(ev.target.files, e)}
        />
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
            {saved ? (
              <>
                <Check className="h-3 w-3" /> Saved
              </>
            ) : (
              'Saving…'
            )}
          </span>
          <Tool label={miniMode ? 'Expand to dashboard' : 'Mini notebook'} onClick={toggleMini}>
            {miniMode ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
          </Tool>
        </div>
      </div>

      <div
        className="relative flex-1 overflow-y-auto"
        onDragOver={(ev) => {
          ev.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(ev) => {
          ev.preventDefault()
          setDragging(false)
          insertFiles(ev.dataTransfer.files, e)
        }}
      >
        <div className={cn('mx-auto px-8 py-10', miniMode ? 'max-w-none' : 'max-w-3xl')}>
          {!miniMode && (
            <div className="mb-4 flex items-center gap-3 text-xs">
              <span
                className={cn(
                  'rounded-full px-2.5 py-0.5 font-semibold uppercase tracking-wider text-primary-foreground',
                  cat.bg
                )}
              >
                {note.category}
              </span>
              <span className="text-muted-foreground">{formatStamp(note.updatedAt)}</span>
            </div>
          )}
          <EditorContent editor={editor} />
        </div>
        {dragging && (
          <div className="pointer-events-none absolute inset-4 grid place-items-center rounded-2xl border-2 border-dashed border-primary bg-primary/10">
            <div className="text-center">
              <ImagePlus className="mx-auto h-8 w-8 text-primary" />
              <p className="mt-2 text-sm font-medium">Drop image — saved to ./assets/</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
