import { Metadata } from "next"
import { NO_INDEX } from "@lib/util/seo"
import UnsubscribeConfirm from "@modules/newsletter/unsubscribe-confirm"

export const metadata: Metadata = {
  title: "Unsubscribe",
  description: "Unsubscribe from the Bacoola newsletter.",
  robots: NO_INDEX,
}

type Props = { searchParams: Promise<{ token?: string }> }

/** Target of the unsubscribe link in every newsletter email. */
export default async function UnsubscribePage(props: Props) {
  const { token } = await props.searchParams

  return (
    <div className="flex min-h-[50vh] w-full flex-col items-center justify-center bg-white px-4 py-24 text-center text-[#111111]">
      <h1 className="mb-4 text-[16px] font-bold uppercase">Newsletter</h1>
      <UnsubscribeConfirm token={token ?? ""} />
    </div>
  )
}
