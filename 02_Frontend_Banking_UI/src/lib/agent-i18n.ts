import type { AgentReport } from "./api";

export type AgentLang = "en" | "ar";

const agentNames: Record<string, string> = {
  OrchestratorAgent: "الوكيل المنسق",
  CreditRiskAgent: "وكيل مخاطر الائتمان",
  ComplianceAgent: "وكيل الامتثال",
  FraudAgent: "وكيل كشف الاحتيال",
  PolicyAgent: "وكيل السياسات",
  CustomerSafetyAgent: "وكيل سلامة رد العميل",
  EvaluatorAgent: "وكيل التقييم",
  OptimizerAgent: "وكيل تحسين القرار",
  PayrollOpsAgent: "وكيل عمليات الرواتب",
  AccountDataAgent: "وكيل بيانات الحساب",
  BankingAgent: "الوكيل البنكي",
};

const agentRoles: Record<string, string> = {
  OrchestratorAgent: "يوجه الطلب إلى الوكلاء البنكيين المتخصصين",
  CreditRiskAgent: "يقيّم أهلية القرض ومخاطر الائتمان",
  ComplianceAgent: "يراجع حالة التعرف على العميل ومتطلبات الامتثال",
  FraudAgent: "يفحص مؤشرات الاحتيال ومخاطر العمليات",
  PolicyAgent: "يسترجع السياسات البنكية ويتحقق من انطباقها",
  CustomerSafetyAgent: "ينقح الرد الموجه للعميل ويحمي البيانات الحساسة",
  EvaluatorAgent: "يراجع نتائج الوكلاء ويحدد الحاجة إلى تدخل موظف",
  OptimizerAgent: "يحل التناقضات ويوحّد القرار النهائي مع إشارات المخاطر",
  PayrollOpsAgent: "يعالج حالات الرواتب والاستثناءات التشغيلية",
  AccountDataAgent: "يقرأ بيانات الحساب والرصيد",
};

const signalLabels: Record<string, string> = {
  complete: "مكتمل",
  warning: "تحذير",
  decision_quality_pass: "اجتاز فحص الجودة",
  human_review_required: "تتطلب مراجعة موظف",
  policy_match: "تمت مطابقة السياسة",
  policy_gap: "توجد فجوة في السياسة",
  safe_response_ready: "الرد الآمن جاهز",
  safe_response_missing: "الرد الآمن يحتاج مراجعة",
  reject_recommended: "موصى بالرفض",
  high_debt_burden: "نسبة التزامات مرتفعة",
  approval_ready: "جاهز للموافقة",
  conditional_credit_fit: "مؤهل بشروط",
  documents_required: "مستندات إضافية مطلوبة",
  decision_optimized: "تم تحسين القرار",
  no_change_required: "القرار متسق ولا يحتاج تعديلًا",
  kyc_review_required: "مراجعة بيانات العميل مطلوبة",
  kyc_clear: "بيانات العميل سليمة",
  kyc_missing: "ملف بيانات العميل غير موجود",
  no_fraud_signal: "لا توجد إشارة احتيال",
  step_up_required: "تحقق أمني إضافي مطلوب",
  ops_exception: "استثناء تشغيلي",
  posted_salary: "تم ترحيل الراتب",
  payroll_record_missing: "سجل الراتب غير موجود",
  account_active: "الحساب نشط",
  account_attention: "الحساب يحتاج متابعة",
  account_missing: "الحساب غير موجود",
  missing_loan_record: "ملف القرض غير موجود",
};

const intentLabels: Record<string, string> = {
  loan_eligibility: "أهلية القرض",
  loan_pre_eligibility_inquiry: "استفسار أولي عن أهلية القرض",
  payroll_exception_inquiry: "استفسار عن استثناء راتب",
  balance_inquiry: "استفسار عن الرصيد",
  transaction_history: "سجل العمليات",
  card_status: "حالة البطاقة",
  kyc_review: "مراجعة بيانات العميل",
  cliq_transfer_assist: "مساعدة تحويل كليك",
  account_opening: "فتح حساب",
  service_request: "طلب خدمة",
  general_banking_assistance: "مساعدة بنكية عامة",
};

function arabicValue(value: string) {
  const replacements: Record<string, string> = {
    true: "نعم",
    false: "لا",
    Low: "منخفض",
    Medium: "متوسط",
    High: "مرتفع",
    Valid: "ساري",
    Current: "محدّث",
    Active: "نشط",
    Suspended: "معلّق",
    Posted: "مُرحّل",
    "Personal Loan": "قرض شخصي",
    JOD: "دينار أردني",
  };
  return replacements[value] || value.replace(/\bJOD\b/g, "دينار أردني");
}

export function agentName(agentId: string | undefined, lang: AgentLang) {
  const id = agentId || "BankingAgent";
  return lang === "ar" ? agentNames[id] || "وكيل بنكي متخصص" : id;
}

export function agentRole(report: AgentReport, lang: AgentLang) {
  const id = report.agentId || report.agent || "BankingAgent";
  return lang === "ar" ? agentRoles[id] || "ينفذ تحليلًا بنكيًا متخصصًا" : report.role || "";
}

export function agentSignal(signal: string | undefined, lang: AgentLang) {
  if (!signal) return lang === "ar" ? "مكتمل" : "complete";
  if (lang !== "ar") return signal;
  if (signal.startsWith("route:")) {
    return `المسار: ${intentLabel(signal.slice(6), lang)}`;
  }
  return signalLabels[signal] || signal.replaceAll("_", " ");
}

export function agentStatus(status: string | undefined, lang: AgentLang) {
  if (lang !== "ar") return status || "complete";
  return signalLabels[status || "complete"] || status || "مكتمل";
}

export function intentLabel(intent: string | undefined, lang: AgentLang) {
  if (!intent) return lang === "ar" ? "غير محدد" : "unknown";
  return lang === "ar" ? intentLabels[intent] || intent.replaceAll("_", " ") : intent;
}

export function gateLabel(gate: string | undefined, lang: AgentLang) {
  return agentSignal(gate, lang);
}

export function orchestrationPattern(pattern: string | undefined, lang: AgentLang) {
  if (lang !== "ar") return pattern || "orchestrator-worker + evaluator-optimizer";
  return "منسق ← وكلاء متخصصون ← تحسين القرار ← التقييم النهائي";
}

export function localizedEvidence(evidence: string, lang: AgentLang) {
  if (lang !== "ar") return evidence;
  if (intentLabels[evidence]) return intentLabels[evidence];
  const [rawKey, ...rawValue] = evidence.split("=");
  const value = rawValue.join("=");
  const keys: Record<string, string> = {
    requestedAmount: "المبلغ المطلوب",
    monthlyIncome: "الدخل الشهري",
    debtBurdenRatio: "نسبة الالتزامات",
    missingDocuments: "المستندات الناقصة",
    mediumRiskTransactions: "عمليات متوسطة المخاطر",
    newBeneficiary: "مستفيد جديد",
  };
  if (value) return `${keys[rawKey] || rawKey}: ${arabicValue(value)}`;
  return arabicValue(evidence);
}

export function agentOutput(report: AgentReport, lang: AgentLang) {
  if (lang !== "ar") return report.output || report.notes || "Agent completed successfully.";

  const id = report.agentId || report.agent || "BankingAgent";
  const evidence = report.evidence || report.findings || [];
  const evidenceValue = (prefix: string) =>
    evidence.find((item) => item.startsWith(`${prefix}=`))?.split("=").slice(1).join("=");

  if (id === "OrchestratorAgent") {
    return "صنّف الطلب واختار الوكلاء المتخصصين المناسبين لمعالجته.";
  }
  if (id === "CreditRiskAgent") {
    const amount = evidenceValue("requestedAmount");
    const income = evidenceValue("monthlyIncome");
    const debt = evidenceValue("debtBurdenRatio");
    if (report.signal === "reject_recommended") {
      return `أوصى برفض الطلب لأن المبلغ المطلوب${amount ? ` (${arabicValue(amount)})` : ""} لا يتناسب مع الدخل الشهري${income ? ` (${arabicValue(income)})` : ""}${debt ? `، ونسبة الالتزامات ${debt}` : ""}.`;
    }
    if (report.signal === "approval_ready") {
      return `الدخل متحقق ونسبة الالتزامات${debt ? ` ${debt}` : ""} ضمن الحدود، لذلك الطلب جاهز للموافقة.`;
    }
    if (report.signal === "documents_required") {
      const missing = evidenceValue("missingDocuments");
      return `المؤشرات الائتمانية مقبولة، لكن لا يمكن إكمال القرار قبل رفع المستندات الناقصة${missing ? `: ${missing.replaceAll("|", "، ")}` : ""}.`;
    }
    return `راجع الدخل ونسبة الالتزامات${debt ? ` (${debt})` : ""}، والطلب مؤهل مبدئيًا بشرط استكمال التحقق من الدخل.`;
  }
  if (id === "ComplianceAgent") {
    return report.signal === "kyc_clear"
      ? "ملف التعرف على العميل محدّث ولم يظهر مانع امتثال."
      : "ملف التعرف على العميل يحتاج مراجعة أو استكمال قبل تنفيذ القرار.";
  }
  if (id === "FraudAgent") {
    return report.signal === "no_fraud_signal"
      ? "لم يتم اكتشاف مؤشرات احتيال مرتفعة في السجلات التجريبية."
      : "تم اكتشاف إشارة مخاطر تتطلب تحققًا أمنيًا إضافيًا قبل التنفيذ.";
  }
  if (id === "PolicyAgent") {
    return `تمت مطابقة الطلب مع السياسة البنكية${evidence[0] ? ` (${evidence[0]})` : ""}.`;
  }
  if (id === "CustomerSafetyAgent") {
    return "تم إعداد رد آمن للعميل وفصل التفاصيل التشغيلية الحساسة عنه.";
  }
  if (id === "EvaluatorAgent") {
    return report.signal === "human_review_required"
      ? "سمح بعرض النتيجة، لكن التنفيذ النهائي يتطلب مراجعة وموافقة موظف."
      : "راجع نتائج الوكلاء وتأكد من اتساقها قبل اعتماد الإجابة.";
  }
  if (id === "OptimizerAgent") {
    return report.signal === "decision_optimized"
      ? "راجع إشارات جميع الوكلاء وعدّل التوصية لمنع أي قرار يتعارض مع مخاطر الائتمان أو الاحتيال أو نقص المستندات."
      : "تحقق من اتساق القرار مع إشارات الوكلاء ولم يجد تناقضًا يحتاج إلى تعديل.";
  }
  if (id === "PayrollOpsAgent") {
    return report.signal === "posted_salary"
      ? "تحقق من سجل الراتب وتأكد أنه مُرحّل بنجاح."
      : "وجد استثناءً في سجل الراتب يحتاج متابعة من قسم العمليات.";
  }
  if (id === "AccountDataAgent") {
    return report.signal === "account_active"
      ? "تحقق من بيانات الحساب وتأكد أن الحساب نشط."
      : "بيانات الحساب تحتاج متابعة قبل إكمال الطلب.";
  }

  const original = report.output || report.notes || "";
  return /[\u0600-\u06ff]/.test(original)
    ? original
    : "أكمل الوكيل التحليل البنكي المتخصص بنجاح.";
}

export function traceStepLabel(step: string, lang: AgentLang) {
  if (lang !== "ar") return step;
  if (agentNames[step]) return agentNames[step];
  const labels: Record<string, string> = {
    "[Analyze]": "تحليل الطلب",
    "[Agent Triggered] OrchestratorAgent": "تشغيل الوكلاء المناسبين",
    "[Policy Check] EvaluatorAgent": "التحقق من السياسة البنكية",
    "[Decision Optimization] OptimizerAgent": "تحسين القرار النهائي",
    "[Evaluator Gate] EvaluatorAgent": "بوابة التقييم والحوكمة",
    "[Audit Logging]": "حفظ سجل التدقيق",
    "[Final Response]": "فصل الرد النهائي للعميل",
    "Voice/Text Intake": "استقبال الصوت أو النص",
    "Intent Detection": "تحديد نية الطلب",
    "Entity Extraction": "استخراج البيانات",
    "Customer Data Lookup": "البحث في بيانات العميل",
    "Policy Retrieval": "استرجاع السياسة",
    Decision: "تكوين القرار",
    "Audit Logging": "حفظ سجل التدقيق",
  };
  return labels[step] || step;
}

export function traceDetail(detail: string, step: string, lang: AgentLang) {
  if (lang !== "ar") return detail;
  const localizedTerms = detail
    .replace(/\bcustomerId\b/g, "رقم العميل")
    .replace(/\bemployeeId\b/g, "رقم الموظف")
    .replace(/\bJOD\b/g, "دينار أردني")
    .replace(/\bSuspended\b/g, "معلّق")
    .replace(/\bPosted\b/g, "مُرحّل")
    .replace(/\bCurrent\b/g, "محدّث")
    .replace(/\bValid\b/g, "ساري")
    .replace(/\bLow\b/g, "منخفض")
    .replace(/\bMedium\b/g, "متوسط")
    .replace(/\bHigh\b/g, "مرتفع");
  if (/[\u0600-\u06ff]/.test(localizedTerms)) return localizedTerms;
  if (step === "[Analyze]") {
    return "تم تصنيف الطلب وتحديد نوعه ومستوى المخاطر ونسبة الثقة قبل تشغيل الوكلاء.";
  }
  if (step === "[Policy Check] EvaluatorAgent") {
    return "تمت مقارنة القرار مع قاعدة السياسات البنكية قبل السماح بالنتيجة.";
  }
  if (step === "[Audit Logging]") {
    return "تم حفظ سجل JSON منظم يحتوي على المسار الكامل للقرار.";
  }
  if (step === "[Final Response]") {
    return "تم فصل الرد الآمن للعميل عن الملخص التشغيلي الداخلي للموظف.";
  }
  if (step === "OrchestratorAgent" || step === "[Agent Triggered] OrchestratorAgent" || detail.startsWith("Routed ")) {
    return "تم تصنيف الطلب وتوجيهه إلى الوكلاء البنكيين المتخصصين المناسبين.";
  }
  if (step === "EvaluatorAgent" || step === "[Evaluator Gate] EvaluatorAgent" || detail.startsWith("Final quality gate:")) {
    const gate = detail.match(/Final quality gate:\s*([^;.\s]+)/)?.[1];
    return `نتيجة بوابة التقييم النهائية: ${gateLabel(gate, lang)}.`;
  }
  if (step === "OptimizerAgent" || step === "[Decision Optimization] OptimizerAgent") {
    return "تمت مراجعة التوصية النهائية وحل أي تعارض بينها وبين إشارات الوكلاء المتخصصين.";
  }
  const exact: Record<string, string> = {
    "Transcript received and normalized.": "تم استلام النص وتوحيده للتحليل.",
    "Decision trace saved for review.": "تم حفظ مسار القرار للمراجعة والتدقيق.",
  };
  return exact[detail] || "اكتملت هذه الخطوة ضمن مسار التحليل البنكي.";
}
