import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Paperclip,
  Send,
  FileText,
  ImageIcon,
  X,
  Sparkles,
  ChevronDown,
  MessageSquareText,
  Clock3,
  WalletCards,
  CreditCard,
  Landmark,
  ShieldCheck,
  BadgeDollarSign,
  RefreshCw,
} from "lucide-react";
import { api, fileToDataUrl, type ServiceRequest } from "@/lib/api";
import { useLang } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import { TopBar, OrbitalArt } from "@/components/nexus/Shell";
import { BackendGate } from "@/components/nexus/BackendGate";
import { VoiceInput } from "@/components/nexus/VoiceInput";
import { StatusBadge } from "@/components/nexus/StatusBadge";

export const Route = createFileRoute("/portal")({
  head: () => ({
    meta: [
      { title: "Customer Portal — Nexus AI VoiceOps" },
      { name: "description", content: "Private voice banking portal for salary, loans, cards, and transfer support." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PortalPage,
});

const demoPrompts: Record<"en" | "ar", string[]> = {
  en: [
    "Why didn't my salary arrive this month?",
    "Can I apply for a personal loan?",
    "Why is my card blocked?",
    "Do I need to update my KYC documents?",
  ],
  ar: [
    "لماذا لم يصل راتبي هذا الشهر؟",
    "هل أقدر أقدم على قرض شخصي؟",
    "لماذا بطاقتي موقوفة؟",
    "هل أحتاج أحدث وثائق KYC؟",
  ],
};

function PortalPage() {
  const router = useRouter();
  const { session, ready } = useSession();
  const { t, lang } = useLang();

  useEffect(() => {
    if (!ready) return;
    if (!session) router.navigate({ to: "/login", search: { role: "customer" } });
    else if (session.role !== "customer") router.navigate({ to: "/workspace/command" });
  }, [ready, session, router]);

  if (!ready || !session) return null;

  return (
    <div className="relative min-h-screen nexus-ambient">
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <OrbitalArt />
      </div>
      <div className="relative z-10">
        <TopBar
          title={`${t("greeting")}, ${session.name.split(" ")[0]}`}
          subtitle={
            session.customerId
              ? `${lang === "ar" ? "رقم العميل" : "Customer"} #${session.customerId}`
              : t("customerPortal")
          }
        />
        <BackendGate>{(state) => <PortalBody state={state} />}</BackendGate>
      </div>
    </div>
  );
}

function PortalBody({ state }: { state: Awaited<ReturnType<typeof api.state>> }) {
  const { t, lang } = useLang();
  const { session } = useSession();
  const qc = useQueryClient();
  const [transcript, setTranscript] = useState("");
  const [reply, setReply] = useState<{
    text: string;
    auditId?: string;
    requestType?: string;
  } | null>(null);
  const [note, setNote] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [documentStatus, setDocumentStatus] = useState<string | null>(null);
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);
  const customer = useMemo(
    () => (state.customers || []).find((c) => c.customerId === session?.customerId),
    [state.customers, session?.customerId],
  );
  const account = useMemo(
    () => ((state as any).bankAccounts || []).find((a: any) => a.customerId === session?.customerId),
    [state, session?.customerId],
  );
  const card = useMemo(
    () => ((state as any).cards || []).find((c: any) => c.customerId === session?.customerId),
    [state, session?.customerId],
  );
  const kyc = useMemo(
    () => ((state as any).kycProfiles || []).find((k: any) => k.customerId === session?.customerId),
    [state, session?.customerId],
  );
  const loan = useMemo(
    () => ((state as any).loanApplications || []).find((l: any) => l.customerId === session?.customerId),
    [state, session?.customerId],
  );
  const transactions = useMemo(
    () =>
      ((state as any).transactions || [])
        .filter((tx: any) => tx.customerId === session?.customerId)
        .slice(0, 3),
    [state, session?.customerId],
  );

  const myRequests: ServiceRequest[] = useMemo(
    () =>
      (state.serviceRequests || []).filter((r) => r.customerId === session?.customerId),
    [state.serviceRequests, session?.customerId],
  );

  const analyze = useMutation({
    mutationFn: api.analyze,
    onSuccess: (data) => {
      const a = data.analysis;
      const explain =
        a.customerSafeResponse ||
        a.customerReason ||
        a.decisionExplanation ||
        a.recommendation ||
        a.suggestedAction ||
        (lang === "ar" ? "تم استلام طلبك." : "We received your request.");
      setReply({
        text: String(explain),
        auditId: data.audit?.auditId,
        requestType: a.requestType || a.intent,
      });
    },
  });

  const createRequest = useMutation({
    mutationFn: api.createServiceRequest,
    onSuccess: async (data) => {
      const created = data.request;
      setRequestError(null);
      setDocumentStatus(null);
      // Upload attached documents (if request type supports it — server allows loan_application)
      const loanLikeRequest = String(created.type || "").toLowerCase().includes("loan");
      if (pendingFiles.length && !loanLikeRequest) {
        setRequestError(lang === "ar" ? "تحليل المستندات مفعّل فقط لطلبات القروض في هذا الديمو." : "Document analysis is enabled only for loan requests in this demo.");
      }
      if (pendingFiles.length && loanLikeRequest) {
        try {
        const validationError = validateUploadFiles(pendingFiles, lang);
        if (validationError) {
          setRequestError(validationError);
          setPendingFiles([]);
          setNote("");
          setConfirm(created.requestId);
          qc.invalidateQueries({ queryKey: ["state"] });
          return;
        }
        setDocumentStatus(lang === "ar" ? "جاري رفع وتحليل المستندات..." : "Uploading and analyzing documents...");
        const files = await Promise.all(
          pendingFiles.map(async (f) => ({
            name: f.name,
            type: f.type || mimeFromName(f.name),
            data: await fileToDataUrl(f),
          })),
        );
          const uploaded = await api.uploadDocuments({
            requestId: created.requestId,
            customerId: created.customerId,
            userId: session?.userId,
            userName: session?.name,
            language: lang,
            files,
          });
          setDocumentStatus(
            lang === "ar"
              ? `تم رفع وتحليل ${uploaded.documents.length} مستند/مستندات. تظهر النتيجة عند الموظف.`
              : `${uploaded.documents.length} document(s) uploaded and analyzed. The result is visible to the employee.`,
          );
        } catch (error) {
          setDocumentStatus(null);
          setRequestError(error instanceof Error ? error.message : String(error));
          /* surfaced silently — the request itself was submitted */
        }
      }
      setPendingFiles([]);
      setNote("");
      setConfirm(created.requestId);
      qc.invalidateQueries({ queryKey: ["state"] });
    },
  });

  const submit = () => {
    if (!transcript.trim() || !session) return;
    setReply(null);
    setConfirm(null);
    setRequestError(null);
    setDocumentStatus(null);
    analyze.mutate({
      transcript,
      mode: "customer",
      language: lang,
      actorName: session.name,
      actorUserId: session.userId,
      actorCustomerId: session.customerId,
    });
  };

  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-6 py-8 lg:grid-cols-[1.45fr_1fr]">
      <section className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <CustomerMetric
            icon={<WalletCards className="h-4 w-4" />}
            label={lang === "ar" ? "الرصيد المتاح" : "Available balance"}
            value={formatMoney(account?.availableBalance, account?.currency)}
            hint={account?.type || customer?.segment || "Current"}
          />
          <CustomerMetric
            icon={<CreditCard className="h-4 w-4" />}
            label={lang === "ar" ? "البطاقة" : "Card"}
            value={card ? `${card.type} • ${card.last4}` : lang === "ar" ? "لا توجد بطاقة" : "No card"}
            hint={card?.status || (lang === "ar" ? "غير متاح" : "Unavailable")}
          />
          <CustomerMetric
            icon={<ShieldCheck className="h-4 w-4" />}
            label={lang === "ar" ? "حالة KYC" : "KYC status"}
            value={kyc?.status || (lang === "ar" ? "غير متاح" : "Unavailable")}
            hint={kyc?.nextReviewDate ? `${lang === "ar" ? "المراجعة" : "Review"} ${kyc.nextReviewDate}` : customer?.riskProfile}
          />
        </div>

        <div className="nexus-glass rounded-3xl p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground">
                {lang === "ar" ? "الخدمات البنكية السريعة" : "Quick banking services"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {lang === "ar" ? "اختار خدمة أو اسأل المساعد مباشرة." : "Choose a service or ask the assistant directly."}
              </p>
            </div>
            <span className="rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-[10px] uppercase tracking-widest text-gold">
              Nexus
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <ServiceTile
              icon={<BadgeDollarSign className="h-4 w-4" />}
              title={lang === "ar" ? "طلب قرض" : "Apply for loan"}
              desc={loan?.preEligibility || (lang === "ar" ? "تحقق أهلية مبدئي" : "Check pre-eligibility")}
              onClick={() => setTranscript(lang === "ar" ? "هل أقدر أقدم على قرض شخصي؟" : "Can I apply for a personal loan?")}
            />
            <ServiceTile
              icon={<Landmark className="h-4 w-4" />}
              title={lang === "ar" ? "الراتب والحساب" : "Salary and account"}
              desc={lang === "ar" ? "رصيد، راتب، وحركات" : "Balance, payroll, transactions"}
              onClick={() => setTranscript(lang === "ar" ? "ليش راتبي ما نزل هذا الشهر؟" : "Why didn't my salary arrive this month?")}
            />
            <ServiceTile
              icon={<CreditCard className="h-4 w-4" />}
              title={lang === "ar" ? "البطاقات" : "Cards"}
              desc={card?.status || (lang === "ar" ? "حالة البطاقة والحدود" : "Card status and limits")}
              onClick={() => setTranscript(lang === "ar" ? "ليش بطاقتي موقوفة؟" : "Why is my card blocked?")}
            />
            <ServiceTile
              icon={<ShieldCheck className="h-4 w-4" />}
              title={lang === "ar" ? "تحديث KYC" : "KYC update"}
              desc={kyc?.riskRating ? `${lang === "ar" ? "المخاطر" : "Risk"}: ${kyc.riskRating}` : lang === "ar" ? "وثائق وهوية" : "Documents and identity"}
              onClick={() => setTranscript(lang === "ar" ? "هل أحتاج أحدث وثائق KYC؟" : "Do I need to update my KYC documents?")}
            />
            <ServiceTile
              icon={<RefreshCw className="h-4 w-4" />}
              title={lang === "ar" ? "تحويل CliQ" : "CliQ transfer"}
              desc={lang === "ar" ? "تحويل آمن لمستفيد" : "Safe beneficiary transfer"}
              onClick={() => setTranscript(lang === "ar" ? "هل أقدر أحول كليك لمستفيد جديد؟" : "Can I send a CliQ transfer to a new beneficiary?")}
            />
            <ServiceTile
              icon={<FileText className="h-4 w-4" />}
              title={lang === "ar" ? "مستنداتي" : "My documents"}
              desc={lang === "ar" ? "إرفاق PDF أو صورة للطلبات" : "Attach PDF or image to requests"}
              onClick={() => setTranscript(lang === "ar" ? "بدي أرفع مستندات طلب القرض" : "I want to upload documents for my loan request")}
            />
          </div>
        </div>

        <div className="nexus-glass rounded-3xl p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-xl font-semibold text-foreground">
                {t("askAssistant")}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{t("askAssistantDesc")}</p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs text-accent">
              <Sparkles className="h-3 w-3" /> AI
            </span>
          </div>

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
            {demoPrompts[lang].map((p) => (
              <button
                key={p}
                onClick={() => setTranscript(p)}
                className="rounded-full border border-border bg-card/40 px-3 py-1 text-xs text-muted-foreground transition hover:border-accent/40 hover:text-foreground"
              >
                {p}
              </button>
            ))}
          </div>

          {analyze.isError ? (
            <p className="mt-4 rounded-2xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
              {(analyze.error as Error).message}
            </p>
          ) : null}

          {reply ? (
            <div className="mt-6 rounded-2xl border border-accent/30 bg-accent/5 p-5 nexus-fade-in">
              <div className="text-xs uppercase tracking-wider text-accent">
                {t("yourReply")}
              </div>
              <p className="mt-2 text-base leading-relaxed text-foreground">{reply.text}</p>

              <div className="mt-5 rounded-xl border border-border/60 bg-card/40 p-4">
                <div className="text-sm font-medium text-foreground">{t("sendRequest")}</div>
                <p className="mt-1 text-xs text-muted-foreground">{t("sendRequestDesc")}</p>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={t("summary")}
                  rows={2}
                  className="mt-3 w-full rounded-xl border border-border bg-background/60 p-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none"
                />
                <FileDrop files={pendingFiles} setFiles={setPendingFiles} />
                <button
                  disabled={createRequest.isPending || !reply.auditId}
                  onClick={() =>
                    reply.auditId &&
                    createRequest.mutate({
                      auditId: reply.auditId,
                      summary: note || undefined,
                      requestType: reply.requestType,
                    })
                  }
                  className="mt-4 inline-flex items-center gap-2 rounded-full nexus-aurora px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40"
                >
                  <Send className="h-4 w-4" />
                  {createRequest.isPending ? t("submitting") : t("submit")}
                </button>
                {documentStatus ? (
                  <div className="mt-3 rounded-lg border border-accent/40 bg-accent/10 p-3 text-xs text-accent">
                    {documentStatus}
                  </div>
                ) : null}
                {(requestError || createRequest.isError) ? (
                  <div className="mt-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                    {requestError || (createRequest.error as Error).message}
                  </div>
                ) : null}
                {confirm ? (
                  <div className="mt-3 rounded-lg border border-success/40 bg-success/10 p-3 text-xs text-success">
                    {t("requestSent")} · #{confirm}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <aside className="space-y-4">
        <div className="nexus-glass rounded-3xl p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {lang === "ar" ? "ملف العميل" : "Customer profile"}
              </div>
              <h3 className="mt-1 font-display text-lg font-semibold text-foreground">
                {customer?.name || session?.name}
              </h3>
              <p className="text-xs text-muted-foreground">{customer?.segment || session?.role}</p>
            </div>
            <span className="rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-[10px] text-success">
              {account?.status || "Active"}
            </span>
          </div>
          <div className="mt-4 grid gap-2 text-xs">
            <MiniInfo label={lang === "ar" ? "الحساب" : "Account"} value={customer?.maskedAccount || account?.accountId || "N/A"} />
            <MiniInfo label={lang === "ar" ? "الشركة" : "Employer"} value={customer?.company || "N/A"} />
            <MiniInfo label={lang === "ar" ? "الدخل الشهري" : "Monthly income"} value={formatMoney(customer?.monthlySalaryJod || loan?.monthlyIncome, "JOD")} />
          </div>
        </div>

        <div className="nexus-glass rounded-3xl p-5">
          <h3 className="font-display text-sm font-semibold text-foreground">
            {lang === "ar" ? "آخر الحركات" : "Recent activity"}
          </h3>
          <ul className="mt-3 space-y-2">
            {transactions.length ? (
              transactions.map((tx: any) => (
                <li key={tx.transactionId} className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/30 p-3 text-xs">
                  <div className="min-w-0">
                    <div className="truncate text-foreground">{tx.description}</div>
                    <div className="text-[10px] text-muted-foreground">{tx.date} • {tx.channel}</div>
                  </div>
                  <div className={Number(tx.amount) < 0 ? "text-destructive" : "text-success"}>
                    {formatMoney(tx.amount, tx.currency)}
                  </div>
                </li>
              ))
            ) : (
              <li className="text-xs text-muted-foreground">{lang === "ar" ? "لا توجد حركات حديثة" : "No recent transactions"}</li>
            )}
          </ul>
        </div>

        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold text-foreground">{t("myRequests")}</h3>
          <span className="rounded-full border border-border bg-card/40 px-2.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            {myRequests.length}
          </span>
        </div>
        <ul className="space-y-3">
          {myRequests.length === 0 ? (
            <li className="nexus-glass rounded-2xl border-dashed p-6 text-center text-sm text-muted-foreground">
              {t("noRequests")}
            </li>
          ) : (
            myRequests.map((r) => {
              const audit = (state.auditLogs || []).find((item) => item.auditId === r.auditId);
              const expanded = expandedRequestId === r.requestId;
              const customerMessage = audit?.transcript || r.summary;
              // Customer-safe response only; never leak internal decisionExplanation.
              const safeReply = audit?.customerSafeResponse || audit?.customerReason;

              return (
                <li key={r.requestId} className="nexus-bankcard nexus-fade-in">
                  {/* Card sheen */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent"
                  />
                  <button
                    type="button"
                    data-testid={`request-toggle-${r.requestId}`}
                    aria-expanded={expanded}
                    onClick={() => setExpandedRequestId(expanded ? null : r.requestId)}
                    className="w-full p-5 text-start"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                          {lang === "ar" ? "طلب" : "Request"} · #{r.requestId.slice(-6)}
                        </div>
                        <div className="mt-1 font-display text-base font-semibold text-foreground">
                          {humanizeType(r.type, lang)}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <StatusBadge status={r.status} lang={lang} />
                        <ChevronDown
                          className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
                        />
                      </div>
                    </div>
                    <div className="mt-4 flex items-end justify-between gap-3">
                      <div className="min-w-0">
                        {!expanded && customerMessage ? (
                          <p className="line-clamp-2 text-xs text-muted-foreground">{customerMessage}</p>
                        ) : null}
                      </div>
                      <div className="text-end">
                        <div className="text-[10px] uppercase text-muted-foreground">
                          {lang === "ar" ? "تاريخ" : "Filed"}
                        </div>
                        <div className="font-mono text-[11px] text-foreground/80">
                          {formatRequestDate(r.createdAt, lang) || "—"}
                        </div>
                      </div>
                    </div>
                  </button>

                  {expanded ? (
                    <div
                      data-testid={`request-details-${r.requestId}`}
                      className="space-y-3 border-t border-border/60 bg-background/25 px-5 pb-5 pt-4 nexus-fade-in"
                    >
                      <RequestMessage
                        icon={<MessageSquareText className="h-4 w-4" />}
                        label={lang === "ar" ? "رسالتك للبنك" : "Your message to the bank"}
                        text={
                          customerMessage ||
                          (lang === "ar" ? "لم يتم إدخال وصف للطلب." : "No request description was entered.")
                        }
                      />

                      {safeReply ? (
                        <RequestMessage
                          accent
                          icon={<Sparkles className="h-4 w-4" />}
                          label={lang === "ar" ? "رد البنك" : "Bank's response"}
                          text={safeReply}
                        />
                      ) : null}

                      {r.adminNote ? (
                        <RequestMessage
                          accent
                          icon={<Clock3 className="h-4 w-4" />}
                          label={lang === "ar" ? "ملاحظة الموظف" : "Officer note"}
                          text={r.adminNote}
                        />
                      ) : !safeReply ? (
                        <RequestMessage
                          icon={<Clock3 className="h-4 w-4" />}
                          label={lang === "ar" ? "الحالة" : "Status"}
                          text={
                            lang === "ar"
                              ? "طلبك بانتظار المراجعة من فريق العمليات."
                              : "Your request is awaiting review by the operations team."
                          }
                        />
                      ) : null}

                      {r.decidedBy || r.decidedAt ? (
                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/40 pt-2 text-[11px] text-muted-foreground">
                          <span>
                            {r.decidedBy ? `${lang === "ar" ? "بواسطة" : "By"}: ${r.decidedBy}` : ""}
                          </span>
                          <span>{formatRequestDate(r.decidedAt, lang)}</span>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              );
            })
          )}
        </ul>
      </aside>
    </main>
  );
}

function RequestMessage({
  icon,
  label,
  text,
  accent = false,
}: {
  icon: React.ReactNode;
  label: string;
  text: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        accent ? "border-success/40 bg-success/10" : "border-border/70 bg-background/40"
      }`}
    >
      <div
        className={`flex items-center gap-2 text-xs font-medium ${
          accent ? "text-success" : "text-muted-foreground"
        }`}
      >
        {icon}
        {label}
      </div>
      <p className="mt-2 text-sm leading-relaxed text-foreground">{text}</p>
    </div>
  );
}

function CustomerMetric({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="nexus-glass rounded-2xl p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="grid h-8 w-8 place-items-center rounded-xl border border-accent/30 bg-accent/10 text-accent">
          {icon}
        </span>
        {label}
      </div>
      <div className="mt-3 truncate font-display text-lg font-semibold text-foreground" title={value}>
        {value}
      </div>
      {hint ? <div className="mt-1 truncate text-[11px] text-muted-foreground">{hint}</div> : null}
    </div>
  );
}

function ServiceTile({
  icon,
  title,
  desc,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-2xl border border-border/70 bg-background/35 p-4 text-start transition hover:border-accent/50 hover:bg-accent/10"
    >
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-xl border border-gold/30 bg-gold/10 text-gold transition group-hover:border-accent/40 group-hover:text-accent">
          {icon}
        </span>
        <span className="font-display text-sm font-semibold text-foreground">{title}</span>
      </div>
      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{desc}</p>
    </button>
  );
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/30 px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate text-foreground" title={value}>{value}</span>
    </div>
  );
}

function formatMoney(value: unknown, currency = "JOD") {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "N/A";
  return `${amount.toLocaleString("en-JO", { maximumFractionDigits: 2 })} ${currency || "JOD"}`;
}

function formatRequestDate(value: string | undefined, lang: "en" | "ar") {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(lang === "ar" ? "ar-JO" : "en-JO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function mimeFromName(name: string) {
  const ext = name.toLowerCase().split(".").pop();
  if (ext === "pdf") return "application/pdf";
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "webp") return "image/webp";
  return "";
}

function isAllowedUpload(file: File) {
  const mime = file.type || mimeFromName(file.name);
  return ["application/pdf", "image/png", "image/jpeg", "image/webp"].includes(mime);
}

function validateUploadFiles(files: File[], lang: "en" | "ar") {
  const tooLarge = files.find((file) => file.size > 4 * 1024 * 1024);
  if (tooLarge) {
    return lang === "ar" ? `الملف ${tooLarge.name} أكبر من 4MB.` : `${tooLarge.name} is larger than 4MB.`;
  }
  const invalid = files.find((file) => !isAllowedUpload(file));
  if (invalid) {
    return lang === "ar" ? `نوع الملف ${invalid.name} غير مدعوم. ارفع PDF أو صورة.` : `${invalid.name} is not supported. Upload PDF or image files.`;
  }
  return "";
}

function FileDrop({
  files,
  setFiles,
}: {
  files: File[];
  setFiles: (f: File[]) => void;
}) {
  const { t } = useLang();
  return (
    <div className="mt-3">
      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background/40 p-3 text-xs text-muted-foreground transition hover:border-accent/40 hover:text-foreground">
        <Paperclip className="h-4 w-4" />
        {t("attachDocuments")} (PDF / PNG / JPG · ≤ 4MB)
        <input
          type="file"
          multiple
          accept="application/pdf,image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            const list = Array.from(e.target.files || []).filter(
              (file) => isAllowedUpload(file) && file.size <= 4 * 1024 * 1024,
            );
            setFiles([...files, ...list].slice(0, 5));
          }}
        />
      </label>
      {files.length > 0 ? (
        <ul className="mt-2 space-y-1">
          {files.map((f, i) => (
            <li
              key={i}
              className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card/40 px-3 py-1.5 text-xs"
            >
              <span className="flex min-w-0 items-center gap-2 text-foreground">
                {f.type.includes("pdf") ? (
                  <FileText className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <ImageIcon className="h-3.5 w-3.5 shrink-0" />
                )}
                <span className="truncate">{f.name}</span>
              </span>
              <button
                onClick={() => setFiles(files.filter((_, j) => j !== i))}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function humanizeType(t: string, lang: "en" | "ar") {
  const map: Record<string, { en: string; ar: string }> = {
    loan_application: { en: "Loan application", ar: "طلب قرض" },
    payroll_exception_inquiry: { en: "Payroll inquiry", ar: "استفسار راتب" },
    card_issue: { en: "Card issue", ar: "مشكلة بطاقة" },
    kyc_update: { en: "KYC update", ar: "تحديث KYC" },
    cliq_transfer: { en: "CliQ transfer", ar: "تحويل كليك" },
    service_request: { en: "Service request", ar: "طلب خدمة" },
  };
  return (map[t] || { en: t, ar: t })[lang];
}
