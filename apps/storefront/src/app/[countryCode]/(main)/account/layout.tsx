import { retrieveCustomer } from "@lib/data/customer"
import { NO_INDEX, SITE_NAME } from "@lib/util/seo"
import { Metadata } from "next"
// TODO: Re-add Toaster component when needed
import AccountLayout from "@modules/account/templates/account-layout"

// Everything under /account is personal; keep the whole section out of search.
// The @login / @dashboard slot titles don't pick up the root title template,
// so it's repeated here.
export const metadata: Metadata = {
  title: { default: `Account | ${SITE_NAME}`, template: `%s | ${SITE_NAME}` },
  robots: NO_INDEX,
}

export default async function AccountPageLayout({
  dashboard,
  login,
}: {
  dashboard?: React.ReactNode
  login?: React.ReactNode
}) {
  const customer = await retrieveCustomer().catch(() => null)

  return (
    <AccountLayout customer={customer}>
      {customer ? dashboard : login}
      {/* TODO: Re-add Toaster component when needed */}
    </AccountLayout>
  )
}
