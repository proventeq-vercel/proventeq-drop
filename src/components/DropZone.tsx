import { useEffect, useRef, useState } from 'react'
import { CloudUpload } from 'lucide-react'
import { cn } from '@/lib/utils'

function hasFiles(e: DragEvent) {
  return Array.from(e.dataTransfer?.types ?? []).includes('Files')
}

/**
 * The whole window is a drop target (Dropbox-style): dragging files anywhere
 * shows an overlay, dropping uploads them. The card itself is also a
 * keyboard-accessible "browse" button.
 */
export function DropZone({ onFiles }: { onFiles: (files: File[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const depth = useRef(0)

  useEffect(() => {
    const onEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      depth.current++
      setDragging(true)
    }
    const onOver = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault()
    }
    const onLeave = (e: DragEvent) => {
      if (!hasFiles(e)) return
      depth.current = Math.max(0, depth.current - 1)
      if (depth.current === 0) setDragging(false)
    }
    const onDrop = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      depth.current = 0
      setDragging(false)
      const files = Array.from(e.dataTransfer?.files ?? [])
      if (files.length) onFiles(files)
    }
    window.addEventListener('dragenter', onEnter)
    window.addEventListener('dragover', onOver)
    window.addEventListener('dragleave', onLeave)
    window.addEventListener('drop', onDrop)
    return () => {
      window.removeEventListener('dragenter', onEnter)
      window.removeEventListener('dragover', onOver)
      window.removeEventListener('dragleave', onLeave)
      window.removeEventListener('drop', onDrop)
    }
  }, [onFiles])

  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={cn(
          'group flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-brand/35 bg-surface px-6 py-10 text-center transition-colors',
          'hover:border-brand hover:bg-accent focus-visible:border-brand focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40',
          dragging && 'border-brand bg-accent',
        )}
      >
        <span className="grid size-14 place-items-center rounded-full bg-brand/12 text-brand-strong transition-transform group-hover:-translate-y-0.5">
          <CloudUpload className="size-7" aria-hidden="true" />
        </span>
        <span>
          <span className="block text-base font-semibold text-ink">Drop files anywhere to upload</span>
          <span className="mt-1 block text-sm text-muted-foreground">
            or <span className="font-semibold text-brand-strong underline-offset-4 group-hover:underline">browse your computer</span>
          </span>
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        hidden
        data-testid="file-input"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? [])
          if (files.length) onFiles(files)
          e.target.value = ''
        }}
      />

      {dragging && (
        <div className="pointer-events-none fixed inset-0 z-50 grid place-items-center bg-brand/15 p-6 backdrop-blur-[1px]" aria-hidden="true">
          <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-brand bg-surface/95 px-12 py-10 shadow-xl">
            <CloudUpload className="size-10 text-brand" />
            <p className="text-lg font-semibold text-ink">Release to upload</p>
          </div>
        </div>
      )}
    </>
  )
}
