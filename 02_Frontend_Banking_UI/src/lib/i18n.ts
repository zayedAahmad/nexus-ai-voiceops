import { useEffect, useState } from "react";

export type Lang = "en" | "ar";

const LS_KEY = "nexus.lang";

type Dict = Record<string, { en: string; ar: string }>;

export const dict: Dict = {
  appName: { en: "Nexus AI VoiceOps", ar: "نيكسوس للذكاء الصوتي" },
  tagline: {
    en: "Voice-first banking operations, powered by explainable AI.",
    ar: "عمليات مصرفية صوتية مدعومة بذكاء اصطناعي مفسَّر.",
  },
  customerPortal: { en: "Customer Portal", ar: "بوابة العملاء" },
  employeeWorkspace: { en: "Employee Workspace", ar: "مساحة الموظفين" },
  customerPortalDesc: {
    en: "Private voice banking. Ask about salary, loans, cards, transfers and requests.",
    ar: "خدمة مصرفية صوتية خاصة. اسأل عن الراتب والقروض والبطاقات والتحويلات والطلبات.",
  },
  employeeWorkspaceDesc: {
    en: "Operations inbox, agents, AI trace, automations, audit trail and approvals.",
    ar: "صندوق العمليات والوكلاء وتتبع الذكاء الاصطناعي والأتمتة وسجل التدقيق والموافقات.",
  },
  enter: { en: "Enter", ar: "دخول" },
  chooseAccount: { en: "Choose your account", ar: "اختر حسابك" },
  chooseAccountDesc: {
    en: "Select a demo profile to sign in. No password required in this sandbox.",
    ar: "اختر ملفًا تجريبيًا لتسجيل الدخول. لا حاجة لكلمة مرور في هذا العرض.",
  },
  continueBtn: { en: "Continue", ar: "متابعة" },
  back: { en: "Back", ar: "رجوع" },
  language: { en: "Language", ar: "اللغة" },
  signOut: { en: "Sign out", ar: "تسجيل الخروج" },
  greeting: { en: "Welcome back", ar: "مرحبًا بعودتك" },
  askAssistant: { en: "Ask your assistant", ar: "اسأل المساعد" },
  askAssistantDesc: {
    en: "Tap the mic and speak, or type your question below. Available in English and Arabic.",
    ar: "اضغط على الميكروفون وتحدث، أو اكتب سؤالك أدناه. متاح بالعربية والإنجليزية.",
  },
  listening: { en: "Listening…", ar: "جارٍ الاستماع…" },
  tapToSpeak: { en: "Tap to speak", ar: "اضغط للتحدث" },
  send: { en: "Send", ar: "إرسال" },
  yourReply: { en: "Assistant reply", ar: "رد المساعد" },
  sendRequest: { en: "Send a request to the bank", ar: "أرسل طلبًا للبنك" },
  sendRequestDesc: {
    en: "Submit a formal request based on this conversation. You can attach documents.",
    ar: "قدّم طلبًا رسميًا استنادًا إلى هذه المحادثة. يمكنك إرفاق مستندات.",
  },
  myRequests: { en: "My requests", ar: "طلباتي" },
  noRequests: { en: "You have no requests yet.", ar: "لا توجد طلبات بعد." },
  attachDocuments: { en: "Attach documents", ar: "إرفاق مستندات" },
  submit: { en: "Submit", ar: "إرسال" },
  submitting: { en: "Submitting…", ar: "جارٍ الإرسال…" },
  status: { en: "Status", ar: "الحالة" },
  transcriptPlaceholder: {
    en: "e.g. Why didn't my salary arrive this month?",
    ar: "مثال: لماذا لم يصل راتبي هذا الشهر؟",
  },
  demoPrompts: { en: "Try one of these", ar: "جرّب أحد هذه" },
  requestType: { en: "Request type", ar: "نوع الطلب" },
  summary: { en: "Summary", ar: "ملخص" },
  requestSent: { en: "Request submitted", ar: "تم إرسال الطلب" },
  commandCenter: { en: "Command Center", ar: "مركز القيادة" },
  serviceRequests: { en: "Service Requests", ar: "طلبات الخدمة" },
  agentsTrace: { en: "Agents & AI Trace", ar: "الوكلاء وتتبع الذكاء" },
  automations: { en: "n8n Automations", ar: "أتمتة n8n" },
  auditTrail: { en: "Audit Trail", ar: "سجل التدقيق" },
  committee: { en: "Committee Demo", ar: "عرض اللجنة الفنية" },
  resetDemo: { en: "Reset demo", ar: "إعادة تهيئة العرض" },
  analyze: { en: "Analyze", ar: "تحليل" },
  analyzing: { en: "Analyzing…", ar: "جارٍ التحليل…" },
  intent: { en: "Intent", ar: "النية" },
  confidence: { en: "Confidence", ar: "الثقة" },
  risk: { en: "Risk", ar: "المخاطر" },
  suggestedAction: { en: "Recommended action", ar: "الإجراء الموصى به" },
  sources: { en: "Policy sources", ar: "المصادر" },
  createTicket: { en: "Create OPS ticket", ar: "إنشاء تذكرة عمليات" },
  approve: { en: "Approve", ar: "اعتماد" },
  reject: { en: "Reject", ar: "رفض" },
  needsReview: { en: "Needs review", ar: "يحتاج مراجعة" },
  decisionNote: { en: "Decision note", ar: "ملاحظة القرار" },
  documents: { en: "Documents", ar: "المستندات" },
  view: { en: "View", ar: "عرض" },
  download: { en: "Download", ar: "تنزيل" },
  trace: { en: "AI Trace", ar: "تتبع الذكاء الاصطناعي" },
  agents: { en: "Agents", ar: "الوكلاء" },
  events: { en: "Events", ar: "الأحداث" },
  tickets: { en: "Tickets", ar: "التذاكر" },
  approvals: { en: "Approvals", ar: "الموافقات" },
  loading: { en: "Loading…", ar: "جارٍ التحميل…" },
  backendOffline: { en: "Backend offline", ar: "الخادم غير متصل" },
  backendOfflineDesc: {
    en: "Nexus API is not reachable. Start server.js (default http://localhost:4173) or set VITE_API_BASE_URL.",
    ar: "لا يمكن الوصول لخادم Nexus. شغّل server.js (المنفذ الافتراضي 4173) أو اضبط VITE_API_BASE_URL.",
  },
  retry: { en: "Retry", ar: "إعادة المحاولة" },
};

export type DictKey = keyof typeof dict;

export function useLang() {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const stored = (typeof window !== "undefined" && localStorage.getItem(LS_KEY)) as Lang | null;
    if (stored === "en" || stored === "ar") setLangState(stored);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  const setLang = (next: Lang) => {
    setLangState(next);
    if (typeof window !== "undefined") localStorage.setItem(LS_KEY, next);
  };

  const t = (key: DictKey) => dict[key][lang];

  return { lang, setLang, t };
}
