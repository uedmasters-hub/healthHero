export function relativeRect(el, root = document.querySelector('.phone-app')) {
  if (!el || !root) return null
  const er = el.getBoundingClientRect()
  const rr = root.getBoundingClientRect()
  const scale = rr.width / (root.clientWidth || rr.width) || 1
  return {
    left: (er.left - rr.left) / scale,
    top: (er.top - rr.top) / scale,
    width: er.width / scale,
    height: er.height / scale,
  }
}

export function displayDoctorName(name) {
  if (!name) return 'Doctor'
  return name.startsWith('Dr.') ? name : `Dr. ${name}`
}
