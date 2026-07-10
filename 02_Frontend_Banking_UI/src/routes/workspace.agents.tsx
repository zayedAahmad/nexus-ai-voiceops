import { createFileRoute } from "@tanstack/react-router";
import { Cpu, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { api } from "@/lib/api";
import {
  agentStatus,
  gateLabel,
  intentLabel,
  orchestrationPattern,
  traceDetail,
  traceStepLabel,
} from "@/lib/agent-i18n";
import { BackendGate } from "@/components/nexus/BackendGate";
import { AgentPipeline } from "@/components/nexus/AgentPipeline";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/workspace/agents")({
  component: Agents,
});

function Agents() {
  return <BackendGate>{(state) => <Body state={state} />}</BackendGate>;
}

function Body({ state }: { state: Awaited<ReturnType<typeof api.state>> }) {
  const { t, lang } = useLang();
  const audits = (state.auditLogs || []).filter(
    (audit) =>
      Boolean(audit.trace?.length) ||
      Boolean(audit.agentReports?.length) ||
      Boolean(audit.agentOrchestration?.agentReports?.length),
  );
  const latest = audits[0];
  const reports =
    latest?.agentReports || latest?.agentOrchestration?.agentReports || [];
  const trace = latest?.trace || [];

  return (
    <div className="space-y-6">
      <section className="nexus-glass rounded-3xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl nexus-aurora text-primary-foreground">
              <Cpu className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground">{t("agentsTrace")}</h2>
              <p className="text-xs text-muted-foreground">
                {lang === "ar"
                  ? "خط اتخاذ القرار: المنسق ← المتخصصون ← المحسّن ← المقيّم."
                  : "Decision pipeline: Orchestrator → Specialists → Optimizer → Evaluator."}
              </p>
            </div>
          </div>
          {latest ? (
            <div className="flex flex-wrap gap-2 text-[11px]">
              {latest.agentOrchestration ? (
                <>
                  <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-accent">
                    {orchestrationPattern(latest.agentOrchestration.pattern, lang)}
                  </span>
                  <span className="rounded-full border border-border px-3 py-1 text-muted-foreground">
                    {lang === "ar" ? "المسار" : "Route"}: {intentLabel(latest.agentOrchestration.activeRoute, lang)}
                  </span>
                  <span className="rounded-full border border-success/30 bg-success/10 px-3 py-1 text-success">
                    {lang === "ar" ? "البوابة" : "Gate"}: {gateLabel(latest.agentOrchestration.finalGate, lang)}
                  </span>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      {latest ? (
        <>
          <section className="nexus-glass rounded-3xl p-6">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-mono">#{latest.auditId}</span>
              <span>{new Date(latest.timestamp).toLocaleString(lang === "ar" ? "ar-JO" : "en-JO")}</span>
            </div>
            <h3 className="mt-2 font-display text-base font-semibold text-foreground">
              {intentLabel(latest.intent, lang)}
              {latest.model ? <span className="ms-2 font-mono text-xs text-muted-foreground">· {latest.model}</span> : null}
            </h3>

            <div className="mt-5">
              <AgentPipeline
                reports={reports}
                orchestration={latest.agentOrchestration}
                lang={lang}
              />
            </div>
          </section>

          {trace.length ? (
            <section className="nexus-glass rounded-3xl p-6">
              <h4 className="font-display text-sm font-semibold text-foreground">
                {lang === "ar" ? "سجل الأحداث الزمني" : "Event timeline"}
              </h4>
              <ol className="mt-4 space-y-1 border-s border-border/60 ps-4">
                {trace.map((step, index) => {
                  const ok = step.status === "complete" || step.status === "ok";
                  return (
                    <li key={`${step.step}-${index}`} className="relative py-3">
                      <span
                        className={`absolute -start-[21px] top-4 grid h-3.5 w-3.5 place-items-center rounded-full ${
                          ok ? "bg-success/20 text-success" : "bg-warning/20 text-warning"
                        }`}
                      >
                        {ok ? <CheckCircle2 className="h-2.5 w-2.5" /> : <AlertCircle className="h-2.5 w-2.5" />}
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-accent">
                          {traceStepLabel(step.step, lang)}
                        </span>
                        <span className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] text-muted-foreground">
                          {agentStatus(step.status, lang)}
                        </span>
                        <span className="ms-auto font-mono text-[10px] text-muted-foreground">
                          T+{index * 40}ms
                        </span>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-foreground/85">
                        {traceDetail(step.detail, step.step, lang)}
                      </p>
                    </li>
                  );
                })}
              </ol>
            </section>
          ) : null}
        </>
      ) : (
        <div className="nexus-glass grid min-h-[40vh] place-items-center rounded-3xl p-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            {lang === "ar"
              ? "لا يوجد مسار بعد. شغّل تحليلًا من مركز الأوامر."
              : "No trace yet. Run an analysis in Command Center."}
          </div>
        </div>
      )}
    </div>
  );
}
