import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

/**
 * Puts the men's t-shirts into Men -> Clothing -> T-Shirts.
 *
 * The products were added to a standalone, section-less "T-Shirts" category
 * (handle `t-shirts`) instead of the men's clothing t-shirts category
 * (`mc-v2-t-shirts`). They only ever appeared on the men's page via a
 * cross-section name-match fallback that has since been fixed, so now they show
 * nowhere. This links each of them into the correct men's category.
 *
 * By default it also DROPS the section-less `t-shirts` link, so each product
 * ends up cleanly under Men. Pass --keep-orphan to leave that link in place.
 *
 * Dry run by default:
 *   npx medusa exec ./src/scripts/fix-mens-tshirts-category.ts
 *   npx medusa exec ./src/scripts/fix-mens-tshirts-category.ts -- --apply
 */

const ORPHAN_HANDLE = "t-shirts"
const MENS_HANDLE = "mc-v2-t-shirts"

export default async function fixMensTshirts({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const productModule: any = container.resolve(Modules.PRODUCT)
  const apply = process.argv.includes("--apply")
  const keepOrphan = process.argv.includes("--keep-orphan")

  const { data: cats } = await query.graph({
    entity: "product_category",
    fields: ["id", "handle"],
  })
  const orphan = (cats as any[]).find((c) => c.handle === ORPHAN_HANDLE)
  const mens = (cats as any[]).find((c) => c.handle === MENS_HANDLE)

  if (!orphan || !mens) {
    logger.error(
      `Missing category: orphan(${ORPHAN_HANDLE})=${!!orphan} mens(${MENS_HANDLE})=${!!mens}`
    )
    return
  }

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "title", "handle", "categories.id", "categories.handle"],
    filters: {} as any,
  })

  const inOrphan = (products as any[]).filter((p) =>
    (p.categories ?? []).some((c: any) => c.id === orphan.id)
  )

  logger.info(
    `${inOrphan.length} products in "${ORPHAN_HANDLE}" -> add "${MENS_HANDLE}"` +
      (keepOrphan ? " (keeping orphan link)" : " (dropping orphan link)")
  )

  let already = 0
  const updates: { id: string; title: string; categoryIds: string[] }[] = []
  for (const p of inOrphan) {
    const currentIds: string[] = (p.categories ?? []).map((c: any) => c.id)
    if (currentIds.includes(mens.id) && keepOrphan) {
      already++
      continue
    }
    let nextIds = new Set(currentIds)
    nextIds.add(mens.id)
    if (!keepOrphan) nextIds.delete(orphan.id)
    updates.push({ id: p.id, title: p.title, categoryIds: [...nextIds] })
  }

  logger.info(`${updates.length} products to update, ${already} already correct.`)
  for (const u of updates.slice(0, 10)) {
    logger.info(`  ${u.title}`)
  }
  if (updates.length > 10) logger.info(`  ...and ${updates.length - 10} more`)

  if (!apply) {
    logger.info("DRY RUN — nothing written. Re-run with `-- --apply` to commit.")
    return
  }

  let done = 0
  for (const u of updates) {
    try {
      await productModule.updateProducts(u.id, {
        categories: u.categoryIds.map((id) => ({ id })),
      })
      done++
    } catch (e: any) {
      logger.error(`  failed ${u.title}: ${e.message}`)
    }
  }
  logger.info(`Updated ${done}/${updates.length} products.`)

  // Verify.
  const { data: after } = await query.graph({
    entity: "product",
    fields: ["id", "categories.id"],
    filters: { id: updates.map((u) => u.id) } as any,
  })
  const nowInMens = (after as any[]).filter((p) =>
    (p.categories ?? []).some((c: any) => c.id === mens.id)
  ).length
  logger.info(`Verified: ${nowInMens}/${updates.length} now in ${MENS_HANDLE}.`)
}
