import { Metadata } from "next"
import ReturnsFAQ from "@modules/help/components/returns-faq"

export const metadata: Metadata = {
  title: "Returns, Exchanges & Refunds",
  description:
    "How to return or exchange a Bacoola order, track a return and get your refund. Start a return and find answers to common questions.",
}

export default function ReturnsPage() {
  return <ReturnsFAQ />
}
