"use client"

import { clx } from "@modules/common/components/ui"
import Image from "next/image"
import React, { useState } from "react"

import PlaceholderImage from "@modules/common/icons/placeholder-image"

type ThumbnailProps = {
  thumbnail?: string | null
  images?: { url?: string }[] | null
  size?: "small" | "medium" | "large" | "full" | "square"
  isFeatured?: boolean
  className?: string
  "data-testid"?: string
}

const Thumbnail: React.FC<ThumbnailProps> = ({
  thumbnail,
  images,
  size = "small",
  isFeatured,
  className,
  "data-testid": dataTestid,
}) => {
  const initialImage = thumbnail || images?.[0]?.url

  return (
    <div
      className={clx(
        "relative w-full overflow-hidden transition-shadow ease-in-out duration-150 group",
        className,
        {
          "aspect-[11/14]": isFeatured,
          "aspect-[2048/2867]": !isFeatured && size !== "square",
          "aspect-[1/1]": size === "square",
          "w-[180px]": size === "small",
          "w-[290px]": size === "medium",
          "w-[440px]": size === "large",
          "w-full": size === "full",
        }
      )}
      data-testid={dataTestid}
    >
      <ImageOrPlaceholder image={initialImage} size={size} />
    </div>
  )
}

const ImageOrPlaceholder = ({
  image,
  size,
}: Pick<ThumbnailProps, "size"> & { image?: string }) => {
  const [loaded, setLoaded] = useState(false)
  const [errored, setErrored] = useState(false)

  if (!image || errored) {
    return (
      <div className="absolute inset-0 bg-neutral-100 overflow-hidden">
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.8s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
      </div>
    )
  }

  return (
    <>
      {!loaded && (
        <div className="absolute inset-0 bg-neutral-100 overflow-hidden z-[1]">
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.8s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
        </div>
      )}
      <Image
        src={image}
        alt="Product image"
        className={clx(
          "absolute inset-0 object-cover object-center transition-opacity duration-500 ease-in-out",
          loaded ? "opacity-100" : "opacity-0"
        )}
        draggable={false}
        quality={50}
        sizes="(max-width: 576px) 280px, (max-width: 768px) 360px, (max-width: 992px) 480px, 800px"
        fill
        onLoad={() => setLoaded(true)}
        onError={() => setErrored(true)}
      />
    </>
  )
}

export default Thumbnail
