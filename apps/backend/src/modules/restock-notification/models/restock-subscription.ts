import { model } from "@medusajs/framework/utils"

/**
 * A shopper's request to be emailed when a specific variant is back in stock.
 *
 * One row = one (email, variant) request. `notified_at` is null while the
 * request is pending; it is stamped once the back-in-stock email has been sent,
 * which both records that we told them and stops a later restock from emailing
 * the same person again for the same sign-up.
 */
export const RestockSubscription = model
  .define("restock_subscription", {
    id: model.id().primaryKey(),
    email: model.text().searchable(),
    variant_id: model.text(),
    // Denormalised for a friendlier email + admin view without a variant join.
    variant_title: model.text().nullable(),
    product_title: model.text().nullable(),
    notified_at: model.dateTime().nullable(),
  })
  .indexes([
    { on: ["variant_id"] },
    // Fast lookup + dedupe of a person's pending request for a variant.
    { on: ["email", "variant_id"] },
  ])
