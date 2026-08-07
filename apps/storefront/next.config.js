const checkEnvVariables = require("./check-env-variables")

checkEnvVariables()

/**
 * React de-duplication:
 * This monorepo has React 18 (backend/Medusa admin) and React 19 (storefront)
 * on disk. We deliberately do NOT alias `react` / `react-dom` / `jsx-runtime`
 * here. Next.js already rewrites every React import in the storefront bundle --
 * app code AND hoisted node_modules UI libs (@medusajs/ui, @headlessui/react,
 * react-select, ...) -- to its own single bundled React 19, keeping one copy
 * across the server and client boundary.
 *
 * Manually aliasing these to the npm copy instead splits the bundle across two
 * React instances and breaks prerendering: elements minted by one instance are
 * rejected by the other ("Minified React error #31" from a jsx-runtime
 * mismatch), and Next's own App Router runtime loses its dispatcher ("Cannot
 * read properties of null (reading 'useContext')" in OuterLayoutRouter from a
 * react-dom mismatch). Let Next own the de-duplication.
 */

/**
 * Medusa Cloud-related environment variables
 */
const S3_HOSTNAME = process.env.MEDUSA_CLOUD_S3_HOSTNAME
const S3_PATHNAME = process.env.MEDUSA_CLOUD_S3_PATHNAME

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverMinification: false,
  },
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    // Next's defaults (8 deviceSizes + 8 imageSizes) make every `fill` image
    // emit a 17-candidate srcset. Each candidate is a full percent-encoded
    // Cloudinary URL, so one <img> tag costs ~3.2KB of HTML -- and a category
    // page renders over a thousand of them (one card per colourway, several
    // thumbnails per card), which put ~3.9MB of srcset markup into a 5.1MB page.
    //
    // Thumbnails declare `sizes` topping out at 800 CSS px, so 2048 and 3840 can
    // never be picked, and the gaps between the remaining stops are too fine to
    // matter visually. These stops still cover every declared breakpoint plus 2x
    // DPR at the largest slot (800 -> 1600, served by 1920).
    deviceSizes: [640, 828, 1080, 1920],
    imageSizes: [128, 256, 384],
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "9000",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "media.mango.com",
      },
      {
        protocol: "https",
        hostname: "shop.mango.com",
      },
      {
        protocol: "https",
        hostname: "st.mngbcn.com",
      },
      {
        protocol: "https",
        hostname: "*.s3.*.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "*.s3.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "*.onrender.com",
      },
      ...(S3_HOSTNAME && S3_PATHNAME
        ? [
            {
              protocol: "https",
              hostname: S3_HOSTNAME,
              pathname: S3_PATHNAME,
            },
          ]
        : []),
    ],
  },
}

module.exports = nextConfig
