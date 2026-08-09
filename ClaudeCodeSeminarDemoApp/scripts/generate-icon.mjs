// トレイ・ウィンドウ・デスクトップショートカット用のアイコンを生成する。
// 依存パッケージなしで、PNG(build/icon.png)と、デスクトップショートカットのアイコンに使う
// ICO(build/icon.ico、複数解像度のPNGを内包)を直接組み立てる。
//
// 意匠: 青のグラデーションを敷いた角丸スクエアに、白い再生マーク(三角形)と、
//       その左に小さな白丸を置いたもの。「登録したものをまとめて開く(再生する)」を表す。
// 図形はすべて座標式で描いているため、16pxでも256pxでも輪郭が崩れない。
// 別のロゴに差し替えたい場合は、生成後の build/icon.png / build/icon.ico を直接置き換えればよい。
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'

const ICO_SIZES = [16, 32, 48, 256]
const WINDOW_ICON_SIZE = 256

// --- 意匠のパラメータ(すべて一辺に対する比率。size を変えても見た目が保たれる) ---
const CORNER_RADIUS = 0.2 // 角丸の半径
const GRADIENT_FROM = [59, 130, 246] // 左上の青 #3b82f6
const GRADIENT_TO = [21, 82, 220] // 右下の青 #1552dc
const MARK = [255, 255, 255] // 再生マーク・丸の色

const DOT_CENTER = [0.275, 0.5]
const DOT_RADIUS = 0.045
const TRIANGLE = [
  [0.395, 0.262], // 左上
  [0.395, 0.738], // 左下
  [0.755, 0.5], // 右の頂点
]

// 1ピクセルあたり SUPERSAMPLE^2 点を評価して輪郭を滑らかにする(アンチエイリアス)。
const SUPERSAMPLE = 4

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[n] = c >>> 0
  }
  return table
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  }
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii')
  const lenBuf = Buffer.alloc(4)
  lenBuf.writeUInt32BE(data.length, 0)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf])
}

// u, v は 0..1 に正規化した座標。以降の図形判定はすべてこの座標系で行う。
function insideRoundedSquare(u, v) {
  const r = CORNER_RADIUS
  const cx = Math.min(Math.max(u, r), 1 - r)
  const cy = Math.min(Math.max(v, r), 1 - r)
  const dx = u - cx
  const dy = v - cy
  return dx * dx + dy * dy <= r * r
}

function insideDot(u, v) {
  const dx = u - DOT_CENTER[0]
  const dy = v - DOT_CENTER[1]
  return dx * dx + dy * dy <= DOT_RADIUS * DOT_RADIUS
}

function insideTriangle(u, v) {
  // 3辺それぞれについて、点が同じ側にあるかを外積の符号で判定する。
  const [a, b, c] = TRIANGLE
  const cross = (p, q) => (q[0] - p[0]) * (v - p[1]) - (q[1] - p[1]) * (u - p[0])
  const d1 = cross(a, b)
  const d2 = cross(b, c)
  const d3 = cross(c, a)
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0
  return !(hasNeg && hasPos)
}

function gradientAt(u, v) {
  // 左上から右下へ向かう対角グラデーション。
  const t = Math.min(Math.max((u + v) / 2, 0), 1)
  return [
    Math.round(GRADIENT_FROM[0] + (GRADIENT_TO[0] - GRADIENT_FROM[0]) * t),
    Math.round(GRADIENT_FROM[1] + (GRADIENT_TO[1] - GRADIENT_FROM[1]) * t),
    Math.round(GRADIENT_FROM[2] + (GRADIENT_TO[2] - GRADIENT_FROM[2]) * t),
  ]
}

function makePng(size) {
  const rowBytes = size * 4
  const raw = Buffer.alloc((rowBytes + 1) * size)
  const samples = SUPERSAMPLE * SUPERSAMPLE

  for (let y = 0; y < size; y++) {
    const rowStart = y * (rowBytes + 1)
    raw[rowStart] = 0 // フィルタなし
    for (let x = 0; x < size; x++) {
      let covered = 0
      let sumR = 0
      let sumG = 0
      let sumB = 0

      for (let sy = 0; sy < SUPERSAMPLE; sy++) {
        for (let sx = 0; sx < SUPERSAMPLE; sx++) {
          const u = (x + (sx + 0.5) / SUPERSAMPLE) / size
          const v = (y + (sy + 0.5) / SUPERSAMPLE) / size
          if (!insideRoundedSquare(u, v)) continue

          covered++
          const color = insideDot(u, v) || insideTriangle(u, v) ? MARK : gradientAt(u, v)
          sumR += color[0]
          sumG += color[1]
          sumB += color[2]
        }
      }

      const off = rowStart + 1 + x * 4
      if (covered === 0) {
        // 角の外側は完全な透明。RGBも0にしておく(縮小時の色にじみを避ける)。
        continue
      }
      raw[off] = Math.round(sumR / covered)
      raw[off + 1] = Math.round(sumG / covered)
      raw[off + 2] = Math.round(sumB / covered)
      raw[off + 3] = Math.round((covered / samples) * 255)
    }
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type: RGBA
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  const idat = deflateSync(raw)

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// ICO(Vista以降): 各エントリの画像データにPNGをそのまま格納できる。BMPへの変換は不要。
function makeIco(sizes) {
  const pngs = sizes.map((size) => ({ size, data: makePng(size) }))

  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // type: 1 = icon
  header.writeUInt16LE(pngs.length, 4)

  let offset = 6 + pngs.length * 16
  const entries = []
  const dataParts = []
  for (const { size, data } of pngs) {
    const entry = Buffer.alloc(16)
    entry.writeUInt8(size >= 256 ? 0 : size, 0) // width (0 = 256)
    entry.writeUInt8(size >= 256 ? 0 : size, 1) // height (0 = 256)
    entry.writeUInt8(0, 2) // color count
    entry.writeUInt8(0, 3) // reserved
    entry.writeUInt16LE(1, 4) // color planes
    entry.writeUInt16LE(32, 6) // bits per pixel
    entry.writeUInt32LE(data.length, 8) // size of image data
    entry.writeUInt32LE(offset, 12) // offset of image data
    entries.push(entry)
    dataParts.push(data)
    offset += data.length
  }

  return Buffer.concat([header, ...entries, ...dataParts])
}

mkdirSync(new URL('../build/', import.meta.url), { recursive: true })

writeFileSync(new URL('../build/icon.png', import.meta.url), makePng(WINDOW_ICON_SIZE))
console.log('build/icon.png を生成しました')

writeFileSync(new URL('../build/icon.ico', import.meta.url), makeIco(ICO_SIZES))
console.log('build/icon.ico を生成しました(デスクトップショートカット用)')
