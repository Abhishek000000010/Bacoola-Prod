/**
 * Regenerate the phone / tablet copies of the home hero photos.
 *
 * The originals are full-size JPGs (the first one is 571 KB), and a phone
 * loads all four at once because the hero keeps every section's photo mounted
 * for its hover crossfade. Screens under 1024px get these WebP copies
 * instead; desktop still loads the original JPGs.
 *
 * Run this after replacing one of the photos:
 *   node scripts/build-mobile-hero-images.mjs
 *
 * If a replacement photo has different dimensions, update its width and
 * height in modules/home/components/section-hero as well; the script prints
 * them.
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import sharp from "sharp"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const IMAGES = path.join(ROOT, "apps/storefront/public/images")
const OUT = path.join(IMAGES, "mobile")

const PHOTOS = ["hero-vacation", "hero-arrivals", "campaign-8", "campaign-4"]

// Must match MOBILE_WIDTHS in the section-hero component. The original width
// is always added as the largest step, and nothing is ever upscaled.
const MOBILE_WIDTHS = [640, 960, 1280, 1600]
const QUALITY = 78

fs.mkdirSync(OUT, { recursive: true })

for (const name of PHOTOS) {
  const source = path.join(IMAGES, `${name}.jpg`)
  const { width, height } = await sharp(source).metadata()
  const widths = [...MOBILE_WIDTHS.filter((w) => w < width), width]

  console.log(`${name}.jpg  ${width}x${height}`)

  for (const w of widths) {
    const file = path.join(OUT, `${name}-${w}.webp`)
    await sharp(source).resize({ width: w }).webp({ quality: QUALITY }).toFile(file)
    console.log(`  ${path.relative(ROOT, file)}  ${Math.round(fs.statSync(file).size / 1024)} KB`)
  }
}
