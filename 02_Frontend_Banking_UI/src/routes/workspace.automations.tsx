import { createFileRoute } from "@tanstack/react-router";
import { Workflow, Zap } from "lucide-react";
import { api } from "@/lib/api";
import { BackendGate } from "@/components/nexus/BackendGate";
import { StatusBadge } from "@/components/nexus/StatusBadge";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/workspace/automations")({
  component: Automations,
});

function Automations() {
  return <BackendGate>{(state) => <Body state={state} />}</BackendGate>;
}

function Body({ state }: { state: Awaited<ReturnType<typeof api.state>> }) {
  const { t, lang } = useLang();
  const runs = state.n8nWorkflowRuns || [];

  return (
    <div className="space-y-6">
      <section className="nexus-glass rounded-3xl p-6">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl nexus-aurora text-primary-foreground">
            <Workflow className="h-4 w-4" />
          </div>
          <h2 className="font-display text-lg font-semibold text-foreground">
            {t("automations")}
          </h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {lang === "ar"
            ? "تشغيلات سير عمل n8n المرتبطة بأحداث Nexus AI."
            : "n8n workflow runs triggered by Nexus AI events."}
        </p>
      </section>

      {runs.length === 0 ? (
        <div className="nexus-glass grid min-h-[30vh] place-items-center rounded-3xl">
          <div className="max-w-md p-6 text-center">
            <p className="text-sm font-medium text-foreground">
              {lang === "ar" ? "لا توجد تشغيلات بعد" : "No workflow runs yet."}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {lang === "ar"
                ? "ستظهر هنا تلقائياً عند إرسال طلب من العميل، رفع مستندات قرض، أو تسجيل قرار موظف."
                : "Runs appear here after a customer submits a request, uploads loan documents, or an officer records a decision."}
            </p>
          </div>
        </div>
      ) : (
        <ul className="grid gap-3">
          {runs.map((r, i) => (
            <li
              key={String(r.runId || i)}
              className="nexus-glass rounded-2xl p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-accent/15 text-accent">
                    <Zap className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-mono text-xs text-muted-foreground">
                      {String(r.workflowId || r.workflowKey || "n8n.workflow")}
                    </div>
                    <div className="text-sm text-foreground">
                      {String(r.eventType || "event")}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {r.correlationId ? `corr:${String(r.correlationId).slice(0, 10)}` : ""}
                  </span>
                  <StatusBadge status={String(r.status || "queued")} />
                </div>
              </div>
              {r.triggeredAt || r.requestedAt ? (
                <div className="mt-1 text-[10px] text-muted-foreground">
                  {new Date(String(r.triggeredAt || r.requestedAt)).toLocaleString()}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
