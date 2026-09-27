import assert from 'node:assert/strict'
import { nearestSnapIndex, snapScrollLeft } from '../src/lib/carouselFocus.js'

const slides = [
  { offset: 20, width: 388 },
  { offset: 416, width: 388 },
  { offset: 812, width: 388 },
]

assert.equal(nearestSnapIndex(slides, 20), 0)
assert.equal(nearestSnapIndex(slides, 416), 1)
assert.equal(nearestSnapIndex(slides, 812), 2)
assert.equal(nearestSnapIndex(slides, 218), 0)
assert.equal(nearestSnapIndex(slides, 219), 1)
assert.equal(nearestSnapIndex([null, slides[1]], 400), 1)

assert.equal(snapScrollLeft(20, 20), 0)
assert.equal(snapScrollLeft(416, 20), 396)
assert.equal(snapScrollLeft(10, 20), 0)

console.log('sanity-carousel-focus ok')
