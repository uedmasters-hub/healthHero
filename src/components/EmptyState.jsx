import './EmptyState.css'

export default function EmptyState({
  image,
  alt = '',
  title = 'Coming soon',
  message,
}) {
  return (
    <div className="empty-state">
      <img src={image} alt={alt} className="empty-state-image" />
      <p className="empty-state-title">{title}</p>
      {message ? <p className="empty-state-copy">{message}</p> : null}
    </div>
  )
}
