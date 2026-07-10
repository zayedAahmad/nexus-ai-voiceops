import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Gauge, PlayCircle, ShieldCheck, Sparkles, Users2, XCircle } from "lucide-react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { BackendGate } from "@/components/nexus/BackendGate";
import { useLang } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import { StatusBadge, RiskBadge } from "@/components/nexus/StatusBadge";

export const Route = createFileRoute("/workspace/committee")({
  component: Committee,
});

const scenarios = [
  {
    id: "payroll",
    en: "Why did customer 10452 not receive his salary?",
    ar: "ليش راتب العميل 10452 ما نزل؟",
    title: { en: "Payroll exception", ar: "استثناء رواتب" },
    lang: "en" as const,
  },
  {
    id: "card",
    en: "Why is customer 11880's card blocked?",
    ar: "ليش بطاقة العميل 11880 موقوفة؟",
    title: { en: "Card block review", ar: "مراجعة إيقاف بطاقة" },
    lang: "en" as const,
  },
  {
    id: "loan",
    en: "Can customer 10452 apply for a personal loan?",
    ar: "هل يقدر العميل 10452 يتقدم لقرض شخصي؟",
    title: { en: "Loan eligibility", ar: "أهلية القرض" },
    lang: "en" as const,
  },
];

const evaluationTitles: Record<string, { en: string; ar: string }> = {
  "perfect-loan": { en: "Perfect loan candidate", ar: "عميل قرض مثالي" },
  "high-risk": { en: "High-risk credit request", ar: "طلب ائتماني مرتفع المخاطر" },
  "missing-doc": { en: "Missing salary document", ar: "مستند راتب ناقص" },
  "fraud-transfer": { en: "Unusual transfer pattern", ar: "نمط تحويل غير معتاد" },
  "vip-policy": { en: "Complex VIP policy", ar: "سياسة عميل VIP معقدة" },
};

function Committee() {
  return <BackendGate>{() => <Body />}</BackendGate>;
}

function Body() {
  const { t, lang } = useLang();
  const { session } = useSession();
  const qc = useQueryClient();
  const [running, setRunning] = useState<string | null>(null);
  const [result, setResult] = useState<Awaited<ReturnType<typeof api.analyze>> | null>(null);
  const evaluations = useQuery({
    queryKey: ["agent-evaluations"],
    queryFn: api.agentEvaluations,
    refetchInterval: 30_000,
  });

  const analyze = useMutation({
    mutationFn: api.analyze,
    onSuccess: (data) => {
      setResult(data);
      qc.invalidateQueries({ queryKey: ["state"] });
    },
    onSettled: () => setRunning(null),
  });

  const run = (id: string, transcript: string) => {
    setRunning(id);
    setResult(null);
    analyze.mutate({
      transcript,
      mode: "employee",
      language: lang,
      actorName: session?.name || "Committee Demo",
      actorUserId: session?.userId,
    });
  };

  return (
    <div className="space-y-6">
      <section className="nexus-glass rounded-3xl p-6">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl nexus-aurora text-primary-foreground">
            <Users2 className="h-4 w-4" />
          </div>
          <h2 className="font-display text-lg font-semibold text-foreground">
            {t("committee")}
          </h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {lang === "ar"
            ? "سيناريوهات جاهزة لعرض القدرات أمام اللجنة الفنية."
            : "One-tap scenarios for the technical committee walkthrough."}
        </p>
      </section>

      <section className="nexus-glass rounded-3xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-accent">
              <ShieldCheck className="h-4 w-4" />
              {lang === "ar" ? "جاهزية نظام الوكلاء" : "Agent system readiness"}
            </div>
            <h3 className="mt-2 font-display text-xl font-semibold text-foreground">
              {lang === "ar"
                ? "اختبارات مصرفية قبل العرض"
                : "Pre-demo banking evaluations"}
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {lang === "ar"
                ? "كل سيناريو يتحقق من اختيار الوكلاء، الأدلة، اتساق القرار، وسلامة الرد الموجه للعميل."
                : "Each scenario verifies agent routing, evidence, decision consistency, and customer-safe output."}
            </p>
          </div>
          <div className="text-end">
            <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
              <Gauge className="h-4 w-4" />
              {lang === "ar" ? "درجة الجاهزية" : "Readiness score"}
            </div>
            <div className="mt-1 font-display text-4xl font-bold text-foreground">
              {evaluations.data ? `${evaluations.data.score}%` : "—"}
            </div>
          </div>
        </div>

        {evaluations.isError ? (
          <div className="mt-5 border-t border-border/60 pt-4 text-sm text-destructive">
            {lang === "ar"
              ? "تعذر تشغيل اختبارات الوكلاء. تأكد أن خادم Nexus يعمل."
              : "Agent evaluations could not run. Make sure the Nexus API is online."}
          </div>
        ) : null}

        {evaluations.data ? (
          <div className="mt-6">
            <div className="grid grid-cols-3 gap-3 border-y border-border/60 py-4 text-center">
              <div>
                <div className="text-xl font-semibold text-foreground">{evaluations.data.passed}/{evaluations.data.total}</div>
                <div className="text-xs text-muted-foreground">{lang === "ar" ? "سيناريو ناجح" : "Scenarios passed"}</div>
              </div>
              <div>
                <div className="text-xl font-semibold text-foreground">{evaluations.data.averageQuality}%</div>
                <div className="text-xs text-muted-foreground">{lang === "ar" ? "متوسط جودة القرار" : "Decision quality"}</div>
              </div>
              <div>
                <div className="text-xl font-semibold text-foreground">{evaluations.data.status === "ready" ? (lang === "ar" ? "جاهز" : "Ready") : (lang === "ar" ? "يحتاج مراجعة" : "Review")}</div>
                <div className="text-xs text-muted-foreground">{lang === "ar" ? "حالة العرض" : "Demo status"}</div>
              </div>
            </div>

            <div>
              {evaluations.data.scenarios.map((scenario) => (
                <div
                  key={scenario.id}
                  className="grid gap-3 border-b border-border/50 py-4 last:border-b-0 md:grid-cols-[1fr_auto_auto]"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    {scenario.passed ? (
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                    ) : (
                      <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                    )}
                    <div className="min-w-0">
                      <div className="font-medium text-foreground">
                        {evaluationTitles[scenario.id]?.[lang] || scenario.title}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {lang === "ar"
                          ? `العميل ${scenario.customerId} · ${scenario.selectedAgents.length} وكلاء`
                          : `Customer ${scenario.customerId} · ${scenario.selectedAgents.length} agents`}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {lang === "ar" ? "جودة القرار" : "Quality"}{" "}
                    <span className="font-semibold text-foreground">{scenario.qualityScore}%</span>
                  </div>
                  <div className="text-sm font-medium text-accent">
                    {scenario.passed ? (lang === "ar" ? "اجتاز" : "Passed") : (lang === "ar" ? "فشل" : "Failed")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : evaluations.isLoading ? (
          <div className="mt-5 h-24 animate-pulse rounded-lg bg-muted/30" />
        ) : null}
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        {scenarios.map((s) => (
          <button
            key={s.id}
            onClick={() => run(s.id, lang === "ar" ? s.ar : s.en)}
            disabled={running !== null}
            className="nexus-glass group rounded-3xl p-5 text-start transition hover:-translate-y-1 disabled:opacity-60"
          >
            <div className="flex items-center gap-2 text-xs text-accent">
              <Sparkles className="h-3.5 w-3.5" /> {lang === "ar" ? "سيناريو مباشر" : "Live scenario"}
            </div>
            <h3 className="mt-2 font-display text-base font-semibold text-foreground">
              {s.title[lang]}
            </h3>
            <p className="mt-2 line-clamp-3 text-xs text-muted-foreground">
              {lang === "ar" ? s.ar : s.en}
            </p>
            <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-accent">
              <PlayCircle className="h-4 w-4" />
              {running === s.id ? t("analyzing") : lang === "ar" ? "تشغيل" : "Run"}
            </div>
          </button>
        ))}
      </div>

      {result ? (
        <section className="nexus-glass rounded-3xl p-6 nexus-fade-in">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs text-accent">
              {String(result.analysis.intent || "—")}
            </span>
            <RiskBadge level={result.analysis.riskLevel} />
            <StatusBadge status={String(result.analysis.status || "complete")} />
            {typeof result.analysis.qualityScore === "number" ? (
              <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300">
                {lang === "ar" ? "جودة القرار" : "Decision quality"} {result.analysis.qualityScore}%
              </span>
            ) : null}
          </div>
          <h3 className="mt-4 font-display text-lg font-semibold text-foreground">
            {String(result.analysis.suggestedAction || result.analysis.recommendation || "—")}
          </h3>
          {result.analysis.decisionExplanation ? (
            <p className="mt-2 text-sm text-muted-foreground">
              {String(result.analysis.decisionExplanation)}
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
