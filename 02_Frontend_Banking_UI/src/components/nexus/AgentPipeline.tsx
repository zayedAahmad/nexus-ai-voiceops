import {
  Compass,
  Users,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  ChevronRight,
} from "lucide-react";
import type { AgentReport, AgentOrchestration } from "@/lib/api";
import {
  agentName,
  agentOutput,
  agentRole,
  agentSignal,
  localizedEvidence,
  type AgentLang,
} from "@/lib/agent-i18n";

type Stage = "orchestrator" | "specialists" | "optimizer" | "evaluator";

interface StageMeta {
  id: Stage;
  icon: React.ComponentType<{ className?: string }>;
  title: { en: string; ar: string };
  subtitle: { en: string; ar: string };
  accent: string;
}

const STAGES: StageMeta[] = [
  {
    id: "orchestrator",
    icon: Compass,
    title: { en: "Orchestrator", ar: "المنسق" },
    subtitle: { en: "Routes request", ar: "يوجه الطلب" },
    accent: "text-accent",
  },
  {
    id: "specialists",
    icon: Users,
    title: { en: "Specialists", ar: "المتخصصون" },
    subtitle: { en: "Domain analysis", ar: "التحليل التخصصي" },
    accent: "text-primary-foreground",
  },
  {
    id: "optimizer",
    icon: Sparkles,
    title: { en: "Optimizer", ar: "المحسّن" },
    subtitle: { en: "Customer-safe response", ar: "صياغة رد العميل" },
    accent: "text-gold",
  },
  {
    id: "evaluator",
    icon: ShieldCheck,
    title: { en: "Evaluator", ar: "المقيّم" },
    subtitle: { en: "Quality gate", ar: "بوابة الجودة" },
    accent: "text-success",
  },
];

function categorize(report: AgentReport): Stage {
  const id = (report.agentId || report.agent || "").toLowerCase();
  if (id.includes("orchestr")) return "orchestrator";
  if (id.includes("evaluat")) return "evaluator";
  if (id.includes("optimiz") || id.includes("customersafety") || id.includes("safety")) return "optimizer";
  return "specialists";
}

function stageStatus(reports: AgentReport[]): "complete" | "warning" | "pending" {
  if (!reports.length) return "pending";
  if (reports.some((r) => (r.status || "").toLowerCase() === "warning" || (r.status || "").toLowerCase().includes("fail"))) return "warning";
  return "complete";
}

function avgConfidence(reports: AgentReport[]): number | null {
  const nums = reports.map((r) => r.confidence).filter((n): n is number => typeof n === "number");
  if (!nums.length) return null;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

export function AgentPipeline({
  reports,
  orchestration,
  lang,
  compact = false,
}: {
  reports: AgentReport[];
  orchestration?: AgentOrchestration | null;
  lang: AgentLang;
  compact?: boolean;
}) {
  const grouped: Record<Stage, AgentReport[]> = {
    orchestrator: [],
    specialists: [],
    optimizer: [],
    evaluator: [],
  };
  reports.forEach((r) => grouped[categorize(r)].push(r));

  const quality = orchestration?.qualityScore;

  return (
    <div className="space-y-5">
      {/* Rail */}
      <div className="grid gap-3 md:grid-cols-4">
        {STAGES.map((stage, idx) => {
          const stageReports = grouped[stage.id];
          const status = stageStatus(stageReports);
          const conf = avgConfidence(stageReports);
          const Icon = stage.icon;
          const tone =
            status === "complete"
              ? "border-success/40"
              : status === "warning"
                ? "border-warning/40"
                : "border-border";
          return (
            <div key={stage.id} className="relative">
              <div className={`nexus-pipe-node p-4 ${tone}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className={`grid h-8 w-8 place-items-center rounded-lg bg-background/60 ${stage.accent}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                        {String(idx + 1).padStart(2, "0")}
                      </div>
                      <div className="text-sm font-semibold text-foreground">
                        {stage.title[lang]}
                      </div>
                    </div>
                  </div>
                  {status === "complete" ? (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  ) : status === "warning" ? (
                    <AlertTriangle className="h-4 w-4 text-warning" />
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                  )}
                </div>
                <div className="mt-2 text-[11px] text-muted-foreground">
                  {stage.subtitle[lang]}
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">
                    {stageReports.length} {lang === "ar" ? "وكيل" : stageReports.length === 1 ? "agent" : "agents"}
                  </span>
                  {conf !== null ? (
                    <span className="font-mono font-semibold text-foreground">{conf}%</span>
                  ) : null}
                </div>
              </div>
              {idx < STAGES.length - 1 ? (
                <ChevronRight
                  className={`absolute top-1/2 -end-2 hidden h-4 w-4 -translate-y-1/2 text-muted-foreground/50 md:block ${lang === "ar" ? "rotate-180" : ""}`}
                />
              ) : null}
            </div>
          );
        })}
      </div>

      {typeof quality === "number" ? (
        <QualityBar score={quality} lang={lang} checks={orchestration?.qualityChecks?.length} />
      ) : null}

      {compact ? null : (
        <div className="space-y-4">
          {STAGES.map((stage) => {
            const items = grouped[stage.id];
            if (!items.length) return null;
            return (
              <div key={stage.id} className="nexus-pipe-node p-4">
                <div className="mb-3 flex items-center gap-2">
                  <stage.icon className={`h-3.5 w-3.5 ${stage.accent}`} />
                  <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    {stage.title[lang]}
                  </h4>
                </div>
                <div className="divide-y divide-border/60">
                  {items.map((r, i) => (
                    <AgentRow key={`${r.agentId || r.agent}-${i}`} report={r} lang={lang} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AgentRow({ report, lang }: { report: AgentReport; lang: AgentLang }) {
  const evidence = report.evidence || report.findings || [];
  const status = (report.status || "").toLowerCase();
  const warn = status === "warning" || status.includes("fail");
  return (
    <div className="grid gap-2 py-3 sm:grid-cols-[160px_1fr_auto] sm:gap-4">
      <div>
        <div className="flex items-center gap-1.5">
          {warn ? (
            <AlertTriangle className="h-3 w-3 text-warning" />
          ) : (
            <CheckCircle2 className="h-3 w-3 text-success" />
          )}
          <span className="text-xs font-semibold text-foreground">
            {agentName(report.agentId || report.agent, lang)}
          </span>
        </div>
        <div className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
          {agentRole(report, lang)}
        </div>
      </div>
      <div className="min-w-0">
        <p className="text-xs leading-relaxed text-foreground/90">{agentOutput(report, lang)}</p>
        {evidence.length ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {evidence.slice(0, 4).map((item, i) => (
              <span
                key={`${item}-${i}`}
                className="rounded-full border border-border/60 px-2 py-0.5 font-mono text-[10px] text-muted-foreground"
              >
                {localizedEvidence(item, lang)}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <div className="text-end">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
          {agentSignal(report.signal || report.verdict || report.status, lang)}
        </div>
        {typeof report.confidence === "number" ? (
          <div className="mt-1 font-mono text-sm font-semibold text-foreground">{report.confidence}%</div>
        ) : null}
      </div>
    </div>
  );
}

function QualityBar({ score, lang, checks }: { score: number; lang: AgentLang; checks?: number }) {
  const tone =
    score >= 90
      ? "from-success to-accent"
      : score >= 70
        ? "from-warning to-accent"
        : "from-destructive to-warning";
  return (
    <div className="nexus-pipe-node p-4">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Cpu className="h-3.5 w-3.5 text-gold" />
          <span className="font-semibold uppercase tracking-widest text-muted-foreground">
            {lang === "ar" ? "درجة جودة القرار" : "Decision quality"}
          </span>
          {typeof checks === "number" ? (
            <span className="text-[10px] text-muted-foreground">
              · {checks} {lang === "ar" ? "فحص" : "checks"}
            </span>
          ) : null}
        </div>
        <span className="font-mono text-lg font-semibold text-foreground">{score}%</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted/50">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${tone}`}
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        />
      </div>
    </div>
  );
}
