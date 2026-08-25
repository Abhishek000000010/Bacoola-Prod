import { Text, clx } from "@modules/common/components/ui"
import { VariantPrice } from "types/global"

export default function PreviewPrice({ price, isMobileLayout }: { price: VariantPrice, isMobileLayout?: boolean }) {
  if (!price) {
    return null
  }

  if (isMobileLayout) {
    return (
      <div className="flex items-center gap-x-1.5">
        {price.price_type === "sale" && (
          <span className="line-through text-gray-500 font-normal">
            {price.original_price}
          </span>
        )}
        <span className={price.price_type === "sale" ? "text-[#D01313] font-normal" : "text-black font-normal"}>
          {price.calculated_price}
        </span>
      </div>
    )
  }

  // The gap lives here rather than on each caller's wrapper: this used to be a
  // bare fragment, so spacing came from whichever parent happened to set one --
  // and the desktop tile set none, leaving the struck-through price glued to the
  // sale price. Matches the mobile branch above so both breakpoints agree.
  return (
    <div className="flex items-center gap-x-1.5">
      {price.price_type === "sale" && (
        <Text
          className="!text-[12px] lg:text-[14px] line-through text-ui-fg-muted"
          data-testid="original-price"
        >
          {price.original_price}
        </Text>
      )}
      <Text
        className={clx("!text-[12px] lg:text-[14px] text-ui-fg-muted", {
          "text-ui-fg-interactive": price.price_type === "sale",
        })}
        data-testid="price"
      >
        {price.calculated_price}
      </Text>
    </div>
  )
}
