const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

const SIZE = 256
const OUTPUT_DIR = path.join(__dirname, '../build')

const BG_R = 99
const BG_G = 102
const BG_B = 241
const WHITE_R = 255
const WHITE_G = 255
const WHITE_B = 255

const RADIUS = 32

function createPNG() {
  const width = SIZE
  const height = SIZE
  const rowSize = width * 4 + 1
  const rawData = Buffer.alloc(rowSize * height)

  for (let y = 0; y < height; y++) {
    const rowStart = y * rowSize
    rawData[rowStart] = 0

    for (let x = 0; x < width; x++) {
      const px = rowStart + 1 + x * 4

      let inside = false
      if (x >= RADIUS && x <= width - 1 - RADIUS) {
        inside = true
      } else if (y >= RADIUS && y <= height - 1 - RADIUS) {
        inside = true
      } else {
        let cx, cy
        if (x < RADIUS && y < RADIUS) { cx = RADIUS; cy = RADIUS }
        else if (x > width - 1 - RADIUS && y < RADIUS) { cx = width - 1 - RADIUS; cy = RADIUS }
        else if (x < RADIUS && y > height - 1 - RADIUS) { cx = RADIUS; cy = height - 1 - RADIUS }
        else { cx = width - 1 - RADIUS; cy = height - 1 - RADIUS }
        const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
        inside = dist <= RADIUS
      }

      if (inside) {
        rawData[px] = BG_R
        rawData[px + 1] = BG_G
        rawData[px + 2] = BG_B
        rawData[px + 3] = 255
      } else {
        rawData[px] = 0
        rawData[px + 1] = 0
        rawData[px + 2] = 0
        rawData[px + 3] = 0
      }
    }
  }

  drawFileIcon(rawData, width, rowSize)
  drawPDFText(rawData, width, rowSize)

  const compressed = zlib.deflateSync(rawData, { level: 9 })

  const ihdrData = Buffer.alloc(13)
  ihdrData.writeUInt32BE(width, 0)
  ihdrData.writeUInt32BE(height, 4)
  ihdrData[8] = 8
  ihdrData[9] = 6
  ihdrData[10] = 0
  ihdrData[11] = 0
  ihdrData[12] = 0

  const chunks = []
  chunks.push(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))
  chunks.push(makeChunk('IHDR', ihdrData))
  chunks.push(makeChunk('IDAT', compressed))
  chunks.push(makeChunk('IEND', Buffer.alloc(0)))

  return Buffer.concat(chunks)
}

function drawFileIcon(rawData, width, rowSize) {
  const margin = 50
  const fileWidth = width - margin * 2
  const fileHeight = fileWidth
  const startX = margin
  const startY = margin + 20

  const fileRadius = 8

  for (let y = startY; y < startY + fileHeight; y++) {
    for (let x = startX; x < startX + fileWidth; x++) {
      const px = y * rowSize + 1 + x * 4

      let inside = false
      if (x >= startX + fileRadius && x <= startX + fileWidth - 1 - fileRadius) {
        inside = true
      } else if (y >= startY + fileRadius && y <= startY + fileHeight - 1 - fileRadius) {
        inside = true
      } else {
        let cx = x < startX + fileRadius ? startX + fileRadius : startX + fileWidth - 1 - fileRadius
        let cy = y < startY + fileRadius ? startY + fileRadius : startY + fileHeight - 1 - fileRadius
        const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
        inside = dist <= fileRadius
      }

      if (inside) {
        rawData[px] = WHITE_R
        rawData[px + 1] = WHITE_G
        rawData[px + 2] = WHITE_B
        rawData[px + 3] = 255
      }
    }
  }

  for (let x = startX; x < startX + fileWidth; x++) {
    const px = startY * rowSize + 1 + x * 4
    rawData[px] = 220
    rawData[px + 1] = 220
    rawData[px + 2] = 220
    rawData[px + 3] = 255
  }

  for (let y = startY + 20; y < startY + fileHeight; y++) {
    const px = y * rowSize + 1 + startX * 4
    rawData[px] = 220
    rawData[px + 1] = 220
    rawData[px + 2] = 220
    rawData[px + 3] = 255
  }

  for (let y = startY; y < startY + 35; y++) {
    for (let x = startX; x < startX + 35; x++) {
      const px = y * rowSize + 1 + x * 4
      rawData[px] = BG_R
      rawData[px + 1] = BG_G
      rawData[px + 2] = BG_B
      rawData[px + 3] = 255
    }
  }
}

function drawPDFText(rawData, width, rowSize) {
  const font = {
    'P': [
      'XXXXX',
      'X   X',
      'XXXXX',
      'X   X',
      'X   X',
      'X   X',
      'XXXXX',
    ],
    'D': [
      'XXXXX',
      'X   X',
      'X   X',
      'X   X',
      'X   X',
      'X   X',
      'XXXXX',
    ],
    'F': [
      'XXXXX',
      'X',
      'XXXXX',
      'X',
      'X',
      'X',
      'X',
    ],
  }

  const cellSize = 6
  const textY = width / 2 + 20
  const startX = (width - 3 * 7 * cellSize - 2 * cellSize) / 2

  const chars = ['P', 'D', 'F']

  chars.forEach((char, ci) => {
    const charData = font[char]
    if (!charData) return

    charData.forEach((row, ri) => {
      row.split('').forEach((pixel, pi) => {
        if (pixel === 'X') {
          for (let dy = 0; dy < cellSize; dy++) {
            for (let dx = 0; dx < cellSize; dx++) {
              const x = startX + ci * (7 * cellSize + cellSize) + pi * cellSize + dx
              const y = textY + ri * cellSize + dy
              if (x >= 0 && x < width && y >= 0 && y < width) {
                const px = y * rowSize + 1 + x * 4
                rawData[px] = BG_R
                rawData[px + 1] = BG_G
                rawData[px + 2] = BG_B
                rawData[px + 3] = 255
              }
            }
          }
        }
      })
    })
  })
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii')
  const lenBuf = Buffer.alloc(4)
  lenBuf.writeUInt32BE(data.length, 0)

  const crcBuf = Buffer.alloc(4)
  const crcData = Buffer.concat([typeBuf, data])
  crcBuf.writeUInt32BE(crc32(crcData), 0)

  return Buffer.concat([lenBuf, typeBuf, data, crcBuf])
}

function crc32(buf) {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
    }
    table[i] = c >>> 0
  }

  let crc = -1
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF]
  }
  return (crc ^ -1) >>> 0
}

function createICO(pngBuffer) {
  const iconDir = Buffer.alloc(6)
  iconDir.writeUInt16LE(0, 0)
  iconDir.writeUInt16LE(1, 2)
  iconDir.writeUInt16LE(1, 4)

  const dirEntry = Buffer.alloc(16)
  dirEntry[0] = 0
  dirEntry[1] = 0
  dirEntry[2] = 0
  dirEntry[3] = 0
  dirEntry.writeUInt16LE(1, 4)
  dirEntry.writeUInt16LE(32, 6)
  dirEntry.writeUInt32LE(pngBuffer.length, 8)
  dirEntry.writeUInt32LE(22, 12)

  return Buffer.concat([iconDir, dirEntry, pngBuffer])
}

function createICNS(pngBuffer) {
  const entries = []

  const entryHeader = Buffer.alloc(8)
  entryHeader.write('ic08', 0, 4, 'ascii')
  entryHeader.writeUInt32BE(8 + pngBuffer.length, 4)
  entries.push(entryHeader, pngBuffer)

  const tocHeader = Buffer.alloc(8)
  tocHeader.write('TOC ', 0, 4, 'ascii')
  tocHeader.writeUInt32BE(8 + 8, 4)
  const tocEntry = Buffer.alloc(8)
  tocEntry.write('ic08', 0, 4, 'ascii')
  tocEntry.writeUInt32BE(8 + pngBuffer.length, 4)
  entries.unshift(tocHeader, tocEntry)

  const allEntries = Buffer.concat(entries)
  const header = Buffer.alloc(8)
  header.write('icns', 0, 4, 'ascii')
  header.writeUInt32BE(8 + allEntries.length, 4)

  return Buffer.concat([header, allEntries])
}

const pngBuffer = createPNG()
fs.writeFileSync(path.join(OUTPUT_DIR, 'icon.png'), pngBuffer)
console.log('Created build/icon.png')

const icoBuffer = createICO(pngBuffer)
fs.writeFileSync(path.join(OUTPUT_DIR, 'icon.ico'), icoBuffer)
console.log('Created build/icon.ico')

const icnsBuffer = createICNS(pngBuffer)
fs.writeFileSync(path.join(OUTPUT_DIR, 'icon.icns'), icnsBuffer)
console.log('Created build/icon.icns')