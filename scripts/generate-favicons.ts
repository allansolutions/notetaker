import sharp from 'sharp';
import { join } from 'path';

const publicDir = join(import.meta.dir, '..', 'public');

// Dark variant (used for PNGs since they can't adapt to color scheme)
const svgDark = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="7" fill="#0f172a"/>
  <rect x="7" y="8" width="2.5" height="3" rx="1.25" fill="#3b82f6"/>
  <rect x="11" y="8" width="14" height="3" rx="1.5" fill="#e2e8f0"/>
  <rect x="7" y="14.5" width="13" height="3" rx="1.5" fill="#94a3b8"/>
  <rect x="7" y="21" width="16" height="3" rx="1.5" fill="#64748b"/>
</svg>`;

// Light variant for apple-touch-icon (shown on light home screens)
const svgLight = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="#0f172a"/>
  <rect x="112" y="128" width="40" height="48" rx="20" fill="#3b82f6"/>
  <rect x="176" y="128" width="224" height="48" rx="24" fill="#e2e8f0"/>
  <rect x="112" y="232" width="208" height="48" rx="24" fill="#94a3b8"/>
  <rect x="112" y="336" width="256" height="48" rx="24" fill="#64748b"/>
</svg>`;

async function generate() {
  // favicon-32x32.png
  await sharp(Buffer.from(svgDark))
    .resize(32, 32)
    .png()
    .toFile(join(publicDir, 'favicon-32x32.png'));

  // favicon-16x16.png
  await sharp(Buffer.from(svgDark))
    .resize(16, 16)
    .png()
    .toFile(join(publicDir, 'favicon-16x16.png'));

  // apple-touch-icon (180x180)
  await sharp(Buffer.from(svgLight))
    .resize(180, 180)
    .png()
    .toFile(join(publicDir, 'apple-touch-icon.png'));

  // android-chrome-192x192
  await sharp(Buffer.from(svgLight))
    .resize(192, 192)
    .png()
    .toFile(join(publicDir, 'android-chrome-192x192.png'));

  // android-chrome-512x512
  await sharp(Buffer.from(svgLight))
    .resize(512, 512)
    .png()
    .toFile(join(publicDir, 'android-chrome-512x512.png'));

  console.log('All favicons generated.');
}

generate().catch(console.error);
