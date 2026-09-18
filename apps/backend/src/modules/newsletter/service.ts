import { MedusaService } from "@medusajs/framework/utils"
import { NewsletterSubscriber } from "./models/newsletter-subscriber"

export class NewsletterService extends MedusaService({
  NewsletterSubscriber,
}) {}
