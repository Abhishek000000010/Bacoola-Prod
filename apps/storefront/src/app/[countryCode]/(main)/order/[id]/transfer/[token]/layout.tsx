import { NO_INDEX } from "@lib/util/seo"
import { Metadata } from "next"

// Order-transfer links carry a private token; never index them.
export const metadata: Metadata = {
  title: "Order Transfer",
  description: "Accept or decline the transfer of a Bacoola order to your account.",
  robots: NO_INDEX,
}

export default function OrderTransferLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
