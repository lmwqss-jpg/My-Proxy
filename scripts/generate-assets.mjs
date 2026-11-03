/**
 * Deterministic pixel-art asset generator for ATLAS CLIENT.
 *
 * The generated PNGs are committed so a normal build does not need Python or
 * any image library. Run `npm run assets` after changing a design.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RP = path.join(ROOT, "src/ATLAS/RP");
const BP = path.join(ROOT, "src/ATLAS/BP");

const COLORS = {
  dark: [7, 14, 26, 255],
  navy: [12, 24, 43, 255],
  line: [26, 48, 78, 255],
  cyan: [56, 189, 248, 255],
  cyanSoft: [34, 211, 238, 255],
  white: [226, 232, 240, 255],
  muted: [100, 116, 139, 255],
  green: [52, 211, 153, 255],
  red: [248, 113, 113, 255],
  amber: [251, 191, 36, 255],
  violet: [167, 139, 250, 255],
};

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let crc = -1;
  for (let i = 0; i < buffer.length; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ buffer[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

function writePng(file, width, height, pixels) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const scanlines = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (width * 4 + 1);
    scanlines[rowStart] = 0; // filter: none
    pixels.copy(scanlines, rowStart + 1, y * width * 4, (y + 1) * width * 4);
  }
  const payload = Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(scanlines, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, payload);
}

function canvas(width, height, fill = null) {
  const pixels = Buffer.alloc(width * height * 4);
  if (fill) {
    for (let i = 0; i < width * height; i++) {
      pixels[i * 4] = fill[0];
      pixels[i * 4 + 1] = fill[1];
      pixels[i * 4 + 2] = fill[2];
      pixels[i * 4 + 3] = fill[3] ?? 255;
    }
  }
  return { width, height, pixels };
}

function setPixel(image, x, y, color) {
  if (x < 0 || y < 0 || x >= image.width || y >= image.height) return;
  if (color.length === 3) color = [...color, 255];
  const index = (Math.floor(y) * image.width + Math.floor(x)) * 4;
  image.pixels[index] = color[0];
  image.pixels[index + 1] = color[1];
  image.pixels[index + 2] = color[2];
  image.pixels[index + 3] = color[3];
}

function clearPixel(image, x, y) {
  if (x < 0 || y < 0 || x >= image.width || y >= image.height) return;
  const index = (Math.floor(y) * image.width + Math.floor(x)) * 4;
  image.pixels[index] = 0;
  image.pixels[index + 1] = 0;
  image.pixels[index + 2] = 0;
  image.pixels[index + 3] = 0;
}

function fillRect(image, x, y, width, height, color) {
  for (let py = y; py < y + height; py++) {
    for (let px = x; px < x + width; px++) setPixel(image, px, py, color);
  }
}

function fillRoundedRect(image, x, y, width, height, radius, color) {
  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      const dx = Math.min(px, width - 1 - px);
      const dy = Math.min(py, height - 1 - py);
      if (dx < radius && dy < radius) {
        const cx = radius - dx;
        const cy = radius - dy;
        if (cx * cx + cy * cy > radius * radius) continue;
      }
      setPixel(image, x + px, y + py, color);
    }
  }
}

function fillCircle(image, cx, cy, radius, color) {
  const r2 = radius * radius;
  for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y++) {
    for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r2) setPixel(image, x, y, color);
    }
  }
}

function fillEllipse(image, cx, cy, rx, ry, color) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1) setPixel(image, x, y, color);
    }
  }
}

function clearCircle(image, cx, cy, radius) {
  const r2 = radius * radius;
  for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y++) {
    for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r2) clearPixel(image, x, y);
    }
  }
}

function line(image, x0, y0, x1, y1, thickness, color) {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    fillCircle(image, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, thickness / 2, color);
  }
}

function polygon(image, points, color) {
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [, y] of points) {
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
    const intersections = [];
    for (let i = 0; i < points.length; i++) {
      const [x1, y1] = points[i];
      const [x2, y2] = points[(i + 1) % points.length];
      if ((y1 > y) !== (y2 > y)) {
        intersections.push(x1 + ((y - y1) / (y2 - y1)) * (x2 - x1));
      }
    }
    intersections.sort((a, b) => a - b);
    for (let i = 0; i + 1 < intersections.length; i += 2) {
      for (let x = Math.ceil(intersections[i]); x <= Math.floor(intersections[i + 1]); x++) {
        setPixel(image, x, y, color);
      }
    }
  }
}

function scaled(image, factor) {
  const result = canvas(image.width * factor, image.height * factor);
  for (let y = 0; y < result.height; y++) {
    for (let x = 0; x < result.width; x++) {
      const sourceX = Math.floor(x / factor);
      const sourceY = Math.floor(y / factor);
      const sourceIndex = (sourceY * image.width + sourceX) * 4;
      const targetIndex = (y * result.width + x) * 4;
      image.pixels.copy(result.pixels, targetIndex, sourceIndex, sourceIndex + 4);
    }
  }
  return result;
}

const FONT = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  I: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
};

function textWidth(text, scale) {
  return text.length * 5 * scale + (text.length - 1) * scale;
}

function drawText(image, text, centerX, topY, scale, color) {
  const width = textWidth(text, scale);
  let cursor = Math.round(centerX - width / 2);
  for (const character of text) {
    const glyph = FONT[character];
    if (glyph) {
      for (let row = 0; row < 7; row++) {
        for (let col = 0; col < 5; col++) {
          if (glyph[row][col] === "1") {
            fillRect(image, cursor + col * scale, topY + row * scale, scale, scale, color);
          }
        }
      }
    }
    cursor += 6 * scale;
  }
}

function drawCompassStar(image, cx, cy, outer, inner, color, centerColor) {
  polygon(
    image,
    [
      [cx, cy - outer],
      [cx + inner, cy - inner],
      [cx + outer, cy],
      [cx + inner, cy + inner],
      [cx, cy + outer],
      [cx - inner, cy + inner],
      [cx - outer, cy],
      [cx - inner, cy - inner],
    ],
    color,
  );
  polygon(
    image,
    [
      [cx, cy - outer * 0.55],
      [cx + inner * 0.55, cy - inner * 0.55],
      [cx + outer * 0.55, cy],
      [cx + inner * 0.55, cy + inner * 0.55],
      [cx, cy + outer * 0.55],
      [cx - inner * 0.55, cy + inner * 0.55],
      [cx - outer * 0.55, cy],
      [cx - inner * 0.55, cy - inner * 0.55],
    ],
    centerColor,
  );
}

function packIcon() {
  const image = canvas(128, 128, COLORS.dark);
  fillRoundedRect(image, 3, 3, 122, 122, 18, COLORS.navy);
  for (let x = 12; x < 128; x += 16) line(image, x, 4, x, 124, 1, [18, 35, 58, 255]);
  for (let y = 12; y < 128; y += 16) line(image, 4, y, 124, y, 1, [18, 35, 58, 255]);
  fillCircle(image, 64, 50, 34, [20, 45, 74, 255]);
  fillCircle(image, 64, 50, 31, COLORS.navy);
  line(image, 64, 19, 64, 81, 1, [56, 189, 248, 120]);
  line(image, 33, 50, 95, 50, 1, [56, 189, 248, 120]);
  drawCompassStar(image, 64, 50, 28, 10, COLORS.cyan, COLORS.white);
  fillCircle(image, 64, 50, 4, COLORS.dark);
  drawText(image, "ATLAS", 64, 89, 3, COLORS.white);
  drawText(image, "CLIENT", 64, 113, 2, COLORS.cyan);
  return scaled(image, 2);
}

function itemIcon() {
  const image = canvas(32, 32);
  fillCircle(image, 16, 16, 15, COLORS.cyan);
  fillCircle(image, 16, 16, 13, COLORS.navy);
  drawCompassStar(image, 16, 16, 11, 4, COLORS.cyan, COLORS.white);
  fillCircle(image, 16, 16, 2, COLORS.dark);
  return image;
}

function hudIcon() {
  const image = canvas(32, 32);
  fillRoundedRect(image, 4, 7, 24, 5, 2, COLORS.cyan);
  fillRoundedRect(image, 4, 14, 18, 5, 2, COLORS.white);
  fillRoundedRect(image, 4, 21, 21, 5, 2, COLORS.muted);
  return image;
}

function visualIcon() {
  const image = canvas(32, 32);
  fillEllipse(image, 16, 16, 13, 8, COLORS.cyan);
  fillEllipse(image, 16, 16, 8, 5, COLORS.dark);
  fillCircle(image, 16, 16, 4, COLORS.white);
  fillCircle(image, 16, 16, 2, COLORS.dark);
  fillCircle(image, 14, 14, 1, COLORS.cyanSoft);
  return image;
}

function pvpIcon() {
  const image = canvas(32, 32);
  line(image, 7, 25, 25, 7, 3, COLORS.white);
  line(image, 7, 7, 25, 25, 3, COLORS.white);
  line(image, 5, 23, 9, 27, 4, COLORS.cyan);
  line(image, 23, 23, 27, 27, 4, COLORS.cyan);
  fillCircle(image, 16, 16, 2, COLORS.dark);
  return image;
}

function utilitiesIcon() {
  const image = canvas(32, 32);
  fillCircle(image, 16, 13, 10, COLORS.cyan);
  polygon(image, [[6, 16], [26, 16], [16, 30]], COLORS.cyan);
  fillCircle(image, 16, 13, 4, COLORS.dark);
  fillCircle(image, 16, 13, 1.5, COLORS.white);
  return image;
}

function settingsIcon() {
  const image = canvas(32, 32);
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI * 2 * i) / 8;
    line(
      image,
      16 + Math.cos(angle) * 9,
      16 + Math.sin(angle) * 9,
      16 + Math.cos(angle) * 14,
      16 + Math.sin(angle) * 14,
      4,
      COLORS.cyan,
    );
  }
  fillCircle(image, 16, 16, 10, COLORS.cyan);
  clearCircle(image, 16, 16, 5);
  return image;
}

function closeIcon() {
  const image = canvas(32, 32);
  line(image, 8, 8, 24, 24, 4, COLORS.white);
  line(image, 8, 24, 24, 8, 4, COLORS.white);
  return image;
}

function logoIcon() {
  const image = canvas(32, 32);
  fillCircle(image, 16, 16, 15, [20, 45, 74, 255]);
  fillCircle(image, 16, 16, 13, COLORS.navy);
  drawCompassStar(image, 16, 16, 12, 4, COLORS.cyan, COLORS.white);
  fillCircle(image, 16, 16, 2, COLORS.dark);
  return image;
}

const icon = packIcon();
writePng(path.join(BP, "pack_icon.png"), icon.width, icon.height, icon.pixels);
writePng(path.join(RP, "pack_icon.png"), icon.width, icon.height, icon.pixels);
writePng(path.join(RP, "textures/items/atlas_client.png"), ...pngItem());
writePng(path.join(RP, "textures/ui/atlas_logo.png"), ...pngItem(logoIcon));
writePng(path.join(RP, "textures/ui/atlas_hud.png"), ...pngItem(hudIcon));
writePng(path.join(RP, "textures/ui/atlas_visual.png"), ...pngItem(visualIcon));
writePng(path.join(RP, "textures/ui/atlas_pvp.png"), ...pngItem(pvpIcon));
writePng(path.join(RP, "textures/ui/atlas_utilities.png"), ...pngItem(utilitiesIcon));
writePng(path.join(RP, "textures/ui/atlas_settings.png"), ...pngItem(settingsIcon));
writePng(path.join(RP, "textures/ui/atlas_close.png"), ...pngItem(closeIcon));

function pngItem(factory = itemIcon) {
  const image = factory();
  return [image.width, image.height, image.pixels];
}

console.log("Generated ATLAS pack icons, item texture and UI icons.");
