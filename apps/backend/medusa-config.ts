import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

// ============================================================================
// ⚠️  REDIS IS INTENTIONALLY DISABLED (MVP / pre-launch phase)  ⚠️
// ----------------------------------------------------------------------------
// TODO(redis before public launch): flip REDIS_DISABLED back to `false`.
//
// Why it's off: on the single Render Free instance, Upstash's free command cap
// was being exhausted in ~2-3 days. The drain was the BullMQ-backed event bus
// and workflow engine, which poll Redis continuously (blocking reads +
// heartbeats) even when the store is idle — not the cache. Rather than pay for
// idle polling during the MVP, we run entirely on Medusa's in-memory fallbacks.
//
// What we lose while it's off (acceptable for a demo / low traffic, ONE instance):
//   • Logins don't survive a restart/redeploy — and Render Free sleeps often,
//     so users get logged out on every cold start ("fake redis" session store).
//   • No workflow durability: a restart mid-checkout won't resume the workflow.
//   • Queued events in flight during a crash are lost (events still fire in-process
//     normally while the server is up, so e.g. Shiprocket auto-fulfill still works).
//   • No cross-instance cache/locks — irrelevant while we run a single instance.
//
// RE-ENABLE CHECKLIST (do before opening to real customers / scaling past 1 instance):
//   1. Point REDIS_URL at a NON per-command-metered host (Render Key Value,
//      Railway, or a small VPS) — Upstash's per-command billing is a bad fit for
//      BullMQ's constant polling. Upstash TLS URL shape: rediss://default:<token>@<host>:6379
//   2. Set REDIS_DISABLED = false (or delete the flag and use process.env.REDIS_URL).
//   3. Verify sessions persist across a redeploy and a checkout survives a restart.
//   See docs/WEBSITE-ANALYSIS.md section A1 for the original analysis.
// ============================================================================
const REDIS_DISABLED = true
const REDIS_URL = REDIS_DISABLED ? undefined : process.env.REDIS_URL

if (REDIS_DISABLED) {
  // Nags on every boot/redeploy so this doesn't quietly ship to production.
  console.warn(
    "[bacoola] ⚠️  Redis is DISABLED (MVP mode) — using in-memory cache/events/" +
      "workflows/locks and a non-persistent session store. Re-enable Redis before " +
      "public launch: see the RE-ENABLE CHECKLIST in medusa-config.ts."
  )
}

const redisModules = REDIS_URL
  ? [
      {
        resolve: "@medusajs/medusa/cache-redis",
        options: {
          redisUrl: REDIS_URL,
          // Namespaced so multiple environments can share one Upstash DB
          // without colliding. TTL is in seconds.
          namespace: process.env.REDIS_NAMESPACE || "bacoola-cache",
          ttl: 30,
        },
      },
      {
        resolve: "@medusajs/medusa/event-bus-redis",
        options: {
          redisUrl: REDIS_URL,
          queueName: process.env.REDIS_NAMESPACE
            ? `${process.env.REDIS_NAMESPACE}-events`
            : "bacoola-events",
        },
      },
      {
        resolve: "@medusajs/medusa/workflow-engine-redis",
        options: {
          // NOTE: 2.17.2 logs a deprecation warning asking for `redisUrl` /
          // `redisOptions` here, but its loader still destructures
          // `options.redis.url` — switching to the "new" names crashes the
          // Workflows module at boot. Keep this shape until a later Medusa
          // version actually supports the rename. The warning is harmless.
          redis: {
            url: REDIS_URL,
            // BullMQ requires blocking commands with retries disabled;
            // ioredis' default of 20 retries makes workers throw on Upstash.
            options: { maxRetriesPerRequest: null },
          },
        },
      },
      {
        resolve: "@medusajs/medusa/locking",
        options: {
          providers: [
            {
              resolve: "@medusajs/medusa/locking-redis",
              id: "locking-redis",
              is_default: true,
              options: { redisUrl: REDIS_URL },
            },
          ],
        },
      },
    ]
  : []

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    // Separate from the Redis *modules* below: this one backs the express
    // session store. Without it Medusa logs "redisUrl not found. A fake redis
    // instance will be used." and keeps sessions in process memory, so logins
    // drop on every restart/redeploy and don't survive more than one instance.
    redisUrl: REDIS_URL,
    redisPrefix: process.env.REDIS_NAMESPACE
      ? `${process.env.REDIS_NAMESPACE}:sess:`
      : "bacoola:sess:",
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET,
      cookieSecret: process.env.COOKIE_SECRET,
      // @ts-ignore - Disable secure cookies when testing production build locally via HTTP
      cookieSecure: process.env.NODE_ENV === "production" && !process.env.ADMIN_CORS?.includes("localhost"),
    },
    // ⚠️  `http.cookieSecure` above is DEAD CONFIG — the framework never reads
    // it. The session cookie's flags come from `resolveSessionCookieSecurity()`
    // in @medusajs/framework/dist/http/express-loader.js, which forces
    // `{ sameSite: "lax", secure: true }` whenever NODE_ENV is production or
    // staging. Over plain HTTP the browser then drops the cookie, `/auth/session`
    // returns 200, and every following `/admin/users/me` is a 401 — the admin
    // login "succeeds" and bounces straight back to the login page.
    //
    // `projectConfig.cookieOptions` is spread LAST into that cookie object, so
    // it is the supported way to override the flag.
    //
    // Set COOKIE_INSECURE=true ONLY when the server is reached over plain HTTP
    // (e.g. the VPS on a bare IP, before a domain + TLS exist). DELETE it the
    // moment HTTPS is in front — secure cookies must be on in real production.
    ...(process.env.COOKIE_INSECURE === "true"
      ? { cookieOptions: { secure: false, sameSite: "lax" as const } }
      : {}),
  },
  modules: [
    ...redisModules,
    {
      // File storage: Cloudinary instead of local disk.
      // Credentials are read from env vars (see .env.template) — never hardcoded.
      resolve: "@medusajs/medusa/file",
      options: {
        providers: [
          {
            resolve: "./src/modules/cloudinary",
            id: "cloudinary",
            options: {
              cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
              api_key: process.env.CLOUDINARY_API_KEY,
              api_secret: process.env.CLOUDINARY_API_SECRET,
              secure: true,
              folder: process.env.CLOUDINARY_FOLDER || "bacoola",
            },
          },
        ],
      },
    },
    {
      // Fulfillment: register Shiprocket as a fulfillment PROVIDER so that
      // creating a fulfillment for an order pushes it to the Shiprocket
      // dashboard (assigns an AWB, schedules pickup). Registering the plugin in
      // the `plugins` array below only loads the admin widget + API routes — it
      // does NOT make Shiprocket available as a provider. Both are required.
      // The manual provider is kept so manual/return fulfillments still work.
      // Credentials come from env vars — never hardcoded.
      resolve: "@medusajs/medusa/fulfillment",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/fulfillment-manual",
            id: "manual",
          },
          {
            resolve: "@sam-ael/medusa-plugin-shiprocket",
            id: "shiprocket",
            options: {
              email: process.env.SHIPROCKET_EMAIL || "dummy@example.com",
              password: process.env.SHIPROCKET_PASSWORD || "dummypassword",
              // Must match a pickup location nickname configured in your
              // Shiprocket dashboard (Settings → Pickup Addresses). Defaults to
              // "Primary" inside the plugin if unset.
              pickup_location: process.env.SHIPROCKET_PICKUP_LOCATION || "Primary",
            },
          },
        ],
      },
    },
    {
      // Payments: Razorpay (works in India, unlike Stripe). The default manual
      // provider (pp_system_default) stays available automatically.
      // Credentials come from env vars — never hardcoded.
      resolve: "@medusajs/payment",
      options: {
        providers: [
          {
            // Wrapper around @sgftech/payment-razorpay that fixes a Medusa 2.17
            // incompatibility (see src/modules/razorpay/service.ts).
            resolve: "./src/modules/razorpay",
            id: "razorpay",
            options: {
              key_id: process.env.RAZORPAY_KEY_ID,
              key_secret: process.env.RAZORPAY_KEY_SECRET,
              razorpay_account: process.env.RAZORPAY_ACCOUNT,
              auto_capture: true,
              refund_speed: "normal",
              automatic_expiry_period: 30,
              manual_expiry_period: 20,
              webhook_secret:
                process.env.RAZORPAY_WEBHOOK_SECRET || "razorpay_webhook_secret",
            },
          },
        ],
      },
    },
    {
      // Landing Pages CMS — custom standalone module for managing
      // marketing/landing page content (hero banners, editorial sections, etc.)
      // directly from the Medusa admin. Completely independent of commerce modules.
      resolve: "./src/modules/landing-pages",
    },
    {
      // Back-in-stock: stores shopper requests to be emailed when an
      // out-of-stock variant is restocked. The store API route creates rows and
      // the restock-notify subscriber sends the emails (see
      // src/subscribers/restock-notify.ts).
      resolve: "./src/modules/restock-notification",
    },
  ],
  plugins: [
    {
      resolve: "@sam-ael/medusa-plugin-shiprocket",
      options: {
        email: process.env.SHIPROCKET_EMAIL || "dummy@example.com",
        password: process.env.SHIPROCKET_PASSWORD || "dummypassword",
        channel_id: process.env.SHIPROCKET_CHANNEL_ID || "12345",
        pricing: "flat_rate",
        length_unit: "cm",
      },
    },
  ],
})
