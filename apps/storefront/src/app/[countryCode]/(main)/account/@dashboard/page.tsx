import { Metadata } from "next"

import Overview from "@modules/account/components/overview"
import { notFound } from "next/navigation"
import { retrieveCustomer } from "@lib/data/customer"
import { listOrders } from "@lib/data/orders"

export const metadata: Metadata = {
  // Slot pages on the /account route itself skip the title template.
  title: { absolute: "Account | Bacoola" },
  description: "Overview of your account activity.",
}

export default async function OverviewTemplate() {
  const [customer, orders] = await Promise.all([
    retrieveCustomer().catch(() => null),
    listOrders().catch(() => null).then((orders) => orders || null),
  ])

  if (!customer) {
    notFound()
  }

  return <Overview customer={customer} orders={orders} />
}
