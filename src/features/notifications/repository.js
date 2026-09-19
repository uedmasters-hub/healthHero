const STORAGE_KEY = 'hh_notifications'

function read() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []
  } catch {
    return []
  }
}

function write(notifications) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications))
}

export function getAll() {
  return read()
}

export function getById(id) {
  return read().find((n) => n.id === id) || null
}

export function save(notifications) {
  write(notifications)
}

export function append(notification) {
  const list = read()
  list.unshift(notification)
  write(list)
  return list
}

export function update(id, patch) {
  const list = read().map((n) => (n.id === id ? { ...n, ...patch } : n))
  write(list)
  return list
}

export function remove(id) {
  const list = read().filter((n) => n.id !== id)
  write(list)
  return list
}

export function clear() {
  write([])
  return []
}

export function getUnreadCount() {
  return read().filter((n) => n.unread).length
}
