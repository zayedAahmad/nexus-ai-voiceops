import { CheckCircle2, Clock3, AlertTriangle, XCircle, CircleDot } from "lucide-react";

type Tone = "success" | "warning" | "destructive" | "accent" | "muted";

interface StatusMeta {
  tone: Tone;
  label: { en: string; ar: string };
  icon: React.ComponentType<{ className?: string }>;
}

const STATUS_MAP: Record<string, StatusMeta> = {
  approved: { tone: "success", label: { en: "Approved", ar: "معتمد" }, icon: CheckCircle2 },
  complete: { tone: "success", label: { en: "Complete", ar: "مكتمل" }, icon: CheckCircle2 },
  ok: { tone: "success", label: { en: "OK", ar: "تم" }, icon: CheckCircle2 },
  rejected: { tone: "destructive", label: { en: "Rejected", ar: "مرفوض" }, icon: XCircle },
  "needs review": { tone: "warning", label: { en: "Needs review", ar: "بحاجة مراجعة" }, icon: AlertTriangle },
  "in review": { tone: "accent", label: { en: "In review", ar: "قيد المراجعة" }, icon: Clock3 },
  submitted: { tone: "accent", label: { en: "Submitted", ar: "تم الإرسال" }, icon: CircleDot },
  pending: { tone: "warning", label: { en: "Pending", ar: "قيد الانتظار" }, icon: Clock3 },
};

const TONES: Record<Tone, string> = {
  success: "bg-success/10 text-success border-success/30",
  warning: "bg-warning/10 text-warning border-warning/30",
  destructive: "bg-destructive/10 text-destructive border-destructive/30",
  accent: "bg-accent/10 text-accent border-accent/30",
  muted: "bg-muted/40 text-muted-foreground border-border",
};

function resolve(status?: string): StatusMeta {
  const k = (status || "").toLowerCase().trim();
  if (STATUS_MAP[k]) return STATUS_MAP[k];
  const found = Object.entries(STATUS_MAP).find(([key]) => k.includes(key));
  return found ? found[1] : { tone: "muted", label: { en: status || "—", ar: status || "—" }, icon: CircleDot };
}

export function StatusBadge({
  status,
  lang = "en",
  size = "sm",
}: {
  status?: string;
  lang?: "en" | "ar";
  size?: "sm" | "md";
}) {
  const meta = resolve(status);
  const Icon = meta.icon;
  const px = size === "md" ? "px-3 py-1 text-xs" : "px-2.5 py-0.5 text-[11px]";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${TONES[meta.tone]} ${px}`}
    >
      <Icon className="h-3 w-3" />
      {meta.label[lang]}
    </span>
  );
}

export function RiskBadge({ level, lang = "en" }: { level?: string; lang?: "en" | "ar" }) {
  const l = (level || "Low").toLowerCase();
  const label =
    lang === "ar"
      ? l === "high" ? "مخاطرة عالية" : l === "medium" ? "مخاطرة متوسطة" : "مخاطرة منخفضة"
      : `${level || "Low"} risk`;
  const tone =
    l === "high"
      ? "bg-destructive/10 text-destructive border-destructive/30"
      : l === "medium"
        ? "bg-warning/10 text-warning border-warning/30"
        : "bg-success/10 text-success border-success/30";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${tone}`}>
      {label}
    </span>
  );
}
