// @ts-nocheck
import { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import { Container, Heading, Button, toast, Badge, IconButton } from "@medusajs/ui"
import { ArrowUturnLeft, PencilSquare, Trash, Plus } from "@medusajs/icons"
import { sdk } from "../../../../lib/config"

import { SectionForm } from "../components/section-form"
import { ItemForm } from "../components/item-form"

type LandingSectionItem = {
  id: string
  landing_section_id: string
  item_type: string
  title: string | null
  subtitle: string | null
  description: string | null
  desktop_image: string | null
  mobile_image: string | null
  video_url: string | null
  button_text: string | null
  button_link: string | null
  alignment: string
  display_order: number
  is_visible: boolean
  metadata: Record<string, any> | null
}

type Section = {
  id: string
  page: string
  section_key: string
  layout_type: string
  display_order: number
  is_visible: boolean
  max_items: number | null
  items: LandingSectionItem[]
}

export default function LandingPageEditor() {
  const { page } = useParams()
  
  const [sections, setSections] = useState<Section[]>([])
  const [loading, setLoading] = useState(true)
  
  // Section Drawer state
  const [sectionFormOpen, setSectionFormOpen] = useState(false)
  const [selectedSection, setSelectedSection] = useState<Partial<Section> | null>(null)

  // Item Drawer state
  const [itemFormOpen, setItemFormOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<Partial<LandingSectionItem> | null>(null)
  const [activeSectionId, setActiveSectionId] = useState<string>("")

  const fetchSections = async () => {
    try {
      setLoading(true)
      const { sections } = await sdk.client.fetch<{ sections: Section[] }>(`/admin/content/landing-pages?page=${page}`)
      setSections(sections || [])
    } catch (e: any) {
      toast.error(e.message || "Failed to fetch sections")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSections()
  }, [page])

  // --- Section Actions ---
  const handleDeleteSection = async (id: string) => {
    if (!confirm("Are you sure you want to delete this entire section and all its items?")) return
    try {
      await sdk.client.fetch(`/admin/content/landing-pages/${id}`, { method: "DELETE" })
      toast.success("Section deleted successfully")
      fetchSections()
    } catch (e: any) {
      toast.error(e.message || "Failed to delete section")
    }
  }

  const handleAddSection = () => {
    setSelectedSection(null)
    setSectionFormOpen(true)
  }

  const handleEditSection = (section: Section) => {
    setSelectedSection(section)
    setSectionFormOpen(true)
  }

  // --- Item Actions ---
  const handleDeleteItem = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return
    try {
      await sdk.client.fetch(`/admin/content/landing-pages/items/${id}`, { method: "DELETE" })
      toast.success("Item deleted successfully")
      fetchSections()
    } catch (e: any) {
      toast.error(e.message || "Failed to delete item")
    }
  }

  const handleAddItem = (sectionId: string) => {
    setActiveSectionId(sectionId)
    setSelectedItem(null)
    setItemFormOpen(true)
  }

  const handleEditItem = (sectionId: string, item: LandingSectionItem) => {
    setActiveSectionId(sectionId)
    setSelectedItem(item)
    setItemFormOpen(true)
  }

  const handleSuccess = () => {
    fetchSections()
  }

  // Formatting helpers
  const formatType = (type: string) => type.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")

  return (
    <Container className="p-4 lg:p-8">
      <div className="flex flex-wrap items-center gap-3 mb-8">
        <Link to="/content/landing-pages">
          <Button variant="secondary" size="small">
            <ArrowUturnLeft /> Back
          </Button>
        </Link>
        <Heading level="h1" className="capitalize">{page} Page CMS</Heading>
      </div>

      <div className="flex justify-between items-center mb-6">
        <Heading level="h2">Landing Sections</Heading>
        <Button onClick={handleAddSection}>+ Add Section</Button>
      </div>

      {loading ? (
        <div className="text-ui-fg-subtle p-4">Loading...</div>
      ) : (
        <div className="flex flex-col gap-6">
          {sections.map(section => (
            <div key={section.id} className="border border-ui-border-base rounded-lg overflow-hidden">
              
              {/* Section Header */}
              <div className="bg-ui-bg-subtle p-4 flex justify-between items-center border-b border-ui-border-base">
                <div className="flex items-center gap-4">
                  <Badge>{section.display_order}</Badge>
                  <Heading level="h3" className="font-semibold">
                    {formatType(section.layout_type)} 
                    <span className="text-ui-fg-subtle font-normal ml-2">({section.section_key})</span>
                  </Heading>
                  {!section.is_visible && <Badge color="grey">Hidden</Badge>}
                </div>
                <div className="flex gap-2">
                  <IconButton variant="transparent" size="small" onClick={() => handleEditSection(section)}>
                    <PencilSquare />
                  </IconButton>
                  <IconButton variant="transparent" size="small" onClick={() => handleDeleteSection(section.id)}>
                    <Trash className="text-ui-fg-error" />
                  </IconButton>
                </div>
              </div>

              {/* Items List */}
              <div className="p-4 flex flex-col gap-3">
                {section.items && section.items.length > 0 ? (
                  section.items.map(item => (
                    <div key={item.id} className="border border-ui-border-base rounded flex justify-between items-center p-3 bg-ui-bg-base">
                      <div className="flex items-center gap-4">
                        <Badge>{item.display_order}</Badge>
                        <div>
                          <p className="text-sm font-semibold">{item.title || "Untitled"} <span className="text-xs text-ui-fg-subtle font-normal uppercase ml-1">({item.item_type})</span></p>
                          {item.subtitle && <p className="text-xs text-ui-fg-subtle line-clamp-1">{item.subtitle}</p>}
                        </div>
                      </div>
                      <div className="flex gap-2 items-center">
                        {!item.is_visible && <Badge color="grey">Hidden</Badge>}
                        <IconButton variant="transparent" size="small" onClick={() => handleEditItem(section.id, item)}>
                          <PencilSquare />
                        </IconButton>
                        <IconButton variant="transparent" size="small" onClick={() => handleDeleteItem(item.id)}>
                          <Trash className="text-ui-fg-error" />
                        </IconButton>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-ui-fg-subtle italic p-2">No items added to this section yet.</p>
                )}

                {/* Add Item Button */}
                <div className="mt-2">
                  <Button 
                    variant="secondary" 
                    size="small" 
                    onClick={() => handleAddItem(section.id)}
                    disabled={section.max_items !== null && section.items?.length >= section.max_items}
                  >
                    <Plus /> Add {formatType(section.layout_type)} Item
                  </Button>
                </div>
              </div>

            </div>
          ))}
          {sections.length === 0 && (
            <div className="p-8 text-center text-ui-fg-subtle border border-ui-border-base border-dashed rounded-lg">
              No sections found. Click "+ Add Section" to start.
            </div>
          )}
        </div>
      )}

      {/* Forms */}
      {sectionFormOpen && (
        <SectionForm 
          open={sectionFormOpen} 
          onOpenChange={setSectionFormOpen} 
          section={selectedSection}
          defaultPage={page}
          onSuccess={handleSuccess}
        />
      )}

      {itemFormOpen && (
        <ItemForm 
          open={itemFormOpen} 
          onOpenChange={setItemFormOpen} 
          item={selectedItem}
          sectionId={activeSectionId}
          pageHandle={page}
          onSuccess={handleSuccess}
        />
      )}
    </Container>
  )
}
