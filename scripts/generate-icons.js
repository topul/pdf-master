const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

const SIZE = 256
const OUTPUT_DIR = path.join(__dirname, '../build')

// 颜色定义 (indigo-500 #6366f1)
const BG_R = 99
const BG_G = 102
const BG_B = 241

// 圆角半径
const RADIUS = 48

function createPNG() {
  const width = SIZE
  const height = SIZE

  // 每行: width * 4 (RGBA) + 1 (filter byte)
  const rowSize = width * 4 + 1
  const rawData = Buffer.alloc(rowSize * height)

  for (let y = 0; y < height; y++) {
    const rowStart = y * rowSize
    rawData[rowStart] = 0 // filter: None

    for (let x = 0; x < width; x++) {
      const px = rowStart + 1 + x * 4

      // 计算到四个角的距离
      const dx1 = x - RADIUS
      const dx2 = x - (width - 1 - RADIUS)
      const dy1 = y - RADIUS
      const dy2 = y - (height - 1 - RADIUS)

      // 判断是否在圆角矩形内
      let inside = false
      if (x >= RADIUS && x <= width - 1 - RADIUS) {
        inside = true
      } else if (y >= RADIUS && y <= height - 1 - RADIUS) {
        inside = true
      } else {
        // 计算到最近的圆角中心的距离
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

  // 压缩
  const compressed = zlib.deflateSync(rawData, { level: 9 })

  // 构建 PNG
  const ihdrData = Buffer.alloc(13)
  ihdrData.writeUInt32BE(width, 0)
  ihdrData.writeUInt32BE(height, 4)
  ihdrData[8] = 8   // bit depth
  ihdrData[9] = 6   // color type: RGBA
  ihdrData[10] = 0  // compression
  ihdrData[11] = 0  // filter method
  ihdrData[12] = 0  // interlace

  const chunks = []

  // PNG signature
  chunks.push(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))

  // IHDR
  chunks.push(makeChunk('IHDR', ihdrData))

  // IDAT
  chunks.push(makeChunk('IDAT', compressed))

  // IEND
  chunks.push(makeChunk('IEND', Buffer.alloc(0)))

  return Buffer.concat(chunks)
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
  iconDir.writeUInt16LE(0, 0) // reserved
  iconDir.writeUInt16LE(1, 2) // type: icon
  iconDir.writeUInt16LE(1, 4) // count

  const dirEntry = Buffer.alloc(16)
  dirEntry[0] = 0 // width (0 means 256)
  dirEntry[1] = 0 // height (0 means 256)
  dirEntry[2] = 0 // colors
  dirEntry[3] = 0 // reserved
  dirEntry.writeUInt16LE(1, 4)  // color planes
  dirEntry.writeUInt16LE(32, 6) // bits per pixel
  dirEntry.writeUInt32LE(pngBuffer.length, 8) // size
  dirEntry.writeUInt32LE(22, 12) // offset (6 + 16)

  return Buffer.concat([iconDir, dirEntry, pngBuffer])
}

function createICNS(pngBuffer) {
  // icns format: header + entries
  // entry format: type(4) + size(4) + data

  const entries = []

  // ic12 (256x256 @2x PNG) for Retina
  // ic11 (128x128 @2x PNG)
  // ic10 (16x16 @2x PNG)
  // ic09 (512x512 PNG)
  // ic08 (256x256 PNG)
  // ic07 (128x128 PNG)
  // icp6 (64x64 PNG)
  // icp5 (32x32 PNG)
  // icp4 (16x16 PNG)

  // For simplicity, just add ic08 (256x256 PNG)
  const entryHeader = Buffer.alloc(8)
  entryHeader.write('ic08', 0, 4, 'ascii')
  entryHeader.writeUInt32BE(8 + pngBuffer.length, 4)
  entries.push(entryHeader, pngBuffer)

  // Also add a TOC (table of contents) entry
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

// Main
const pngBuffer = createPNG()
fs.writeFileSync(path.join(OUTPUT_DIR, 'icon.png'), pngBuffer)
console.log('Created build/icon.png')

const icoBuffer = createICO(pngBuffer)
fs.writeFileSync(path.join(OUTPUT_DIR, 'icon.ico'), icoBuffer)
console.log('Created build/icon.ico')

const icnsBuffer = createICNS(pngBuffer)
fs.writeFileSync(path.join(OUTPUT_DIR, 'icon.icns'), icnsBuffer)
console.log('Created build/icon.icns')
