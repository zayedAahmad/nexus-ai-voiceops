// Client wrapper around the existing Node.js server.js API.
// In dev we proxy /api → http://localhost:4173 (see vite.config.ts).
// In production set VITE_API_BASE_URL to point at the Node backend.

const LOCAL_BACKEND =
  typeof window !== "undefined" && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)
    ? "http://localhost:4173"
    : "";
const BASE = (import.meta.env.VITE_API_BASE_URL || LOCAL_BACKEND).replace(/\/$/, "");
const API_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS || 20000);

function url(path: string) {
  return `${BASE}${path}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  const res = await fetch(url(path), {
    ...init,
    signal: init?.signal || controller.signal,
    headers: {
      "content-type": "application/json",
      ...(init?.headers || {}),
    },
  }).finally(() => globalThis.clearTimeout(timeout));
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (body?.error) msg = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

// -------- Types (loose — the server returns rich objects; we type only what we use) --------

export interface Customer {
  customerId: string;
  name?: string;
  email?: string;
  phone?: string;
  segment?: string;
  employeeId?: string;
  company?: string;
  maskedAccount?: string;
  riskProfile?: string;
  monthlySalaryJod?: number;
}

export interface UserAccount {
  userId: string;
  name: string;
  email: string;
  type?: "employee" | "customer" | string;
  role: "employee" | "customer" | string;
  customerId?: string;
  linkedCustomerId?: string | null;
}

export interface AgentReport {
  agentId?: string;
  agent?: string;
  role?: string;
  status?: string;
  signal?: string;
  confidence?: number;
  output?: string;
  evidence?: string[];
  verdict?: string;
  findings?: string[];
  notes?: string;
}

export interface AgentOrchestration {
  pattern?: string;
  activeRoute?: string;
  selectedAgents?: string[];
  agentReports?: AgentReport[];
  finalGate?: string;
  qualityScore?: number;
  qualityChecks?: AgentQualityCheck[];
}

export interface AgentQualityCheck {
  id: string;
  label: string;
  passed: boolean;
  severity?: string;
  detail: string;
}

export interface AgentEvaluationScenario {
  id: string;
  title: string;
  category: string;
  customerId: string;
  expected: string;
  passed: boolean;
  qualityScore: number;
  finalGate: string;
  recommendation: string;
  selectedAgents: string[];
  checks: AgentQualityCheck[];
}

export interface AgentEvaluationSuite {
  suiteVersion: string;
  generatedAt: string;
  total: number;
  passed: number;
  failed: number;
  score: number;
  averageQuality: number;
  status: "ready" | "needs_attention";
  scenarios: AgentEvaluationScenario[];
}

export interface StructuredAuditStage {
  phase: string;
  status: string;
  summary?: string;
  [k: string]: unknown;
}

export interface StructuredAuditTrail {
  schemaVersion: string;
  systemDirectiveVersion: string;
  auditId: string;
  correlationId: string;
  createdAt: string;
  principles?: string[];
  chainOfThoughtPolicy?: string;
  customerDataBoundary?: Record<string, unknown>;
  stages: StructuredAuditStage[];
}

export interface AuditLog {
  auditId: string;
  correlationId?: string;
  timestamp: string;
  actor: string;
  transcript: string;
  mode: string;
  language?: string;
  customerId?: string | null;
  intent?: string;
  confidence?: number;
  riskLevel?: string;
  suggestedAction?: string;
  sources?: Array<{ title: string; section?: string; url?: string }>;
  engine?: string;
  model?: string;
  status?: string;
  requestType?: string;
  recommendation?: string;
  decisionLabel?: string;
  decisionExplanation?: string;
  customerSafeResponse?: string;
  customerReason?: string;
  requiredDocuments?: string[];
  trace?: Array<{ step: string; status: string; detail: string }>;
  agentReports?: AgentReport[];
  agentOrchestration?: AgentOrchestration;
  systemDirectiveVersion?: string;
  auditSchemaVersion?: string;
  structuredAuditTrail?: StructuredAuditTrail;
}

export interface ServiceRequest {
  requestId: string;
  auditId: string;
  createdAt: string;
  customerId: string;
  customerName?: string | null;
  type: string;
  status: "Submitted" | "In Review" | "Approved" | "Rejected" | "Needs Review" | string;
  priority?: string;
  channel?: string;
  summary?: string;
  documentIds?: string[];
  documentCount?: number;
  documentStatus?: string;
  notification?: string;
  adminDecision?: string;
  adminNote?: string;
  decidedAt?: string;
  decidedBy?: string;
  decisionLabel?: string;
  decisionExplanation?: string;
  decisionRecommendation?: string;
  riskLevel?: string;
  analysisConfidence?: number;
  remainingRequiredDocuments?: string[];
  documentAnalysisSummary?: {
    agentId?: string;
    status?: string;
    analyzedCount?: number;
    averageConfidence?: number;
    detectedTypes?: string[];
    remainingRequiredDocuments?: string[];
    flags?: string[];
    summary?: string;
  };
}

export interface DocumentIntelligence {
  agentId?: string;
  status?: string;
  documentType?: string;
  documentTypeLabel?: string;
  confidence?: number;
  extractedFields?: Record<string, string | number>;
  signals?: string[];
  flags?: string[];
  recommendation?: string;
  summary?: string;
}

export interface DocumentUpload {
  documentId: string;
  requestId: string;
  customerId: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  uploadedByName?: string;
  intelligence?: DocumentIntelligence;
}

export interface Ticket {
  ticketId: string;
  auditId: string;
  createdAt: string;
  status: string;
  priority: string;
  title: string;
  customerId?: string | null;
  owner: string;
  summary: string;
}

export interface Approval {
  approvalId: string;
  auditId: string;
  timestamp: string;
  approver: string;
  decision: string;
  note: string;
}

export interface N8nRun {
  runId?: string;
  workflowKey?: string;
  workflowId?: string;
  eventType?: string;
  triggeredAt?: string;
  status?: string;
  correlationId?: string;
  [k: string]: unknown;
}

export interface AppState {
  users?: UserAccount[];
  customers?: Customer[];
  serviceRequests?: ServiceRequest[];
  documentUploads?: DocumentUpload[];
  auditLogs?: AuditLog[];
  tickets?: Ticket[];
  approvals?: Approval[];
  n8nWorkflowRuns?: N8nRun[];
  policies?: Array<{ policyId?: string; title: string; section?: string; body?: string }>;
  demoPersonas?: Array<{ id: string; label: string; transcript: string; language?: string }>;
  [k: string]: unknown;
}

const DEMO_STORAGE_KEY = "nexus.voiceops.demo-state";

function demoFallbackEnabled() {
  return import.meta.env.VITE_DISABLE_DEMO_FALLBACK !== "true";
}

function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function demoBaseState(): AppState {
  const now = new Date().toISOString();
  const agentReports: AgentReport[] = [
    {
      agentId: "OrchestratorAgent",
      role: "Routes the request to specialized banking agents",
      status: "complete",
      signal: "route:loan_eligibility",
      confidence: 98,
      output: "Selected CreditRiskAgent, ComplianceAgent, PolicyAgent, CustomerSafetyAgent and EvaluatorAgent.",
      evidence: ["loan_eligibility"],
    },
    {
      agentId: "CreditRiskAgent",
      role: "Assesses loan eligibility",
      status: "warning",
      signal: "documents_required",
      confidence: 91,
      output: "Credit indicators are acceptable, but latest salary certificate and bank statement are required before approval.",
      evidence: ["debtBurdenRatio=31%", "missingDocuments=Latest salary certificate|Last 3 months bank statement"],
    },
    {
      agentId: "PolicyAgent",
      role: "Retrieves and checks bank policies",
      status: "complete",
      signal: "policy_match",
      confidence: 92,
      output: "Matched Retail Lending Policy - Section 1.1 for loan eligibility.",
      evidence: ["POL-LOAN-DBR-1-1"],
    },
    {
      agentId: "CustomerSafetyAgent",
      role: "Redacts sensitive details for customer-facing output",
      status: "complete",
      signal: "safe_response_ready",
      confidence: 96,
      output: "Customer-safe response is available and separated from internal reasoning.",
      evidence: ["customerSafeResponse"],
    },
    {
      agentId: "EvaluatorAgent",
      role: "Reviews agent outputs and decides if human approval is needed",
      status: "complete",
      signal: "human_review_required",
      confidence: 90,
      output: "Quality score 100%. Human review remains required before execution.",
      evidence: ["documents_required"],
    },
  ];
  const audit: AuditLog = {
    auditId: "AUD-NEXUS-DEMO",
    correlationId: "CORR-NEXUS-DEMO",
    timestamp: now,
    actor: "Nexus Demo Customer",
    transcript: "Can I apply for a personal loan?",
    mode: "customer",
    language: "en",
    customerId: "10452",
    intent: "loan_eligibility",
    confidence: 92,
    riskLevel: "Medium",
    suggestedAction: "Request missing income documents and route to Credit Operations.",
    requestType: "loan_application",
    recommendation: "request_documents",
    decisionLabel: "Documents required",
    decisionExplanation: "The loan request can proceed only after the customer uploads the latest salary certificate and recent bank statement.",
    customerSafeResponse: "Your loan request is under review. Please upload your latest salary certificate and recent bank statement so the bank can continue the assessment.",
    requiredDocuments: ["Latest salary certificate", "Last 3 months bank statement", "Valid ID"],
    agentReports,
    agentOrchestration: {
      pattern: "orchestrator-worker + evaluator-optimizer",
      activeRoute: "loan_eligibility",
      selectedAgents: agentReports.map((report) => report.agentId || "Agent"),
      agentReports,
      finalGate: "human_review_required",
      qualityScore: 100,
      qualityChecks: [
        {
          id: "policy_grounding",
          label: "Decision is grounded in bank policy",
          passed: true,
          severity: "critical",
          detail: "A policy source was matched.",
        },
      ],
    },
    trace: [
      { step: "[Analyze]", status: "complete", detail: "Classified request as loan_eligibility; risk Medium; confidence 92%." },
      { step: "[Agent Triggered] OrchestratorAgent", status: "complete", detail: "Routed loan_eligibility to CreditRiskAgent, ComplianceAgent, PolicyAgent, CustomerSafetyAgent, EvaluatorAgent." },
      { step: "[Policy Check] EvaluatorAgent", status: "complete", detail: "Policy grounding passed." },
      { step: "[Final Response]", status: "complete", detail: "Customer-safe response separated from employee operational summary." },
    ],
    engine: "nexus-demo-fallback",
    model: "nexus-ui-preview",
    status: "pending_approval",
  };
  return {
    users: [
      { userId: "CUS-10452", name: "Omar Haddad", email: "omar.haddad@example.demo", role: "customer", type: "customer", customerId: "10452" },
      { userId: "CUS-11880", name: "Maya Al-Khatib", email: "maya.khatib@example.demo", role: "customer", type: "customer", customerId: "11880" },
      { userId: "EMP-1001", name: "Demo Operations Officer", email: "ops.officer@nexus-bank.demo", role: "employee", type: "employee" },
    ],
    customers: [
      { customerId: "10452", name: "Omar Haddad", email: "omar.haddad@example.demo", segment: "Retail Payroll Customer" },
      { customerId: "11880", name: "Maya Al-Khatib", email: "maya.khatib@example.demo", segment: "Retail Customer" },
    ],
    serviceRequests: [
      {
        requestId: "REQ-NEXUS-DEMO",
        auditId: audit.auditId,
        createdAt: now,
        customerId: "10452",
        customerName: "Omar Haddad",
        type: "loan_application",
        status: "Needs Review",
        priority: "Medium",
        channel: "Nexus Offline Demo",
        summary: "Customer requested a personal loan and needs to upload income documents.",
        documentIds: [],
        documentCount: 0,
        documentStatus: "Pending",
        decisionLabel: audit.decisionLabel,
        decisionExplanation: audit.decisionExplanation,
        decisionRecommendation: audit.recommendation,
        riskLevel: audit.riskLevel,
        analysisConfidence: audit.confidence,
      },
    ],
    documentUploads: [],
    auditLogs: [audit],
    tickets: [],
    approvals: [],
    n8nWorkflowRuns: [
      {
        runId: "N8N-DEMO-REQUEST-ROUTER",
        correlationId: "CORR-DEMO-REQ-10452",
        workflowKey: "customer_request_router",
        workflowId: "nexus.customer_request_router",
        workflowName: "Customer Request Router",
        eventType: "service_request_submitted",
        triggeredAt: new Date().toISOString(),
        requestedAt: new Date().toISOString(),
        status: "sandbox_queued",
      },
      {
        runId: "N8N-DEMO-DOCS-INTAKE",
        correlationId: "CORR-DEMO-DOCS-10452",
        workflowKey: "loan_documents_intake",
        workflowId: "nexus.loan_documents_intake",
        workflowName: "Loan Documents Intake",
        eventType: "loan_documents_uploaded",
        triggeredAt: new Date().toISOString(),
        requestedAt: new Date().toISOString(),
        status: "sandbox_queued",
      },
      {
        runId: "N8N-DEMO-OPS-ALERT",
        correlationId: "CORR-DEMO-OPS-ALERT",
        workflowKey: "operations_alert",
        workflowId: "nexus.operations_alert",
        workflowName: "Operations Alert",
        eventType: "human_review_required",
        triggeredAt: new Date().toISOString(),
        requestedAt: new Date().toISOString(),
        status: "sandbox_queued",
      },
    ],
    policies: [{ policyId: "POL-LOAN-DBR-1-1", title: "Retail Lending Policy", section: "Section 1.1", body: "Loan decisions require verified income, debt burden checks, and complete documents." }],
    demoPersonas: [],
  };
}

function readDemoState(): AppState {
  if (typeof window === "undefined") return demoBaseState();
  const saved = safeJsonParse<Partial<AppState>>(localStorage.getItem(DEMO_STORAGE_KEY), {});
  const base = demoBaseState();
  return {
    ...base,
    ...saved,
    users: saved.users || base.users,
    customers: saved.customers || base.customers,
    serviceRequests: saved.serviceRequests || base.serviceRequests,
    documentUploads: saved.documentUploads || base.documentUploads,
    auditLogs: saved.auditLogs || base.auditLogs,
    tickets: saved.tickets || base.tickets,
    approvals: saved.approvals || base.approvals,
    n8nWorkflowRuns: saved.n8nWorkflowRuns || base.n8nWorkflowRuns,
    policies: saved.policies || base.policies,
  };
}

function writeDemoState(state: AppState) {
  if (typeof window !== "undefined") {
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(state));
  }
}

function demoIntent(text: string) {
  const lower = text.toLowerCase();
  if (/loan|قرض|تمويل/.test(lower)) return "loan_eligibility";
  if (/salary|payroll|راتب|رواتب/.test(lower)) return "payroll_exception_inquiry";
  if (/card|بطاقة|كرت/.test(lower)) return "card_status";
  if (/kyc|هوية|وثائق/.test(lower)) return "kyc_review";
  if (/cliq|transfer|تحويل|كليك/.test(lower)) return "cliq_transfer_assist";
  return "general_banking_assistance";
}

async function withDemoFallback<T>(operation: () => Promise<T>, fallback: () => T | Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (!demoFallbackEnabled()) throw error;
    return fallback();
  }
}

function demoAnalyzeResponse(input: {
  transcript: string;
  mode: "employee" | "customer";
  language: "en" | "ar";
  actorName?: string;
  actorUserId?: string;
  actorCustomerId?: string;
}): AnalyzeResponse {
  const state = readDemoState();
  const intent = demoIntent(input.transcript);
  const auditId = `AUD-DEMO-${Date.now().toString(36).toUpperCase()}`;
  const now = new Date().toISOString();
  const ar = input.language === "ar";
  const isLoan = intent === "loan_eligibility";
  const isSalary = intent === "payroll_exception_inquiry";
  const customerSafeResponse = isLoan
    ? ar
      ? "طلب القرض قيد المراجعة. يرجى رفع شهادة راتب حديثة وكشف حساب لآخر 3 أشهر حتى يستطيع البنك إكمال التقييم."
      : "Your loan request is under review. Please upload a recent salary certificate and last 3 months bank statement so the bank can continue the assessment."
    : isSalary
      ? ar
        ? "الراتب قيد التحقق التشغيلي، والبنك يتابع الحالة مع جهة العمل بشكل آمن."
        : "Your salary is under operational verification, and the bank is coordinating safely with the employer."
      : ar
        ? "تم استلام طلبك وسيقوم البنك بمراجعته ضمن مسار آمن."
        : "We received your request and the bank will review it through a governed workflow.";
  const agentReports: AgentReport[] = [
    { agentId: "OrchestratorAgent", role: "Routes the request", status: "complete", signal: `route:${intent}`, confidence: 98, output: `Selected relevant specialists for ${intent}.`, evidence: [intent] },
    ...(isLoan ? [{ agentId: "CreditRiskAgent", role: "Assesses loan eligibility", status: "warning", signal: "documents_required", confidence: 91, output: "Documents are required before approval.", evidence: ["missingDocuments=Latest salary certificate|Last 3 months bank statement"] } as AgentReport] : []),
    { agentId: "PolicyAgent", role: "Checks banking policy", status: "complete", signal: "policy_match", confidence: 92, output: "Matched the relevant sandbox banking policy.", evidence: ["POL-DEMO"] },
    { agentId: "CustomerSafetyAgent", role: "Prepares customer-safe response", status: "complete", signal: "safe_response_ready", confidence: 96, output: "Customer-safe response is separated from internal reasoning.", evidence: ["customerSafeResponse"] },
    { agentId: "EvaluatorAgent", role: "Applies final quality gate", status: "complete", signal: isLoan ? "human_review_required" : "decision_quality_pass", confidence: 90, output: "Final response is ready for the demo preview.", evidence: [] },
  ];
  const audit: AuditLog = {
    auditId,
    correlationId: `CORR-DEMO-${Date.now().toString(36).toUpperCase()}`,
    timestamp: now,
    actor: input.actorName || (input.mode === "customer" ? "Customer Voice AI" : "Employee VoiceOps"),
    transcript: input.transcript,
    mode: input.mode,
    language: input.language,
    customerId: input.actorCustomerId || "10452",
    intent,
    confidence: 92,
    riskLevel: isLoan ? "Medium" : "Low",
    suggestedAction: isLoan ? "Ask customer to upload missing income documents." : "Route request to the appropriate operations queue.",
    requestType: isLoan ? "loan_application" : intent,
    recommendation: isLoan ? "request_documents" : "manual_review",
    decisionLabel: isLoan ? "Documents required" : "Operations review",
    decisionExplanation: isLoan ? "The request requires income documents before a final decision." : "The request should be reviewed by operations.",
    customerSafeResponse,
    requiredDocuments: isLoan ? ["Latest salary certificate", "Last 3 months bank statement", "Valid ID"] : [],
    agentReports,
    agentOrchestration: {
      pattern: "orchestrator-worker + evaluator-optimizer",
      activeRoute: intent,
      selectedAgents: agentReports.map((report) => report.agentId || "Agent"),
      agentReports,
      finalGate: isLoan ? "human_review_required" : "decision_quality_pass",
      qualityScore: 100,
      qualityChecks: [{ id: "nexus_preview", label: "Nexus offline fallback", passed: true, detail: "UI preview is using synthetic fallback data until a real backend URL is configured." }],
    },
    trace: [
      { step: "[Analyze]", status: "complete", detail: `Classified request as ${intent}.` },
      { step: "[Agent Triggered] OrchestratorAgent", status: "complete", detail: "Selected only relevant demo specialists." },
      { step: "[Final Response]", status: "complete", detail: "Customer-safe response prepared." },
    ],
    engine: "nexus-demo-fallback",
    model: "nexus-ui-preview",
    status: "pending_approval",
  };
  state.auditLogs = [audit, ...(state.auditLogs || [])];
  writeDemoState(state);
  return { analysis: audit as AuditLog & Record<string, unknown>, audit, openAiError: null };
}

export interface AnalyzeResponse {
  audit: AuditLog;
  analysis: AuditLog & Record<string, unknown>;
  openAiError?: string | null;
}

type FlatAnalyzeResponse = Record<string, unknown> & {
  auditId?: string;
  openAiError?: string | null;
  sourceCitations?: Array<{
    source?: string;
    excerpt?: string;
    policyId?: string;
  }>;
};

function normalizeAnalyzeResponse(
  raw: AnalyzeResponse | FlatAnalyzeResponse,
  input: {
    transcript: string;
    mode: "employee" | "customer";
    language: "en" | "ar";
    actorName?: string;
    actorCustomerId?: string;
  },
): AnalyzeResponse {
  if ("analysis" in raw && raw.analysis && "audit" in raw && raw.audit) {
    return raw as AnalyzeResponse;
  }

  const flat = raw as FlatAnalyzeResponse;
  const sourceCitations = Array.isArray(flat.sourceCitations) ? flat.sourceCitations : [];
  const sources = sourceCitations.map((citation) => ({
    title: citation.source || citation.policyId || "Bank policy",
    section: citation.excerpt,
  }));
  const auditId = String(flat.auditId || "");
  const analysis = {
    ...flat,
    auditId,
    sources,
  } as AuditLog & Record<string, unknown>;

  return {
    analysis,
    audit: {
      auditId,
      timestamp: new Date().toISOString(),
      actor: input.actorName || (input.mode === "customer" ? "Customer Voice AI" : "Employee VoiceOps"),
      transcript: input.transcript,
      mode: input.mode,
      language: input.language,
      customerId: input.actorCustomerId || null,
      intent: typeof flat.intent === "string" ? flat.intent : undefined,
      confidence: typeof flat.confidence === "number" ? flat.confidence : undefined,
      riskLevel: typeof flat.riskLevel === "string" ? flat.riskLevel : undefined,
      suggestedAction:
        typeof flat.suggestedAction === "string" ? flat.suggestedAction : undefined,
      requestType: typeof flat.requestType === "string" ? flat.requestType : undefined,
      recommendation:
        typeof flat.recommendation === "string" ? flat.recommendation : undefined,
      decisionLabel:
        typeof flat.decisionLabel === "string" ? flat.decisionLabel : undefined,
      decisionExplanation:
        typeof flat.decisionExplanation === "string" ? flat.decisionExplanation : undefined,
      customerSafeResponse:
        typeof flat.customerSafeResponse === "string" ? flat.customerSafeResponse : undefined,
      customerReason:
        typeof flat.customerReason === "string" ? flat.customerReason : undefined,
      requiredDocuments: Array.isArray(flat.requiredDocuments)
        ? flat.requiredDocuments.map(String)
        : undefined,
      sources,
      engine: typeof flat.engine === "string" ? flat.engine : undefined,
      model: typeof flat.model === "string" ? flat.model : undefined,
      status: "pending_approval",
      trace: Array.isArray(flat.trace) ? (flat.trace as AuditLog["trace"]) : undefined,
      agentReports: Array.isArray(flat.agentReports)
        ? (flat.agentReports as AuditLog["agentReports"])
        : undefined,
      agentOrchestration:
        flat.agentOrchestration && typeof flat.agentOrchestration === "object"
          ? (flat.agentOrchestration as AgentOrchestration)
          : undefined,
      correlationId: typeof flat.correlationId === "string" ? flat.correlationId : undefined,
      systemDirectiveVersion:
        typeof flat.systemDirectiveVersion === "string" ? flat.systemDirectiveVersion : undefined,
      auditSchemaVersion:
        typeof flat.auditSchemaVersion === "string" ? flat.auditSchemaVersion : undefined,
      structuredAuditTrail:
        flat.structuredAuditTrail && typeof flat.structuredAuditTrail === "object"
          ? (flat.structuredAuditTrail as StructuredAuditTrail)
          : undefined,
    },
    openAiError: typeof flat.openAiError === "string" ? flat.openAiError : null,
  };
}

// -------- Endpoints --------

export const api = {
  state: () => withDemoFallback(
    () => request<AppState>("/api/state"),
    () => readDemoState(),
  ),

  agentEvaluations: () =>
    withDemoFallback(
      () => request<AgentEvaluationSuite>("/api/evaluations/agents"),
      () => ({
        suiteVersion: "nexus-offline-eval",
        generatedAt: new Date().toISOString(),
        total: 5,
        passed: 5,
        failed: 0,
        score: 100,
        averageQuality: 100,
        status: "ready",
        scenarios: [
          "perfect-loan",
          "high-risk",
          "missing-doc",
          "fraud-transfer",
          "vip-policy",
        ].map((id) => ({
          id,
          title: id,
          category: "Nexus offline demo",
          customerId: "10452",
          expected: "UI preview scenario",
          passed: true,
          qualityScore: 100,
          finalGate: id === "perfect-loan" ? "decision_quality_pass" : "human_review_required",
          recommendation: id === "perfect-loan" ? "approve" : "manual_review",
          selectedAgents: ["OrchestratorAgent", "PolicyAgent", "CustomerSafetyAgent", "EvaluatorAgent"],
          checks: [{ id: "preview", label: "Preview data available", passed: true, detail: "Nexus fallback is active." }],
        })),
      }),
    ),

  voiceCapabilities: () =>
    withDemoFallback(
      () =>
        request<{ serverTranscription: boolean; model: string | null }>(
          "/api/voice-capabilities",
        ),
      () => ({ serverTranscription: false, model: null }),
    ),

  transcribeAudio: (input: {
    audioData: string;
    mimeType: string;
    language: "en" | "ar";
  }) =>
    withDemoFallback(
      () =>
        request<{ text: string; model: string }>("/api/transcribe", {
          method: "POST",
          body: JSON.stringify(input),
        }),
      () => ({
        text: input.language === "ar" ? "هل أستطيع التقديم على قرض شخصي؟" : "Can I apply for a personal loan?",
        model: "nexus-preview",
      }),
    ),

  analyze: async (input: {
    transcript: string;
    mode: "employee" | "customer";
    language: "en" | "ar";
    actorName?: string;
    actorUserId?: string;
    actorCustomerId?: string;
  }) => {
    const raw = await withDemoFallback(
      () =>
        request<AnalyzeResponse | FlatAnalyzeResponse>("/api/analyze", {
          method: "POST",
          body: JSON.stringify(input),
        }),
      () => demoAnalyzeResponse(input),
    );
    return normalizeAnalyzeResponse(raw, input);
  },

  createServiceRequest: (input: {
    auditId: string;
    requestType?: string;
    summary?: string;
  }) =>
    withDemoFallback(
      () =>
        request<{ request: ServiceRequest }>("/api/service-requests", {
          method: "POST",
          body: JSON.stringify(input),
        }),
      () => {
        const state = readDemoState();
        const audit = (state.auditLogs || []).find((item) => item.auditId === input.auditId);
        const created: ServiceRequest = {
          requestId: `REQ-DEMO-${Date.now().toString(36).toUpperCase()}`,
          auditId: input.auditId,
          createdAt: new Date().toISOString(),
          customerId: audit?.customerId || "10452",
          customerName: audit?.actor || "Nexus Demo Customer",
          type: input.requestType || audit?.requestType || "general_service_request",
          status: "Submitted",
          priority: audit?.riskLevel === "High" ? "High" : "Medium",
          channel: "Nexus Offline Demo",
          summary: input.summary || audit?.transcript || "Demo service request",
          documentIds: [],
          documentCount: 0,
          documentStatus: "Pending",
          decisionLabel: audit?.decisionLabel,
          decisionExplanation: audit?.decisionExplanation,
          decisionRecommendation: audit?.recommendation,
          riskLevel: audit?.riskLevel,
          analysisConfidence: audit?.confidence,
        };
        state.serviceRequests = [created, ...(state.serviceRequests || [])];
        writeDemoState(state);
        return { request: created };
      },
    ),

  uploadDocuments: (input: {
    requestId: string;
    customerId?: string;
    userId?: string;
    userName?: string;
    language?: string;
    files: Array<{ name: string; type: string; data: string /* base64 or dataUrl */ }>;
  }) =>
    withDemoFallback(
      () =>
        request<{ request: ServiceRequest; documents: DocumentUpload[] }>(
          "/api/service-requests/documents",
          { method: "POST", body: JSON.stringify(input) },
        ),
      () => {
        const state = readDemoState();
        const requestItem = (state.serviceRequests || []).find((item) => item.requestId === input.requestId);
        const lang = input.language === "ar" ? "ar" : "en";
        const inferType = (name: string) => {
          const text = name.toLowerCase();
          if (text.includes("salary") || text.includes("payslip") || text.includes("راتب")) return "salary_certificate";
          if (text.includes("statement") || text.includes("bank") || text.includes("كشف") || text.includes("حساب")) return "bank_statement";
          if (text.includes("id") || text.includes("identity") || text.includes("passport") || text.includes("هوية")) return "identity_document";
          return "supporting_document";
        };
        const documents = input.files.map((file) => {
          const documentType = inferType(file.name);
          const documentTypeLabel =
            documentType === "salary_certificate"
              ? lang === "ar" ? "شهادة راتب" : "Salary certificate"
              : documentType === "bank_statement"
                ? lang === "ar" ? "كشف حساب" : "Bank statement"
                : documentType === "identity_document"
                  ? lang === "ar" ? "وثيقة هوية" : "Identity document"
                  : lang === "ar" ? "مستند داعم" : "Supporting document";
          const confidence = documentType === "supporting_document" ? 64 : 90;
          return {
            documentId: `DOC-DEMO-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(16).slice(2, 6).toUpperCase()}`,
            requestId: input.requestId,
            customerId: input.customerId || requestItem?.customerId || "10452",
            originalName: file.name,
            storedName: file.name,
            mimeType: file.type,
            size: file.data.length,
            uploadedAt: new Date().toISOString(),
            uploadedByName: input.userName,
            intelligence: {
              agentId: "DocumentIntelligenceAgent",
              status: documentType === "supporting_document" ? "needs_review" : "analyzed",
              documentType,
              documentTypeLabel,
              confidence,
              extractedFields: {
                documentName: file.name,
                detectedType: documentTypeLabel,
                fileSizeKb: Math.round(file.data.length / 1024),
              },
              signals: [`${documentType}_detected`, "demo_metadata_analysis", "linked_to_loan_request"],
              flags: documentType === "supporting_document" ? [lang === "ar" ? "نوع المستند يحتاج مراجعة موظف" : "Document type needs officer review"] : [],
              recommendation: documentType === "supporting_document" ? "manual_document_review" : "accepted_for_credit_review",
              summary: lang === "ar"
                ? `تم تحليل المستند كـ ${documentTypeLabel} وربطه بطلب القرض.`
                : `Document analyzed as ${documentTypeLabel} and linked to the loan request.`,
            },
          };
        });
        state.documentUploads = [...documents, ...(state.documentUploads || [])];
        if (requestItem) {
          requestItem.documentIds = [...(requestItem.documentIds || []), ...documents.map((doc) => doc.documentId)];
          requestItem.documentCount = requestItem.documentIds.length;
          requestItem.documentStatus = "Analyzed - ready for credit review";
          requestItem.documentAnalysisSummary = {
            agentId: "DocumentIntelligenceAgent",
            status: "ready_for_credit_review",
            analyzedCount: documents.length,
            averageConfidence: Math.round(documents.reduce((sum, doc) => sum + (doc.intelligence?.confidence || 0), 0) / documents.length),
            detectedTypes: documents.map((doc) => doc.intelligence?.documentType || "unknown"),
            remainingRequiredDocuments: [],
            flags: documents.flatMap((doc) => doc.intelligence?.flags || []),
            summary: lang === "ar" ? "تم تحليل المستندات وربطها بطلب القرض." : "Documents analyzed and linked to the loan request.",
          };
        }
        writeDemoState(state);
        return { request: requestItem || (readDemoState().serviceRequests?.[0] as ServiceRequest), documents };
      },
    ),

  decideServiceRequest: (input: {
    requestId: string;
    decision: "approved" | "rejected" | "needs_review";
    note?: string;
    approver?: string;
    actorUserId?: string;
    language?: string;
  }) =>
    withDemoFallback(
      () =>
        request<{ request: ServiceRequest }>("/api/service-requests/decision", {
          method: "POST",
          body: JSON.stringify(input),
        }),
      () => {
        const state = readDemoState();
        const requestItem = (state.serviceRequests || []).find((item) => item.requestId === input.requestId);
        if (!requestItem) throw new Error("Demo request not found");
        requestItem.status =
          input.decision === "approved" ? "Approved" : input.decision === "rejected" ? "Rejected" : "Needs Review";
        requestItem.adminDecision = input.decision;
        requestItem.adminNote = input.note || "Decision recorded in Nexus offline demo mode.";
        requestItem.decidedAt = new Date().toISOString();
        requestItem.decidedBy = input.approver || "Demo Operations Officer";
        writeDemoState(state);
        return { request: requestItem };
      },
    ),

  createTicket: (input: { auditId: string; title?: string }) =>
    withDemoFallback(
      () =>
        request<{ ticket: Ticket }>("/api/tickets", {
          method: "POST",
          body: JSON.stringify(input),
        }),
      () => {
        const ticket: Ticket = {
          ticketId: `TCK-DEMO-${Date.now().toString(36).toUpperCase()}`,
          auditId: input.auditId,
          createdAt: new Date().toISOString(),
          status: "Open",
          priority: "Medium",
          title: input.title || "Nexus demo ticket",
          owner: "Demo Operations",
          summary: "Generated in Nexus offline fallback mode.",
        };
        const state = readDemoState();
        state.tickets = [ticket, ...(state.tickets || [])];
        writeDemoState(state);
        return { ticket };
      },
    ),

  approve: (input: { auditId: string; decision?: string; note?: string; approver?: string }) =>
    withDemoFallback(
      () =>
        request<{ approval: Approval }>("/api/approve", {
          method: "POST",
          body: JSON.stringify(input),
        }),
      () => {
        const approval: Approval = {
          approvalId: `APR-DEMO-${Date.now().toString(36).toUpperCase()}`,
          auditId: input.auditId,
          timestamp: new Date().toISOString(),
          approver: input.approver || "Demo Operations Officer",
          decision: input.decision || "Approved",
          note: input.note || "Approved in Nexus offline demo mode.",
        };
        const state = readDemoState();
        state.approvals = [approval, ...(state.approvals || [])];
        writeDemoState(state);
        return { approval };
      },
    ),

  reset: () =>
    withDemoFallback(
      () => request<{ ok: true }>("/api/reset", { method: "POST", body: "{}" }),
      () => {
        if (typeof window !== "undefined") localStorage.removeItem(DEMO_STORAGE_KEY);
        return { ok: true as const };
      },
    ),

  documentViewUrl: (documentId: string) => url(`/api/documents/${documentId}/view`),
  documentDownloadUrl: (documentId: string) => url(`/api/documents/${documentId}/download`),
};

// Read a File and return base64 data URL suitable for the /api/service-requests/documents endpoint.
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}
