import {
  File, FileArchive, FileAudio, FileCode, FileImage, FileSpreadsheet, FileText, FileVideo,
} from 'lucide-react'

const BY_EXT: [RegExp, typeof File, string][] = [
  [/\.(png|jpe?g|gif|webp|svg|heic)$/i, FileImage, 'text-sky bg-sky/10'],
  [/\.(mp4|mov|avi|mkv|webm)$/i, FileVideo, 'text-coral bg-coral/10'],
  [/\.(mp3|wav|flac|m4a)$/i, FileAudio, 'text-coral bg-coral/10'],
  [/\.(zip|7z|rar|tar|gz)$/i, FileArchive, 'text-amber bg-amber/10'],
  [/\.(xlsx?|csv|ods)$/i, FileSpreadsheet, 'text-brand-strong bg-brand/10'],
  [/\.(ts|tsx|js|json|py|cs|java|html|css|xml|ya?ml)$/i, FileCode, 'text-ink-soft bg-ink-soft/10'],
  [/\.(pdf|docx?|txt|md|rtf|pptx?)$/i, FileText, 'text-sky bg-sky/10'],
]

export function FileIcon({ name }: { name: string }) {
  const [, Icon, tone] = BY_EXT.find(([re]) => re.test(name)) ?? [null, File, 'text-muted-foreground bg-muted']
  return (
    <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${tone}`} aria-hidden="true">
      <Icon className="size-4.5" />
    </span>
  )
}
