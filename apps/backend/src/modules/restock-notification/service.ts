import { MedusaService } from "@medusajs/framework/utils"
import { RestockSubscription } from "./models/restock-subscription"

export class RestockNotificationService extends MedusaService({
  RestockSubscription,
}) {}
