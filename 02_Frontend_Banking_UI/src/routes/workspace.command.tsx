import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Ticket, Check, FileText, Radar } from "lucide-react";
import { api, type AnalyzeResponse } from "@/lib/api";
import { useLang } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import { BackendGate } from "@/components/nexus/BackendGate";
import { VoiceInput } from "@/components/nexus/VoiceInput";
import { StatusBadge, RiskBadge } from "@/components/nexus/StatusBadge";

export const Route = createFileRoute("/workspace/command")({
  component: CommandCenter,
});

const employeePrompts: Record<"en" | "ar", string[]> = {
  en: [
    "Why did customer 10452 not receive his salary?",
    "Why is customer 11880's card blocked?",
    "Does this customer need updated KYC?",
  ],
  ar: [
    "ليش راتب العميل 10452 ما نزل؟",
    "ليش بطاقة العميل 11880 موقوفة؟",
    "هل العميل بحاجة لتحديث وثائق KYC؟",
  ],
};

function CommandCenter() {
  return <BackendGate>{() => <Body />}</BackendGate>;
}

function Body() {
  const { t, lang } = useLang();
  const { session } = useSession();
  const qc = useQueryClient();
  const [transcript, setTranscript] = useState("");
  const [result, setResult] = useState<AnalyzeResponse | null>(null);

  const analyze = useMutation({
    mutationFn: api.analyze,
    onSuccess: (data) => {
      setResult(data);
      qc.invalidateQueries({ queryKey: ["state"] });
    },
  });
  const createTicket = useMutation({
    mutationFn: api.createTicket,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["state"] }),
  });
  const approve = useMutation({
    mutationFn: api.approve,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["state"] }),
  });

  const submit = () => {
    if (!transcript.trim() || !session) return;
    analyze.mutate({
      transcript,
      mode: "employee",
      language: lang,
      actorName: session.name,
      actorUserId: session.userId,
    });
  };

  const a = result?.analysis;
  const audit = result?.audit;

  return (
    <div className="space-y-6">
      <section className="nexus-glass rounded-3xl p-6 sm:p-8">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl nexus-aurora text-primary-foreground">
            <Radar className="h-4 w-4" />
          </div>
          <h2 className="font-display text-lg font-semibold text-foreground">
            {t("commandCenter")}
          </h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {lang === "ar"
            ? "استمع، حلّل، وقرّر — كل ذلك من مكان واحد."
            : "Listen, analyze and decide — all from one console."}
        </p>

        <div className="mt-5">
          <VoiceInput
            value={transcript}
            onChange={setTranscript}
            onSubmit={submit}
            loading={analyze.isPending}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground">{t("demoPrompts")}:</span>
          {employeePrompts[lang].map((p) => (
            <button
              key={p}
              onClick={() => setTranscript(p)}
              className="rounded-full border border-border bg-card/40 px-3 py-1 text-xs text-muted-foreground transition hover:border-accent/40 hover:text-foreground"
            >
              {p}
            </button>
          ))}
        </div>
      </section>

      {analyze.isError ? (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {(analyze.error as Error).message}
        </div>
      ) : null}

      {a && audit ? (
        <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr] nexus-fade-in">
          <div className="nexus-glass rounded-3xl p-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
                {String(a.intent || "—")}
              </span>
              <RiskBadge level={a.riskLevel} />
              <StatusBadge status={String(a.status || "complete")} />
              <div className="ms-auto font-mono text-xs text-muted-foreground">
                {String(a.model || "")}
              </div>
            </div>

            <h3 className="mt-4 font-display text-lg font-semibold text-foreground">
              {t("suggestedAction")}
            </h3>
            <p className="mt-1 text-sm text-foreground/90">
              {String(a.suggestedAction || a.recommendation || "—")}
            </p>

            {a.decisionExplanation ? (
              <p className="mt-3 text-sm text-muted-foreground">
                {String(a.decisionExplanation)}
              </p>
            ) : null}

            <div className="mt-5">
              <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
                <span>{t("confidence")}</span>
                <span className="font-mono">{Number(a.confidence || 0)}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full nexus-aurora"
                  style={{ width: `${Math.min(100, Number(a.confidence || 0))}%` }}
                />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <button
                onClick={() => createTicket.mutate({ auditId: audit.auditId })}
                disabled={createTicket.isPending}
                className="inline-flex items-center gap-2 rounded-full nexus-aurora px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40"
              >
                <Ticket className="h-4 w-4" /> {t("createTicket")}
              </button>
              <button
                onClick={() =>
                  approve.mutate({ auditId: audit.auditId, approver: session?.name })
                }
                disabled={approve.isPending}
                className="inline-flex items-center gap-2 rounded-full border border-success/40 bg-success/10 px-4 py-2 text-sm font-medium text-success disabled:opacity-40"
              >
                <Check className="h-4 w-4" /> {t("approve")}
              </button>
            </div>
          </div>

          <aside className="nexus-glass rounded-3xl p-6">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-accent" />
              <h4 className="font-display text-sm font-semibold text-foreground">
                {t("sources")}
              </h4>
            </div>
            <ul className="mt-3 space-y-2">
              {(a.sources || []).length === 0 ? (
                <li className="text-xs text-muted-foreground">—</li>
              ) : (
                a.sources!.map((s, i) => (
                  <li
                    key={i}
                    className="rounded-xl border border-border bg-card/40 p-3 text-xs"
                  >
                    <div className="font-medium text-foreground">{s.title}</div>
                    {s.section ? (
                      <div className="mt-0.5 text-muted-foreground">§ {s.section}</div>
                    ) : null}
                  </li>
                ))
              )}
            </ul>
          </aside>
        </section>
      ) : null}
    </div>
  );
}
