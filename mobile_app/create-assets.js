const fs = require('fs');
const zlib = require('zlib');

function crc32(buf) {
  const table = (() => {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[i] = c;
    }
    return t;
  })();
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const len = Buffer.allocUnsafe(4);
  len.writeUInt32BE(data.length, 0);
  const crcVal = Buffer.allocUnsafe(4);
  crcVal.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 0);
  return Buffer.concat([len, typeBytes, data, crcVal]);
}

function createRGBPng(width, height, r, g, b) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.allocUnsafe(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 2;  // color type: RGB
  ihdrData[10] = 0; ihdrData[11] = 0; ihdrData[12] = 0;

  const rowLen = 1 + width * 3;
  const raw = Buffer.allocUnsafe(height * rowLen);
  for (let y = 0; y < height; y++) {
    raw[y * rowLen] = 0; // filter: None
    for (let x = 0; x < width; x++) {
      raw[y * rowLen + 1 + x * 3] = r;
      raw[y * rowLen + 2 + x * 3] = g;
      raw[y * rowLen + 3 + x * 3] = b;
    }
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdrData),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function createRGBAPng(width, height, r, g, b, a) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.allocUnsafe(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 6;  // color type: RGBA
  ihdrData[10] = 0; ihdrData[11] = 0; ihdrData[12] = 0;

  const rowLen = 1 + width * 4;
  const raw = Buffer.allocUnsafe(height * rowLen);
  for (let y = 0; y < height; y++) {
    raw[y * rowLen] = 0;
    for (let x = 0; x < width; x++) {
      raw[y * rowLen + 1 + x * 4] = r;
      raw[y * rowLen + 2 + x * 4] = g;
      raw[y * rowLen + 3 + x * 4] = b;
      raw[y * rowLen + 4 + x * 4] = a;
    }
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdrData),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const dir = './assets';
if (!fs.existsSync(dir)) fs.mkdirSync(dir);

// icon.png: 1024x1024 dark blue #0c1c48
console.log('Creating icon.png (1024x1024)...');
fs.writeFileSync(`${dir}/icon.png`, createRGBPng(1024, 1024, 12, 28, 72));

// adaptive-icon.png: 1024x1024 RGBA (dark blue, full opacity)
console.log('Creating adaptive-icon.png (1024x1024)...');
fs.writeFileSync(`${dir}/adaptive-icon.png`, createRGBAPng(1024, 1024, 12, 28, 72, 255));

// splash.png: 1284x2778 white background
console.log('Creating splash.png (1284x2778)...');
fs.writeFileSync(`${dir}/splash.png`, createRGBPng(1284, 2778, 255, 255, 255));

// favicon.png: 48x48 dark blue
console.log('Creating favicon.png (48x48)...');
fs.writeFileSync(`${dir}/favicon.png`, createRGBPng(48, 48, 12, 28, 72));

console.log('All assets created successfully.');
