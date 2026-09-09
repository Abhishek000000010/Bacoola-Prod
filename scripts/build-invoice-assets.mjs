/**
 * Regenerate apps/backend/src/lib/invoice-assets.ts.
 *
 * The invoice PDF needs three fonts and the wordmark at RUNTIME, but
 * `medusa build` copies only compiled JavaScript out of src/ — every non-code
 * file is dropped, so the production server (which runs from
 * apps/backend/.medusa/server) cannot read them off disk. They are therefore
 * baked into a TypeScript module as base64.
 *
 * Run this after replacing a font or the logo:
 *   node scripts/build-invoice-assets.mjs
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

/** Export name → source file, relative to the repo root. */
const ASSETS = {
  MANGO_REGULAR_WOFF2: "apps/storefront/public/fonts/MangoNew-Regular-en.woff2",
  MANGO_SEMIBOLD_WOFF2: "apps/storefront/public/fonts/MangoNew-SemiBold-en.woff2",
  POPPINS_REGULAR_TTF: "Poppins-Regular.ttf",
  BACOOLA_LOGO_PNG: "apps/backend/src/admin/assets/bacoola-logo.png",
}

const OUT = path.join(ROOT, "apps/backend/src/lib/invoice-assets.ts")

const header = `/**
 * Binary assets for the invoice PDF, base64-encoded into TypeScript.
 *
 * Why inline and not \`fs.readFileSync\` of a real file: \`medusa build\`
 * COMPILES src/ into .medusa/server/src and copies only the emitted JavaScript.
 * Non-code files are dropped — apps/backend/src/admin/assets/bacoola-logo.png
 * exists in the repo but NOT in .medusa/server, which is the directory the
 * production server actually runs from (Dockerfile.backend, invariant 3.1).
 * Anything the runtime needs therefore has to BE code. The admin branding
 * plugin gets away with reading the PNG off disk because it runs at build time,
 * in the source tree; this module runs per order, in production.
 *
 * Regenerate with: node scripts/build-invoice-assets.mjs
 * Sources:
 *   MangoNew-{Regular,SemiBold}-en.woff2  apps/storefront/public/fonts/  (the
 *     storefront brand face — see apps/storefront/src/styles/globals.css)
 *   Poppins-Regular.ttf                   repo root
 *   bacoola-logo.png                      apps/backend/src/admin/assets/
 *
 * DO NOT EDIT BY HAND.
 */
`

let out = header
for (const [name, rel] of Object.entries(ASSETS)) {
  const abs = path.join(ROOT, rel)
  const buf = fs.readFileSync(abs)
  out += `\n/** ${rel} (${buf.length} bytes) */\nexport const ${name}_BASE64 =\n  "${buf.toString("base64")}"\n`
}

out += `
const decode = (b64: string): Buffer => Buffer.from(b64, "base64")

export const MANGO_REGULAR = (): Buffer => decode(MANGO_REGULAR_WOFF2_BASE64)
export const MANGO_SEMIBOLD = (): Buffer => decode(MANGO_SEMIBOLD_WOFF2_BASE64)
export const POPPINS_REGULAR = (): Buffer => decode(POPPINS_REGULAR_TTF_BASE64)
export const BACOOLA_LOGO = (): Buffer => decode(BACOOLA_LOGO_PNG_BASE64)
`

fs.writeFileSync(OUT, out)
console.log(`[invoice-assets] wrote ${path.relative(ROOT, OUT)} (${out.length} chars)`)
