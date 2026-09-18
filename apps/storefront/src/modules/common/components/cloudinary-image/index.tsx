"use client"

import React from "react"

const CLOUDINARY_WIDTHS = [
  320, 368, 429, 480, 600, 640, 721, 768, 800, 960, 1024, 1256, 1350, 1500, 1656, 1920, 2048,
]

interface CloudinaryImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> {
  src?: string | null
  alt: string
  priority?: boolean
  desktopAspectRatio?: string
  tabletAspectRatio?: string
  mobileAspectRatio?: string
  useGravityAuto?: boolean
  objectFit?: "cover" | "contain" | "fill" | "scale-down" | "none"
  /**
   * WebP copies for screens under 1024px (the site's mobile layout). Wider
   * screens ignore it and load `src` exactly as before.
   */
  mobileSource?: { srcSet: string; sizes: string }
}

/**
 * Parses a Medusa-provided URL. If it's a Cloudinary upload URL,
 * it injects the requested transformations. Otherwise, it returns the original URL.
 */
function buildCloudinaryUrl(
  originalUrl: string,
  width: number,
  aspectRatio?: string
): string {
  if (!originalUrl.includes("res.cloudinary.com") || !originalUrl.includes("/upload/")) {
    return originalUrl
  }

  const transformations = [
    "c_fill",
    "f_auto",
    "q_auto",
    `w_${width}`,
  ]

  if (aspectRatio) {
    transformations.push(`ar_${aspectRatio}`)
  }

  const transformString = transformations.join(",")
  
  // Inject the transformations right after /upload/
  // e.g. .../image/upload/v1234/... -> .../image/upload/c_fill,f_auto,.../v1234/...
  return originalUrl.replace("/upload/", `/upload/${transformString}/`)
}

function generateSrcSet(url: string, aspectRatio?: string): string {
  if (!url.includes("res.cloudinary.com")) {
    return url // If not Cloudinary, we can't easily generate srcSet
  }

  return CLOUDINARY_WIDTHS.map(
    (w) => `${buildCloudinaryUrl(url, w, aspectRatio)} ${w}w`
  ).join(", ")
}

export const CloudinaryImage: React.FC<CloudinaryImageProps> = ({
  src,
  alt,
  priority = false,
  className = "",
  desktopAspectRatio,
  tabletAspectRatio,
  mobileAspectRatio,
  useGravityAuto = false,
  objectFit = "cover",
  sizes,
  mobileSource,
  ...rest
}) => {
  // Local fallback if no image provided
  const imageUrl = src || "/assets/images/placeholder.jpg"
  
  // If no specific aspect ratio is provided, we can fallback to the desktop one for all, or none
  const desktopAr = desktopAspectRatio
  const tabletAr = tabletAspectRatio || desktopAspectRatio
  const mobileAr = mobileAspectRatio || tabletAspectRatio || desktopAspectRatio

  const isCloudinary = imageUrl.includes("res.cloudinary.com")

  // Generate srcSets if Cloudinary
  const desktopSrcSet = isCloudinary ? generateSrcSet(imageUrl, desktopAr) : undefined
  const tabletSrcSet = isCloudinary && tabletAr !== desktopAr ? generateSrcSet(imageUrl, tabletAr) : undefined
  const mobileSrcSet = isCloudinary && mobileAr !== tabletAr ? generateSrcSet(imageUrl, mobileAr) : undefined

  // Default image src (e.g. for fallback or standard browsers)
  // Let's use 1024px as a safe default src size
  const defaultSrc = isCloudinary ? buildCloudinaryUrl(imageUrl, 1024, desktopAr) : imageUrl

  // Detect if the media is a video
  const isVideo = imageUrl.match(/\.(mp4|webm|mov|ogg)$/i) || imageUrl.includes("/video/upload/")

  if (isVideo) {
    return (
      <video
        src={imageUrl}
        autoPlay
        loop
        muted
        playsInline
        className={className}
        style={{
          objectFit: objectFit,
          width: "100%",
          height: "100%",
        }}
      />
    )
  }

  return (
    <picture>
      {/* Phones and tablets, when the caller supplies their own copies */}
      {mobileSource && (
        <source
          media="(max-width: 1023px)"
          type="image/webp"
          srcSet={mobileSource.srcSet}
          sizes={mobileSource.sizes}
        />
      )}

      {/* Desktop */}
      {desktopSrcSet && (
        <source
          media="(min-width: 1024px)"
          srcSet={desktopSrcSet}
          sizes={sizes || "100vw"}
        />
      )}
      
      {/* Tablet */}
      {tabletSrcSet && (
        <source
          media="(min-width: 768px)"
          srcSet={tabletSrcSet}
          sizes={sizes || "100vw"}
        />
      )}

      {/* Mobile / Default */}
      {mobileSrcSet && (
        <source
          media="(max-width: 767px)"
          srcSet={mobileSrcSet}
          sizes={sizes || "100vw"}
        />
      )}

      <img
        src={defaultSrc}
        alt={alt}
        className={className}
        loading={priority ? "eager" : "lazy"}
        decoding={priority ? "sync" : "async"}
        {...(priority ? { fetchPriority: "high" } : {})}
        style={{
          objectFit: objectFit,
          // Let the container control dimensions, or fallback to 100%
          width: "100%",
          height: "100%",
          ...(rest.style || {}),
        }}
        {...rest}
      />
    </picture>
  )
}

export default CloudinaryImage
