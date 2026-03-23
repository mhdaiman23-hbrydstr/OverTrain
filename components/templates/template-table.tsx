"use client"

import { useEffect, useMemo, useState } from "react"
import { Copy, MoreHorizontal, PencilLine, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { ProgramTemplateSummary } from "./types"

interface TemplateTableProps {
  accessToken: string | null
  onCreate: () => void
  onEdit: (templateId: string) => void
  onDuplicate: (templateId: string) => void
  refreshKey?: number
}

const formatList = (items: string[] | undefined | null) => {
  if (!items || items.length === 0) return "—"
  return items.map((item) => item.charAt(0).toUpperCase() + item.slice(1)).join(", ")
}

export function TemplateTable({ accessToken, onCreate, onEdit, onDuplicate, refreshKey = 0 }: TemplateTableProps) {
  const [templates, setTemplates] = useState<ProgramTemplateSummary[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [templateToDelete, setTemplateToDelete] = useState<ProgramTemplateSummary | null>(null)
  const [confirmText, setConfirmText] = useState("")
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    if (!accessToken) return

    const controller = new AbortController()

    void (async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await fetch("/api/admin/templates", {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(await response.text())
        }

        const data = await response.json()
        const mapped: ProgramTemplateSummary[] = (data.templates ?? []).map((template: any) => ({
          id: template.id,
          name: template.name,
          description: template.description ?? null,
          daysPerWeek: template.days_per_week,
          totalWeeks: template.total_weeks,
          gender: template.gender ?? [],
          experienceLevel: template.experience_level ?? [],
          isActive: template.is_active,
          progressionType: (template.progression_type ?? "linear") as ProgramTemplateSummary["progressionType"],
          updatedAt: template.updated_at ?? null,
        }))

        setTemplates(mapped)
      } catch (fetchError) {
        if (!(fetchError instanceof DOMException && fetchError.name === "AbortError")) {
          console.error("[TemplateTable] failed to load templates", fetchError)
          setError("Unable to load templates. Please try again.")
        }
      } finally {
        setIsLoading(false)
      }
    })()

    return () => controller.abort()
  }, [accessToken, refreshKey])

  const filteredTemplates = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) return templates

    return templates.filter((template) => {
      const fields = [
        template.name,
        template.description ?? "",
        template.progressionType ?? "",
        template.gender?.join(" ") ?? "",
        template.experienceLevel?.join(" ") ?? "",
      ]

      return fields.some((field) => field.toLowerCase().includes(query))
    })
  }, [searchTerm, templates])

  const totalTemplates = templates.length
  const visibleTemplates = filteredTemplates.length

  const handleDelete = async () => {
    if (!templateToDelete || !accessToken) return
    if (confirmText.trim() !== templateToDelete.name.trim()) return

    try {
      const response = await fetch(`/api/admin/templates/${templateToDelete.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (!response.ok) {
        throw new Error(await response.text())
      }

      setTemplates((prev) => prev.filter((template) => template.id !== templateToDelete.id))
      setConfirmOpen(false)
      setConfirmText("")
      setTemplateToDelete(null)
    } catch (deleteError) {
      console.error("[TemplateTable] failed to delete template", deleteError)
      setError("Unable to delete template. Please try again.")
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="space-y-3 pb-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <CardTitle className="text-lg whitespace-nowrap">Program Templates</CardTitle>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground shrink-0">
                {totalTemplates} total
              </span>
              {searchTerm.trim() && (
                <span className="text-xs text-muted-foreground shrink-0">
                  ({visibleTemplates})
                </span>
              )}
            </div>
            <Button onClick={onCreate} size="sm" className="whitespace-nowrap shrink-0">
              <Plus className="mr-1.5 h-4 w-4" />
              <span className="hidden sm:inline">New Template</span>
              <span className="sm:hidden">New</span>
            </Button>
          </div>
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search templates..."
            aria-label="Search program templates"
          />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
              Loading templates...
            </div>
          ) : error ? (
            <div className="flex h-48 items-center justify-center text-sm text-destructive">{error}</div>
          ) : totalTemplates === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center gap-3 text-center text-sm text-muted-foreground">
              <p>No templates yet.</p>
              <Button onClick={onCreate} variant="outline" size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Create your first template
              </Button>
            </div>
          ) : visibleTemplates === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
              <p>
                No templates match <span className="font-medium text-foreground">"{searchTerm.trim()}"</span>.
              </p>
              <Button onClick={() => setSearchTerm("")} variant="outline" size="sm">
                Clear search
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Template</TableHead>
                    <TableHead className="w-[60px] text-center">Days</TableHead>
                    <TableHead className="w-[80px] text-center">Weeks</TableHead>
                    <TableHead className="hidden lg:table-cell">Progression</TableHead>
                    <TableHead className="hidden md:table-cell">Gender</TableHead>
                    <TableHead className="hidden md:table-cell">Experience</TableHead>
                    <TableHead className="w-[48px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTemplates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>{template.name}</span>
                          {template.description && (
                            <span className="text-xs text-muted-foreground line-clamp-1">
                              {template.description}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-sm font-medium">{template.daysPerWeek}</TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground">{template.totalWeeks}</TableCell>
                      <TableCell className="hidden lg:table-cell capitalize">
                        {template.progressionType.replace(/_/g, " ")}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{formatList(template.gender)}</TableCell>
                      <TableCell className="hidden md:table-cell">{formatList(template.experienceLevel)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label="Template actions">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onDuplicate(template.id)}>
                              <Copy className="mr-2 h-4 w-4" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onEdit(template.id)}>
                              <PencilLine className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => {
                                setTemplateToDelete(template)
                                setConfirmText("")
                                setConfirmOpen(true)
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove template?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will remove{" "}
              <span className="font-medium text-foreground">
                {templateToDelete?.name ?? "this template"}
              </span>{" "}
              from the database. Type the template name to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div>
            <Input
              autoFocus
              value={confirmText}
              onChange={(event) => setConfirmText(event.target.value)}
              placeholder={templateToDelete?.name ?? "Template name"}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmText("")}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={cn(
                "bg-destructive text-destructive-foreground hover:bg-destructive/90",
                confirmText.trim() !== (templateToDelete?.name.trim() ?? "") && "pointer-events-none opacity-50",
              )}
              onClick={handleDelete}
              disabled={confirmText.trim() !== (templateToDelete?.name.trim() ?? "")}
            >
              Remove template
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
