import { useEffect, useState } from 'react'
import { getAttachmentSignedUrl } from '../attachments'
import { ATTACHMENT_KIND } from '../types'

const LABELS = {
  [ATTACHMENT_KIND.PRESCRIPTION]: 'Prescription',
  [ATTACHMENT_KIND.LAB_REPORT]: 'Lab report',
  [ATTACHMENT_KIND.INVOICE]: 'Invoice',
  [ATTACHMENT_KIND.MEDICAL_IMAGE]: 'Medical image',
  [ATTACHMENT_KIND.PDF]: 'PDF',
  [ATTACHMENT_KIND.VOICE_NOTE]: 'Voice note',
  [ATTACHMENT_KIND.OTHER]: 'Attachment',
}

export default function AttachmentCard({ attachment }) {
  const [url, setUrl] = useState(null)

  useEffect(() => {
    let cancelled = false
    if (!attachment?.storage_path) return undefined
    getAttachmentSignedUrl(attachment.storage_path).then((result) => {
      if (!cancelled && result.ok) setUrl(result.url)
    })
    return () => { cancelled = true }
  }, [attachment?.storage_path])

  const label = LABELS[attachment?.kind] || attachment?.file_name || 'Attachment'
  const content = (
    <>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
        <path d="M14 3v5h5" />
      </svg>
      <span>{label}</span>
    </>
  )

  if (url) {
    return (
      <a className="chat-attachment-card" href={url} target="_blank" rel="noreferrer">
        {content}
      </a>
    )
  }

  return <div className="chat-attachment-card">{content}</div>
}
