// Generates the PNG extension icons without any image dependencies.
// The geometry mirrors public/icons/icon.svg (rendered analytically with
// supersampling, then PNG-encoded with node:zlib).
import { writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

// Shopa brand gradient (#6A3DFF → #A100FF), white S, soft lavender signal dot.
const BG_FROM = [0x6a, 0x3d, 0xff]
const BG_TO = [0xa1, 0x00, 0xff]
const FG = [0xff, 0xff, 0xff]
const ACCENT = [0xe6, 0xd2, 0xff]

function background(x, y) {
  const t = Math.min(1, Math.max(0, (x + y) / 256))
  return BG_FROM.map((c, i) => Math.round(c + (BG_TO[i] - c) * t))
}

// All coordinates in a 128-unit space (same as the SVG viewBox).
const R = 20.5
const STROKE = 10
const upper = { x: 64, y: 45.5 }
const lower = { x: 64, y: 86.5 }

function inRoundedRect(x, y) {
  const r = 28
  const cx = Math.min(Math.max(x, r), 128 - r)
  const cy = Math.min(Math.max(y, r), 128 - r)
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r
}

function onRing(c, x, y) {
  const d = Math.hypot(x - c.x, y - c.y)
  return Math.abs(d - R) <= STROKE / 2
}

function sample(x, y) {
  if (!inRoundedRect(x, y)) return null
  if (Math.hypot(x - 84.5, y - 45.5) <= 8.5) return ACCENT
  // Upper ring: everything except its bottom-right quadrant.
  if (onRing(upper, x, y) && !(x > upper.x && y > upper.y)) return FG
  // Lower ring: everything except its top-left quadrant.
  if (onRing(lower, x, y) && !(x < lower.x && y < lower.y)) return FG
  return background(x, y)
}

function render(size) {
  const ss = 4
  const px = Buffer.alloc(size * size * 4)
  for (let py = 0; py < size; py++) {
    for (let pxi = 0; pxi < size; pxi++) {
      let r = 0, g = 0, b = 0, a = 0
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const x = ((pxi + (sx + 0.5) / ss) / size) * 128
          const y = ((py + (sy + 0.5) / ss) / size) * 128
          const c = sample(x, y)
          if (c) { r += c[0]; g += c[1]; b += c[2]; a += 1 }
        }
      }
      const i = (py * size + pxi) * 4
      px[i] = a ? Math.round(r / a) : 0
      px[i + 1] = a ? Math.round(g / a) : 0
      px[i + 2] = a ? Math.round(b / a) : 0
      px[i + 3] = Math.round((a / (ss * ss)) * 255)
    }
  }
  return px
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
function crc32(buf) {
  let c = 0xffffffff
  for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}
function encodePng(size, rgba) {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0)
  header.writeUInt32BE(size, 4)
  header[8] = 8 // bit depth
  header[9] = 6 // RGBA
  const raw = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

for (const size of [16, 32, 48, 128]) {
  writeFileSync(`public/icons/icon${size}.png`, encodePng(size, render(size)))
  console.log(`public/icons/icon${size}.png`)
}
