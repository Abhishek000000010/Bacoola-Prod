import { HttpTypes } from "@medusajs/types"
import { Metadata } from "next"

export const SITE_NAME = "Bacoola"

// Google shows roughly 155-160 characters of a description before cutting it.
const DESCRIPTION_MAX = 155

/** For pages that must stay out of search results: cart, checkout, account... */
export const NO_INDEX: Metadata["robots"] = { index: false, follow: false }

/**
 * Turns admin-entered copy (which may contain HTML or line breaks) into a
 * single-line description, cut at a word boundary with an ellipsis.
 */
export function toMetaDescription(text?: string | null): string | undefined {
  const plain = text
    ?.replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  if (!plain) return undefined
  if (plain.length <= DESCRIPTION_MAX) return plain

  const cut = plain.slice(0, DESCRIPTION_MAX - 1)
  const lastSpace = cut.lastIndexOf(" ")

  return `${(lastSpace > 80 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:–—-]+$/, "")}…`
}

/** Top-level department handles and how they read in front of a category name. */
const DEPARTMENTS: Record<string, { name: string; possessive: string }> = {
  women: { name: "Women", possessive: "Women's" },
  men: { name: "Men", possessive: "Men's" },
  teen: { name: "Teen", possessive: "Teen" },
  kids: { name: "Kids", possessive: "Kids'" },
}

export function getDepartment(handle?: string | null) {
  return handle ? DEPARTMENTS[handle.toLowerCase()] : undefined
}

/**
 * "Dresses" alone is ambiguous across departments, so category titles are
 * prefixed with the department they sit under: "Women's Dresses".
 * `allCategories` only needs id, handle and parent_category_id.
 */
export function categorySeoName(
  category: Pick<HttpTypes.StoreProductCategory, "id" | "name" | "handle" | "parent_category_id">,
  allCategories: Pick<HttpTypes.StoreProductCategory, "id" | "handle" | "parent_category_id">[]
): string {
  const byId = new Map(allCategories.map((c) => [c.id, c]))

  let root: Pick<HttpTypes.StoreProductCategory, "id" | "handle" | "parent_category_id"> = category
  for (let depth = 0; root.parent_category_id && depth < 10; depth++) {
    const parent = byId.get(root.parent_category_id)
    if (!parent) break
    root = parent
  }

  const department = getDepartment(root.handle)

  if (!department) return category.name
  // The department's full listing. "…Clothing & Accessories" is the landing page's title.
  if (root.id === category.id) return `All ${department.possessive} Clothing`
  // Don't double up when the name already carries it ("Women's Basics").
  if (category.name.toLowerCase().startsWith(department.name.toLowerCase())) {
    return category.name
  }

  return `${department.possessive} ${category.name}`
}

export function categoryFallbackDescription(seoName: string) {
  return `Shop ${seoName} at ${SITE_NAME}. Discover the latest styles and everyday essentials, with delivery across India.`
}
