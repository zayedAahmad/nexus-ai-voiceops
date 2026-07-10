import { createFileRoute } from "@tanstack/react-router";
import { History, Ticket, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";
import type { AuditLog } from "@/lib/api";
import { BackendGate } from "@/components/nexus/BackendGate";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/workspace/audit")({
  component: Audit,
});

function Audit() {
  return <BackendGate>{(state) => <Body state={state} />}</BackendGate>;
}

function Body({ state }: { state: Awaited<ReturnType<typeof api.state>> }) {
  const { t, lang } = useLang();
  const audits = state.auditLogs || [];
  const tickets = state.tickets || [];
  const approvals = state.approvals || [];

  return (
    <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
      <section className="nexus-glass rounded-3xl p-6">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl nexus-aurora text-primary-foreground">
            <History className="h-4 w-4" />
          </div>
          <h2 className="font-display text-lg font-semibold text-foreground">
            {t("auditTrail")}
          </h2>
        </div>
        <ol className="relative mt-5 space-y-4 border-s border-border/60 ps-4">
          {audits.slice(0, 40).map((a) => (
            <li key={a.auditId} className="relative">
              <span className="absolute -start-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-accent" />
              <div className="rounded-2xl border border-border bg-card/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-mono text-[10px] text-muted-foreground">
                    #{a.auditId}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {new Date(a.timestamp).toLocaleString()}
                  </div>
                </div>
                <div className="mt-1 text-sm text-foreground">{a.actor}</div>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {a.transcript}
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
                  {a.intent ? (
                    <span className="rounded-full border border-border px-2 py-0.5 text-muted-foreground">
                      {a.intent}
                    </span>
                  ) : null}
                  {a.status ? (
                    <span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-accent">
                      {a.status}
                    </span>
                  ) : null}
                  {a.structuredAuditTrail ? (
                    <span className="rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-success">
                      JSON audit
                    </span>
                  ) : null}
                </div>
                <StructuredAuditPreview audit={a} lang={lang} />
              </div>
            </li>
          ))}
          {audits.length === 0 ? (
            <li className="text-sm text-muted-foreground">No events</li>
          ) : null}
        </ol>
      </section>

      <aside className="space-y-6">
        <div className="nexus-glass rounded-3xl p-6">
          <div className="flex items-center gap-2">
            <Ticket className="h-4 w-4 text-accent" />
            <h3 className="font-display text-sm font-semibold text-foreground">
              {t("tickets")} · {tickets.length}
            </h3>
          </div>
          <ul className="mt-3 space-y-2">
            {tickets.slice(0, 8).map((tk) => (
              <li
                key={tk.ticketId}
                className="rounded-xl border border-border bg-card/40 p-3 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-muted-foreground">
                    #{tk.ticketId}
                  </span>
                  <span className="rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[10px] text-warning">
                    {tk.priority}
                  </span>
                </div>
                <div className="mt-1 text-sm text-foreground">{tk.title}</div>
                <div className="mt-0.5 text-[10px] text-muted-foreground">
                  {tk.owner} · {tk.status}
                </div>
              </li>
            ))}
            {tickets.length === 0 ? (
              <li className="text-xs text-muted-foreground">No tickets yet</li>
            ) : null}
          </ul>
        </div>

        <div className="nexus-glass rounded-3xl p-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-success" />
            <h3 className="font-display text-sm font-semibold text-foreground">
              {t("approvals")} · {approvals.length}
            </h3>
          </div>
          <ul className="mt-3 space-y-2">
            {approvals.slice(0, 8).map((ap) => (
              <li
                key={ap.approvalId}
                className="rounded-xl border border-border bg-card/40 p-3 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-muted-foreground">
                    #{ap.approvalId}
                  </span>
                  <span className="rounded-full border border-success/40 bg-success/10 px-2 py-0.5 text-[10px] text-success">
                    {ap.decision}
                  </span>
                </div>
                <div className="mt-1 text-sm text-foreground">{ap.approver}</div>
                <div className="mt-0.5 text-[10px] text-muted-foreground">{ap.note}</div>
              </li>
            ))}
            {approvals.length === 0 ? (
              <li className="text-xs text-muted-foreground">No approvals yet</li>
            ) : null}
          </ul>
        </div>
      </aside>
    </div>
  );
}

function StructuredAuditPreview({ audit, lang }: { audit: AuditLog; lang: "en" | "ar" }) {
  const trail = audit.structuredAuditTrail;
  if (!trail) return null;

  const isAr = lang === "ar";
  return (
    <div className="mt-3 rounded-2xl border border-border/70 bg-background/35 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">
            {isAr ? "حوكمة القرار" : "Decision governance"}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {trail.systemDirectiveVersion} · {trail.schemaVersion}
          </div>
        </div>
        <span className="rounded-full border border-border px-2 py-1 font-mono text-[10px] text-muted-foreground">
          {audit.correlationId || trail.correlationId}
        </span>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {trail.stages.slice(0, 4).map((stage) => (
          <div key={stage.phase} className="rounded-xl border border-border/70 bg-card/35 p-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-foreground">{stage.phase}</span>
              <span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[10px] text-accent">
                {stage.status}
              </span>
            </div>
            {stage.summary ? (
              <p className="mt-1 line-clamp-2 text-[10px] text-muted-foreground">{stage.summary}</p>
            ) : null}
          </div>
        ))}
      </div>

      <details className="mt-3">
        <summary className="cursor-pointer text-xs font-semibold text-accent">
          {isAr ? "عرض JSON الكامل" : "View full JSON"}
        </summary>
        <pre className="mt-2 max-h-72 overflow-auto rounded-xl border border-border bg-background/70 p-3 text-[10px] text-muted-foreground">
          {JSON.stringify(trail, null, 2)}
        </pre>
      </details>
    </div>
  );
}
