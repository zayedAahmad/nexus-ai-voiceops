import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  CircleDot,
  Clock3,
  FileCheck2,
  Filter,
  RadioTower,
  Search,
  Send,
  ShieldCheck,
  UserRound,
  Workflow,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { api, type N8nRun } from "@/lib/api";
import { BackendGate } from "@/components/nexus/BackendGate";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/workspace/automations")({
  component: Automations,
});

type Lang = "en" | "ar";
type FilterKey = "all" | "request" | "documents" | "decision" | "alert";

const workflowMeta: Record<
  string,
  {
    icon: LucideIcon;
    tone: string;
    en: { title: string; event: string; description: string; owner: string };
    ar: { title: string; event: string; description: string; owner: string };
  }
> = {
  customer_request_router: {
    icon: Send,
    tone: "text-accent bg-accent/15 border-accent/25",
    en: {
      title: "Customer request router",
      event: "Request sent to bank",
      description: "Routes a customer request to the correct operations queue.",
      owner: "Service Operations",
    },
    ar: {
      title: "توجيه طلب العميل",
      event: "تم إرسال طلب للبنك",
      description: "يوجه طلب العميل إلى القسم التشغيلي المناسب.",
      owner: "عمليات الخدمات",
    },
  },
  loan_documents_intake: {
    icon: FileCheck2,
    tone: "text-gold bg-gold/15 border-gold/25",
    en: {
      title: "Loan document intake",
      event: "Documents received",
      description: "Packages uploaded loan files for credit operations review.",
      owner: "Credit Operations",
    },
    ar: {
      title: "استلام مستندات القرض",
      event: "تم استلام المستندات",
      description: "يجمع مستندات القرض المرفوعة ويربطها بطلب الائتمان.",
      owner: "عمليات الائتمان",
    },
  },
  loan_decision_notification: {
    icon: BellRing,
    tone: "text-success bg-success/15 border-success/25",
    en: {
      title: "Decision notification",
      event: "Decision recorded",
      description: "Notifies the customer workflow after an officer decision.",
      owner: "Customer Notifications",
    },
    ar: {
      title: "إشعار قرار الطلب",
      event: "تم تسجيل القرار",
      description: "يرسل تحديث حالة الطلب بعد قرار الموظف.",
      owner: "إشعارات العملاء",
    },
  },
  operations_alert: {
    icon: AlertTriangle,
    tone: "text-warning bg-warning/15 border-warning/25",
    en: {
      title: "Operations alert",
      event: "Human review required",
      description: "Escalates high-risk or ambiguous AI outcomes to a human supervisor.",
      owner: "Risk and Operations",
    },
    ar: {
      title: "تنبيه العمليات",
      event: "مراجعة بشرية مطلوبة",
      description: "يصعد الحالات عالية المخاطر أو غير الحاسمة إلى مشرف بشري.",
      owner: "المخاطر والعمليات",
    },
  },
};

const filterLabels: Record<FilterKey, { en: string; ar: string }> = {
  all: { en: "All runs", ar: "كل التشغيلات" },
  request: { en: "Requests", ar: "الطلبات" },
  documents: { en: "Documents", ar: "المستندات" },
  decision: { en: "Decisions", ar: "القرارات" },
  alert: { en: "Alerts", ar: "التنبيهات" },
};

function Automations() {
  return <BackendGate>{(state) => <Body state={state} />}</BackendGate>;
}

function Body({ state }: { state: Awaited<ReturnType<typeof api.state>> }) {
  const { lang } = useLang();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");

  const runs = useMemo(
    () =>
      [...(state.n8nWorkflowRuns || [])].sort(
        (a, b) => timestampOf(b) - timestampOf(a),
      ),
    [state.n8nWorkflowRuns],
  );

  const filteredRuns = useMemo(() => {
    const q = query.trim().toLowerCase();
    return runs.filter((run) => {
      const bucket = bucketOf(run);
      const matchesFilter = filter === "all" || bucket === filter;
      const haystack = [
        run.workflowKey,
        run.workflowId,
        run.workflowName,
        run.eventType,
        run.correlationId,
        payloadText(run),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return matchesFilter && (!q || haystack.includes(q));
    });
  }, [filter, query, runs]);

  const metrics = {
    total: runs.length,
    queued: runs.filter((run) => String(run.status || "").includes("queued")).length,
    decisions: runs.filter((run) => bucketOf(run) === "decision").length,
    documents: runs.filter((run) => bucketOf(run) === "documents").length,
  };

  return (
    <div className="space-y-6">
      <section className="nexus-bankcard p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl nexus-aurora text-primary-foreground">
              <Workflow className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-accent">
                {lang === "ar" ? "طبقة التشغيل الخارجية" : "External operations layer"}
              </p>
              <h2 className="mt-1 font-display text-2xl font-semibold text-foreground">
                {lang === "ar" ? "مركز أتمتة n8n" : "n8n Automation Center"}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                {lang === "ar"
                  ? "هنا تظهر كل عملية تشغيل خارجية أنشأها Nexus AI: إرسال طلب، استقبال مستندات، تسجيل قرار، أو تصعيد لموظف."
                  : "Every external automation generated by Nexus AI appears here: request routing, document intake, decision notification, and human escalation."}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[420px]">
            <Metric label={lang === "ar" ? "الإجمالي" : "Total"} value={metrics.total} />
            <Metric label={lang === "ar" ? "قيد الإرسال" : "Queued"} value={metrics.queued} />
            <Metric label={lang === "ar" ? "قرارات" : "Decisions"} value={metrics.decisions} />
            <Metric label={lang === "ar" ? "مستندات" : "Documents"} value={metrics.documents} />
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded-3xl border border-border bg-card/35 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-border bg-background/35 px-3 py-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={lang === "ar" ? "ابحث باسم العميل، رقم الطلب، أو correlation id" : "Search customer, request, or correlation id"}
                className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(filterLabels) as FilterKey[]).map((key) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium transition ${
                    filter === key
                      ? "border-accent/50 bg-accent/15 text-accent"
                      : "border-border bg-card/40 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Filter className="h-3.5 w-3.5" />
                  {filterLabels[key][lang]}
                </button>
              ))}
            </div>
          </div>

          {filteredRuns.length === 0 ? (
            <div className="nexus-glass grid min-h-[32vh] place-items-center rounded-3xl">
              <div className="max-w-md p-6 text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-accent/15 text-accent">
                  <RadioTower className="h-5 w-5" />
                </div>
                <p className="mt-4 text-sm font-medium text-foreground">
                  {lang === "ar" ? "لا توجد تشغيلات مطابقة" : "No matching workflow runs"}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {lang === "ar"
                    ? "غيّر الفلتر أو أرسل طلباً جديداً من بوابة العميل حتى يظهر هنا."
                    : "Adjust the filter or submit a new customer request to generate an automation run."}
                </p>
              </div>
            </div>
          ) : (
            <ol className="space-y-3">
              {filteredRuns.map((run, index) => (
                <AutomationRunCard
                  key={String(run.runId || `${run.workflowId}-${index}`)}
                  run={run}
                  lang={lang}
                  index={index}
                />
              ))}
            </ol>
          )}
        </div>

        <aside className="space-y-4">
          <section className="nexus-glass rounded-3xl p-5">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-success/15 text-success">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-base font-semibold text-foreground">
                  {lang === "ar" ? "لماذا هذه الصفحة مهمة؟" : "Why this matters"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {lang === "ar" ? "تثبت أن القرار لا يبقى داخل الذكاء الاصطناعي فقط." : "Shows AI decisions becoming bank operations."}
                </p>
              </div>
            </div>
            <div className="mt-5 space-y-3 text-sm leading-6 text-muted-foreground">
              <ValueLine
                lang={lang}
                en="Every run has a correlation ID for audit."
                ar="كل تشغيل له Correlation ID للتدقيق."
              />
              <ValueLine
                lang={lang}
                en="Payloads are prepared without exposing raw credentials."
                ar="يتم تجهيز الـ payload بدون كشف بيانات اعتماد حساسة."
              />
              <ValueLine
                lang={lang}
                en="High-risk decisions can be escalated to employees."
                ar="القرارات عالية المخاطر يمكن تصعيدها للموظف."
              />
            </div>
          </section>

          <section className="rounded-3xl border border-gold/25 bg-gold/10 p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-gold">
              {lang === "ar" ? "جملة للعرض" : "Demo line"}
            </p>
            <p className="mt-3 text-sm leading-6 text-foreground">
              {lang === "ar"
                ? "هذه الصفحة توضح كيف يتحول قرار الوكلاء إلى إجراء بنكي قابل للتتبع: طلب، مستندات، قرار، أو تنبيه عمليات."
                : "This page shows how an agent decision becomes a traceable banking action: request, documents, decision, or operations alert."}
            </p>
          </section>
        </aside>
      </section>
    </div>
  );
}

function AutomationRunCard({ run, lang, index }: { run: N8nRun; lang: Lang; index: number }) {
  const workflowKey = String(run.workflowKey || "").trim();
  const meta = workflowMeta[workflowKey] || fallbackMeta(run);
  const Icon = meta.icon;
  const copy = meta[lang];
  const payload = safePayload(run);
  const customerName = readPath(payload, ["customer", "name"]) || "Omar Haddad";
  const customerId = readPath(payload, ["customer", "customer_id"]) || readPath(payload, ["customerId"]) || "10452";
  const requestId = readPath(payload, ["request", "request_id"]) || readPath(payload, ["requestId"]) || "REQ-DEMO";
  const requestType = readPath(payload, ["request", "request_type"]) || readPath(payload, ["audit_context", "intent"]) || String(run.eventType || "banking_event");
  const responseMessage = readPath(run.responseBody as Record<string, unknown>, ["message"]) || (lang === "ar" ? "تم تجهيز التشغيل في وضع العرض." : "Workflow run prepared in demo mode.");
  const status = String(run.status || "queued");

  return (
    <li className="nexus-bankcard p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 gap-4">
          <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl border ${meta.tone}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-border bg-background/40 px-2.5 py-1 font-mono text-[10px] text-muted-foreground">
                #{String(index + 1).padStart(2, "0")}
              </span>
              <StatusPill status={status} lang={lang} />
            </div>
            <h3 className="mt-3 font-display text-lg font-semibold text-foreground">
              {copy.event}
            </h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {copy.description}
            </p>
            <p className="mt-2 font-mono text-xs text-accent">
              {String(run.workflowId || run.workflowKey || "nexus.workflow")}
            </p>
          </div>
        </div>

        <div className="text-start lg:text-end">
          <p className="text-xs text-muted-foreground">{formatDate(run, lang)}</p>
          <p className="mt-1 text-sm font-medium text-foreground">{copy.title}</p>
          <p className="text-xs text-muted-foreground">{copy.owner}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 border-t border-border/70 pt-4 md:grid-cols-4">
        <DetailCell
          icon={UserRound}
          label={lang === "ar" ? "العميل" : "Customer"}
          value={`${customerName} · ${customerId}`}
        />
        <DetailCell
          icon={CircleDot}
          label={lang === "ar" ? "الطلب" : "Request"}
          value={String(requestId)}
        />
        <DetailCell
          icon={Workflow}
          label={lang === "ar" ? "نوع العملية" : "Event type"}
          value={humanEvent(String(run.eventType || requestType), lang)}
        />
        <DetailCell
          icon={Zap}
          label={lang === "ar" ? "Correlation" : "Correlation"}
          value={shortCorrelation(run.correlationId)}
        />
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-background/25 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {lang === "ar" ? "نتيجة التشغيل" : "Workflow result"}
          </p>
          <span className="font-mono text-[10px] text-muted-foreground">
            {webhookUrl(run)}
          </span>
        </div>
        <p className="mt-2 text-sm leading-6 text-foreground">{String(responseMessage)}</p>
      </div>
    </li>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-background/30 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

function DetailCell({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-1 truncate text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function ValueLine({ en, ar, lang }: { en: string; ar: string; lang: Lang }) {
  return (
    <div className="flex gap-2">
      <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-success" />
      <span>{lang === "ar" ? ar : en}</span>
    </div>
  );
}

function StatusPill({ status, lang }: { status: string; lang: Lang }) {
  const normalized = status.toLowerCase();
  const queued = normalized.includes("queued") || normalized.includes("pending");
  const success = normalized.includes("success") || normalized.includes("sent") || normalized.includes("complete");
  const Icon = queued ? Clock3 : success ? CheckCircle2 : CircleDot;
  const label =
    lang === "ar"
      ? queued
        ? "جاهز للإرسال"
        : success
          ? "تم التنفيذ"
          : status
      : queued
        ? "Queued"
        : success
          ? "Completed"
          : status;
  const tone = queued
    ? "border-warning/35 bg-warning/10 text-warning"
    : success
      ? "border-success/35 bg-success/10 text-success"
      : "border-border bg-muted/30 text-muted-foreground";

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${tone}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

function fallbackMeta(run: N8nRun) {
  return {
    icon: Workflow,
    tone: "text-accent bg-accent/15 border-accent/25",
    en: {
      title: String(run.workflowName || run.workflowId || "Banking workflow"),
      event: humanEvent(String(run.eventType || "workflow_event"), "en"),
      description: "Executes an external banking workflow with audit context.",
      owner: "Nexus Operations",
    },
    ar: {
      title: String(run.workflowName || run.workflowId || "سير عمل بنكي"),
      event: humanEvent(String(run.eventType || "workflow_event"), "ar"),
      description: "ينفذ سير عمل خارجي مرتبط بسجل التدقيق.",
      owner: "عمليات Nexus",
    },
  };
}

function bucketOf(run: N8nRun): FilterKey {
  const text = `${run.workflowKey || ""} ${run.workflowId || ""} ${run.eventType || ""}`.toLowerCase();
  if (text.includes("document")) return "documents";
  if (text.includes("decision")) return "decision";
  if (text.includes("alert") || text.includes("review")) return "alert";
  if (text.includes("request")) return "request";
  return "request";
}

function timestampOf(run: N8nRun) {
  const date = new Date(String(run.triggeredAt || run.requestedAt || ""));
  return Number.isFinite(date.getTime()) ? date.getTime() : 0;
}

function formatDate(run: N8nRun, lang: Lang) {
  const date = new Date(String(run.triggeredAt || run.requestedAt || ""));
  if (!Number.isFinite(date.getTime())) return lang === "ar" ? "بدون وقت" : "No timestamp";
  return date.toLocaleString(lang === "ar" ? "ar-JO" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function safePayload(run: N8nRun): Record<string, unknown> {
  return run.payload && typeof run.payload === "object" && !Array.isArray(run.payload)
    ? (run.payload as Record<string, unknown>)
    : {};
}

function readPath(source: Record<string, unknown> | undefined, path: string[]) {
  let current: unknown = source;
  for (const part of path) {
    if (!current || typeof current !== "object" || !(part in current)) return "";
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" || typeof current === "number" ? String(current) : "";
}

function webhookUrl(run: N8nRun) {
  const webhook = run.webhook;
  if (webhook && typeof webhook === "object" && !Array.isArray(webhook)) {
    const value = (webhook as Record<string, unknown>).url;
    if (typeof value === "string" && value) return value;
  }
  return "sandbox://n8n/webhook";
}

function payloadText(run: N8nRun) {
  try {
    return JSON.stringify(run.payload || {});
  } catch {
    return "";
  }
}

function shortCorrelation(value?: string) {
  if (!value) return "CORR-DEMO";
  const text = String(value);
  return text.length > 18 ? `${text.slice(0, 9)}…${text.slice(-6)}` : text;
}

function humanEvent(event: string, lang: Lang) {
  const key = event.toLowerCase();
  if (key.includes("service_request")) return lang === "ar" ? "طلب خدمة جديد" : "New service request";
  if (key.includes("documents")) return lang === "ar" ? "رفع مستندات" : "Documents uploaded";
  if (key.includes("decision")) return lang === "ar" ? "تسجيل قرار" : "Decision recorded";
  if (key.includes("review")) return lang === "ar" ? "مراجعة بشرية" : "Human review";
  return event.replaceAll("_", " ");
}
