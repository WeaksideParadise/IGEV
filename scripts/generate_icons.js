const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

function crc32(buf) {
  let table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ (-1)) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type);
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcVal = crc32(crcInput);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal, 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function generatePng(size) {
  const width = size;
  const height = size;
  const scale = size / 64;

  const rawRows = [];

  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 4);
    row[0] = 0; // Filter: None
    const sy = y / scale;

    for (let x = 0; x < width; x++) {
      const sx = x / scale;
      let r = 0, g = 0, b = 0, a = 0;

      // Squircle bounds (x: 2..62, y: 2..62, rx: 14)
      const bMin = 2, bMax = 62, rx = 14;
      const inBoxX = sx >= bMin && sx <= bMax;
      const inBoxY = sy >= bMin && sy <= bMax;

      if (inBoxX && inBoxY) {
        let inside = true;
        let dist = 0;
        const cornerX = sx < bMin + rx ? bMin + rx : (sx > bMax - rx ? bMax - rx : sx);
        const cornerY = sy < bMin + rx ? bMin + rx : (sy > bMax - rx ? bMax - rx : sy);
        const dx = sx - cornerX;
        const dy = sy - cornerY;
        dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > rx) {
          inside = false;
        }

        if (inside) {
          // Dark void gradient from top (#0a1224) to bottom (#04070e)
          const t = sy / 64;
          r = Math.round(10 * (1 - t) + 4 * t);
          g = Math.round(18 * (1 - t) + 7 * t);
          b = Math.round(36 * (1 - t) + 14 * t);
          a = 255;

          // Border stroke (width 2 around edge)
          if (dist > rx - 1.8 || (sx < bMin + 1.8 && sy > bMin + rx && sy < bMax - rx) ||
              (sx > bMax - 1.8 && sy > bMin + rx && sy < bMax - rx) ||
              (sy < bMin + 1.8 && sx > bMin + rx && sx < bMax - rx) ||
              (sy > bMax - 1.8 && sx > bMin + rx && sx < bMax - rx)) {
            r = 30; g = 44; b = 71;
          }

          // Grid line guides (dashed x=20, 34, 48)
          if ((Math.abs(sx - 20) < 0.6 || Math.abs(sx - 34) < 0.6 || Math.abs(sx - 48) < 0.6) && (sy >= 11 && sy <= 53)) {
            if (Math.floor(sy / 3) % 2 === 0) {
              r = 22; g = 35; b = 59;
            }
          }

          // Dependency link: Task 1 to Task 2 (Amber)
          if ((sy >= 19.6 && sy <= 21.4 && sx >= 33 && sx <= 39) ||
              (sx >= 38.1 && sx <= 39.9 && sy >= 20.5 && sy <= 29.5) ||
              (sy >= 28.6 && sy <= 30.4 && sx >= 28 && sx <= 39)) {
            r = 255; g = 182; b = 72;
          }

          // Dependency link: Task 2 to Milestone (Magenta)
          if ((sx >= 46.1 && sx <= 47.9 && sy >= 34 && sy <= 46.5) ||
              (sy >= 45.6 && sy <= 47.4 && sx >= 44 && sx <= 47.9)) {
            r = 255; g = 92; b = 134;
          }

          // Dependency link: Task 3 to Milestone (Amber)
          if (sy >= 45.6 && sy <= 47.4 && sx >= 29 && sx <= 38) {
            r = 245; g = 158; b = 11;
          }

          // Task 1: Cyan (x: 13..33, y: 16..25, rx: 4.5)
          if (sx >= 13 && sx <= 33 && sy >= 16 && sy <= 25) {
            const cx = sx < 17.5 ? 17.5 : (sx > 28.5 ? 28.5 : sx);
            const cy = 20.5;
            const tdist = Math.sqrt((sx - cx) ** 2 + (sy - cy) ** 2);
            if (tdist <= 4.5) {
              r = 0; g = 229; b = 255;
            }
          }

          // Task 2: Emerald (x: 25..47, y: 29.5..38.5, rx: 4.5)
          if (sx >= 25 && sx <= 47 && sy >= 29.5 && sy <= 38.5) {
            const cx = sx < 29.5 ? 29.5 : (sx > 42.5 ? 42.5 : sx);
            const cy = 34;
            const tdist = Math.sqrt((sx - cx) ** 2 + (sy - cy) ** 2);
            if (tdist <= 4.5) {
              r = 16; g = 185; b = 129;
            }
          }

          // Task 3: Amber (x: 13..29, y: 42..51, rx: 4.5)
          if (sx >= 13 && sx <= 29 && sy >= 42 && sy <= 51) {
            const cx = sx < 17.5 ? 17.5 : (sx > 24.5 ? 24.5 : sx);
            const cy = 46.5;
            const tdist = Math.sqrt((sx - cx) ** 2 + (sy - cy) ** 2);
            if (tdist <= 4.5) {
              r = 245; g = 158; b = 11;
            }
          }

          // Milestone Diamond (center 44, 46.5, half-width 6)
          const mdx = Math.abs(sx - 44);
          const mdy = Math.abs(sy - 46.5);
          if (mdx + mdy <= 6) {
            r = 255; g = 77; b = 109;
          }
        }
      }

      const offset = 1 + x * 4;
      row[offset] = r;
      row[offset + 1] = g;
      row[offset + 2] = b;
      row[offset + 3] = a;
    }
    rawRows.push(row);
  }

  const idatRaw = Buffer.concat(rawRows);
  const idatCompressed = zlib.deflateSync(idatRaw);

  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8-bit
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  const ihdr = makeChunk('IHDR', ihdrData);
  const idat = makeChunk('IDAT', idatCompressed);
  const iend = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdr, idat, iend]);
}

const appleTouchIcon180 = generatePng(180);
fs.writeFileSync(path.join(__dirname, '..', 'assets', 'apple-touch-icon.png'), appleTouchIcon180);
console.log('Generated assets/apple-touch-icon.png (180x180)');
