// @ts-nocheck
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { EnvelopeSolid } from "@medusajs/icons"
import { Badge, Button, Container, Heading, Input, Table, Text, toast } from "@medusajs/ui"
import { useEffect, useState } from "react"
import { sdk } from "../../lib/config"

export const config = defineRouteConfig({
  label: "Newsletter",
  icon: EnvelopeSolid,
})

const PAGE_SIZE = 50

const STATUS_FILTERS = [
  { id: "", label: "All" },
  { id: "subscribed", label: "Subscribed" },
  { id: "unsubscribed", label: "Unsubscribed" },
]

const formatDate = (d?: string | null) =>
  d ? new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—"

/**
 * Newsletter subscribers from the storefront footer form and customers'
 * My subscriptions page. Read-only list plus a CSV export for an email tool.
 */
const NewsletterPage = () => {
  const [rows, setRows] = useState<any[]>([])
  const [count, setCount] = useState(0)
  const [activeCount, setActiveCount] = useState(0)
  const [status, setStatus] = useState("")
  const [query, setQuery] = useState("")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  // Debounce the search box.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(query.trim())
      setPage(0)
    }, 300)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    sdk.client
      .fetch(`/admin/newsletter-subscribers`, {
        query: {
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
          ...(status ? { status } : {}),
          ...(search ? { q: search } : {}),
        },
      })
      .then((res: any) => {
        if (cancelled) return
        setRows(res.subscribers ?? [])
        setCount(res.count ?? 0)
        setActiveCount(res.active_count ?? 0)
      })
      .catch((e: any) => toast.error("Could not load subscribers", { description: e?.message }))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [status, search, page])

  // The export is an authenticated admin request, so it's fetched here and
  // saved as a file rather than opened as a plain link.
  const onExport = async () => {
    setExporting(true)
    try {
      const res = await fetch(`/admin/newsletter-subscribers/export?status=${status || "all"}`, {
        credentials: "include",
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `newsletter-subscribers-${status || "all"}-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e: any) {
      toast.error("Export failed", { description: e?.message })
    } finally {
      setExporting(false)
    }
  }

  const pages = Math.max(1, Math.ceil(count / PAGE_SIZE))

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h1">Newsletter</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            {activeCount} active subscriber{activeCount === 1 ? "" : "s"}. Sign-ups come from the
            storefront footer and customers' My subscriptions page.
          </Text>
        </div>
        <Button variant="secondary" size="small" disabled={exporting} onClick={onExport}>
          {exporting ? "Exporting..." : "Export CSV"}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3 px-6 py-4">
        <div className="w-64">
          <Input
            size="small"
            type="search"
            placeholder="Search email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {STATUS_FILTERS.map((f) => (
          <Button
            key={f.id}
            size="small"
            variant={status === f.id ? "primary" : "secondary"}
            onClick={() => {
              setStatus(f.id)
              setPage(0)
            }}
          >
            {f.label}
          </Button>
        ))}
      </div>

      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Email</Table.HeaderCell>
            <Table.HeaderCell>Status</Table.HeaderCell>
            <Table.HeaderCell>Source</Table.HeaderCell>
            <Table.HeaderCell>Interests</Table.HeaderCell>
            <Table.HeaderCell>Subscribed</Table.HeaderCell>
            <Table.HeaderCell>Unsubscribed</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {!loading && rows.length === 0 && (
            <Table.Row>
              <Table.Cell colSpan={6}>
                <Text size="small" className="text-ui-fg-subtle">No subscribers found.</Text>
              </Table.Cell>
            </Table.Row>
          )}
          {rows.map((r) => (
            <Table.Row key={r.id}>
              <Table.Cell>{r.email}</Table.Cell>
              <Table.Cell>
                <Badge size="2xsmall" color={r.status === "subscribed" ? "green" : "grey"}>
                  {r.status}
                </Badge>
              </Table.Cell>
              <Table.Cell>{r.source ?? "—"}</Table.Cell>
              <Table.Cell>
                {Array.isArray(r.interests) && r.interests.length ? r.interests.join(", ") : "—"}
              </Table.Cell>
              <Table.Cell>{formatDate(r.subscribed_at)}</Table.Cell>
              <Table.Cell>{formatDate(r.unsubscribed_at)}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>

      <div className="flex items-center justify-between px-6 py-4">
        <Text size="small" className="text-ui-fg-subtle">
          {loading ? "Loading..." : `${count} result${count === 1 ? "" : "s"} · page ${page + 1} of ${pages}`}
        </Text>
        <div className="flex gap-2">
          <Button size="small" variant="secondary" disabled={page === 0 || loading} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <Button size="small" variant="secondary" disabled={page + 1 >= pages || loading} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      </div>
    </Container>
  )
}

export default NewsletterPage
