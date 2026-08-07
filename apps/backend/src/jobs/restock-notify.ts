import type { MedusaContainer } from "@medusajs/framework/types"
import { processRestockNotifications } from "../lib/process-restock-notifications"

/**
 * Polls for restocked variants and emails the shoppers who asked to be told.
 *
 * Runs every minute. Medusa emits no event when stock changes (see
 * process-restock-notifications.ts), so polling is the reliable trigger — a
 * shopper is emailed within ~1 minute of an admin adding stock. Runs are cheap:
 * they exit immediately when there are no pending requests.
 */
export default async function restockNotifyJob(container: MedusaContainer) {
  await processRestockNotifications(container)
}

export const config = {
  name: "restock-notify",
  // Every minute. Cron: minute hour day month weekday.
  schedule: "* * * * *",
}
