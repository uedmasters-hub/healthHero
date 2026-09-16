import { forwardRef } from 'react'

const RevealItem = forwardRef(function RevealItem({
  revealed,
  cached = false,
  children,
  className = '',
  as: Tag = 'div',
  ...props
}, ref) {
  return (
    <Tag ref={ref} className={`reveal-host ${cached ? 'is-cached' : ''} ${className}`} {...props}>
      <div className={`reveal-skel ${revealed || cached ? 'is-hidden' : ''}`} aria-hidden="true">
        <div className="shimmer reveal-skel-fill" />
      </div>
      <div className={`reveal-body ${revealed || cached ? 'is-visible' : ''}`}>
        {children}
      </div>
    </Tag>
  )
})

export default RevealItem
