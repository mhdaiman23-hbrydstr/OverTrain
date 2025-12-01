import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceIcon = path.join(__dirname, '../public/icons/overtrain_icon_512x512.png');
const outputDir = path.join(__dirname, '../ios/App/App/Assets.xcassets/AppIcon.appiconset');

// iOS icon sizes required (in pixels)
const iconSizes = [
  { filename: 'AppIcon-20x20@2x.png', size: 40 },   // 20pt @2x = 40px
  { filename: 'AppIcon-20x20@3x.png', size: 60 },   // 20pt @3x = 60px
  { filename: 'AppIcon-29x29@2x.png', size: 58 },   // 29pt @2x = 58px
  { filename: 'AppIcon-29x29@3x.png', size: 87 },   // 29pt @3x = 87px
  { filename: 'AppIcon-40x40@2x.png', size: 80 },    // 40pt @2x = 80px
  { filename: 'AppIcon-40x40@3x.png', size: 120 },  // 40pt @3x = 120px
  { filename: 'AppIcon-60x60@2x.png', size: 120 },   // 60pt @2x = 120px
  { filename: 'AppIcon-60x60@3x.png', size: 180 },   // 60pt @3x = 180px
  { filename: 'AppIcon-1024x1024.png', size: 1024 }, // Marketing icon
];

async function generateIcons() {
  console.log('Generating iOS app icons...');
  console.log(`Source: ${sourceIcon}`);
  console.log(`Output: ${outputDir}`);

  // Check if source exists
  if (!fs.existsSync(sourceIcon)) {
    console.error(`Error: Source icon not found at ${sourceIcon}`);
    process.exit(1);
  }

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Generate each icon size
  for (const icon of iconSizes) {
    const outputPath = path.join(outputDir, icon.filename);
    try {
      await sharp(sourceIcon)
        .resize(icon.size, icon.size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 1 }
        })
        .png()
        .toFile(outputPath);
      console.log(`✓ Generated ${icon.filename} (${icon.size}x${icon.size}px)`);
    } catch (error) {
      console.error(`✗ Failed to generate ${icon.filename}:`, error.message);
    }
  }

  console.log('\n✅ All iOS app icons generated successfully!');
}

generateIcons().catch(console.error);

