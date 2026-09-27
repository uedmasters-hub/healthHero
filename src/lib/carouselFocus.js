/** Which slide is parked on the snap line. Scroll position is the only input. */

export function nearestSnapIndex(slides, snapLine) {
  let best = 0
  let bestDist = Infinity
  for (let index = 0; index < slides.length; index += 1) {
    const slide = slides[index]
    if (!slide || !Number.isFinite(slide.offset)) continue
    const dist = Math.abs(slide.offset - snapLine)
    if (dist < bestDist) {
      bestDist = dist
      best = index
    }
  }
  return best
}

/** Scroll offset that places a slide's start on the page inset. */
export function snapScrollLeft(offset, inset) {
  const left = Number(offset) - Number(inset)
  return left > 0 ? left : 0
}

export function slideMetrics(node) {
  if (!node) return null
  return { offset: node.offsetLeft, width: node.offsetWidth }
}
