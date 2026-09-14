import { useState } from 'react'
import { Layout } from './app/Layout'
import { DropZone } from './components/DropZone'
import { FileList } from './components/FileList'
import { ShareDialog } from './components/ShareDialog'
import { ActivityPanel, SharedLinksPanel } from './components/SidePanels'
import { UploadTray } from './components/UploadTray'
import { useUploads } from './hooks/useDrop'
import type { StoredFile } from './storage/types'

export default function App() {
  const uploads = useUploads()
  const [sharing, setSharing] = useState<StoredFile | null>(null)

  return (
    <Layout>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <DropZone onFiles={uploads.start} />
          <UploadTray items={uploads.items} onClear={uploads.clearFinished} />
          <FileList onShare={setSharing} />
        </div>
        <aside className="space-y-4">
          <SharedLinksPanel />
          <ActivityPanel />
        </aside>
      </div>
      <ShareDialog file={sharing} onClose={() => setSharing(null)} />
    </Layout>
  )
}
