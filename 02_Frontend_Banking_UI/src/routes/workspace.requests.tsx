import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  X,
  MessageSquare,
  FileText,
  ImageIcon,
  Download,
  Eye,
  BadgeCheck,
  Filter,
  User2,
  Search,
} from "lucide-react";
import {
  api,
  type AuditLog,
  type DocumentUpload,
  type ServiceRequest,
} from "@/lib/api";
import {
  gateLabel,
  intentLabel,
  orchestrationPattern,
} from "@/lib/agent-i18n";
import { BackendGate } from "@/components/nexus/BackendGate";
import { StatusBadge, RiskBadge } from "@/components/nexus/StatusBadge";
import { AgentPipeline } from "@/components/nexus/AgentPipeline";
import { useLang } from "@/lib/i18n";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/workspace/requests")({
  component: Requests,
});

function Requests() {
  return <BackendGate>{(state) => <Body state={state} />}</BackendGate>;
}

type Filter = "all" | "pending" | "approved" | "rejected";

function Body({ state }: { state: Awaited<ReturnType<typeof api.state>> }) {
  const { t, lang } = useLang();
  const { session } = useSession();
  const qc = useQueryClient();
  const requests = state.serviceRequests || [];
  const docs = state.documentUploads || [];
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requests.filter((r) => {
      const status = (r.status || "").toLowerCase();
      const matchesFilter =
        filter === "all"
          ? true
          : filter === "approved"
            ? status.includes("approv")
            : filter === "rejected"
              ? status.includes("reject")
              : status.includes("review") || status.includes("submit") || status.includes("pending");
      if (!matchesFilter) return false;
      if (!q) return true;
      return (
        r.requestId.toLowerCase().includes(q) ||
        (r.customerName || "").toLowerCase().includes(q) ||
        (r.type || "").toLowerCase().includes(q) ||
        (r.summary || "").toLowerCase().includes(q)
      );
    });
  }, [requests, filter, search]);

  const [selectedId, setSelectedId] = useState<string | null>(
    filtered[0]?.requestId || requests[0]?.requestId || null,
  );
  const [note, setNote] = useState("");

  const selected = useMemo(
    () => requests.find((r) => r.requestId === selectedId) || null,
    [requests, selectedId],
  );
  const selectedAudit = useMemo(
    () =>
      selected
        ? (state.auditLogs || []).find((audit) => audit.auditId === selected.auditId) || null
        : null,
    [selected, state.auditLogs],
  );

  const decide = useMutation({
    mutationFn: api.decideServiceRequest,
    onSuccess: () => {
      setNote("");
      qc.invalidateQueries({ queryKey: ["state"] });
    },
  });

  const counts = useMemo(() => {
    let pending = 0, approved = 0, rejected = 0;
    for (const r of requests) {
      const s = (r.status || "").toLowerCase();
      if (s.includes("approv")) approved++;
      else if (s.includes("reject")) rejected++;
      else pending++;
    }
    return { pending, approved, rejected };
  }, [requests]);

  return (
    <div className="space-y-6">
      {/* Metric strip */}
      <div className="grid gap-3 sm:grid-cols-4">
        <Metric label={lang === "ar" ? "إجمالي" : "Total"} value={requests.length} tone="accent" />
        <Metric label={lang === "ar" ? "قيد المراجعة" : "Pending"} value={counts.pending} tone="warning" />
        <Metric label={lang === "ar" ? "معتمد" : "Approved"} value={counts.approved} tone="success" />
        <Metric label={lang === "ar" ? "مرفوض" : "Rejected"} value={counts.rejected} tone="destructive" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <aside className="nexus-glass rounded-3xl p-4">
          <div className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={lang === "ar" ? "بحث…" : "Search requests…"}
                className="w-full rounded-xl border border-border bg-background/50 py-2 ps-8 pe-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(["all", "pending", "approved", "rejected"] as Filter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-wider transition ${
                    filter === f
                      ? "border-accent/50 bg-accent/10 text-accent"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {filterLabel(f, lang)}
                </button>
              ))}
            </div>
          </div>

          <ul className="mt-3 max-h-[68vh] space-y-1 overflow-y-auto pr-1">
            {filtered.map((r) => {
              const active = r.requestId === selectedId;
              return (
                <li key={r.requestId}>
                  <button
                    onClick={() => setSelectedId(r.requestId)}
                    className={`group w-full rounded-2xl border p-3 text-start transition ${
                      active
                        ? "border-accent/40 bg-accent/10 nexus-glow"
                        : "border-transparent hover:border-border hover:bg-card/60"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[10px] text-muted-foreground">#{r.requestId.slice(-6)}</span>
                      <StatusBadge status={r.status} lang={lang} />
                    </div>
                    <div className="mt-1.5 flex items-center gap-1.5 text-sm text-foreground">
                      <User2 className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="truncate">{r.customerName || r.customerId}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                      <span className="truncate">{intentLabel(r.type, lang)}</span>
                      {r.riskLevel ? <RiskBadge level={r.riskLevel} lang={lang} /> : null}
                    </div>
                  </button>
                </li>
              );
            })}
            {filtered.length === 0 ? (
              <li className="p-6 text-center text-xs text-muted-foreground">
                <Filter className="mx-auto mb-2 h-4 w-4" />
                {lang === "ar" ? "لا نتائج" : "No matching requests"}
              </li>
            ) : null}
          </ul>
        </aside>

        <section className="min-w-0">
          {selected ? (
            <RequestDetail
              request={selected}
              audit={selectedAudit}
              docs={docs.filter((d) => {
                const ids = Array.isArray(selected.documentIds)
                  ? selected.documentIds
                  : String(selected.documentIds || "")
                      .split(/[,\s]+/)
                      .filter(Boolean);
                return ids.includes(d.documentId) || d.requestId === selected.requestId;
              })}
              note={note}
              setNote={setNote}
              onDecide={(decision) =>
                decide.mutate({
                  requestId: selected.requestId,
                  decision,
                  note,
                  approver: session?.name,
                  actorUserId: session?.userId,
                  language: lang,
                })
              }
              pending={decide.isPending}
            />
          ) : (
            <div className="nexus-glass grid min-h-[40vh] place-items-center rounded-3xl p-8 text-sm text-muted-foreground">
              {lang === "ar" ? "اختر طلبًا للمراجعة" : "Select a request to review"}
            </div>
          )}
        </section>
      </div>
    </div>
  );

  function filterLabel(f: Filter, l: "en" | "ar") {
    const map: Record<Filter, { en: string; ar: string }> = {
      all: { en: "All", ar: "الكل" },
      pending: { en: "Pending", ar: "قيد المراجعة" },
      approved: { en: "Approved", ar: "معتمد" },
      rejected: { en: "Rejected", ar: "مرفوض" },
    };
    return map[f][l];
  }
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "accent" | "warning" | "success" | "destructive";
}) {
  const toneMap = {
    accent: "text-accent",
    warning: "text-warning",
    success: "text-success",
    destructive: "text-destructive",
  } as const;
  return (
    <div className="nexus-glass flex items-center justify-between rounded-2xl px-4 py-3">
      <div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
        <div className={`mt-0.5 font-display text-2xl font-semibold ${toneMap[tone]}`}>{value}</div>
      </div>
      <div className={`h-8 w-1 rounded-full ${toneMap[tone].replace("text-", "bg-")}/60`} />
    </div>
  );
}

function RequestDetail({
  request,
  audit,
  docs,
  note,
  setNote,
  onDecide,
  pending,
}: {
  request: ServiceRequest;
  audit: AuditLog | null;
  docs: DocumentUpload[];
  note: string;
  setNote: (v: string) => void;
  onDecide: (d: "approved" | "rejected" | "needs_review") => void;
  pending: boolean;
}) {
  const { t, lang } = useLang();
  const orchestration = audit?.agentOrchestration;
  const reports = audit?.agentReports || orchestration?.agentReports || [];

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="nexus-glass rounded-3xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              #{request.requestId}
            </div>
            <h2 className="mt-1 font-display text-2xl font-semibold text-foreground">
              {request.customerName || request.customerId}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{intentLabel(request.type, lang)}</span>
              {request.channel ? <span>· {request.channel}</span> : null}
              {request.priority ? <span>· {request.priority}</span> : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {request.riskLevel ? <RiskBadge level={request.riskLevel} lang={lang} /> : null}
            <StatusBadge status={request.status} lang={lang} size="md" />
          </div>
        </div>

        {request.summary ? (
          <p className="mt-4 rounded-2xl border border-border/60 bg-background/40 p-4 text-sm leading-relaxed text-foreground/90">
            {request.summary}
          </p>
        ) : null}

        {orchestration ? (
          <div className="mt-4 grid gap-2 text-xs sm:grid-cols-3">
            <Meta label={lang === "ar" ? "النمط" : "Pattern"} value={orchestrationPattern(orchestration.pattern, lang)} />
            <Meta label={lang === "ar" ? "المسار" : "Route"} value={intentLabel(orchestration.activeRoute || audit?.intent || "general", lang)} />
            <Meta label={lang === "ar" ? "البوابة النهائية" : "Final gate"} value={gateLabel(orchestration.finalGate, lang)} />
          </div>
        ) : null}
      </div>

      {/* Agent pipeline */}
      {reports.length ? (
        <div className="nexus-glass rounded-3xl p-6" data-testid="request-agent-details">
          <div className="mb-4 flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-xl nexus-aurora">
              <BadgeCheck className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-display text-sm font-semibold text-foreground">
                {lang === "ar" ? "خط الوكلاء للقرار" : "Agent decision pipeline"}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                {lang === "ar"
                  ? "المنسق ← المتخصصون ← المحسّن ← المقيّم"
                  : "Orchestrator → Specialists → Optimizer → Evaluator"}
              </p>
            </div>
          </div>
          <AgentPipeline reports={reports} orchestration={orchestration} lang={lang} />
        </div>
      ) : null}

      {audit?.decisionExplanation ? (
        <div className="nexus-glass rounded-3xl p-6">
          <div className="text-[10px] uppercase tracking-widest text-gold">
            {audit.decisionLabel || (lang === "ar" ? "توصية النظام" : "System recommendation")}
          </div>
          <p className="mt-2 text-sm leading-relaxed text-foreground">{audit.decisionExplanation}</p>
        </div>
      ) : null}

      {/* Documents */}
      <div className="nexus-glass rounded-3xl p-6">
        <div className="mb-3 flex items-center gap-2">
          <FileText className="h-4 w-4 text-accent" />
          <h3 className="font-display text-sm font-semibold text-foreground">
            {t("documents")} · {docs.length}
          </h3>
        </div>
        {request.documentAnalysisSummary ? (
          <div className="mb-3 rounded-2xl border border-accent/25 bg-accent/10 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <BadgeCheck className="h-4 w-4 text-accent" />
                <span className="text-xs font-semibold text-foreground">DocumentIntelligenceAgent</span>
              </div>
              <span className="rounded-full border border-accent/30 px-2.5 py-1 text-[10px] text-accent">
                {request.documentAnalysisSummary.averageConfidence || 0}%
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {request.documentAnalysisSummary.summary}
            </p>
            {request.remainingRequiredDocuments?.length ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {request.remainingRequiredDocuments.map((item) => (
                  <span key={item} className="rounded-full border border-warning/30 bg-warning/10 px-2 py-1 text-[10px] text-warning">
                    {item}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
        {docs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
            {lang === "ar" ? "لا توجد مستندات مرفقة" : "No documents attached"}
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {docs.map((d) => (
              <DocCard key={d.documentId} doc={d} lang={lang} />
            ))}
          </ul>
        )}
      </div>

      {/* Decision */}
      <div className="nexus-glass rounded-3xl p-6">
        <label className="text-[10px] uppercase tracking-widest text-muted-foreground">
          {t("decisionNote")}
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder={lang === "ar" ? "اكتب ملاحظتك للعميل…" : "Write a note that will be shown to the customer…"}
          className="mt-2 w-full rounded-xl border border-border bg-background/50 p-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => onDecide("approved")}
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-full border border-success/40 bg-success/10 px-4 py-2 text-sm font-medium text-success transition hover:bg-success/20 disabled:opacity-40"
          >
            <Check className="h-4 w-4" /> {t("approve")}
          </button>
          <button
            onClick={() => onDecide("rejected")}
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-full border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive transition hover:bg-destructive/20 disabled:opacity-40"
          >
            <X className="h-4 w-4" /> {t("reject")}
          </button>
          <button
            onClick={() => onDecide("needs_review")}
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-full border border-warning/40 bg-warning/10 px-4 py-2 text-sm font-medium text-warning transition hover:bg-warning/20 disabled:opacity-40"
          >
            <MessageSquare className="h-4 w-4" /> {t("needsReview")}
          </button>
        </div>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/30 p-3">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 truncate font-mono text-xs text-foreground" title={value}>
        {value}
      </div>
    </div>
  );
}

function DocCard({ doc, lang }: { doc: DocumentUpload; lang: "en" | "ar" }) {
  const isImg = doc.mimeType.startsWith("image/");
  const isPdf = doc.mimeType === "application/pdf";
  const [open, setOpen] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const viewUrl = api.documentViewUrl(doc.documentId);
  const downloadUrl = api.documentDownloadUrl(doc.documentId);
  const analysis = doc.intelligence;
  const fields = Object.entries(analysis?.extractedFields || {}).slice(0, 4);
  return (
    <li className="overflow-hidden rounded-2xl border border-border bg-card/40">
      <div className="grid h-32 place-items-center bg-background/50">
        {isImg && !imageFailed ? (
          <img
            src={viewUrl}
            alt={doc.originalName}
            className="h-full w-full object-cover"
            onError={() => setImageFailed(true)}
          />
        ) : isImg && imageFailed ? (
          <div className="flex flex-col items-center gap-2 px-4 text-center">
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">Preview needs backend</span>
          </div>
        ) : isPdf ? (
          <FileText className="h-8 w-8 text-accent" />
        ) : (
          <ImageIcon className="h-8 w-8 text-muted-foreground" />
        )}
      </div>
      <div className="p-3">
        <div className="truncate text-xs text-foreground" title={doc.originalName}>
          {doc.originalName}
        </div>
        <div className="mt-0.5 text-[10px] text-muted-foreground">
          {(doc.size / 1024).toFixed(0)} KB · {doc.mimeType.split("/")[1]}
        </div>
        {analysis ? (
          <div className="mt-3 rounded-xl border border-accent/20 bg-accent/10 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-[11px] font-semibold text-foreground">
                {analysis.documentTypeLabel || analysis.documentType || "Analyzed document"}
              </span>
              <span className="shrink-0 rounded-full border border-accent/30 px-2 py-0.5 text-[10px] text-accent">
                {analysis.confidence || 0}%
              </span>
            </div>
            <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
              {analysis.summary || (lang === "ar" ? "تم تحليل المستند وربطه بالطلب." : "Document analyzed and linked to request.")}
            </p>
            {fields.length ? (
              <div className="mt-2 grid gap-1">
                {fields.map(([key, value]) => (
                  <div key={key} className="flex justify-between gap-2 text-[10px]">
                    <span className="text-muted-foreground">{key}</span>
                    <span className="truncate text-foreground" title={String(value)}>{String(value)}</span>
                  </div>
                ))}
              </div>
            ) : null}
            {analysis.flags?.length ? (
              <div className="mt-2 flex flex-wrap gap-1">
                {analysis.flags.map((flag) => (
                  <span key={flag} className="rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[10px] text-warning">
                    {flag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
        <div className="mt-2 flex gap-2">
          <button
            onClick={() => {
              if (isImg && imageFailed) window.open(viewUrl, "_blank", "noopener,noreferrer");
              else setOpen(true);
            }}
            className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[10px] text-muted-foreground hover:text-foreground"
          >
            <Eye className="h-3 w-3" /> View
          </button>
          <a
            href={downloadUrl}
            className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[10px] text-muted-foreground hover:text-foreground"
          >
            <Download className="h-3 w-3" /> Download
          </a>
        </div>
      </div>
      {open ? (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 grid place-items-center bg-background/90 p-6 backdrop-blur"
        >
          <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-border bg-card">
            {isPdf ? (
              <iframe src={viewUrl} className="h-[85vh] w-full" title={doc.originalName} />
            ) : (
              <img src={viewUrl} alt={doc.originalName} className="max-h-[85vh] w-full object-contain" />
            )}
          </div>
        </div>
      ) : null}
    </li>
  );
}
