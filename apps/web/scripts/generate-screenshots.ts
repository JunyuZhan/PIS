import sharp from "sharp";
import { mkdir } from "fs/promises";
import { dirname, join } from "path";

async function generateScreenshots() {
  const publicDir = join(process.cwd(), "public", "screenshots");

  // 确保目录存在
  await mkdir(publicDir, { recursive: true });

  // Mobile screenshot (1080x1920)
  await sharp({
    create: {
      width: 1080,
      height: 1920,
      channels: 4,
      background: { r: 5, g: 5, b: 5, alpha: 1 },
    },
  })
    .composite([
      {
        input: Buffer.from(`<svg width="1080" height="1920">
      <rect width="1080" height="1920" fill="#050505"/>
      <text x="540" y="960" font-family="Arial, sans-serif" font-size="48" fill="#D4AF37" text-anchor="middle" dominant-baseline="middle">PIS - 专业摄影分享</text>
      <text x="540" y="1020" font-family="Arial, sans-serif" font-size="32" fill="#666666" text-anchor="middle" dominant-baseline="middle">Mobile Preview</text>
    </svg>`),
      },
    ])
    .png()
    .toFile(join(publicDir, "mobile.png"));

  console.log("✓ mobile.png created (1080x1920)");

  // Desktop screenshot (1920x1080)
  await sharp({
    create: {
      width: 1920,
      height: 1080,
      channels: 4,
      background: { r: 5, g: 5, b: 5, alpha: 1 },
    },
  })
    .composite([
      {
        input: Buffer.from(`<svg width="1920" height="1080">
      <rect width="1920" height="1080" fill="#050505"/>
      <text x="960" y="540" font-family="Arial, sans-serif" font-size="72" fill="#D4AF37" text-anchor="middle" dominant-baseline="middle">PIS - 专业摄影分享</text>
      <text x="960" y="620" font-family="Arial, sans-serif" font-size="48" fill="#666666" text-anchor="middle" dominant-baseline="middle">Desktop Preview</text>
    </svg>`),
      },
    ])
    .png()
    .toFile(join(publicDir, "desktop.png"));

  console.log("✓ desktop.png created (1920x1080)");
  console.log("\nAll screenshots generated successfully!");
}

generateScreenshots().catch(console.error);
