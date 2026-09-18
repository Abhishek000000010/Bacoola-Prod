import { model } from "@medusajs/framework/utils"

/**
 * One newsletter subscriber, keyed by email (one row per address, ever).
 *
 * Rows are never deleted on unsubscribe: `status` flips to "unsubscribed" and
 * `unsubscribed_at` is stamped, so the admin list keeps a record of consent
 * being withdrawn and a later re-subscribe reuses the same row and token.
 *
 * `unsubscribe_token` is a random, unguessable id carried in every email's
 * unsubscribe link, so a link can only unsubscribe the address it was sent to.
 */
export const NewsletterSubscriber = model
  .define("newsletter_subscriber", {
    id: model.id().primaryKey(),
    email: model.text().searchable(),
    status: model.enum(["subscribed", "unsubscribed"]).default("subscribed"),
    // Where the sign-up came from: "footer", "account".
    source: model.text().nullable(),
    // Set when a logged-in customer manages it from My subscriptions.
    customer_id: model.text().nullable(),
    // Departments the subscriber wants to hear about: women, men, teen, kids.
    interests: model.json().nullable(),
    unsubscribe_token: model.text(),
    subscribed_at: model.dateTime().nullable(),
    unsubscribed_at: model.dateTime().nullable(),
  })
  .indexes([
    { on: ["email"], unique: true },
    { on: ["unsubscribe_token"], unique: true },
    { on: ["customer_id"] },
    { on: ["status"] },
  ])
