import path from "node:path";
import process from "node:process";
import sharp from "sharp";

const output = path.resolve("public/default-og.png");
const svg = `
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0f172a"/>
      <stop offset="1" stop-color="#1e3a8a"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.82" cy="0.18" r="0.72">
      <stop offset="0" stop-color="#60a5fa" stop-opacity="0.48"/>
      <stop offset="1" stop-color="#60a5fa" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" rx="36" fill="url(#bg)"/>
  <rect width="1200" height="630" rx="36" fill="url(#glow)"/>
  <rect x="72" y="76" width="74" height="74" rx="18" fill="#2563eb"/>
  <text x="109" y="127" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="38" font-weight="700" fill="#fff">R</text>
  <text x="72" y="282" font-family="Arial, Helvetica, sans-serif" font-size="86" font-weight="700" fill="#f8fafc">Ryan's Notes</text>
  <text x="76" y="352" font-family="Arial, Helvetica, sans-serif" font-size="32" letter-spacing="5" fill="#bfdbfe">TECH NOTES · IDEAS · PRACTICE</text>
  <line x1="76" y1="430" x2="1124" y2="430" stroke="#93c5fd" stroke-opacity="0.45" stroke-width="2"/>
  <text x="76" y="510" font-family="Arial, Helvetica, sans-serif" font-size="30" fill="#dbeafe">ryanwang945.github.io</text>
</svg>`;

await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(output);
process.stdout.write(`已生成：${path.relative(process.cwd(), output)}\n`);
