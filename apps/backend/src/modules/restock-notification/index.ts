import { Module } from "@medusajs/framework/utils"
import { RestockNotificationService } from "./service"

export const RESTOCK_NOTIFICATION_MODULE = "restock_notification"

export default Module(RESTOCK_NOTIFICATION_MODULE, {
  service: RestockNotificationService,
})
