"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable } from "@dnd-kit/core";
import {
  Plus,
  Table as TableIcon,
  Kanban,
  ArrowUpDown,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  cn,
  STAGE_LABELS,
  STAGE_COLORS,
  GIFT_STATUS_LABELS,
  STAGES_ORDER,
  formatDate,
  daysInStage,
} from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Project {
  id: string;
  companyName: string;
  companyWebsite: string | null;
  contactName: string;
  contactEmail: string | null;
  contactTitle: string | null;
  contactLinkedinUrl: string | null;
  stage: string;
  giftStatus: string;
  callDate: string | null;
  targetPostDate: string | null;
  updatedAt: string;
}

type SortField =
  | "companyName"
  | "contactName"
  | "stage"
  | "callDate"
  | "targetPostDate"
  | "giftStatus";

// ---------------------------------------------------------------------------
// Dashboard Page
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");

  // New project dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // Sorting
  const [sortField, setSortField] = useState<SortField>("companyName");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Fetch projects
  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/projects");
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Create project
  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreating(true);
    const fd = new FormData(e.currentTarget);
    const body = {
      companyName: fd.get("companyName"),
      companyWebsite: fd.get("companyWebsite") || null,
      contactName: fd.get("contactName"),
      contactEmail: fd.get("contactEmail") || null,
      contactTitle: fd.get("contactTitle") || null,
      contactLinkedinUrl: fd.get("contactLinkedinUrl") || null,
    };

    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setDialogOpen(false);
      fetchProjects();
    }
    setCreating(false);
  }

  // Update stage (for kanban drag)
  async function updateStage(projectId: string, newStage: string) {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId
          ? { ...p, stage: newStage, updatedAt: new Date().toISOString() }
          : p
      )
    );

    await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: newStage }),
    });
  }

  // Sort
  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  const sortedProjects = [...projects].sort((a, b) => {
    const av = (a[sortField] ?? "") as string;
    const bv = (b[sortField] ?? "") as string;
    const cmp = av.localeCompare(bv);
    return sortDir === "asc" ? cmp : -cmp;
  });

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Projects</h1>
          <p className="text-sm text-muted-foreground">
            {projects.length} project{projects.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-md border border-border">
            <Button
              variant={viewMode === "table" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("table")}
              className="rounded-r-none"
            >
              <TableIcon className="mr-1 h-4 w-4" />
              Table
            </Button>
            <Button
              variant={viewMode === "kanban" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("kanban")}
              className="rounded-l-none"
            >
              <Kanban className="mr-1 h-4 w-4" />
              Board
            </Button>
          </div>

          {/* New project */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Project</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Company Name *</label>
                  <Input name="companyName" required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Company Website</label>
                  <Input
                    name="companyWebsite"
                    type="url"
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Contact Name *</label>
                  <Input name="contactName" required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Contact Email</label>
                  <Input name="contactEmail" type="email" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Contact Title</label>
                  <Input name="contactTitle" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Contact LinkedIn URL
                  </label>
                  <Input
                    name="contactLinkedinUrl"
                    type="url"
                    placeholder="https://linkedin.com/in/..."
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={creating}>
                    {creating && (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    )}
                    Create Project
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Views */}
      {viewMode === "table" ? (
        <TableView
          projects={sortedProjects}
          sortField={sortField}
          sortDir={sortDir}
          onSort={toggleSort}
          onRowClick={(id) => router.push(`/projects/${id}`)}
          onUpdateStage={updateStage}
        />
      ) : (
        <KanbanView projects={projects} onUpdateStage={updateStage} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Table View
// ---------------------------------------------------------------------------

function SortHeader({
  label,
  field,
  active,
  dir,
  onSort,
}: {
  label: string;
  field: SortField;
  active: boolean;
  dir: "asc" | "desc";
  onSort: (f: SortField) => void;
}) {
  return (
    <th
      className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground cursor-pointer select-none hover:text-foreground"
      onClick={() => onSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown
          className={cn(
            "h-3 w-3",
            active ? "text-foreground" : "text-muted-foreground/50"
          )}
        />
        {active && (
          <span className="text-[10px]">{dir === "asc" ? "A" : "D"}</span>
        )}
      </span>
    </th>
  );
}

function TableView({
  projects,
  sortField,
  sortDir,
  onSort,
  onRowClick,
  onUpdateStage,
}: {
  projects: Project[];
  sortField: SortField;
  sortDir: "asc" | "desc";
  onSort: (f: SortField) => void;
  onRowClick: (id: string) => void;
  onUpdateStage: (id: string, stage: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-border">
          <tr>
            <SortHeader
              label="Company"
              field="companyName"
              active={sortField === "companyName"}
              dir={sortDir}
              onSort={onSort}
            />
            <SortHeader
              label="Contact"
              field="contactName"
              active={sortField === "contactName"}
              dir={sortDir}
              onSort={onSort}
            />
            <SortHeader
              label="Stage"
              field="stage"
              active={sortField === "stage"}
              dir={sortDir}
              onSort={onSort}
            />
            <SortHeader
              label="Call Date"
              field="callDate"
              active={sortField === "callDate"}
              dir={sortDir}
              onSort={onSort}
            />
            <SortHeader
              label="Target Post Date"
              field="targetPostDate"
              active={sortField === "targetPostDate"}
              dir={sortDir}
              onSort={onSort}
            />
            <SortHeader
              label="Gift Status"
              field="giftStatus"
              active={sortField === "giftStatus"}
              dir={sortDir}
              onSort={onSort}
            />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {projects.length === 0 ? (
            <tr>
              <td
                colSpan={6}
                className="px-4 py-12 text-center text-muted-foreground"
              >
                No projects yet. Create your first one above.
              </td>
            </tr>
          ) : (
            projects.map((p) => (
              <tr
                key={p.id}
                onClick={() => onRowClick(p.id)}
                className="cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <td className="px-4 py-3 font-medium text-foreground">
                  {p.companyName}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {p.contactName}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={p.stage}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      e.stopPropagation();
                      onUpdateStage(p.id, e.target.value);
                    }}
                    className={cn(
                      "rounded-md border-0 px-2 py-0.5 text-xs font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40",
                      STAGE_COLORS[p.stage] ?? ""
                    )}
                  >
                    {STAGES_ORDER.map((s) => (
                      <option key={s} value={s}>
                        {STAGE_LABELS[s] ?? s}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatDate(p.callDate)}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatDate(p.targetPostDate)}
                </td>
                <td className="px-4 py-3">
                  <Badge variant="outline">
                    {GIFT_STATUS_LABELS[p.giftStatus] ?? p.giftStatus}
                  </Badge>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Kanban View
// ---------------------------------------------------------------------------

function KanbanView({
  projects,
  onUpdateStage,
}: {
  projects: Project[];
  onUpdateStage: (id: string, stage: string) => void;
}) {
  const [activeProject, setActiveProject] = useState<Project | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function handleDragStart(event: DragStartEvent) {
    const proj = projects.find((p) => p.id === event.active.id);
    setActiveProject(proj ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveProject(null);
    const { active, over } = event;
    if (!over) return;

    const projectId = active.id as string;
    const targetStage = over.id as string;

    // over.id is the column (stage) id
    if (STAGES_ORDER.includes(targetStage as (typeof STAGES_ORDER)[number])) {
      const project = projects.find((p) => p.id === projectId);
      if (project && project.stage !== targetStage) {
        onUpdateStage(projectId, targetStage);
      }
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-4">
        {STAGES_ORDER.map((stage) => {
          const stageProjects = projects.filter((p) => p.stage === stage);
          return (
            <KanbanColumn
              key={stage}
              stage={stage}
              projects={stageProjects}
            />
          );
        })}
      </div>

      <DragOverlay>
        {activeProject ? (
          <ProjectCard project={activeProject} isDragOverlay />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function KanbanColumn({
  stage,
  projects,
}: {
  stage: string;
  projects: Project[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-64 flex-shrink-0 flex-col rounded-lg bg-gray-50 border border-border",
        isOver && "ring-2 ring-primary/40"
      )}
    >
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
        <div className="flex items-center gap-2">
          <Badge
            variant="secondary"
            className={cn("border-0 text-[11px]", STAGE_COLORS[stage] ?? "")}
          >
            {STAGE_LABELS[stage] ?? stage}
          </Badge>
        </div>
        <span className="text-xs font-medium text-muted-foreground">
          {projects.length}
        </span>
      </div>

      <div className="flex-1 space-y-2 p-2 min-h-[120px]">
        <SortableContext
          items={projects.map((p) => p.id)}
          strategy={verticalListSortingStrategy}
        >
          {projects.map((p) => (
            <SortableProjectCard key={p.id} project={p} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

function SortableProjectCard({ project }: { project: Project }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <ProjectCard project={project} />
    </div>
  );
}

function ProjectCard({
  project,
  isDragOverlay,
}: {
  project: Project;
  isDragOverlay?: boolean;
}) {
  const router = useRouter();
  const days = daysInStage(project.updatedAt);

  return (
    <Card
      className={cn(
        "cursor-grab select-none",
        isDragOverlay && "shadow-lg ring-2 ring-primary/20 rotate-2"
      )}
      onClick={(e) => {
        if (!isDragOverlay) {
          e.stopPropagation();
          router.push(`/projects/${project.id}`);
        }
      }}
    >
      <CardContent className="p-3 space-y-1.5">
        <div className="font-medium text-sm text-foreground leading-tight">
          {project.companyName}
        </div>
        <div className="text-xs text-muted-foreground">{project.contactName}</div>
        <div className="text-[11px] text-muted-foreground/70">
          {days === 0 ? "Today" : `${days}d in stage`}
        </div>
      </CardContent>
    </Card>
  );
}
