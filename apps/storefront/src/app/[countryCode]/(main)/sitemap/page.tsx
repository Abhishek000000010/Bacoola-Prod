import { Metadata } from "next"
import { listCategories } from "@lib/data/categories"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

export const metadata: Metadata = {
  title: "Site map",
  description: "Every section of the Bacoola website in one place.",
}

/**
 * Built from live data, to whatever depth the category tree actually has.
 * Hardcoding it was the alternative and it is the wrong one: handles change,
 * sections get added, and a stale site map is a page of 404s that search
 * engines crawl enthusiastically.
 *
 * LAYOUT. Modelled on the reference site map, which inverts the weight you
 * would expect: the GROUP label is small, grey and sentence case, and the items
 * beneath it are bold uppercase and widely spaced. The items are what a visitor
 * scans for, so they carry the emphasis; the label just names the column.
 *
 * A childless category becomes its own single-item column -- "New Now" as the
 * grey label with "NEW NOW" as the one entry under it. That is what stops the
 * empty columns: previously a category with no children rendered a bold heading
 * over several hundred pixels of nothing, because grid rows align to the tallest
 * cell in the row.
 *
 * Links are not underlined. On a page that is nothing but links, underlines
 * turn every column into a solid block of rules; weight, colour and position
 * carry the hierarchy instead.
 */

type CategoryNode = {
  id: string
  name: string
  handle: string
  children: CategoryNode[]
}

/** Flat list -> tree, at whatever depth the data has. */
function buildTree(categories: any[]): CategoryNode[] {
  const byId = new Map<string, CategoryNode>()
  for (const category of categories) {
    byId.set(category.id, {
      id: category.id,
      name: category.name,
      handle: category.handle,
      children: [],
    })
  }

  const roots: CategoryNode[] = []
  for (const category of categories) {
    const node = byId.get(category.id)!
    const parentId =
      category.parent_category_id ?? category.parent_category?.id ?? null
    const parent = parentId ? byId.get(parentId) : undefined
    // A category whose parent is missing from the response becomes a root
    // rather than being dropped -- better a flat entry than a lost section.
    if (parent) {
      parent.children.push(node)
    } else {
      roots.push(node)
    }
  }

  return roots
}

/**
 * `nav-underline` is the site's own hover treatment (globals.css): a 1px rule
 * that fades in under the text, the same one the header nav uses. Its ::after
 * spans the element's full width, so these links must size to their text --
 * `inline-block` rather than `block`, or the rule would run the width of the
 * whole column.
 *
 * No hover colour change to go with it. The rule is drawn in currentColor, so
 * fading the text to grey would fade the underline along with it and the
 * animation would read as a smudge rather than a line.
 */
const linkBase = "nav-underline no-underline"

/** Level 4 and deeper. Rare; indents rather than earning its own treatment. */
function DeepList({ nodes }: { nodes: CategoryNode[] }) {
  return (
    <ul className="mt-2 ml-3 border-l border-neutral-200 pl-3">
      {nodes.map((node) => (
        <li key={node.id}>
          <LocalizedClientLink
            href={`/categories/${node.handle}`}
            className={`${linkBase} inline-block text-[12px] leading-[2] text-neutral-500`}
          >
            {node.name}
          </LocalizedClientLink>
          {node.children.length > 0 && <DeepList nodes={node.children} />}
        </li>
      ))}
    </ul>
  )
}

/**
 * One column: a grey group label, then its entries in bold uppercase.
 *
 * A category with no children still gets a column, listing itself as the single
 * entry. That keeps the grid regular and gives the visitor the same click target
 * they would get anywhere else.
 */
function CategoryColumn({ node }: { node: CategoryNode }) {
  const entries = node.children.length > 0 ? node.children : [node]

  return (
    // inline-block + w-full is what makes break-inside-avoid hold in a CSS
    // multi-column layout; without it a long list splits across the gutter.
    <div className="break-inside-avoid inline-block w-full align-top mb-14">
      <p className="text-[12px] text-neutral-400 mb-7">{node.name}</p>
      <ul>
        {entries.map((entry) => (
          <li key={entry.id} className="mb-7">
            <LocalizedClientLink
              href={`/categories/${entry.handle}`}
              className={`${linkBase} inline-block text-[12px] font-bold uppercase tracking-[0.02em] leading-[1.3] text-neutral-950`}
            >
              {entry.name}
            </LocalizedClientLink>
            {entry.children.length > 0 && entry !== node && (
              <DeepList nodes={entry.children} />
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * A section, rendered by shape rather than a fixed template. Where a child has
 * grandchildren of its own it becomes a SUB-HEADING with its own column grid --
 * the tree is not a uniform depth (Men is three levels, Teen is four), and
 * flattening both the same way buries one of them.
 */
function CategorySection({
  node,
  level,
}: {
  node: CategoryNode
  level: number
}) {
  const needsSubHeadings = node.children.some((child) =>
    child.children.some((grandchild) => grandchild.children.length > 0)
  )

  return (
    <section
      id={level === 0 ? `section-${node.handle}` : undefined}
      className={level === 0 ? "mb-24 scroll-mt-28" : "mb-16"}
    >
      <h2 className={level === 0 ? "mb-10" : "mb-8"}>
        <LocalizedClientLink
          href={`/categories/${node.handle}`}
          className={`${linkBase} inline-block font-bold uppercase text-neutral-950 ${
            level === 0
              ? "text-[19px] tracking-[0.04em]"
              : "text-[15px] tracking-[0.04em]"
          }`}
        >
          {node.name}
        </LocalizedClientLink>
      </h2>

      {needsSubHeadings ? (
        <div>
          {node.children.map((child) => (
            <CategorySection key={child.id} node={child} level={level + 1} />
          ))}
        </div>
      ) : node.children.length > 0 ? (
        // Columns, not grid. The reference design uses a fixed grid, which works
        // there because each of its sections has at most four groups -- one row,
        // no alignment to fight. Ours run to nine, so a grid wraps to three rows
        // and every row stretches to its tallest column: a 2-entry group beside a
        // 30-entry one left a 1600px hole in "Girls". Column flow packs the
        // blocks instead, and keeps the same four-across look.
        <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-x-10">
          {node.children.map((child) => (
            <CategoryColumn key={child.id} node={child} />
          ))}
        </div>
      ) : null}
    </section>
  )
}

export default async function SiteMapPage() {
  const categories = await listCategories({
    fields: "id,name,handle,parent_category_id",
    limit: 500,
  }).catch(() => [])

  const tree = buildTree(categories as any[])

  // A category with no children of its own is not a section. Several exist
  // (orphans whose parent the API did not return, plus genuinely flat ones).
  // Giving each its own heading and jump link produced a run of empty sections
  // and a nav listing "T-SHIRTS" beside "WOMEN", so they are left out entirely:
  // this page is the category tree, and they are not part of it.
  const sections = tree.filter((root) => root.children.length > 0)

  return (
    <div className="bg-white pt-12 pb-28">
      <div className="max-w-[1280px] mx-auto px-4 md:px-8 lg:px-10">
        <h1 className="text-[19px] font-bold uppercase tracking-[0.04em] text-neutral-950 mb-3">
          Site map
        </h1>
        <p className="text-[12px] text-neutral-600 leading-[1.8] mb-8">
          Every section of the website, in one place.
        </p>

        {/* Jump links. The page is long by nature -- this is what stops a
            visitor scrolling past four sections to reach Kids. */}
        {sections.length > 0 && (
          <nav
            aria-label="Jump to section"
            className="flex flex-wrap gap-x-6 gap-y-2 pb-6 mb-16 border-b border-neutral-200"
          >
            {sections.map((root) => (
              <a
                key={root.id}
                href={`#section-${root.handle}`}
                className={`${linkBase} inline-block text-[12px] font-bold uppercase tracking-[0.05em] text-neutral-500`}
              >
                {root.name}
              </a>
            ))}
          </nav>
        )}

        {sections.map((root) => (
          <CategorySection key={root.id} node={root} level={0} />
        ))}

      </div>
    </div>
  )
}
