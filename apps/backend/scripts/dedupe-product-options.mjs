// Dedupe duplicate product option groups (e.g. a product with three "Size"
// options and three "Color" options -- the result of repeated imports).
//
// For each product, options whose titles match (case-insensitively) are a
// duplicate set. One is kept as canonical; the others are removed. A duplicate
// group is only deleted when it is safe:
//
//   - Unreferenced group (no variant uses any of its values)  -> deleted.
//   - Referenced group whose every value has a same-text value on the canonical
//     group -> variant links are repointed to the canonical values, then the
//     duplicate is deleted.
//   - Anything that can't be repointed cleanly -> left untouched and REPORTED,
//     so a human decides. The script never guesses when a variant's selection
//     would be lost.
//
// DRY RUN BY DEFAULT. Nothing is written unless you pass --apply. Always run
// without --apply first and read the plan.
//
// Usage (from apps/backend):
//   DATABASE_URL="<neon prod url>" node scripts/dedupe-product-options.mjs
//   DATABASE_URL="<neon prod url>" node scripts/dedupe-product-options.mjs --apply

import pg from "pg"

const APPLY = process.argv.includes("--apply")
const CONNECTION = process.env.DATABASE_URL
if (!CONNECTION) {
  console.error("DATABASE_URL is required.")
  process.exit(1)
}

const norm = (s) => (s ?? "").trim().toLowerCase()

/** Find the join table that links a variant to an option value. */
async function findVariantValueLink(client) {
  const { rows } = await client.query(`
    select table_name, column_name
    from information_schema.columns
    where table_schema = 'public'
      and table_name in ('product_variant_option', 'product_variant_option_value')
  `)
  const byTable = {}
  for (const r of rows) (byTable[r.table_name] ??= []).push(r.column_name)

  for (const table of ["product_variant_option", "product_variant_option_value"]) {
    const cols = byTable[table]
    if (!cols) continue
    const valueCol = cols.find((c) => /option_value_id|value_id/.test(c))
    const variantCol = cols.find((c) => /variant_id/.test(c))
    if (valueCol && variantCol) return { table, valueCol, variantCol }
  }
  return null
}

async function main() {
  const client = new pg.Client({
    connectionString: CONNECTION,
    connectionTimeoutMillis: 10000,
    statement_timeout: 60000,
  })
  await client.connect()

  const link = await findVariantValueLink(client)
  if (!link) {
    console.error(
      "Could not find the variant->option_value link table. Aborting so nothing is deleted blindly."
    )
    await client.end()
    process.exit(2)
  }
  console.log(`Variant->value link: ${link.table}(${link.variantCol}, ${link.valueCol})`)
  console.log(APPLY ? "MODE: APPLY (writing changes)\n" : "MODE: DRY RUN (no changes)\n")

  // Every option group with its product + values.
  const { rows: options } = await client.query(`
    select ppo.product_id,
           po.id   as option_id,
           po.title,
           po.created_at
    from product_product_option ppo
    join product_option po on po.id = ppo.product_option_id
    where po.deleted_at is null
    order by ppo.product_id, po.created_at
  `)

  const { rows: values } = await client.query(`
    select id, option_id, value
    from product_option_value
    where deleted_at is null
  `)
  const valuesByOption = new Map()
  for (const v of values) {
    if (!valuesByOption.has(v.option_id)) valuesByOption.set(v.option_id, [])
    valuesByOption.get(v.option_id).push(v)
  }

  // Which option-value ids are actually referenced by a variant.
  const { rows: refRows } = await client.query(
    `select distinct "${link.valueCol}" as value_id from "${link.table}"`
  )
  const referenced = new Set(refRows.map((r) => r.value_id))

  // Group options by product + normalized title.
  const groups = new Map()
  for (const o of options) {
    const key = `${o.product_id}::${norm(o.title)}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(o)
  }

  let dupSets = 0
  let deletable = 0
  let repointable = 0
  let manual = 0
  const deleteOptionIds = []
  const repointPlan = [] // { fromValueId, toValueId }

  for (const [key, opts] of groups) {
    if (opts.length < 2) continue
    dupSets++

    // Canonical = the referenced group with the most values, else the oldest.
    const scored = opts
      .map((o) => {
        const vs = valuesByOption.get(o.option_id) ?? []
        const refCount = vs.filter((v) => referenced.has(v.id)).length
        return { o, vs, refCount }
      })
      .sort((a, b) => b.refCount - a.refCount || b.vs.length - a.vs.length)
    const canonical = scored[0]
    const canonByText = new Map(canonical.vs.map((v) => [norm(v.value), v.id]))

    console.log(
      `\nproduct ${opts[0].product_id}  "${opts[0].title}"  x${opts.length}` +
        `\n  keep option ${canonical.o.option_id} (${canonical.vs.length} values, ${canonical.refCount} referenced)`
    )

    for (const cand of scored.slice(1)) {
      const refVals = cand.vs.filter((v) => referenced.has(v.id))
      if (refVals.length === 0) {
        deletable++
        deleteOptionIds.push(cand.o.option_id)
        console.log(`  - drop option ${cand.o.option_id} (unreferenced)`)
        continue
      }
      // Referenced: can we repoint every referenced value onto a canonical value?
      const mappable = refVals.every((v) => canonByText.has(norm(v.value)))
      if (mappable) {
        repointable++
        deleteOptionIds.push(cand.o.option_id)
        for (const v of refVals) {
          repointPlan.push({ from: v.id, to: canonByText.get(norm(v.value)) })
        }
        console.log(
          `  ~ repoint ${refVals.length} referenced value(s) onto canonical, then drop option ${cand.o.option_id}`
        )
      } else {
        manual++
        const missing = refVals
          .filter((v) => !canonByText.has(norm(v.value)))
          .map((v) => v.value)
        console.log(
          `  ! MANUAL: option ${cand.o.option_id} has referenced value(s) not on canonical: ${missing.join(", ")} -- left untouched`
        )
      }
    }
  }

  console.log(
    `\nSummary: ${dupSets} duplicate set(s) | ${deletable} unreferenced drop(s) | ` +
      `${repointable} repoint+drop | ${manual} need manual review`
  )

  if (!APPLY) {
    console.log("\nDry run only. Re-run with --apply to execute the plan above.")
    await client.end()
    return
  }

  if (!deleteOptionIds.length) {
    console.log("\nNothing to apply.")
    await client.end()
    return
  }

  await client.query("BEGIN")
  try {
    for (const { from, to } of repointPlan) {
      await client.query(
        `update "${link.table}" set "${link.valueCol}" = $1 where "${link.valueCol}" = $2`,
        [to, from]
      )
    }
    // Remove the duplicate groups: their values, the product link, the option.
    await client.query(
      `delete from product_option_value where option_id = any($1::text[])`,
      [deleteOptionIds]
    )
    await client.query(
      `delete from product_product_option where product_option_id = any($1::text[])`,
      [deleteOptionIds]
    )
    await client.query(
      `delete from product_option where id = any($1::text[])`,
      [deleteOptionIds]
    )
    await client.query("COMMIT")
    console.log(`\nApplied: removed ${deleteOptionIds.length} duplicate option group(s).`)
  } catch (e) {
    await client.query("ROLLBACK")
    console.error("\nApply failed, rolled back:", e.message)
    process.exitCode = 3
  }

  await client.end()
}

main().catch((e) => {
  console.error("ERR", e.message)
  process.exit(1)
})
