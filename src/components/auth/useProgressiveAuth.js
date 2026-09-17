import { useCallback, useEffect, useRef, useState } from 'react'
import { firstInvalidField } from '../../user'

function focusField(id) {
  if (!id) return
  const node = document.getElementById(id)
  if (!node) return
  node.focus()
  if (typeof node.scrollIntoView === 'function') {
    node.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }
}

export default function useProgressiveAuth(order, ids, errors) {
  const [attempted, setAttempted] = useState(false)
  const blockingKey = attempted ? firstInvalidField(order, errors) : null
  const focusedKey = useRef(null)

  useEffect(() => {
    if (!blockingKey || focusedKey.current === blockingKey) return
    focusedKey.current = blockingKey
    focusField(ids[blockingKey])
  }, [blockingKey, ids])

  const reset = useCallback(() => {
    setAttempted(false)
    focusedKey.current = null
  }, [])

  const begin = useCallback(() => {
    setAttempted(true)
    const key = firstInvalidField(order, errors)
    focusedKey.current = key
    if (key) focusField(ids[key])
    return key
  }, [errors, ids, order])

  const errorFor = useCallback(
    (key) => (blockingKey === key ? errors[key] || '' : ''),
    [blockingKey, errors],
  )

  return { attempted, blockingKey, begin, reset, errorFor }
}
