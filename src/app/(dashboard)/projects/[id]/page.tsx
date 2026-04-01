"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  cn,
  STAGE_LABELS,
  STAGE_COLORS,
  GIFT_STATUS_LABELS,
  formatDate,
  STAGES_ORDER,
} from "@/lib/utils";
import {
  ArrowLeft,
  Loader2,
  Save,
  ChevronDown,
  ChevronRight,
  FileText,
  Sparkles,
  Share2,
  Copy,
  Check,
  Clock,
  ExternalLink,
} from "lucide-react";

/* ---------- types ---------- */

interface Research {
  id: string;
  type: string;
  content: string;
  createdAt: string;
}

interface Transcript {
  id: string;
  rawTranscript: string;
  callSummary: string | null;
  identifiedPoster: string | null;
  createdAt: string;
}

interface WritingSample {
  id: string;
  sourceUrl: string | null;
  sourceType: string;
  content: string;
  belongsTo: string;
  createdAt: string;
}

interface WritingAnalysis {
  id: string;
  subjectName: string;
  analysis: string;
  createdAt: string;
}

interface PostDraft {
  id: string;
  version: number;
  content: string;
  hookOptions: { id: string; text: string }[] | null;
  selectedHookId: string | null;
  quoteOptions: { id: string; text: string }[] | null;
  selectedQuoteId: string | null;
  status: string;
  customerEditedContent: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ActivityLog {
  id: string;
  action: string;
  details: string | null;
  createdAt: string;
}

interface GiftIdea {
  title: string;
  description: string;
  why: string;
  where: string;
  estimatedCost: string;
  customization: string;
}

interface Project {
  id: string;
  companyName: string;
  companyWebsite: string | null;
  companyDescription: string | null;
  contactName: string;
  contactEmail: string | null;
  contactTitle: string | null;
  contactLinkedinUrl: string | null;
  contactBio: string | null;
  posterName: string | null;
  posterLinkedinUrl: string | null;
  stage: string;
  giftStatus: string;
  giftDescription: string | null;
  giftTrackingNumber: string | null;
  giftShippingAddress: string | null;
  giftNotes: string | null;
  giftIdeas: GiftIdea[] | null;
  callDate: string | null;
  targetPostDate: string | null;
  actualPostDate: string | null;
  shareToken: string;
  createdAt: string;
  updatedAt: string;
  research: Research[];
  transcripts: Transcript[];
  writingSamples: WritingSample[];
  writingAnalyses: WritingAnalysis[];
  postDrafts: PostDraft[];
  activityLogs: ActivityLog[];
}

/* ---------- helpers ---------- */

function toInputDate(val: string | null | undefined): string {
  if (!val) return "";
  const d = new Date(val);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
}

const RESEARCH_LABELS: Record<string, string> = {
  company_brief: "Company Brief",
  person_brief: "Person Brief",
  call_questions: "Call Questions",
};

const SOURCE_LABELS: Record<string, string> = {
  linkedin_post: "LinkedIn",
  blog: "Blog",
  newsletter: "Newsletter",
  medium: "Medium",
  substack: "Substack",
  other: "Other",
};

/* ---------- page component ---------- */

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* action loading states */
  const [saving, setSaving] = useState(false);
  const [generatingResearch, setGeneratingResearch] = useState(false);
  const [importingTranscript, setImportingTranscript] = useState(false);
  const [analyzingWriting, setAnalyzingWriting] = useState(false);
  const [generatingDraft, setGeneratingDraft] = useState(false);
  const [sharingDraft, setSharingDraft] = useState(false);
  const [savingGift, setSavingGift] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  /* hook selection per draft id */
  const [selectedHookIds, setSelectedHookIds] = useState<Record<string, string>>({});

  /* draft revision prompt */
  const [draftGuidance, setDraftGuidance] = useState("");

  /* expanded research cards */
  const [expandedResearch, setExpandedResearch] = useState<Set<string>>(new Set());

  /* form state for overview */
  const [form, setForm] = useState({
    companyName: "",
    companyWebsite: "",
    companyDescription: "",
    contactName: "",
    contactEmail: "",
    contactTitle: "",
    contactLinkedinUrl: "",
    posterName: "",
    posterLinkedinUrl: "",
    callDate: "",
    targetPostDate: "",
    actualPostDate: "",
  });

  /* form state for gift tab */
  const [giftForm, setGiftForm] = useState({
    giftDescription: "",
    giftShippingAddress: "",
    giftStatus: "not_started",
    giftTrackingNumber: "",
    giftNotes: "",
  });

  /* ---------- fetch ---------- */

  const fetchProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      if (!res.ok) throw new Error("Failed to load project");
      const data: Project = await res.json();
      setProject(data);

      setForm({
        companyName: data.companyName ?? "",
        companyWebsite: data.companyWebsite ?? "",
        companyDescription: data.companyDescription ?? "",
        contactName: data.contactName ?? "",
        contactEmail: data.contactEmail ?? "",
        contactTitle: data.contactTitle ?? "",
        contactLinkedinUrl: data.contactLinkedinUrl ?? "",
        posterName: data.posterName ?? "",
        posterLinkedinUrl: data.posterLinkedinUrl ?? "",
        callDate: toInputDate(data.callDate),
        targetPostDate: toInputDate(data.targetPostDate),
        actualPostDate: toInputDate(data.actualPostDate),
      });

      setGiftForm({
        giftDescription: data.giftDescription ?? "",
        giftShippingAddress: data.giftShippingAddress ?? "",
        giftStatus: data.giftStatus ?? "not_started",
        giftTrackingNumber: data.giftTrackingNumber ?? "",
        giftNotes: data.giftNotes ?? "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  /* ---------- actions ---------- */

  async function patchProject(body: Record<string, unknown>) {
    const res = await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("Failed to update project");
    return res.json();
  }

  async function handleStageChange(newStage: string) {
    try {
      const updated = await patchProject({ stage: newStage });
      setProject((prev) => (prev ? { ...prev, ...updated } : prev));
    } catch {
      /* silently handle */
    }
  }

  async function handleSaveOverview() {
    setSaving(true);
    try {
      const body: Record<string, unknown> = { ...form };
      if (form.callDate) body.callDate = new Date(form.callDate).toISOString();
      else body.callDate = null;
      if (form.targetPostDate) body.targetPostDate = new Date(form.targetPostDate).toISOString();
      else body.targetPostDate = null;
      if (form.actualPostDate) body.actualPostDate = new Date(form.actualPostDate).toISOString();
      else body.actualPostDate = null;
      const updated = await patchProject(body);
      setProject((prev) => (prev ? { ...prev, ...updated } : prev));
    } catch {
      /* silently handle */
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerateResearch() {
    setGeneratingResearch(true);
    try {
      await fetch(`/api/projects/${projectId}/research`, { method: "POST" });
      await fetchProject();
    } catch {
      /* silently handle */
    } finally {
      setGeneratingResearch(false);
    }
  }

  async function handleImportTranscript() {
    setImportingTranscript(true);
    try {
      await fetch(`/api/projects/${projectId}/transcript`, { method: "POST" });
      await fetchProject();
    } catch {
      /* silently handle */
    } finally {
      setImportingTranscript(false);
    }
  }

  async function handleAnalyzeWriting() {
    setAnalyzingWriting(true);
    try {
      await fetch(`/api/projects/${projectId}/analyze`, { method: "POST" });
      await fetchProject();
    } catch {
      /* silently handle */
    } finally {
      setAnalyzingWriting(false);
    }
  }

  async function handleGenerateDraft() {
    setGeneratingDraft(true);
    try {
      await fetch(`/api/projects/${projectId}/draft`, { method: "POST" });
      await fetchProject();
    } catch {
      /* silently handle */
    } finally {
      setGeneratingDraft(false);
    }
  }

  async function handleShareDraft() {
    setSharingDraft(true);
    try {
      await fetch(`/api/projects/${projectId}/share`, { method: "POST" });
      await fetchProject();
    } catch {
      /* silently handle */
    } finally {
      setSharingDraft(false);
    }
  }

  async function handleSaveGift() {
    setSavingGift(true);
    try {
      await patchProject(giftForm);
      await fetchProject();
    } catch {
      /* silently handle */
    } finally {
      setSavingGift(false);
    }
  }

  function copyShareLink() {
    if (!project) return;
    const url = `${window.location.origin}/review/${project.shareToken}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }

  /* ---------- render: loading / error ---------- */

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-destructive">{error ?? "Project not found"}</p>
        <Button variant="outline" onClick={() => router.push("/")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  /* ---------- derived ---------- */

  const currentStageIdx = STAGES_ORDER.indexOf(project.stage as (typeof STAGES_ORDER)[number]);
  const latestDraft =
    project.postDrafts.length > 0
      ? project.postDrafts.reduce((a, b) => (a.version > b.version ? a : b))
      : null;
  const olderDrafts = project.postDrafts
    .filter((d) => d.id !== latestDraft?.id)
    .sort((a, b) => b.version - a.version);
  const latestTranscript = project.transcripts.length > 0 ? project.transcripts[project.transcripts.length - 1] : null;

  const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/review/${project.shareToken}`;
  const hasSharedDraft = latestDraft?.status === "shared" || latestDraft?.status === "customer_editing";

  /* ---------- render ---------- */

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{project.companyName}</h1>
            <p className="text-sm text-muted-foreground">
              Created {formatDate(project.createdAt)}
            </p>
          </div>
          <Badge className={cn(STAGE_COLORS[project.stage])}>
            {STAGE_LABELS[project.stage] ?? project.stage}
          </Badge>
        </div>

        {/* Stage selector */}
        <Select value={project.stage} onValueChange={handleStageChange}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STAGES_ORDER.map((s) => (
              <SelectItem key={s} value={s}>
                {STAGE_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stage progress bar */}
      <div className="flex items-center gap-1">
        {STAGES_ORDER.map((stage, idx) => {
          const isComplete = idx < currentStageIdx;
          const isCurrent = idx === currentStageIdx;
          return (
            <div key={stage} className="flex flex-1 flex-col items-center gap-1">
              <div
                className={cn(
                  "h-2 w-full rounded-full transition-colors",
                  isComplete
                    ? "bg-primary"
                    : isCurrent
                      ? "bg-primary/60"
                      : "bg-muted"
                )}
              />
              <span
                className={cn(
                  "text-[10px] leading-tight",
                  isCurrent ? "font-semibold text-foreground" : "text-muted-foreground"
                )}
              >
                {STAGE_LABELS[stage]}
              </span>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="draft">Draft</TabsTrigger>
          <TabsTrigger value="gift">Gift</TabsTrigger>
        </TabsList>

        {/* ==================== OVERVIEW ==================== */}
        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Project Details</CardTitle>
              <CardDescription>Edit project and contact information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Company section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Company
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Company Name</label>
                    <Input
                      value={form.companyName}
                      onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Website</label>
                    <Input
                      value={form.companyWebsite}
                      onChange={(e) => setForm((f) => ({ ...f, companyWebsite: e.target.value }))}
                      placeholder="https://..."
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    value={form.companyDescription}
                    onChange={(e) => setForm((f) => ({ ...f, companyDescription: e.target.value }))}
                    rows={3}
                  />
                </div>
              </div>

              {/* Contact section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Contact
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Name</label>
                    <Input
                      value={form.contactName}
                      onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Email</label>
                    <Input
                      type="email"
                      value={form.contactEmail}
                      onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Title</label>
                    <Input
                      value={form.contactTitle}
                      onChange={(e) => setForm((f) => ({ ...f, contactTitle: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">LinkedIn URL</label>
                    <Input
                      value={form.contactLinkedinUrl}
                      onChange={(e) => setForm((f) => ({ ...f, contactLinkedinUrl: e.target.value }))}
                      placeholder="https://linkedin.com/in/..."
                    />
                  </div>
                </div>
              </div>

              {/* Poster section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Poster
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Name</label>
                    <Input
                      value={form.posterName}
                      onChange={(e) => setForm((f) => ({ ...f, posterName: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">LinkedIn URL</label>
                    <Input
                      value={form.posterLinkedinUrl}
                      onChange={(e) => setForm((f) => ({ ...f, posterLinkedinUrl: e.target.value }))}
                      placeholder="https://linkedin.com/in/..."
                    />
                  </div>
                </div>
              </div>

              {/* Dates section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Dates
                </h3>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Call Date</label>
                    <Input
                      type="date"
                      value={form.callDate}
                      onChange={(e) => setForm((f) => ({ ...f, callDate: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Target Post Date</label>
                    <Input
                      type="date"
                      value={form.targetPostDate}
                      onChange={(e) => setForm((f) => ({ ...f, targetPostDate: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Actual Post Date</label>
                    <Input
                      type="date"
                      value={form.actualPostDate}
                      onChange={(e) => setForm((f) => ({ ...f, actualPostDate: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveOverview} disabled={saving}>
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Research section inline in Overview */}
          <div className="space-y-4 mt-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Research</h2>
              <Button onClick={handleGenerateResearch} disabled={generatingResearch} variant="outline" size="sm">
                {generatingResearch ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                {project.research.length > 0 ? "Regenerate" : "Generate Research"}
              </Button>
            </div>
            {generatingResearch && (
              <Card><CardContent className="flex items-center justify-center gap-3 py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /><span className="text-muted-foreground">Generating research...</span></CardContent></Card>
            )}
            {project.research.map((r) => {
              const isExpanded = expandedResearch.has(r.id);
              return (
                <Card key={r.id}>
                  <CardHeader className="cursor-pointer" onClick={() => setExpandedResearch((prev) => { const next = new Set(prev); if (next.has(r.id)) next.delete(r.id); else next.add(r.id); return next; })}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                        <CardTitle className="text-base">{RESEARCH_LABELS[r.type] ?? r.type}</CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  {isExpanded && <CardContent><div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm">{r.content}</div></CardContent>}
                </Card>
              );
            })}
            {project.research.length === 0 && !generatingResearch && (
              <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">No research yet.</CardContent></Card>
            )}
          </div>
        </TabsContent>

        {/* ==================== DRAFT ==================== */}
        <TabsContent value="draft">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Post Draft</h2>
              <div className="flex gap-2">
                {latestDraft && (
                  <Button
                    variant="outline"
                    onClick={handleShareDraft}
                    disabled={sharingDraft}
                  >
                    {sharingDraft ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Share2 className="mr-2 h-4 w-4" />
                    )}
                    Share with Customer
                  </Button>
                )}
                <Button onClick={handleGenerateDraft} disabled={generatingDraft}>
                  {generatingDraft ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  Generate Draft
                </Button>
              </div>
            </div>

            {/* Share link */}
            {hasSharedDraft && (
              <Card>
                <CardContent className="flex items-center justify-between py-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Share Link</p>
                    <p className="text-xs text-muted-foreground break-all">{shareUrl}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={copyShareLink}>
                    {copiedLink ? (
                      <Check className="mr-1 h-3 w-3" />
                    ) : (
                      <Copy className="mr-1 h-3 w-3" />
                    )}
                    {copiedLink ? "Copied" : "Copy"}
                  </Button>
                </CardContent>
              </Card>
            )}

            {!latestDraft && !generatingDraft && (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No draft generated yet. Click &quot;Generate Draft&quot; to create one.
                </CardContent>
              </Card>
            )}

            {generatingDraft && (
              <Card>
                <CardContent className="flex items-center justify-center gap-3 py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-muted-foreground">Generating draft...</span>
                </CardContent>
              </Card>
            )}

            {latestDraft && (
              <>
                {/* Hook options */}
                {latestDraft.hookOptions &&
                  Array.isArray(latestDraft.hookOptions) &&
                  latestDraft.hookOptions.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                        Hook Options — pick one
                      </h3>
                      <div className="space-y-2">
                        {(latestDraft.hookOptions as { id: string; text: string }[]).map(
                          (hook, i) => {
                            const activeId = selectedHookIds[latestDraft.id] ?? latestDraft.hookOptions![0].id;
                            const isActive = activeId === hook.id;
                            // First line of each hook variant as the preview
                            const hookPreview = hook.text.split("\n")[0];
                            return (
                              <Card
                                key={hook.id}
                                className={cn(
                                  "cursor-pointer transition-colors",
                                  isActive
                                    ? "border-primary ring-1 ring-primary"
                                    : "hover:border-muted-foreground/30"
                                )}
                                onClick={() =>
                                  setSelectedHookIds((prev) => ({
                                    ...prev,
                                    [latestDraft.id]: hook.id,
                                  }))
                                }
                              >
                                <CardContent className="py-3 flex items-start gap-3">
                                  <div
                                    className={cn(
                                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold",
                                      isActive
                                        ? "border-primary bg-primary text-primary-foreground"
                                        : "border-muted-foreground/30 text-muted-foreground"
                                    )}
                                  >
                                    {i + 1}
                                  </div>
                                  <p className="text-sm">{hookPreview}</p>
                                </CardContent>
                              </Card>
                            );
                          }
                        )}
                      </div>
                    </div>
                  )}

                {/* Current draft — shows selected hook variant */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">
                        Version {latestDraft.version}
                      </CardTitle>
                      <Badge variant="secondary">{latestDraft.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="whitespace-pre-wrap rounded-md border bg-muted/30 p-4 text-sm leading-relaxed">
                      {latestDraft.hookOptions && Array.isArray(latestDraft.hookOptions) && latestDraft.hookOptions.length > 0
                        ? (latestDraft.hookOptions as { id: string; text: string }[]).find(
                            (h) => h.id === (selectedHookIds[latestDraft.id] ?? latestDraft.hookOptions![0].id)
                          )?.text ?? latestDraft.content
                        : latestDraft.content}
                    </div>
                  </CardContent>
                </Card>

                {/* Revision prompt */}
                <Card>
                  <CardContent className="pt-4 space-y-3">
                    <Textarea
                      value={draftGuidance}
                      onChange={(e) => setDraftGuidance(e.target.value)}
                      placeholder="Make the hook punchier... more vulnerable, less polished... open with the customer story instead... try a different angle..."
                      rows={2}
                      className="resize-none text-sm"
                    />
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        onClick={async () => {
                          setGeneratingDraft(true);
                          try {
                            await fetch(`/api/projects/${projectId}/draft`, {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ guidance: draftGuidance }),
                            });
                            setDraftGuidance("");
                            await fetchProject();
                          } finally {
                            setGeneratingDraft(false);
                          }
                        }}
                        disabled={generatingDraft || !draftGuidance.trim()}
                      >
                        {generatingDraft ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="mr-2 h-4 w-4" />
                        )}
                        Take Another Pass
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Quote options */}
                {latestDraft.quoteOptions &&
                  Array.isArray(latestDraft.quoteOptions) &&
                  latestDraft.quoteOptions.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                        Quote Options
                      </h3>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {(latestDraft.quoteOptions as { id: string; text: string }[]).map(
                          (quote) => (
                            <Card
                              key={quote.id}
                              className={cn(
                                "cursor-pointer transition-colors",
                                latestDraft.selectedQuoteId === quote.id
                                  ? "border-primary ring-1 ring-primary"
                                  : "hover:border-muted-foreground/30"
                              )}
                            >
                              <CardContent className="py-4">
                                <div className="flex items-start gap-3">
                                  <div
                                    className={cn(
                                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                                      latestDraft.selectedQuoteId === quote.id
                                        ? "border-primary bg-primary text-primary-foreground"
                                        : "border-muted-foreground/30"
                                    )}
                                  >
                                    {latestDraft.selectedQuoteId === quote.id && (
                                      <Check className="h-3 w-3" />
                                    )}
                                  </div>
                                  <p className="text-sm italic">&ldquo;{quote.text}&rdquo;</p>
                                </div>
                              </CardContent>
                            </Card>
                          )
                        )}
                      </div>
                    </div>
                  )}

                {/* Version history */}
                {olderDrafts.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                      Version History
                    </h3>
                    {olderDrafts.map((d) => (
                      <Card key={d.id}>
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm">Version {d.version}</CardTitle>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">
                                {d.status}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatDate(d.createdAt)}
                              </span>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm line-clamp-3 text-muted-foreground whitespace-pre-wrap">
                            {d.content}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </TabsContent>

        {/* ==================== GIFT ==================== */}
        <TabsContent value="gift">
          {/* AI Gift Ideas */}
          {project.giftIdeas && Array.isArray(project.giftIdeas) && (project.giftIdeas as GiftIdea[]).length > 0 && (
            <div className="space-y-3 mb-6">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">AI Gift Ideas</h3>
              <div className="grid gap-3 sm:grid-cols-3">
                {(project.giftIdeas as GiftIdea[]).map((idea, i) => (
                  <Card key={i} className="cursor-pointer hover:border-primary/40 transition-colors" onClick={() => setGiftForm(f => ({ ...f, giftDescription: `${idea.title}: ${idea.description}\n\nOrder from: ${idea.where}\nCustomize: ${idea.customization}\nEstimated cost: ${idea.estimatedCost}` }))}>
                    <CardContent className="p-4 space-y-1.5">
                      <div className="font-medium text-sm">{idea.title}</div>
                      <div className="text-xs text-muted-foreground">{idea.estimatedCost}</div>
                      <div className="text-xs text-muted-foreground line-clamp-2">{idea.why}</div>
                      <div className="text-xs text-primary">{idea.where}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Click an idea to populate the gift description below.</p>
            </div>
          )}
          <Card>
            <CardHeader>
              <CardTitle>Gift Management</CardTitle>
              <CardDescription>Track thank-you gift for the co-marketing partner</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Gift Description</label>
                <Textarea
                  value={giftForm.giftDescription}
                  onChange={(e) =>
                    setGiftForm((f) => ({ ...f, giftDescription: e.target.value }))
                  }
                  placeholder="Describe the gift..."
                  rows={2}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Shipping Address</label>
                <Textarea
                  value={giftForm.giftShippingAddress}
                  onChange={(e) =>
                    setGiftForm((f) => ({ ...f, giftShippingAddress: e.target.value }))
                  }
                  placeholder="Full shipping address..."
                  rows={3}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Status</label>
                  <Select
                    value={giftForm.giftStatus}
                    onValueChange={(val) =>
                      setGiftForm((f) => ({ ...f, giftStatus: val }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(GIFT_STATUS_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Tracking Number</label>
                  <Input
                    value={giftForm.giftTrackingNumber}
                    onChange={(e) =>
                      setGiftForm((f) => ({ ...f, giftTrackingNumber: e.target.value }))
                    }
                    placeholder="Tracking #"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Notes</label>
                <Textarea
                  value={giftForm.giftNotes}
                  onChange={(e) =>
                    setGiftForm((f) => ({ ...f, giftNotes: e.target.value }))
                  }
                  placeholder="Additional notes..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveGift} disabled={savingGift}>
                  {savingGift ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save Gift Info
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
