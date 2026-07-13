import http from "node:http";
import { spawn } from "node:child_process";
import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "data");
const DB_PATH = path.join(DATA_DIR, "db.json");
const SEED_PATH = path.join(DATA_DIR, "seed.json");
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
const PUBLIC_DIR = path.join(__dirname, "public");
const PORT = Number(process.env.PORT || 4173);
const FRONTEND_DEV_PORT = Number(process.env.FRONTEND_DEV_PORT || 8080);
const FRONTEND_DEV_URL = (process.env.FRONTEND_DEV_URL || `http://127.0.0.1:${FRONTEND_DEV_PORT}`).replace(/\/$/, "");
const FRONTEND_DIR_CANDIDATES = [
  path.join(__dirname, "..", "nexus-ai-voiceops-frontend"),
  path.join(__dirname, "..", "02_Frontend_Banking_UI")
];
const FRONTEND_DIR = FRONTEND_DIR_CANDIDATES.find((dir) => existsSync(path.join(dir, "package.json")));
const USE_FRONTEND_PROXY = process.env.NEXUS_SINGLE_URL !== "false" && Boolean(FRONTEND_DIR);
const MODEL = process.env.OPENAI_MODEL || "gpt-5.5";
const TRANSCRIBE_MODEL = process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-4o-mini-transcribe";
const NEXUS_SYSTEM_DIRECTIVE_VERSION = "nexus-banking-architect-v1";
const NEXUS_AUDIT_SCHEMA_VERSION = "nexus-audit-trail-v2";
const NEXUS_SYSTEM_DIRECTIVE = `
You are the Nexus Banking Architect, the central intelligence layer governing the Nexus AI VoiceOps banking platform.

Operational philosophy:
- Security: protect customer data, never expose raw credentials, and separate internal operations from customer-facing content.
- Traceability: every decision must be linked to route, selected agents, policy evidence, quality gate, and audit metadata.
- Explainability: negative or delayed outcomes must include specific policy-grounded reasons and next actions.

Operational protocol:
1. Analyze every input to distinguish standard inquiries from operational banking requests.
2. Orchestrate only the relevant specialized banking agents: CreditRiskAgent, ComplianceAgent, FraudAgent, PolicyAgent, PayrollOpsAgent, AccountDataAgent, and CustomerSafetyAgent.
3. Verify and govern every decision with EvaluatorAgent against the Banking Policy Knowledge Base.
4. If the decision is ambiguous, high risk, missing documents, or requires execution, escalate to Human-in-the-loop review in the Employee Workspace.
5. Log a structured JSON audit trail for input ingestion, routing, agent outputs, policy checks, quality gates, and final response separation.
6. Keep Internal AI Reasoning for employee/audit views only as concise operational summaries. Do not reveal hidden chain-of-thought.
7. Keep External Customer Response empathetic, precise, and safe for customer channels.
`.trim();

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".pdf": "application/pdf"
};

async function ensureDb() {
  await mkdir(DATA_DIR, { recursive: true });
  await mkdir(UPLOAD_DIR, { recursive: true });
  if (!existsSync(DB_PATH)) {
    await copyFile(SEED_PATH, DB_PATH);
  }
}

async function readDb() {
  await ensureDb();
  const raw = await readFile(DB_PATH, "utf8");
  const db = JSON.parse(raw.replace(/^\uFEFF/, ""));
  db.users ||= [];
  db.customers ||= [];
  db.payrollRecords ||= [];
  db.bankAccounts ||= [];
  db.transactions ||= [];
  db.loanApplications ||= [];
  db.cards ||= [];
  db.kycProfiles ||= [];
  db.beneficiaries ||= [];
  db.customerDocuments ||= [];
  db.demoPersonas ||= [];
  db.serviceRequests ||= [];
  db.documentUploads ||= [];
  db.n8nWorkflowRuns ||= [];
  db.policies ||= [];
  db.tickets ||= [];
  db.approvals ||= [];
  db.auditLogs ||= [];
  return repairArabicMojibakeDeep(db);
}

async function writeDb(db) {
  await writeFile(DB_PATH, JSON.stringify(repairArabicMojibakeDeep(db), null, 2), "utf8");
}

function json(res, status, body) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    ...corsHeaders()
  });
  res.end(JSON.stringify(repairArabicMojibakeDeep(body)));
}

function corsHeaders() {
  return {
    "access-control-allow-origin": process.env.CORS_ORIGIN || "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type,authorization,x-nexus-correlation-id,x-nexus-workflow-id",
    "access-control-max-age": "86400"
  };
}

const cp1256HighCodepoints = [
  0x20ac, 0x067e, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021,
  0x02c6, 0x2030, 0x0679, 0x2039, 0x0152, 0x0686, 0x0698, 0x0688,
  0x06af, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014,
  0x06a9, 0x2122, 0x0691, 0x203a, 0x0153, 0x200c, 0x200d, 0x06ba,
  0x00a0, 0x060c, 0x00a2, 0x00a3, 0x00a4, 0x00a5, 0x00a6, 0x00a7,
  0x00a8, 0x00a9, 0x06be, 0x00ab, 0x00ac, 0x00ad, 0x00ae, 0x00af,
  0x00b0, 0x00b1, 0x00b2, 0x00b3, 0x00b4, 0x00b5, 0x00b6, 0x00b7,
  0x00b8, 0x00b9, 0x061b, 0x00bb, 0x00bc, 0x00bd, 0x00be, 0x061f,
  0x06c1, 0x0621, 0x0622, 0x0623, 0x0624, 0x0625, 0x0626, 0x0627,
  0x0628, 0x0629, 0x062a, 0x062b, 0x062c, 0x062d, 0x062e, 0x062f,
  0x0630, 0x0631, 0x0632, 0x0633, 0x0634, 0x0635, 0x0636, 0x00d7,
  0x0637, 0x0638, 0x0639, 0x063a, 0x0640, 0x0641, 0x0642, 0x0643,
  0x00e0, 0x0644, 0x00e2, 0x0645, 0x0646, 0x0647, 0x0648, 0x00e7,
  0x00e8, 0x00e9, 0x00ea, 0x00eb, 0x0649, 0x064a, 0x00ee, 0x00ef,
  0x064b, 0x064c, 0x064d, 0x064e, 0x00f4, 0x064f, 0x0650, 0x00f7,
  0x0651, 0x00f9, 0x0652, 0x00fb, 0x00fc, 0x200e, 0x200f, 0x06d2
];
const cp1256Reverse = new Map(cp1256HighCodepoints.map((cp, index) => [String.fromCodePoint(cp), 0x80 + index]));
const cp1256ContinuationChars = new Set(cp1256HighCodepoints.slice(0, 0x40).map((cp) => String.fromCodePoint(cp)));

function mojibakeScore(text) {
  let score = 0;
  for (let i = 0; i < text.length - 1; i += 1) {
    if ((text[i] === "ط" || text[i] === "ظ") && cp1256ContinuationChars.has(text[i + 1])) score += 1;
  }
  return score;
}

function repairArabicMojibake(text) {
  if (typeof text !== "string" || !text) return text;
  const score = mojibakeScore(text);
  if (!score) return text;
  const bytes = [];
  for (const char of text) {
    const codepoint = char.codePointAt(0);
    if (codepoint <= 0x7f) {
      bytes.push(codepoint);
    } else if (cp1256Reverse.has(char)) {
      bytes.push(cp1256Reverse.get(char));
    } else {
      return text;
    }
  }
  const decoded = Buffer.from(bytes).toString("utf8");
  if (!decoded || decoded.includes("\uFFFD")) return text;
  return mojibakeScore(decoded) < score ? decoded : text;
}

function repairArabicMojibakeDeep(value) {
  if (typeof value === "string") return repairArabicMojibake(value);
  if (Array.isArray(value)) return value.map((item) => repairArabicMojibakeDeep(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, repairArabicMojibakeDeep(item)]));
  }
  return value;
}

function sendOptions(res) {
  res.writeHead(204, corsHeaders());
  res.end();
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function id(prefix) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

const n8nWorkflowRegistry = {
  customer_request_router: {
    workflowId: "nexus.customer_request_router",
    name: "Customer Request Router",
    path: "/webhook/nexus/customer-request-router",
    purpose: "Notify the responsible banking queue and create a work item in external operations tooling."
  },
  loan_documents_intake: {
    workflowId: "nexus.loan_documents_intake",
    name: "Loan Documents Intake",
    path: "/webhook/nexus/loan-documents-intake",
    purpose: "Notify Credit Operations that customer loan documents are ready for review."
  },
  loan_decision_notification: {
    workflowId: "nexus.loan_decision_notification",
    name: "Loan Decision Notification",
    path: "/webhook/nexus/loan-decision-notification",
    purpose: "Send the final loan decision to downstream banking channels after human review."
  },
  payroll_exception_ops12: {
    workflowId: "nexus.payroll_exception_ops12",
    name: "Payroll OPS-12 Exception",
    path: "/webhook/nexus/payroll-ops12-exception",
    purpose: "Create an OPS-12 payroll exception, notify Payroll Operations, and request employer correction."
  },
  ticket_created: {
    workflowId: "nexus.ticket_created",
    name: "OPS Ticket Created",
    path: "/webhook/nexus/ops-ticket-created",
    purpose: "Notify the human operations queue that a governed AI ticket was opened."
  },
  operations_alert: {
    workflowId: "nexus.operations_alert",
    name: "Operations Alert",
    path: "/webhook/nexus/operations-alert",
    purpose: "Escalate automation failures to a human supervisor."
  }
};

function n8nWebhookUrl(workflow) {
  const base = String(process.env.N8N_WEBHOOK_BASE_URL || "").trim();
  if (!base) return null;
  return new URL(workflow.path.replace(/^\//, ""), base.endsWith("/") ? base : `${base}/`).toString();
}

function workflowForRequest(request = {}) {
  if (request.type === "loan_application") return "customer_request_router";
  if (request.type === "payroll_exception_inquiry") return "payroll_exception_ops12";
  return "customer_request_router";
}

function documentLinks(documents = []) {
  return documents.map((document) => ({
    document_id: document.documentId,
    mime_type: document.mimeType,
    size_bytes: document.size,
    view_url: `/api/documents/${document.documentId}/view`,
    download_url: `/api/documents/${document.documentId}/download`
  }));
}

function buildN8nPayload({ workflowKey, eventType, correlationId, request, audit, ticket, documents = [], decision, failure }) {
  return {
    correlation_id: correlationId,
    workflow_id: n8nWorkflowRegistry[workflowKey]?.workflowId || workflowKey,
    event_type: eventType,
    created_at: new Date().toISOString(),
    governance: {
      pii_policy: "redacted_minimum_required",
      raw_credentials_included: false,
      audit_trail_required: true,
      channel: "secure_internal_gateway"
    },
    customer: {
      customer_id: request?.customerId || audit?.customerId || ticket?.customerId || null
    },
    request: request ? {
      request_id: request.requestId,
      audit_id: request.auditId,
      request_type: request.type,
      status: request.status,
      priority: request.priority,
      assigned_queue: request.assignedQueue,
      decision_label: request.decisionLabel,
      decision_score: request.analysisConfidence,
      risk_level: request.riskLevel,
      required_documents: request.requiredDocuments || [],
      document_status: request.documentStatus,
      document_count: request.documentCount || 0
    } : null,
    ticket: ticket ? {
      ticket_id: ticket.ticketId,
      audit_id: ticket.auditId,
      priority: ticket.priority,
      owner: ticket.owner,
      payroll_id: ticket.payrollId || null
    } : null,
    audit_context: audit ? {
      audit_id: audit.auditId,
      intent: audit.intent,
      payroll_id: audit.payrollId || null,
      risk_level: audit.riskLevel,
      confidence: audit.confidence,
      suggested_action: audit.suggestedAction
    } : null,
    decision: decision || null,
    attached_docs_url: documentLinks(documents),
    failure: failure || null
  };
}

async function triggerN8nWorkflow(db, workflowKey, payload, { onFailureAlert = true } = {}) {
  const workflow = n8nWorkflowRegistry[workflowKey] || n8nWorkflowRegistry.customer_request_router;
  const webhookUrl = n8nWebhookUrl(workflow);
  const now = new Date().toISOString();
  const run = {
    runId: id("N8N"),
    correlationId: payload.correlation_id,
    workflowKey,
    workflowId: workflow.workflowId,
    workflowName: workflow.name,
    eventType: payload.event_type,
    requestedAt: now,
    webhook: {
      method: "POST",
      url: webhookUrl || `sandbox://n8n${workflow.path}`
    },
    payload,
    status: "pending",
    responseStatus: null,
    responseBody: null
  };

  if (!webhookUrl) {
    run.status = "sandbox_queued";
    run.responseStatus = 202;
    run.responseBody = { ok: true, mode: "sandbox", message: "Webhook generated but not sent because N8N_WEBHOOK_BASE_URL is not configured." };
  } else {
    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-nexus-correlation-id": payload.correlation_id,
          "x-nexus-workflow-id": workflow.workflowId
        },
        body: JSON.stringify(payload)
      });
      run.responseStatus = response.status;
      const text = await response.text();
      run.responseBody = text.slice(0, 1000);
      run.status = response.ok ? "success" : "failed";
    } catch (error) {
      run.status = "failed";
      run.responseBody = error.message;
    }
  }

  db.n8nWorkflowRuns ||= [];
  db.n8nWorkflowRuns.unshift(run);
  db.auditLogs.unshift({
    auditId: id("AUD"),
    timestamp: new Date().toISOString(),
    actor: "Nexus Operations Architect",
    actorUserId: null,
    transcript: `n8n workflow ${workflow.workflowId} ${run.status} with correlation ${payload.correlation_id}`,
    mode: "system",
    language: "en",
    customerId: payload.customer?.customer_id || null,
    payrollId: payload.audit_context?.payroll_id || null,
    intent: "n8n_workflow_trigger",
    confidence: 100,
    riskLevel: run.status === "failed" ? "High" : "Low",
    suggestedAction: workflow.purpose,
    correlationId: payload.correlation_id,
    workflowId: workflow.workflowId,
    sources: [],
    engine: "n8n-operations-architect",
    model: "nexus-n8n-bridge-v1",
    status: run.status
  });

  if (run.status === "failed" && onFailureAlert && workflowKey !== "operations_alert") {
    const alertCorrelationId = id("CORR");
    const alertPayload = buildN8nPayload({
      workflowKey: "operations_alert",
      eventType: "automation_failure",
      correlationId: alertCorrelationId,
      failure: {
        failed_correlation_id: payload.correlation_id,
        failed_workflow_id: workflow.workflowId,
        response_status: run.responseStatus,
        response_body: run.responseBody
      }
    });
    await triggerN8nWorkflow(db, "operations_alert", alertPayload, { onFailureAlert: false });
  }

  return run;
}

function sanitizeFileName(name = "document") {
  const cleaned = String(name).replace(/[^\w.\- ]+/g, "").replace(/\s+/g, "-").slice(0, 90);
  return cleaned || "document";
}

function extensionForMime(mimeType) {
  const map = {
    "application/pdf": ".pdf",
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/webp": ".webp"
  };
  return map[mimeType] || "";
}

function parseUploadedFile(file) {
  const mimeType = String(file.type || "").toLowerCase();
  const allowed = ["application/pdf", "image/png", "image/jpeg", "image/jpg", "image/webp"];
  if (!allowed.includes(mimeType)) {
    throw new Error("Only PDF and image documents are allowed.");
  }

  const encoded = String(file.data || file.dataUrl || "");
  const base64 = encoded.includes(",") ? encoded.split(",").pop() : encoded;
  const buffer = Buffer.from(base64, "base64");
  if (!buffer.length || buffer.length > 4 * 1024 * 1024) {
    throw new Error("Each document must be smaller than 4MB.");
  }

  const originalName = sanitizeFileName(file.name || `document${extensionForMime(mimeType)}`);
  const ext = path.extname(originalName) || extensionForMime(mimeType);
  return { buffer, originalName, mimeType, ext };
}

function extractEntity(transcript, fallbackId = "10452") {
  const normalized = String(transcript || "");
  const matches = normalized.match(/\b\d{4,8}\b/g);
  return matches?.[0] || fallbackId || "10452";
}

function normalizeDigits(value = "") {
  const arabicDigits = "٠١٢٣٤٥٦٧٨٩";
  const easternArabicDigits = "۰۱۲۳۴۵۶۷۸۹";
  return String(value)
    .replace(/[٠-٩]/g, (digit) => String(arabicDigits.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String(easternArabicDigits.indexOf(digit)));
}

function extractRequestedAmount(transcript, customerId) {
  const text = normalizeDigits(transcript).toLowerCase();
  const matches = [...text.matchAll(/(\d+(?:[.,]\d+)?)\s*(مليون|million|ألف|الف|thousand|jod|دينار|دنانير)?/g)];
  const candidates = matches
    .map((match) => {
      const raw = Number(match[1].replace(",", ""));
      const unit = match[2] || "";
      const factor = /مليون|million/.test(unit)
        ? 1_000_000
        : /ألف|الف|thousand/.test(unit)
          ? 1_000
          : 1;
      return raw * factor;
    })
    .filter((amount) => Number.isFinite(amount) && amount > 0 && String(amount) !== String(customerId));
  return candidates.length ? Math.max(...candidates) : null;
}

function randomDigits(length) {
  let output = "";
  while (output.length < length) output += String(Math.floor(Math.random() * 10));
  return output;
}

function maskEmail(email) {
  if (!email || !email.includes("@")) return email || "--";
  const [name, domain] = email.split("@");
  return `${name.slice(0, 2)}***@${domain}`;
}

function detectIntent(transcript) {
  const normalize = (value = "") => String(value)
    .toLowerCase()
    .replace(/[إأآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[ًٌٍَُِّْـ]/g, "");
  const text = normalize(transcript);
  const has = (...terms) => terms.some((term) => text.includes(normalize(term)));
  if (has("loan", "credit", "facility", "debt-to-income", "collateral")) return "loan_eligibility";
  if (has("شكوى", "مشكلة", "complaint", "dispute", "اعتراض")) return "service_request";
  if (has("راتب", "راتبي", "راتبه", "رواتب", "معاش", "salary", "payroll", "wage", "ما نزل", "مانزل", "تأخر", "تاخر")) return "payroll_exception_inquiry";
  if (has("رصيد", "balance", "account balance", "كم معي")) return "balance_inquiry";
  if (has("آخر عملية", "اخر عملية", "معاملات", "حركات", "transactions", "last transaction")) return "transaction_history";
  if (has("قرض", "loan", "تمويل", "credit", "أهلية", "اهلية")) return "loan_eligibility";
  if (has("بطاقة", "بطاق", "كرت", "card", "blocked", "موقوف", "وقف")) return "card_status";
  if (has("اعرف عميلك", "kyc", "هوية", "وثائق", "مستندات", "تحديث بيانات")) return "kyc_review";
  if (has("كليك", "cliq", "حول", "حوّل", "تحويل", "transfer", "beneficiary")) return "cliq_transfer_assist";
  if (has("request", "خدمة")) return "service_request";
  if (has("افتح حساب", "فتح حساب", "open account", "new account")) return "account_opening";
  return "general_banking_assistance";
}

function canonicalizeIntent(modelIntent, detectedIntent) {
  const known = new Set([
    "payroll_exception_inquiry",
    "balance_inquiry",
    "transaction_history",
    "loan_eligibility",
    "card_status",
    "kyc_review",
    "cliq_transfer_assist",
    "service_request",
    "account_opening",
    "general_banking_assistance"
  ]);
  if (known.has(detectedIntent) && detectedIntent !== "general_banking_assistance") {
    return detectedIntent;
  }

  const intent = String(modelIntent || "").toLowerCase();
  if (/loan|credit|lending|finance|eligib|facility/.test(intent)) return "loan_eligibility";
  if (/salary|payroll|wage/.test(intent)) return "payroll_exception_inquiry";
  if (/balance/.test(intent)) return "balance_inquiry";
  if (/transaction|statement|history/.test(intent)) return "transaction_history";
  if (/card/.test(intent)) return "card_status";
  if (/kyc|compliance|identity_document/.test(intent)) return "kyc_review";
  if (/cliq|transfer|beneficiary/.test(intent)) return "cliq_transfer_assist";
  if (/account.*open|open.*account/.test(intent)) return "account_opening";
  if (/service|complaint|dispute|request/.test(intent)) return "service_request";
  return known.has(detectedIntent) ? detectedIntent : "general_banking_assistance";
}

function requestTypeForIntent(intent) {
  const map = {
    loan_eligibility: "loan_application",
    card_status: "card_reactivation",
    kyc_review: "kyc_update",
    cliq_transfer_assist: "cliq_transfer_review",
    account_opening: "account_opening",
    transaction_history: "transaction_dispute",
    payroll_exception_inquiry: "payroll_exception_inquiry",
    balance_inquiry: "balance_inquiry",
    service_request: "general_service_request"
  };
  return map[intent] || "general_service_request";
}

function sourceKeywordsForIntent(intent) {
  const map = {
    payroll_exception_inquiry: ["salary", "payroll", "OPS-12", "suspended"],
    loan_eligibility: ["loan", "credit", "eligibility", "income"],
    card_status: ["card", "blocked", "reactivate"],
    kyc_review: ["KYC", "review", "business activity"],
    cliq_transfer_assist: ["CliQ", "transfer", "beneficiary", "confirmation"],
    service_request: ["customer notification", "response"],
    account_opening: ["KYC", "review"],
    balance_inquiry: ["customer notification", "response"],
    transaction_history: ["customer notification", "response"]
  };
  return map[intent] || ["customer notification", "response"];
}

function searchPolicies(policies, transcript, record, intent = "general_banking_assistance") {
  const keywords = sourceKeywordsForIntent(intent).join(" ");
  const haystack = `${transcript} ${keywords} ${record?.exceptionCode || ""} ${record?.reason || ""}`.toLowerCase();
  const scored = policies
    .map((policy) => {
      const score = policy.keywords.reduce((sum, keyword) => {
        return haystack.includes(keyword.toLowerCase()) ? sum + 2 : sum;
      }, 0) + (haystack.includes("salary") && policy.title.includes("Payroll") ? 1 : 0);
      return { ...policy, score };
    })
    .sort((a, b) => b.score - a.score);
  return scored[0]?.score > 0 ? scored.slice(0, 2) : policies.slice(0, 1);
}

function localizePolicy(policy, language) {
  if (language !== "ar") return policy;
  const arabicExcerpts = {
    "POL-PAY-EX-3-2": "إذا كان رقم الحساب في ملف رواتب الشركة لا يطابق سجل العميل الرئيسي في البنك، يجب تعليق الراتب. على قسم العمليات فتح تذكرة OPS-12، وإرفاق دليل عدم التطابق، وطلب تصحيح من جهة العمل، وإبلاغ العميل بتفسير آمن لا يكشف تفاصيل حساسة.",
    "POL-PAY-EX-4-1": "يجب أن تتجنب الردود الموجهة للعميل كشف تفاصيل ملف جهة العمل. الرد المعتمد: الراتب قيد التحقق التشغيلي والبنك ينسق مع جهة العمل.",
    "POL-KYC-2-4": "ملفات الشركات الصغيرة والمتوسطة التي تتطلب مراجعة نشاط تجاري تحتاج إلى مستندات محدثة قبل تحرير العمليات عالية القيمة."
  };
  return { ...policy, excerpt: arabicExcerpts[policy.policyId] || policy.excerpt };
}

function buildOperationalDecision({ intent, riskLevel, confidence, suggestedAction, language = "en" }) {
  const ar = language === "ar";
  const reviewLabel = ar ? "مراجعة تشغيلية" : "Operations review";
  const defaultDocs = ar ? ["إثبات هوية", "تأكيد بيانات التواصل"] : ["Proof of identity", "Contact details confirmation"];

  if (intent === "loan_eligibility") {
    const isHighRisk = riskLevel === "High";
    return {
      recommendation: isHighRisk ? "manual_review" : "conditional_approval",
      decisionLabel: isHighRisk ? (ar ? "مراجعة يدوية" : "Manual review") : (ar ? "قبول مشروط" : "Conditional approval"),
      decisionExplanation: isHighRisk
        ? (ar
            ? "نسبة الالتزامات أو جودة المستندات تحتاج مراجعة ائتمانية قبل إصدار قرار نهائي."
            : "Debt burden or document quality requires credit review before a final decision.")
        : (ar
            ? "العميل مؤهل مبدئيا لأن نسبة الالتزامات ضمن الحد التجريبي، لكن القرار النهائي مشروط برفع شهادة راتب حديثة وتأكيد الدخل."
            : "The customer is preliminarily eligible because debt burden is within the sandbox threshold, but final approval requires income verification."),
      requiredDocuments: ar
        ? ["شهادة راتب حديثة", "كشف حساب آخر 3 أشهر", "هوية سارية"]
        : ["Latest salary certificate", "Last 3 months bank statement", "Valid ID"]
    };
  }

  if (intent === "payroll_exception_inquiry") {
    return {
      recommendation: riskLevel === "Low" ? "approve" : "manual_review",
      decisionLabel: riskLevel === "Low" ? (ar ? "إغلاق بعد التحقق" : "Close after confirmation") : reviewLabel,
      decisionExplanation: riskLevel === "Low"
        ? (ar ? "لا يوجد استثناء نشط، ويمكن إبلاغ العميل بالحالة." : "No active exception is present, so the customer can be informed.")
        : (ar ? "يوجد استثناء تشغيلي يحتاج معالجة قبل إغلاق الطلب." : "An operational exception must be handled before closing the request."),
      requiredDocuments: riskLevel === "Low" ? [] : (ar ? ["دليل عدم التطابق", "تصحيح جهة العمل"] : ["Mismatch evidence", "Employer correction"])
    };
  }

  if (intent === "kyc_review") {
    return {
      recommendation: "manual_review",
      decisionLabel: reviewLabel,
      decisionExplanation: ar
        ? "ملف العميل يحتاج تحديث مستندات KYC قبل تنفيذ الطلب."
        : "The customer profile requires KYC document refresh before fulfillment.",
      requiredDocuments: ar ? ["وثائق KYC الناقصة", "إثبات نشاط/دخل عند الحاجة"] : ["Missing KYC documents", "Business/income proof if required"]
    };
  }

  if (intent === "card_status" || intent === "cliq_transfer_assist") {
    return {
      recommendation: riskLevel === "Low" ? "approve" : "manual_review",
      decisionLabel: riskLevel === "Low" ? (ar ? "قابل للتنفيذ" : "Ready to fulfill") : reviewLabel,
      decisionExplanation: ar
        ? "الطلب يحتاج تحقق أمني/تشغيلي قبل التنفيذ في قناة العميل."
        : "The request needs security or operations verification before customer-channel fulfillment.",
      requiredDocuments: defaultDocs
    };
  }

  return {
    recommendation: confidence >= 85 && riskLevel === "Low" ? "approve" : "manual_review",
    decisionLabel: confidence >= 85 && riskLevel === "Low" ? (ar ? "قابل للتنفيذ" : "Ready to fulfill") : reviewLabel,
    decisionExplanation: ar
      ? (suggestedAction || "يحتاج الطلب مراجعة موظف البنك قبل القرار النهائي.")
      : (suggestedAction || "The request needs bank staff review before a final decision."),
    requiredDocuments: riskLevel === "Low" ? [] : defaultDocs
  };
}

function normalizeOperationalDecision({ decision, intent, riskLevel, language = "en" }) {
  const ar = language === "ar";
  if (intent !== "loan_eligibility") return decision;
  if (riskLevel === "High") {
    return {
      ...decision,
      recommendation: "reject",
      decisionLabel: ar ? "رفض - مخاطر عالية" : "Rejected - high risk",
      decisionExplanation: ar
        ? "نسبة الالتزامات مرتفعة وتتجاوز حدود السياسة التجريبية، لذلك يوصي النظام برفض الطلب."
        : "Debt burden is above the sandbox policy threshold, so the system recommends rejecting the request.",
      requiredDocuments: []
    };
  }
  if (riskLevel === "Low") {
    return {
      ...decision,
      recommendation: "approve",
      decisionLabel: ar ? "موافقة" : "Approved",
      decisionExplanation: ar
        ? "الدخل متحقق ونسبة الالتزامات منخفضة، لذلك الطلب مؤهل للموافقة."
        : "Income is verified and debt burden is low, so the request is eligible for approval.",
      requiredDocuments: []
    };
  }
  return decision;
}

function agentReport(agentId, role, status, signal, confidence, output, evidence = []) {
  return { agentId, role, status, signal, confidence, output, evidence };
}

function policyAgent({ policies, intent }) {
  const matched = policies[0];
  return agentReport(
    "PolicyAgent",
    "Retrieves and checks bank policies",
    matched ? "complete" : "warning",
    matched ? "policy_match" : "policy_gap",
    matched ? 92 : 55,
    matched ? `Matched ${matched.source} for ${intent}.` : `No strong policy match found for ${intent}.`,
    matched ? [matched.policyId] : []
  );
}

function creditRiskAgent({ db, customer, requestedAmount }) {
  const loan = db.loanApplications.find((item) => item.customerId === customer?.customerId);
  const documentProfile = db.customerDocuments.find((item) => item.customerId === customer?.customerId);
  if (!loan) {
    return agentReport("CreditRiskAgent", "Assesses loan eligibility", "warning", "missing_loan_record", 58, "No loan application profile was found.", []);
  }

  const evaluatedAmount = requestedAmount || loan.requestedAmount;
  const affordabilityMultiple = loan.monthlyIncome > 0
    ? evaluatedAmount / (loan.monthlyIncome * 12)
    : Number.POSITIVE_INFINITY;
  const amountOutsidePolicy = affordabilityMultiple > 10 || evaluatedAmount > 1_000_000;
  const highBurden = loan.debtBurdenRatio > 45;
  const rejectLevel = loan.debtBurdenRatio > 60 || amountOutsidePolicy;
  const missingDocuments = documentProfile?.missingDocuments || [];
  const documentsIncomplete = missingDocuments.length > 0;
  const approvalReady = !highBurden && /approved|verified|clean/i.test(`${loan.preEligibility} ${loan.recommendedAction}`);
  return agentReport(
    "CreditRiskAgent",
    "Assesses loan eligibility",
    "complete",
    rejectLevel
      ? "reject_recommended"
      : highBurden
        ? "high_debt_burden"
        : documentsIncomplete
          ? "documents_required"
          : approvalReady
            ? "approval_ready"
            : "conditional_credit_fit",
    amountOutsidePolicy ? 98 : highBurden ? 82 : approvalReady ? 95 : 91,
    amountOutsidePolicy
      ? `Requested amount is ${evaluatedAmount.toLocaleString("en-US")} ${loan.currency}, equal to ${affordabilityMultiple.toFixed(1)} years of current annual income. It is outside the demo affordability threshold, so rejection is recommended.`
      : rejectLevel
        ? `Debt burden is ${loan.debtBurdenRatio}%, so the agent recommends rejection under sandbox policy.`
      : highBurden
        ? `Debt burden is ${loan.debtBurdenRatio}%, so manual credit review is required.`
      : documentsIncomplete
        ? `Credit indicators are acceptable, but the request cannot proceed until these documents are supplied: ${missingDocuments.join(", ")}.`
      : approvalReady
        ? `Debt burden is ${loan.debtBurdenRatio}% and income is verified, so the customer is ready for approval.`
        : `Debt burden is ${loan.debtBurdenRatio}%, so the customer can move to conditional approval with income verification.`,
    [
      `requestedAmount=${evaluatedAmount} ${loan.currency}`,
      `monthlyIncome=${loan.monthlyIncome} ${loan.currency}`,
      `debtBurdenRatio=${loan.debtBurdenRatio}%`,
      `missingDocuments=${missingDocuments.join("|") || "none"}`
    ]
  );
}

function complianceAgent({ db, customer, intent }) {
  const kyc = db.kycProfiles.find((item) => item.customerId === customer?.customerId);
  if (!kyc) {
    return agentReport("ComplianceAgent", "Reviews KYC and compliance readiness", "warning", "kyc_missing", 60, "No KYC profile was found for this customer.", []);
  }

  const validStatus = ["Current", "Valid"].includes(kyc.status);
  const needsReview = !validStatus || kyc.riskRating === "Medium" || kyc.missingDocuments.length > 0 || intent === "kyc_review";
  return agentReport(
    "ComplianceAgent",
    "Reviews KYC and compliance readiness",
    "complete",
    needsReview ? "kyc_review_required" : "kyc_clear",
    needsReview ? 84 : 94,
    needsReview
      ? `KYC status is ${kyc.status}; missing documents: ${kyc.missingDocuments.join(", ") || "none"}.`
      : "KYC profile is current and no compliance blocker was detected.",
    [kyc.status, kyc.riskRating]
  );
}

function fraudAgent({ db, customer, intent }) {
  const transactions = db.transactions.filter((item) => item.customerId === customer?.customerId);
  const mediumRiskTx = transactions.filter((item) => item.risk === "Medium").length;
  const beneficiaries = db.beneficiaries.filter((item) => item.customerId === customer?.customerId);
  const hasNewBeneficiary = beneficiaries.some((item) => !item.trusted);
  const elevated = intent === "cliq_transfer_assist" ? hasNewBeneficiary : mediumRiskTx > 0;

  return agentReport(
    "FraudAgent",
    "Checks fraud and transaction risk signals",
    "complete",
    elevated ? "step_up_required" : "no_fraud_signal",
    elevated ? 86 : 93,
    elevated
      ? "A fraud or step-up verification signal was detected before fulfillment."
      : "No elevated fraud signal was detected in the sandbox records.",
    [`mediumRiskTransactions=${mediumRiskTx}`, `newBeneficiary=${hasNewBeneficiary}`]
  );
}

function payrollOpsAgent({ record }) {
  if (!record) {
    return agentReport("PayrollOpsAgent", "Handles salary and payroll exceptions", "warning", "payroll_record_missing", 62, "No payroll record was found.", []);
  }

  const exception = record.status !== "Posted";
  return agentReport(
    "PayrollOpsAgent",
    "Handles salary and payroll exceptions",
    "complete",
    exception ? "ops_exception" : "posted_salary",
    exception ? 90 : 96,
    exception
      ? `Payroll status is ${record.status}; exception code ${record.exceptionCode || "none"} requires operations follow-up.`
      : `Payroll ${record.payrollId} is posted successfully.`,
    [record.payrollId, record.status]
  );
}

function accountDataAgent({ db, customer }) {
  const account = db.bankAccounts.find((item) => item.customerId === customer?.customerId);
  if (!account) {
    return agentReport("AccountDataAgent", "Reads account and balance data", "warning", "account_missing", 65, "No bank account record was found.", []);
  }

  return agentReport(
    "AccountDataAgent",
    "Reads account and balance data",
    "complete",
    account.status === "Active" ? "account_active" : "account_attention",
    account.status === "Active" ? 95 : 80,
    `Account ${account.accountId} is ${account.status}; available balance is ${account.availableBalance} ${account.currency}.`,
    [account.accountId, account.status]
  );
}

function customerSafetyAgent({ analysis }) {
  const safe = Boolean(analysis.customerSafeResponse);
  return agentReport(
    "CustomerSafetyAgent",
    "Redacts sensitive details for customer-facing output",
    safe ? "complete" : "warning",
    safe ? "safe_response_ready" : "safe_response_missing",
    safe ? 96 : 50,
    safe ? "Customer-safe response is available and separated from internal reasoning." : "Customer-safe response needs review before release.",
    safe ? ["customerSafeResponse"] : []
  );
}

function requiredAgentsForIntent(intent) {
  const routes = {
    payroll_exception_inquiry: ["PayrollOpsAgent", "PolicyAgent", "CustomerSafetyAgent"],
    balance_inquiry: ["AccountDataAgent", "CustomerSafetyAgent"],
    transaction_history: ["AccountDataAgent", "FraudAgent", "CustomerSafetyAgent"],
    loan_eligibility: ["CreditRiskAgent", "ComplianceAgent", "FraudAgent", "PolicyAgent", "CustomerSafetyAgent"],
    card_status: ["FraudAgent", "PolicyAgent", "CustomerSafetyAgent"],
    kyc_review: ["ComplianceAgent", "PolicyAgent", "CustomerSafetyAgent"],
    cliq_transfer_assist: ["FraudAgent", "ComplianceAgent", "PolicyAgent", "CustomerSafetyAgent"],
    account_opening: ["ComplianceAgent", "PolicyAgent", "CustomerSafetyAgent"],
    service_request: ["PolicyAgent", "CustomerSafetyAgent"]
  };
  return routes[intent] || ["PolicyAgent", "CustomerSafetyAgent"];
}

function evaluateAgentOutputs({ analysis, workerReports }) {
  const reportById = new Map(workerReports.map((report) => [report.agentId, report]));
  const requiredAgents = requiredAgentsForIntent(analysis.intent);
  const missingAgents = requiredAgents.filter((agentId) => !reportById.has(agentId));
  const reportsWithoutEvidence = workerReports
    .filter((report) => !Array.isArray(report.evidence) || report.evidence.length === 0)
    .map((report) => report.agentId);
  const creditSignal = reportById.get("CreditRiskAgent")?.signal;
  const fraudSignal = reportById.get("FraudAgent")?.signal;
  const hasRejectSignal = ["reject_recommended", "high_debt_burden"].includes(creditSignal);
  const hasApprovalSignal = creditSignal === "approval_ready";
  const hasStepUpSignal = fraudSignal === "step_up_required";
  const decisionConsistent =
    (!hasRejectSignal || analysis.recommendation === "reject") &&
    (!hasApprovalSignal || analysis.riskLevel !== "High") &&
    (!hasStepUpSignal || analysis.recommendation !== "approve");

  const checks = [
    {
      id: "required_agents",
      label: "Required specialists selected",
      passed: missingAgents.length === 0,
      severity: "critical",
      detail: missingAgents.length ? `Missing: ${missingAgents.join(", ")}` : `All ${requiredAgents.length} required agents ran.`
    },
    {
      id: "evidence_coverage",
      label: "Every specialist returned evidence",
      passed: reportsWithoutEvidence.length === 0,
      severity: "high",
      detail: reportsWithoutEvidence.length ? `No evidence: ${reportsWithoutEvidence.join(", ")}` : "Every specialist report is evidence-backed."
    },
    {
      id: "customer_safety",
      label: "Customer-safe response is present",
      passed: Boolean(analysis.customerSafeResponse),
      severity: "critical",
      detail: analysis.customerSafeResponse ? "A separate customer-safe response is ready." : "Customer-safe response is missing."
    },
    {
      id: "policy_grounding",
      label: "Decision is grounded in bank policy",
      passed: !requiredAgents.includes("PolicyAgent") || reportById.get("PolicyAgent")?.signal === "policy_match",
      severity: "critical",
      detail: reportById.get("PolicyAgent")?.signal === "policy_match" ? "A policy source was matched." : "No policy source supports the route."
    },
    {
      id: "decision_consistency",
      label: "Recommendation matches risk signals",
      passed: decisionConsistent,
      severity: "critical",
      detail: decisionConsistent ? "No contradiction was found between agent signals and the recommendation." : "The recommendation conflicts with a credit or fraud signal."
    },
    {
      id: "confidence_bounds",
      label: "Confidence values are valid",
      passed: workerReports.every((report) => Number.isFinite(report.confidence) && report.confidence >= 0 && report.confidence <= 100),
      severity: "high",
      detail: "All agent confidence values must stay between 0 and 100."
    }
  ];
  const weights = { critical: 3, high: 2, medium: 1 };
  const totalWeight = checks.reduce((sum, check) => sum + weights[check.severity], 0);
  const passedWeight = checks.reduce((sum, check) => sum + (check.passed ? weights[check.severity] : 0), 0);
  return {
    checks,
    score: Math.round((passedWeight / totalWeight) * 100),
    passed: checks.every((check) => check.passed),
    criticalFailures: checks.filter((check) => !check.passed && check.severity === "critical").map((check) => check.id)
  };
}

function optimizerAgent({ analysis, workerReports, language = "en" }) {
  const signals = new Set(workerReports.map((report) => report.signal));
  const ar = language === "ar";
  const optimized = { ...analysis };
  const changes = [];
  const creditReport = workerReports.find((report) => report.agentId === "CreditRiskAgent");
  const creditEvidence = Object.fromEntries(
    (creditReport?.evidence || [])
      .map((item) => String(item).split("="))
      .filter((parts) => parts.length >= 2)
      .map(([key, ...value]) => [key, value.join("=")])
  );

  if (signals.has("reject_recommended") || signals.has("high_debt_burden")) {
    optimized.riskLevel = "High";
    optimized.recommendation = "reject";
    optimized.decisionLabel = ar ? "مرفوض - مخاطر مرتفعة" : "Rejected - high risk";
    changes.push("Aligned final recommendation with the credit rejection signal.");
    optimized.decisionExplanation = ar
      ? `تم رفض الطلب لأن إشارات الائتمان تعتبر المخاطر مرتفعة. المبلغ المطلوب${creditEvidence.requestedAmount ? ` (${creditEvidence.requestedAmount})` : ""} لا يتناسب مع الدخل الشهري${creditEvidence.monthlyIncome ? ` (${creditEvidence.monthlyIncome})` : ""} أو يتجاوز حدود القدرة على السداد في سياسة الديمو.`
      : `The request was rejected because the credit signals indicate high risk. The requested amount${creditEvidence.requestedAmount ? ` (${creditEvidence.requestedAmount})` : ""} is not aligned with the monthly income${creditEvidence.monthlyIncome ? ` (${creditEvidence.monthlyIncome})` : ""} or exceeds the demo affordability policy.`;
    optimized.customerSafeResponse = ar
      ? "لا يمكن قبول طلب القرض بهذا المبلغ حالياً لأن المبلغ المطلوب لا يتناسب مع الدخل المتاح وحدود القدرة على السداد. يمكنك تقديم طلب جديد بمبلغ أقل أو مراجعة موظف البنك لمعرفة البدائل المناسبة."
      : "We cannot approve this loan amount right now because the requested amount is not aligned with the available income and repayment capacity limits. You may submit a lower amount or ask a bank employee about suitable alternatives.";
    optimized.requiredDocuments = [];
  } else if (signals.has("documents_required")) {
    optimized.riskLevel = optimized.riskLevel === "High" ? "High" : "Medium";
    optimized.recommendation = "request_documents";
    optimized.decisionLabel = ar ? "بانتظار المستندات" : "Documents required";
    changes.push("Stopped approval until required documents are complete.");
  } else if (signals.has("step_up_required")) {
    optimized.riskLevel = optimized.riskLevel === "High" ? "High" : "Medium";
    optimized.recommendation = "manual_review";
    optimized.decisionLabel = ar ? "تحقق أمني إضافي" : "Step-up verification";
    changes.push("Blocked automatic fulfillment because step-up verification is required.");
  } else if (signals.has("approval_ready") && signals.has("kyc_clear") && signals.has("no_fraud_signal")) {
    optimized.riskLevel = "Low";
    optimized.recommendation = "approve";
    optimized.decisionLabel = ar ? "مؤهل للموافقة" : "Approval ready";
    changes.push("Aligned final recommendation with verified low-risk approval signals.");
  }

  const changed = changes.length > 0 && (
    optimized.riskLevel !== analysis.riskLevel ||
    optimized.recommendation !== analysis.recommendation ||
    optimized.decisionLabel !== analysis.decisionLabel
  );
  return {
    analysis: optimized,
    report: agentReport(
      "OptimizerAgent",
      "Resolves contradictions and tightens the final decision",
      "complete",
      changed ? "decision_optimized" : "no_change_required",
      changed ? 94 : 92,
      changed ? changes.join(" ") : "The recommendation already matches the specialist signals.",
      [...signals]
    )
  };
}

function evaluatorAgent({ analysis, workerReports, quality }) {
  const blockers = workerReports.filter((report) => report.status === "warning");
  const confidenceFloor = Math.min(...workerReports.map((report) => report.confidence), analysis.confidence || 70);
  const requiresHuman =
    blockers.length > 0 ||
    analysis.riskLevel === "High" ||
    confidenceFloor < 70 ||
    quality.criticalFailures.length > 0 ||
    analysis.recommendation === "manual_review" ||
    analysis.recommendation === "request_documents";

  return agentReport(
    "EvaluatorAgent",
    "Reviews agent outputs and decides if human approval is needed",
    quality.passed ? "complete" : "warning",
    requiresHuman ? "human_review_required" : "decision_quality_pass",
    Math.max(60, Math.min(96, Math.min(confidenceFloor, quality.score))),
    requiresHuman
      ? `Quality score ${quality.score}%. Human review remains required before execution.`
      : `Quality score ${quality.score}%. Agent outputs passed the final decision gate.`,
    [
      ...blockers.map((report) => report.agentId),
      ...quality.checks.filter((check) => !check.passed).map((check) => check.id)
    ]
  );
}

function runAgentOrchestrator(context, analysis) {
  const routeMap = {
    payroll_exception_inquiry: [payrollOpsAgent, policyAgent, customerSafetyAgent],
    balance_inquiry: [accountDataAgent, customerSafetyAgent],
    transaction_history: [accountDataAgent, fraudAgent, customerSafetyAgent],
    loan_eligibility: [creditRiskAgent, complianceAgent, fraudAgent, policyAgent, customerSafetyAgent],
    card_status: [fraudAgent, policyAgent, customerSafetyAgent],
    kyc_review: [complianceAgent, policyAgent, customerSafetyAgent],
    cliq_transfer_assist: [fraudAgent, complianceAgent, policyAgent, customerSafetyAgent],
    account_opening: [complianceAgent, policyAgent, customerSafetyAgent],
    service_request: [policyAgent, customerSafetyAgent]
  };
  const workers = routeMap[analysis.intent] || [policyAgent, customerSafetyAgent];
  const workerReports = workers.map((worker) => worker({ ...context, analysis }));
  const optimization = optimizerAgent({ analysis, workerReports, language: context.language });
  const optimizedQuality = evaluateAgentOutputs({ analysis: optimization.analysis, workerReports });
  const evaluatorReport = evaluatorAgent({
    analysis: optimization.analysis,
    workerReports,
    quality: optimizedQuality
  });
  const agentReports = [
    agentReport(
      "OrchestratorAgent",
      "Routes the request to specialized banking agents",
      "complete",
      `route:${analysis.intent}`,
      98,
      `Selected ${workerReports.map((report) => report.agentId).join(", ")} for this request.`,
      [analysis.intent]
    ),
    ...workerReports,
    optimization.report,
    evaluatorReport
  ];

  return {
    pattern: "orchestrator-worker + evaluator-optimizer",
    activeRoute: analysis.intent,
    selectedAgents: agentReports.map((report) => report.agentId),
    agentReports,
    finalGate: evaluatorReport.signal,
    qualityScore: optimizedQuality.score,
    qualityChecks: optimizedQuality.checks,
    optimizedAnalysis: optimization.analysis
  };
}

function buildStructuredAuditTrail({ auditId, correlationId, context, analysis, agentOrchestration, policies = [], openAiError = null }) {
  const workerAgents = (agentOrchestration.selectedAgents || []).filter(
    (agentId) => !["OrchestratorAgent", "OptimizerAgent", "EvaluatorAgent"].includes(agentId)
  );
  const reportById = new Map((agentOrchestration.agentReports || []).map((report) => [report.agentId, report]));
  const policyReport = reportById.get("PolicyAgent");
  const optimizerReport = reportById.get("OptimizerAgent");
  const evaluatorReport = reportById.get("EvaluatorAgent");
  const failedChecks = (agentOrchestration.qualityChecks || []).filter((check) => !check.passed);

  return {
    schemaVersion: NEXUS_AUDIT_SCHEMA_VERSION,
    systemDirectiveVersion: NEXUS_SYSTEM_DIRECTIVE_VERSION,
    auditId,
    correlationId,
    createdAt: new Date().toISOString(),
    principles: ["Security", "Traceability", "Explainability"],
    chainOfThoughtPolicy: "operational_trace_only_no_hidden_chain_of_thought",
    customerDataBoundary: {
      rawCredentialsIncluded: false,
      customerPortalReceives: "externalCustomerResponse",
      employeeWorkspaceReceives: "internalOperationalSummary, agentReports, policyEvidence, evaluatorGate"
    },
    stages: [
      {
        phase: "[Input Intake]",
        status: "complete",
        summary: "Transcript received, normalized, and scoped to the active user/session.",
        references: {
          mode: context.mode,
          customerId: context.customer?.customerId || null,
          payrollId: context.record?.payrollId || null
        }
      },
      {
        phase: "[Analyze]",
        status: "complete",
        summary: "Request intent, risk level, request type, and customer-safe response boundary were identified.",
        intent: analysis.intent,
        requestType: analysis.requestType,
        riskLevel: analysis.riskLevel,
        confidence: analysis.confidence
      },
      {
        phase: "[Agent Triggered]",
        status: "complete",
        orchestrator: "OrchestratorAgent",
        computePolicy: "relevant_agents_only",
        selectedSpecialists: workerAgents,
        skippedSpecialists: ["CreditRiskAgent", "ComplianceAgent", "FraudAgent", "PolicyAgent", "PayrollOpsAgent", "AccountDataAgent"]
          .filter((agentId) => !workerAgents.includes(agentId))
      },
      {
        phase: "[Policy Check]",
        status: policyReport?.signal === "policy_match" ? "complete" : "warning",
        evaluator: "EvaluatorAgent",
        policyEvidence: policies.map((policy) => ({
          policyId: policy.policyId,
          source: policy.source,
          title: policy.title
        })),
        summary: policyReport?.output || "No policy evidence was available for this route."
      },
      {
        phase: "[Decision Optimization]",
        status: optimizerReport?.status || "complete",
        optimizer: "OptimizerAgent",
        signal: optimizerReport?.signal || "not_available",
        summary: optimizerReport?.output || "No optimization summary was produced."
      },
      {
        phase: "[Evaluator Gate]",
        status: failedChecks.length ? "warning" : "complete",
        evaluator: "EvaluatorAgent",
        finalGate: agentOrchestration.finalGate,
        qualityScore: agentOrchestration.qualityScore,
        failedChecks: failedChecks.map((check) => ({
          id: check.id,
          severity: check.severity,
          detail: check.detail
        })),
        humanInLoopRequired: agentOrchestration.finalGate === "human_review_required",
        summary: evaluatorReport?.output || "Evaluator gate completed."
      },
      {
        phase: "[Final Response]",
        status: "complete",
        separation: {
          internalOperationalSummary: analysis.decisionExplanation || analysis.suggestedAction,
          externalCustomerResponse: analysis.customerSafeResponse
        },
        recommendation: analysis.recommendation,
        decisionLabel: analysis.decisionLabel,
        requiredDocuments: analysis.requiredDocuments || []
      },
      {
        phase: "[Audit Logging]",
        status: "complete",
        summary: "Structured JSON audit trail saved with the banking decision.",
        openAiFallback: Boolean(openAiError)
      }
    ]
  };
}

function evaluateDemoScenario(db, persona) {
  const transcript = persona.script;
  const detectedIntent = detectIntent(transcript);
  const customer = db.customers.find((item) => item.customerId === persona.customerId);
  const record = db.payrollRecords.find((item) => item.customerId === persona.customerId);
  const requestedAmount = extractRequestedAmount(transcript, persona.customerId);
  const policies = searchPolicies(db.policies, transcript, record, detectedIntent);
  const context = {
    transcript,
    mode: "employee",
    customer,
    record,
    policies,
    language: "en",
    db,
    intent: detectedIntent,
    requestedAmount
  };
  let analysis = buildDeterministicAnalysis(context);
  analysis = {
    ...analysis,
    intent: canonicalizeIntent(analysis.intent, detectedIntent),
    requestType: requestTypeForIntent(detectedIntent)
  };
  const orchestration = runAgentOrchestrator(context, analysis);
  analysis = { ...analysis, ...orchestration.optimizedAnalysis };
  const reportById = new Map(orchestration.agentReports.map((report) => [report.agentId, report]));
  const hasAgentFocus = persona.agentFocus.every((agentId) => reportById.has(agentId));
  const scenarioChecks = [
    {
      id: "agent_focus",
      label: "Expected specialist agents were selected",
      passed: hasAgentFocus,
      detail: hasAgentFocus ? persona.agentFocus.join(", ") : "One or more expected agents did not run."
    },
    {
      id: "quality_gate",
      label: "Agent quality score is at least 90%",
      passed: orchestration.qualityScore >= 90,
      detail: `Quality score ${orchestration.qualityScore}%.`
    }
  ];

  if (persona.id === "perfect-loan") {
    scenarioChecks.push({
      id: "expected_outcome",
      label: "Low-risk complete loan is approval-ready",
      passed: reportById.get("CreditRiskAgent")?.signal === "approval_ready" && analysis.recommendation === "approve",
      detail: `Credit=${reportById.get("CreditRiskAgent")?.signal}; recommendation=${analysis.recommendation}.`
    });
  } else if (persona.id === "high-risk") {
    scenarioChecks.push({
      id: "expected_outcome",
      label: "High debt burden is rejected",
      passed: reportById.get("CreditRiskAgent")?.signal === "reject_recommended" && analysis.recommendation === "reject",
      detail: `Credit=${reportById.get("CreditRiskAgent")?.signal}; recommendation=${analysis.recommendation}.`
    });
  } else if (persona.id === "missing-doc") {
    scenarioChecks.push({
      id: "expected_outcome",
      label: "Missing salary certificate blocks approval",
      passed: reportById.get("CreditRiskAgent")?.signal === "documents_required" && analysis.recommendation === "request_documents",
      detail: `Credit=${reportById.get("CreditRiskAgent")?.signal}; recommendation=${analysis.recommendation}.`
    });
  } else if (persona.id === "fraud-transfer") {
    scenarioChecks.push({
      id: "expected_outcome",
      label: "Unusual new-beneficiary transfer requires step-up",
      passed: reportById.get("FraudAgent")?.signal === "step_up_required" && analysis.recommendation !== "approve",
      detail: `Fraud=${reportById.get("FraudAgent")?.signal}; recommendation=${analysis.recommendation}.`
    });
  } else if (persona.id === "vip-policy") {
    scenarioChecks.push({
      id: "expected_outcome",
      label: "VIP facility is routed to policy and compliance review",
      passed:
        reportById.get("PolicyAgent")?.signal === "policy_match" &&
        reportById.get("ComplianceAgent")?.signal === "kyc_review_required" &&
        orchestration.finalGate === "human_review_required",
      detail: `Policy=${reportById.get("PolicyAgent")?.signal}; compliance=${reportById.get("ComplianceAgent")?.signal}; gate=${orchestration.finalGate}.`
    });
  }

  return {
    id: persona.id,
    title: persona.title,
    category: persona.category,
    customerId: persona.customerId,
    expected: persona.expectedSystemBehavior,
    passed: scenarioChecks.every((check) => check.passed),
    qualityScore: orchestration.qualityScore,
    finalGate: orchestration.finalGate,
    recommendation: analysis.recommendation,
    selectedAgents: orchestration.selectedAgents,
    checks: scenarioChecks
  };
}

function runAgentEvaluationSuite(db) {
  const scenarios = db.demoPersonas.map((persona) => evaluateDemoScenario(db, persona));
  const passed = scenarios.filter((scenario) => scenario.passed).length;
  const averageQuality = scenarios.length
    ? Math.round(scenarios.reduce((sum, scenario) => sum + scenario.qualityScore, 0) / scenarios.length)
    : 0;
  return {
    suiteVersion: "nexus-agent-eval-v2",
    generatedAt: new Date().toISOString(),
    total: scenarios.length,
    passed,
    failed: scenarios.length - passed,
    score: scenarios.length ? Math.round((passed / scenarios.length) * 100) : 0,
    averageQuality,
    status: passed === scenarios.length ? "ready" : "needs_attention",
    scenarios
  };
}

function payrollReasonBundle(record, language = "en") {
  const ar = language === "ar";
  if (!record) return {};
  const localizedReason = ar && record.exceptionCode === "ACC-MISMATCH"
    ? "عدم تطابق رقم حساب ملف رواتب جهة العمل مع رقم الحساب الرئيسي المسجل في البنك."
    : record.reason;
  if (record.status === "Suspended") {
    return {
      answer: ar
        ? `الراتب ${record.payrollId} معلّق بسبب ${localizedReason} رقم حساب ملف الرواتب من جهة العمل (${record.employerFileAccount}) لا يطابق رقم الحساب الرئيسي المسجل في البنك (${record.bankMasterAccount}). الخطوة الصحيحة هي فتح تذكرة OPS-12 مع إرفاق دليل عدم التطابق وطلب تصحيح من جهة العمل وإرسال رد آمن للعميل.`
        : `Salary ${record.payrollId} is suspended because ${localizedReason} Employer payroll account ${record.employerFileAccount} does not match bank master account ${record.bankMasterAccount}. The correct next step is OPS-12 with mismatch evidence, employer correction request, and a safe customer notification.`,
      customerSafeResponse: ar
        ? "نعتذر عن التأخير. راتبك لم يترحل بعد لأن هناك اختلافًا في بيانات حساب تحويل الراتب بين جهة العمل وسجل البنك. البنك ينسق مع جهة العمل لتصحيح البيانات واستكمال الترحيل بأمان."
        : "We apologize for the delay. Your salary has not posted yet because there is a mismatch in the salary transfer account details between your employer and the bank record. The bank is coordinating with your employer to correct it and complete posting safely.",
      customerReason: ar
        ? "اختلاف في بيانات حساب تحويل الراتب بين جهة العمل والبنك، لذلك تم تعليق الترحيل مؤقتًا لحماية الحساب إلى أن يتم التصحيح."
        : "There is a mismatch in salary transfer account details between the employer and the bank record, so posting was temporarily suspended to protect the account until corrected.",
      caseReason: `Status=${record.status}; Exception=${record.exceptionCode}; Reason=${localizedReason}; Employer file account=${record.employerFileAccount}; Bank master account=${record.bankMasterAccount}; Scheduled=${record.scheduledDate}; Amount=${record.amount} ${record.currency}.`,
      suggestedAction: ar ? "فتح تذكرة استثناء رواتب OPS-12" : "Open OPS-12 Payroll Exception ticket"
    };
  }
  if (record.status === "Posted") {
    return {
      customerReason: ar ? "لا يوجد تأخير؛ الراتب مرحّل بنجاح." : "There is no delay; the salary has posted successfully.",
      caseReason: `Status=${record.status}; Payroll=${record.payrollId}; Posted amount=${record.amount} ${record.currency}.`
    };
  }
  return {
    customerReason: ar ? "العملية تحت مراجعة تشغيلية قبل إعطاء حالة نهائية." : "The transaction is under operational review before a final status is provided.",
    caseReason: `Status=${record.status}; Exception=${record.exceptionCode || "none"}; Reason=${record.reason || "review required"}.`
  };
}

function enrichPayrollReason(analysis, { record, language = "en" }) {
  if (analysis.intent !== "payroll_exception_inquiry" || !record) return analysis;
  const reason = payrollReasonBundle(record, language);
  return {
    ...analysis,
    answer: reason.answer || analysis.answer,
    customerSafeResponse: reason.customerSafeResponse || analysis.customerSafeResponse,
    customerReason: reason.customerReason || analysis.customerReason,
    caseReason: reason.caseReason || analysis.caseReason,
    suggestedAction: reason.suggestedAction || analysis.suggestedAction
  };
}

function buildDeterministicAnalysis({ transcript, mode, customer, record, policies, language = "en", db, intent }) {
  const primaryPolicy = policies[0];
  const accounts = db.bankAccounts.filter((item) => item.customerId === customer?.customerId);
  const account = accounts[0];
  const transactions = db.transactions.filter((item) => item.customerId === customer?.customerId).slice(0, 3);
  const loan = db.loanApplications.find((item) => item.customerId === customer?.customerId);
  const card = db.cards.find((item) => item.customerId === customer?.customerId);
  const kyc = db.kycProfiles.find((item) => item.customerId === customer?.customerId);
  const beneficiaries = db.beneficiaries.filter((item) => item.customerId === customer?.customerId);
  const suspended = record?.status === "Suspended";
  const pendingReview = record?.status === "Pending Review";
  const posted = record?.status === "Posted";
  const ar = language === "ar";
  let answer;
  let suggestedAction;
  let riskLevel;
  let confidence;
  let customerSafeResponse;
  let customerReason;
  let caseReason;
  let requestType = intent;
  let contextCards = [];

  if (intent === "payroll_exception_inquiry" && suspended) {
    answer = ar
      ? `الراتب ${record.payrollId} معلّق بسبب ${record.reason} رقم حساب ملف الرواتب من جهة العمل (${record.employerFileAccount}) لا يطابق رقم الحساب الرئيسي المسجل في البنك (${record.bankMasterAccount}). الخطوة الصحيحة هي فتح تذكرة OPS-12 مع إرفاق دليل عدم التطابق وطلب تصحيح من جهة العمل وإرسال رد آمن للعميل.`
      : `Salary ${record.payrollId} is suspended because ${record.reason} Employer payroll account ${record.employerFileAccount} does not match bank master account ${record.bankMasterAccount}. The correct next step is OPS-12 with mismatch evidence, employer correction request, and a safe customer notification.`;
    suggestedAction = ar ? "فتح تذكرة استثناء رواتب OPS-12" : "Open OPS-12 Payroll Exception ticket";
    customerSafeResponse = ar
      ? "نعتذر عن التأخير. راتبك لم يترحل بعد لأن هناك اختلافًا في بيانات حساب تحويل الراتب بين جهة العمل وسجل البنك. البنك ينسق مع جهة العمل لتصحيح البيانات واستكمال الترحيل بأمان."
      : "We apologize for the delay. Your salary has not posted yet because there is a mismatch in the salary transfer account details between your employer and the bank record. The bank is coordinating with your employer to correct it and complete posting safely.";
    customerReason = ar
      ? "اختلاف في بيانات حساب تحويل الراتب بين جهة العمل والبنك، لذلك تم تعليق الترحيل مؤقتًا لحماية الحساب إلى أن يتم التصحيح."
      : "There is a mismatch in salary transfer account details between the employer and the bank record, so posting was temporarily suspended to protect the account until corrected.";
    caseReason = ar
      ? `Status=${record.status}; Exception=${record.exceptionCode}; Reason=${record.reason}; Employer file account=${record.employerFileAccount}; Bank master account=${record.bankMasterAccount}; Scheduled=${record.scheduledDate}; Amount=${record.amount} ${record.currency}.`
      : `Status=${record.status}; Exception=${record.exceptionCode}; Reason=${record.reason}; Employer file account=${record.employerFileAccount}; Bank master account=${record.bankMasterAccount}; Scheduled=${record.scheduledDate}; Amount=${record.amount} ${record.currency}.`;
    riskLevel = "Medium";
    confidence = 92;
    contextCards = [
      { label: ar ? "سجل الراتب" : "Payroll record", value: record.payrollId },
      { label: ar ? "الحالة" : "Status", value: record.status },
      { label: ar ? "رمز الاستثناء" : "Exception code", value: record.exceptionCode },
      { label: ar ? "المبلغ" : "Amount", value: `${record.amount} ${record.currency}` }
    ];
  } else if (intent === "payroll_exception_inquiry" && pendingReview) {
    answer = ar
      ? `الراتب ${record.payrollId} قيد المراجعة لأن ملف العميل يحتاج إلى تحديث تحقق النشاط التجاري قبل ترحيل العملية.`
      : `Salary ${record.payrollId} is pending review because the customer profile needs updated business activity verification before posting.`;
    suggestedAction = ar ? "تحويل الطلب إلى قائمة مراجعة الامتثال KYC" : "Route to Compliance KYC refresh queue";
    customerSafeResponse = ar ? "العملية قيد مراجعة امتثال، ويمكنك إرسال طلب متابعة للبنك." : "The transaction is under compliance review. You can send a follow-up request to the bank.";
    riskLevel = "High";
    confidence = 88;
  } else if (intent === "payroll_exception_inquiry" && posted) {
    answer = ar
      ? `تم ترحيل الراتب ${record.payrollId} بنجاح، ولا يوجد استثناء نشط حاليًا لهذا العميل.`
      : `Salary ${record.payrollId} was posted successfully. No exception is currently active for this customer.`;
    suggestedAction = ar ? "تأكيد ترحيل الراتب للعميل" : "Provide posted salary confirmation";
    customerSafeResponse = ar ? "تم ترحيل راتبك بنجاح." : "Your salary has been posted successfully.";
    riskLevel = "Low";
    confidence = 94;
  } else if (intent === "balance_inquiry" && account) {
    answer = ar
      ? `الرصيد المتاح لحساب العميل هو ${account.availableBalance} ${account.currency}، والرصيد الدفتري ${account.ledgerBalance} ${account.currency}. حالة الحساب: ${account.status}.`
      : `The available balance is ${account.availableBalance} ${account.currency}, and the ledger balance is ${account.ledgerBalance} ${account.currency}. Account status: ${account.status}.`;
    customerSafeResponse = ar ? `رصيدك المتاح هو ${account.availableBalance} ${account.currency}.` : `Your available balance is ${account.availableBalance} ${account.currency}.`;
    suggestedAction = ar ? "عرض الرصيد وتسجيل الاستفسار" : "Show balance and log inquiry";
    riskLevel = account.status === "Active" ? "Low" : "Medium";
    confidence = 95;
    contextCards = [
      { label: ar ? "الحساب" : "Account", value: account.accountId },
      { label: ar ? "النوع" : "Type", value: account.type },
      { label: ar ? "الرصيد المتاح" : "Available balance", value: `${account.availableBalance} ${account.currency}` },
      { label: ar ? "الحالة" : "Status", value: account.status }
    ];
  } else if (intent === "transaction_history") {
    answer = ar
      ? `آخر ${transactions.length} عمليات للعميل: ${transactions.map((tx) => `${tx.description} (${tx.amount} ${tx.currency}, ${tx.status})`).join("؛ ")}.`
      : `Latest ${transactions.length} transactions: ${transactions.map((tx) => `${tx.description} (${tx.amount} ${tx.currency}, ${tx.status})`).join("; ")}.`;
    customerSafeResponse = ar ? "تم عرض آخر العمليات المتاحة على حسابك." : "Your latest available transactions are shown.";
    suggestedAction = ar ? "عرض آخر العمليات وإتاحة إرسال اعتراض عند الحاجة" : "Show latest transactions and allow dispute if needed";
    riskLevel = transactions.some((tx) => tx.risk === "Medium") ? "Medium" : "Low";
    confidence = transactions.length ? 90 : 62;
    requestType = "transaction_dispute";
    contextCards = transactions.map((tx) => ({ label: tx.date, value: `${tx.description} · ${tx.amount} ${tx.currency} · ${tx.status}` }));
  } else if (intent === "loan_eligibility" && loan) {
    answer = ar
      ? `تحليل أهلية القرض: المنتج ${loan.product}، المبلغ المطلوب ${loan.requestedAmount} ${loan.currency}، نسبة الالتزامات ${loan.debtBurdenRatio}%. النتيجة الأولية: ${loan.preEligibility}. الإجراء المطلوب: ${loan.recommendedAction}`
      : `Loan eligibility analysis: ${loan.product}, requested ${loan.requestedAmount} ${loan.currency}, debt burden ${loan.debtBurdenRatio}%. Preliminary result: ${loan.preEligibility}. Required action: ${loan.recommendedAction}`;
    customerSafeResponse = ar ? "طلب القرض يحتاج تحققًا من الدخل قبل القرار النهائي. يمكنك إرسال الطلب الآن." : "Your loan request needs income verification before a final decision. You can submit the request now.";
    suggestedAction = loan.recommendedAction || (ar ? "إرسال طلب قرض مع مستندات الدخل" : "Submit loan request with income documents");
    riskLevel = loan.debtBurdenRatio > 45
      ? "High"
      : /approved|verified|clean/i.test(loan.preEligibility || loan.recommendedAction || "")
        ? "Low"
        : "Medium";
    confidence = 87;
    requestType = "loan_application";
    contextCards = [
      { label: ar ? "المنتج" : "Product", value: loan.product },
      { label: ar ? "المبلغ" : "Amount", value: `${loan.requestedAmount} ${loan.currency}` },
      { label: ar ? "نسبة الالتزامات" : "Debt burden", value: `${loan.debtBurdenRatio}%` },
      { label: ar ? "النتيجة" : "Result", value: loan.preEligibility }
    ];
  } else if (intent === "card_status" && card) {
    answer = ar
      ? `حالة البطاقة المنتهية بـ ${card.last4}: ${card.status}. الحد اليومي ${card.dailyLimit} ${account?.currency || "JOD"} والمتاح اليوم ${card.availableToday}.`
      : `Card ending ${card.last4} is ${card.status}. Daily limit is ${card.dailyLimit} ${account?.currency || "JOD"} and available today is ${card.availableToday}.`;
    customerSafeResponse = card.status.includes("Blocked")
      ? (ar ? "بطاقتك موقوفة مؤقتًا. يمكنك إرسال طلب إعادة تفعيل بعد التحقق." : "Your card is temporarily blocked. You can submit a reactivation request after verification.")
      : (ar ? "بطاقتك فعالة حاليًا." : "Your card is currently active.");
    suggestedAction = card.status.includes("Blocked") ? (ar ? "إرسال طلب إعادة تفعيل بطاقة" : "Submit card reactivation request") : (ar ? "عرض حالة البطاقة" : "Show card status");
    riskLevel = card.status.includes("Blocked") ? "Medium" : "Low";
    confidence = 91;
    requestType = "card_reactivation";
    contextCards = [
      { label: ar ? "البطاقة" : "Card", value: `**** ${card.last4}` },
      { label: ar ? "الحالة" : "Status", value: card.status },
      { label: ar ? "المتاح اليوم" : "Available today", value: `${card.availableToday}` }
    ];
  } else if (intent === "kyc_review" && kyc) {
    answer = ar
      ? `حالة KYC للعميل: ${kyc.status}. مستوى المخاطر ${kyc.riskRating}. المستندات الناقصة: ${kyc.missingDocuments.length ? kyc.missingDocuments.join("، ") : "لا يوجد"}.`
      : `KYC status is ${kyc.status}. Risk rating: ${kyc.riskRating}. Missing documents: ${kyc.missingDocuments.length ? kyc.missingDocuments.join(", ") : "None"}.`;
    customerSafeResponse = ar ? "ملفك يحتاج تحديث بيانات/وثائق قبل بعض العمليات. يمكنك إرسال طلب تحديث الآن." : "Your profile needs a data/document refresh before some operations. You can submit an update request now.";
    suggestedAction = ar ? "إرسال طلب تحديث بيانات KYC" : "Submit KYC update request";
    riskLevel = kyc.riskRating === "Medium" ? "Medium" : "Low";
    confidence = 89;
    requestType = "kyc_update";
    contextCards = [
      { label: "KYC", value: kyc.status },
      { label: ar ? "المخاطر" : "Risk", value: kyc.riskRating },
      { label: ar ? "مستندات ناقصة" : "Missing docs", value: kyc.missingDocuments.join(", ") || "None" }
    ];
  } else if (intent === "cliq_transfer_assist") {
    const trusted = beneficiaries.find((beneficiary) => beneficiary.trusted);
    const untrusted = beneficiaries.find((beneficiary) => !beneficiary.trusted);
    answer = ar
      ? `تحليل تحويل كليك: يوجد مستفيد موثوق (${trusted?.name || "غير متاح"}) ومستفيد جديد غير موثوق (${untrusted?.name || "غير متاح"}). التحويل لمستفيد جديد يحتاج تأكيد إضافي ولا يتم تنفيذه تلقائيًا في الديمو.`
      : `CliQ transfer analysis: trusted beneficiary (${trusted?.name || "N/A"}) and new untrusted beneficiary (${untrusted?.name || "N/A"}). New beneficiaries require step-up confirmation and are not auto-executed in this demo.`;
    customerSafeResponse = ar ? "لأمانك، أي تحويل كليك لمستفيد جديد يحتاج تأكيد إضافي. يمكنك إرسال الطلب للبنك." : "For your safety, CliQ transfers to new beneficiaries require extra confirmation. You can submit the request to the bank.";
    suggestedAction = ar ? "إرسال طلب تحويل كليك مع تحقق إضافي" : "Submit CliQ transfer request with step-up verification";
    riskLevel = "Medium";
    confidence = 86;
    requestType = "cliq_transfer_review";
    contextCards = beneficiaries.map((beneficiary) => ({ label: beneficiary.name, value: `${beneficiary.rail} · ${beneficiary.trusted ? "trusted" : "new/untrusted"}` }));
  } else if (intent === "account_opening") {
    answer = ar
      ? "فتح حساب جديد يتطلب التحقق من الهوية، بيانات التواصل، وفحص KYC. في الديمو يتم إنشاء طلب فتح حساب بدل تنفيذ مباشر."
      : "Opening a new account requires identity verification, contact details, and KYC screening. In this demo, a request is created instead of direct execution.";
    customerSafeResponse = ar ? "يمكنك إرسال طلب فتح حساب الآن وسيقوم موظف البنك بمراجعته." : "You can submit an account opening request now and a bank employee will review it.";
    suggestedAction = ar ? "إرسال طلب فتح حساب" : "Submit account opening request";
    riskLevel = "Medium";
    confidence = 84;
    requestType = "account_opening";
    contextCards = [{ label: ar ? "المطلوب" : "Required", value: ar ? "هوية + KYC + موافقة" : "ID + KYC + approval" }];
  } else {
    answer = ar
      ? "فهمت الطلب كاستفسار بنكي عام. يمكنني المساعدة في الرصيد، آخر العمليات، الراتب، القروض، البطاقات، KYC، تحويل كليك، أو إرسال طلب خدمة للبنك."
      : "I understood this as a general banking request. I can help with balance, transactions, salary, loans, cards, KYC, CliQ transfers, or submitting a service request.";
    customerSafeResponse = ar ? "يمكنك إرسال طلب خدمة للبنك ليتم مراجعته." : "You can submit a service request to the bank for review.";
    suggestedAction = ar ? "إرسال طلب خدمة عام" : "Submit general service request";
    riskLevel = "Low";
    confidence = 70;
    requestType = "general_service_request";
    contextCards = [
      { label: ar ? "العميل" : "Customer", value: customer?.name || "Unknown" },
      { label: ar ? "النية" : "Intent", value: intent }
    ];
  }

  const localizedPolicies = policies.map((policy) => localizePolicy(policy, language));
  let operationalDecision = buildOperationalDecision({
    intent,
    riskLevel,
    confidence,
    suggestedAction,
    language
  });
  operationalDecision = normalizeOperationalDecision({ decision: operationalDecision, intent, riskLevel, language });
  const fallbackCustomerSafeResponse = ar
    ? "طلبك يحتاج إلى مراجعة تشغيلية قبل تقديم حالة نهائية."
    : "Your request requires an operational review before we can provide a final status.";

  return {
    engine: process.env.OPENAI_API_KEY ? "deterministic-fallback-after-openai" : "deterministic-demo-engine",
    model: process.env.OPENAI_API_KEY ? MODEL : "sandbox-rules-v1",
    intent,
    detectedIntent: intent,
    extractedEntities: {
      mode,
      customerId: customer?.customerId || null,
      employeeId: record?.employeeId || null,
      payrollId: record?.payrollId || null
    },
    answer,
    customerReason,
    caseReason,
    confidence,
    riskLevel,
    suggestedAction,
    requestType,
    contextCards,
    customerSafeResponse: customerSafeResponse || fallbackCustomerSafeResponse,
    recommendation: operationalDecision.recommendation,
    decisionLabel: operationalDecision.decisionLabel,
    decisionExplanation: operationalDecision.decisionExplanation,
    requiredDocuments: operationalDecision.requiredDocuments,
    sourceCitations: localizedPolicies.map((policy) => ({
      source: policy.source,
      excerpt: policy.excerpt,
      policyId: policy.policyId
    })),
    trace: ar
      ? [
          { step: "استقبال الصوت/النص", status: "complete", detail: "تم استلام النص وتوحيده للتحليل." },
          { step: "فهم النية", status: "complete", detail: `تم تصنيف الطلب كـ ${intent}.` },
          { step: "استخراج البيانات", status: "complete", detail: `تم تحديد رقم العميل ${customer?.customerId || record?.employeeId || "غير معروف"}.` },
          { step: "البحث في بيانات العميل", status: customer ? "complete" : "warning", detail: customer ? `تم العثور على ملف ${customer.name}.` : "لم يتم العثور على ملف العميل." },
          { step: "استرجاع السياسة", status: "complete", detail: `تمت مطابقة ${primaryPolicy?.source || "سياسة تجريبية"}.` },
          { step: "القرار", status: "complete", detail: suggestedAction },
          { step: "سجل التدقيق", status: "complete", detail: "تم حفظ مسار القرار للمراجعة." }
        ]
      : [
          { step: "Voice/Text Intake", status: "complete", detail: "Transcript received and normalized." },
          { step: "Intent Detection", status: "complete", detail: `Classified as ${intent}.` },
          { step: "Entity Extraction", status: "complete", detail: `Detected customer ID ${customer?.customerId || record?.employeeId || "unknown"}.` },
          { step: "Customer Data Lookup", status: customer ? "complete" : "warning", detail: customer ? `Found ${customer.name}'s profile.` : "No customer profile found." },
          { step: "Policy Retrieval", status: "complete", detail: `Matched ${primaryPolicy?.source || "sandbox policy"}.` },
          { step: "Decision", status: "complete", detail: suggestedAction },
          { step: "Audit Logging", status: "complete", detail: "Decision trace saved for review." }
        ]
  };
}

function openAiPrompt({ transcript, mode, customer, record, policies, language = "en" }) {
  const responseLanguage = language === "ar" ? "Arabic" : "English";
  return [
    {
      role: "system",
      content:
        `${NEXUS_SYSTEM_DIRECTIVE}\n\nUse only the supplied synthetic sandbox records and Banking Policy Knowledge Base. Return concise JSON only. Never invent banking records. Do not expose sensitive full account numbers to customers. Do not reveal hidden chain-of-thought; trace fields must contain audit-ready operational summaries only. Write user-facing fields and trace details in ${responseLanguage}. Keep machine codes such as intent, IDs, OPS-12, and riskLevel unchanged.`
    },
    {
      role: "user",
      content: JSON.stringify({
        task: "Analyze a banking operations voice/query transcript and produce a grounded decision.",
        transcript,
        responseLanguage,
        mode,
        customer,
        payrollRecord: record,
        policies,
        requiredJsonShape: {
          intent: "string",
          answer: "string",
          customerSafeResponse: "string",
          confidence: "number 0-100",
          riskLevel: "Low|Medium|High",
          suggestedAction: "string",
          sourceCitations: [{ source: "string", excerpt: "string", policyId: "string" }],
          trace: [{ step: "[Analyze]|[Agent Triggered]|[Policy Check]|[Audit Logging]|[Final Response]", status: "complete|warning", detail: "operational summary, not hidden chain-of-thought" }]
        }
      })
    }
  ];
}

async function callOpenAI(context) {
  if (!process.env.OPENAI_API_KEY) return null;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: MODEL,
      input: openAiPrompt(context),
      reasoning: { effort: "high" },
      text: {
        format: {
          type: "json_schema",
          name: "nexus_banking_decision",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              intent: { type: "string" },
              answer: { type: "string" },
              customerSafeResponse: { type: "string" },
              confidence: { type: "number" },
              riskLevel: { type: "string", enum: ["Low", "Medium", "High"] },
              suggestedAction: { type: "string" },
              sourceCitations: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    source: { type: "string" },
                    excerpt: { type: "string" },
                    policyId: { type: "string" }
                  },
                  required: ["source", "excerpt", "policyId"]
                }
              },
              trace: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    step: { type: "string" },
                    status: { type: "string", enum: ["complete", "warning"] },
                    detail: { type: "string" }
                  },
                  required: ["step", "status", "detail"]
                }
              }
            },
            required: ["intent", "answer", "customerSafeResponse", "confidence", "riskLevel", "suggestedAction", "sourceCitations", "trace"]
          },
          strict: true
        }
      }
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI API ${response.status}`);
  }

  const data = await response.json();
  const text =
    data.output_text ||
    data.output?.flatMap((item) => item.content || [])?.find((part) => part.type === "output_text")?.text;
  if (!text) throw new Error("OpenAI response did not include output_text");
  const parsed = JSON.parse(text);
  return {
    ...parsed,
    engine: "openai-responses-api",
    model: MODEL,
    extractedEntities: {
      mode: context.mode,
      customerId: context.customer?.customerId || null,
      employeeId: context.record?.employeeId || null,
      payrollId: context.record?.payrollId || null
    }
  };
}

async function analyze(req, res) {
  const db = await readDb();
  const body = await readBody(req);
  const transcript = String(body.transcript || "").trim();
  const mode = body.mode === "customer" ? "customer" : "employee";
  const language = body.language === "ar" ? "ar" : "en";
  const actorName = String(body.actorName || "").trim();
  const actorUserId = String(body.actorUserId || "").trim();
  const actorCustomerId = String(body.actorCustomerId || "").trim();
  if (!transcript) return json(res, 400, { error: "Missing transcript" });

  const entityId = extractEntity(transcript, actorCustomerId);
  const intent = detectIntent(transcript);
  const record = db.payrollRecords.find((item) => item.employeeId === entityId || item.customerId === entityId);
  const customer = db.customers.find((item) => item.customerId === entityId || item.employeeId === entityId);
  const requestedAmount = extractRequestedAmount(transcript, customer?.customerId || entityId);
  const policies = searchPolicies(db.policies, transcript, record, intent);
  const context = { transcript, mode, customer, record, policies, language, db, intent, requestedAmount };

  let analysis;
  let openAiError = null;
  try {
    analysis = await callOpenAI(context);
  } catch (error) {
    openAiError = error.message;
  }
  if (!analysis) analysis = buildDeterministicAnalysis(context);
  const modelIntent = analysis.intent || intent;
  const canonicalIntent = canonicalizeIntent(modelIntent, intent);
  analysis = {
    ...analysis,
    modelIntent,
    intent: canonicalIntent,
    detectedIntent: canonicalIntent
  };
  analysis = enrichPayrollReason(analysis, { record, language });
  let operationalDecision = buildOperationalDecision({
    intent: canonicalIntent,
    riskLevel: analysis.riskLevel,
    confidence: analysis.confidence,
    suggestedAction: analysis.suggestedAction,
    language
  });
  operationalDecision = normalizeOperationalDecision({
    decision: operationalDecision,
    intent: canonicalIntent,
    riskLevel: analysis.riskLevel,
    language
  });
  analysis = {
    ...analysis,
    requestType: requestTypeForIntent(canonicalIntent),
    contextCards: analysis.contextCards || [],
    recommendation: analysis.recommendation || operationalDecision.recommendation,
    decisionLabel: analysis.decisionLabel || operationalDecision.decisionLabel,
    decisionExplanation: analysis.decisionExplanation || operationalDecision.decisionExplanation,
    requiredDocuments: analysis.requiredDocuments || operationalDecision.requiredDocuments
  };
  const auditId = id("AUD");
  const correlationId = id("CORR");
  const agentOrchestration = runAgentOrchestrator(context, analysis);
  analysis = {
    ...analysis,
    ...agentOrchestration.optimizedAnalysis,
    engine: analysis.engine === "openai-responses-api" ? analysis.engine : "agentic-orchestrator",
    model: analysis.model === MODEL ? analysis.model : "nexus-multi-agent-v1",
    agentOrchestration,
    agentReports: agentOrchestration.agentReports,
    qualityScore: agentOrchestration.qualityScore,
    qualityChecks: agentOrchestration.qualityChecks,
    auditId,
    correlationId,
    systemDirectiveVersion: NEXUS_SYSTEM_DIRECTIVE_VERSION,
    auditSchemaVersion: NEXUS_AUDIT_SCHEMA_VERSION,
    trace: [
      {
        step: "[Analyze]",
        status: "complete",
        detail: `Classified request as ${analysis.intent}; risk ${analysis.riskLevel}; confidence ${analysis.confidence}%.`
      },
      {
        step: "[Agent Triggered] OrchestratorAgent",
        status: "complete",
        detail: `Routed ${analysis.intent} to ${agentOrchestration.selectedAgents.filter((name) => name !== "OrchestratorAgent").join(", ")}.`
      },
      ...(analysis.trace || []),
      {
        step: "[Policy Check] EvaluatorAgent",
        status: agentOrchestration.qualityChecks?.some((check) => check.id === "policy_grounding" && !check.passed) ? "warning" : "complete",
        detail: `Policy grounding ${agentOrchestration.qualityChecks?.find((check) => check.id === "policy_grounding")?.passed ? "passed" : "requires review"}.`
      },
      {
        step: "[Decision Optimization] OptimizerAgent",
        status: "complete",
        detail: agentOrchestration.agentReports.find((report) => report.agentId === "OptimizerAgent")?.output
      },
      {
        step: "[Evaluator Gate] EvaluatorAgent",
        status: agentOrchestration.qualityScore === 100 ? "complete" : "warning",
        detail: `Final quality gate: ${agentOrchestration.finalGate}; quality score ${agentOrchestration.qualityScore}%.`
      },
      {
        step: "[Audit Logging]",
        status: "complete",
        detail: `Structured JSON audit saved under ${NEXUS_AUDIT_SCHEMA_VERSION}.`
      },
      {
        step: "[Final Response]",
        status: "complete",
        detail: "Customer-safe response separated from the employee operational summary."
      }
    ]
  };
  const structuredAuditTrail = buildStructuredAuditTrail({
    auditId,
    correlationId,
    context,
    analysis,
    agentOrchestration,
    policies,
    openAiError
  });
  analysis = {
    ...analysis,
    structuredAuditTrail
  };

  console.info("[NexusAudit]", JSON.stringify({
    auditId,
    correlationId,
    intent: analysis.intent,
    selectedAgents: agentOrchestration.selectedAgents,
    finalGate: agentOrchestration.finalGate,
    qualityScore: agentOrchestration.qualityScore,
    customerResponseSeparated: Boolean(analysis.customerSafeResponse)
  }));

  const auditEvent = {
    auditId,
    correlationId,
    timestamp: new Date().toISOString(),
    actor: actorName || (mode === "customer" ? "Customer Voice AI" : "Employee VoiceOps"),
    actorUserId: actorUserId || null,
    transcript,
    mode,
    language,
    customerId: customer?.customerId || null,
    payrollId: record?.payrollId || null,
    intent: analysis.intent,
    confidence: analysis.confidence,
    riskLevel: analysis.riskLevel,
    suggestedAction: analysis.suggestedAction,
    requestType: analysis.requestType,
    customerSafeResponse: analysis.customerSafeResponse,
    customerReason: analysis.customerReason,
    caseReason: analysis.caseReason,
    recommendation: analysis.recommendation,
    decisionLabel: analysis.decisionLabel,
    decisionExplanation: analysis.decisionExplanation,
    requiredDocuments: analysis.requiredDocuments,
    agentOrchestration: analysis.agentOrchestration,
    agentReports: analysis.agentReports,
    qualityScore: analysis.qualityScore,
    qualityChecks: analysis.qualityChecks,
    systemDirectiveVersion: analysis.systemDirectiveVersion,
    auditSchemaVersion: analysis.auditSchemaVersion,
    structuredAuditTrail,
    trace: analysis.trace,
    sources: analysis.sourceCitations,
    engine: analysis.engine,
    model: analysis.model,
    status: "pending_approval",
    openAiError
  };

  db.auditLogs.unshift(auditEvent);
  await writeDb(db);
  json(res, 200, { ...analysis, auditId: auditEvent.auditId, customer, payrollRecord: record || null, openAiError });
}

async function transcribeAudio(req, res) {
  if (!process.env.OPENAI_API_KEY) {
    return json(res, 503, {
      error: "Server transcription is not configured. Set a new OPENAI_API_KEY and restart the API server."
    });
  }

  const body = await readBody(req);
  const audioData = String(body.audioData || "");
  const mimeType = String(body.mimeType || "audio/webm").split(";")[0];
  const base64 = audioData.includes(",") ? audioData.split(",").pop() : audioData;
  if (!base64) return json(res, 400, { error: "Missing audio recording" });

  const audioBuffer = Buffer.from(base64, "base64");
  if (!audioBuffer.length) return json(res, 400, { error: "Empty audio recording" });
  if (audioBuffer.length > 8 * 1024 * 1024) {
    return json(res, 413, { error: "Audio recording is too large. Keep it under 20 seconds." });
  }

  const extensionByMime = {
    "audio/webm": "webm",
    "audio/ogg": "ogg",
    "audio/mp4": "mp4",
    "audio/mpeg": "mp3",
    "audio/wav": "wav"
  };
  const extension = extensionByMime[mimeType] || "webm";
  const form = new FormData();
  form.append("file", new Blob([audioBuffer], { type: mimeType }), `nexus-voice.${extension}`);
  form.append("model", TRANSCRIBE_MODEL);
  form.append("language", body.language === "ar" ? "ar" : "en");
  form.append(
    "prompt",
    body.language === "ar"
      ? "محادثة بنكية باللهجة الأردنية. اكتب النص بالعربية بدقة."
      : "A professional retail banking conversation. Transcribe accurately."
  );

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: form
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    return json(res, response.status, {
      error: result?.error?.message || `Voice transcription failed (${response.status})`
    });
  }

  const text = String(result.text || "").trim();
  if (!text) return json(res, 422, { error: "No speech was detected in the recording." });
  json(res, 200, { text, model: TRANSCRIBE_MODEL });
}

async function createAccount(req, res) {
  const db = await readDb();
  const body = await readBody(req);
  const type = body.type === "customer" ? "customer" : "employee";
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim();
  const roleOrCompany = String(body.roleOrCompany || "").trim();

  if (!name || !email) {
    return json(res, 400, { error: "Name and email are required" });
  }

  const now = new Date().toISOString();
  let linkedCustomerId = null;

  if (type === "customer") {
    linkedCustomerId = String(body.customerId || randomDigits(5)).replace(/\D/g, "").slice(0, 8) || randomDigits(5);
    while (db.customers.some((customer) => customer.customerId === linkedCustomerId)) {
      linkedCustomerId = randomDigits(5);
    }
    db.customers.unshift({
      customerId: linkedCustomerId,
      employeeId: linkedCustomerId,
      name,
      segment: "New Digital Customer",
      company: roleOrCompany || "Self Service",
      maskedAccount: `JO${randomDigits(2)} NEXU **** ${linkedCustomerId.slice(-4).padStart(4, "0")}`,
      phone: "07*******",
      riskProfile: "Low"
    });
  }

  const user = {
    userId: type === "employee" ? id("EMP") : `CUS-${linkedCustomerId}`,
    type,
    name,
    email,
    role: type === "employee" ? roleOrCompany || "Bank Employee" : "Retail Customer",
    department: type === "employee" ? "Banking Operations" : "Customer Channel",
    linkedCustomerId,
    status: "Active",
    createdAt: now
  };

  db.users.unshift(user);
  db.auditLogs.unshift({
    auditId: id("AUD"),
    timestamp: now,
    actor: "Account Admin",
    actorUserId: user.userId,
    transcript: `${type} account created for ${name} (${maskEmail(email)})`,
    mode: "system",
    language: "en",
    customerId: linkedCustomerId,
    payrollId: null,
    intent: "account_creation",
    confidence: 100,
    riskLevel: "Low",
    suggestedAction: "Account created in sandbox",
    sources: [],
    engine: "account-workflow",
    model: "nexus-account-v1",
    status: "complete"
  });

  await writeDb(db);
  json(res, 201, { user });
}

async function createTicket(req, res) {
  const db = await readDb();
  const body = await readBody(req);
  const audit = db.auditLogs.find((item) => item.auditId === body.auditId);
  if (!audit) return json(res, 404, { error: "Audit event not found" });

  const ticket = {
    ticketId: id("OPS-12"),
    auditId: audit.auditId,
    createdAt: new Date().toISOString(),
    status: "Open",
    priority: audit.riskLevel === "High" ? "High" : "Medium",
    title: body.title || audit.suggestedAction || "Payroll exception review",
    customerId: audit.customerId,
    payrollId: audit.payrollId,
    owner: "Operations Queue",
    summary: "Generated from Nexus AI VoiceOps decision trace."
  };
  audit.status = "ticket_created";
  db.tickets.unshift(ticket);
  db.auditLogs.unshift({
    auditId: id("AUD"),
    timestamp: new Date().toISOString(),
    actor: "System",
    transcript: `Ticket ${ticket.ticketId} created from ${audit.auditId}`,
    mode: "system",
    customerId: audit.customerId,
    payrollId: audit.payrollId,
    intent: "ticket_creation",
    confidence: 100,
    riskLevel: audit.riskLevel,
    suggestedAction: "Ticket created",
    sources: audit.sources,
    engine: "workflow",
    model: "nexus-ticketing-v1",
    status: "complete"
  });
  const automation = await triggerN8nWorkflow(
    db,
    "ticket_created",
    buildN8nPayload({
      workflowKey: "ticket_created",
      eventType: "ops_ticket_created",
      correlationId: id("CORR"),
      audit,
      ticket
    })
  );
  await writeDb(db);
  json(res, 201, { ticket, automation });
}

async function createServiceRequest(req, res) {
  const db = await readDb();
  const body = await readBody(req);
  const audit = db.auditLogs.find((item) => item.auditId === body.auditId);
  if (!audit) return json(res, 404, { error: "Audit event not found" });
  const customer = db.customers.find((item) => item.customerId === audit.customerId);

  const request = {
    requestId: id("REQ"),
    auditId: audit.auditId,
    createdAt: new Date().toISOString(),
    customerId: audit.customerId,
    customerName: customer?.name || null,
    type: body.requestType || audit.requestType || audit.intent || "service_request",
    status: "Submitted",
    priority: audit.riskLevel === "High" ? "High" : audit.riskLevel === "Medium" ? "Medium" : "Normal",
    channel: audit.mode === "customer" ? "Customer Voice AI" : "Employee VoiceOps",
    summary: body.summary || audit.suggestedAction || "Customer request submitted from Nexus AI.",
    assignedQueue: body.assignedQueue || (audit.requestType === "loan_application" ? "Credit Operations" : "Digital Service Desk"),
    decisionRecommendation: body.recommendation || audit.recommendation || "manual_review",
    decisionLabel: body.decisionLabel || audit.decisionLabel || "Operations review",
    decisionExplanation: body.decisionExplanation || audit.decisionExplanation || audit.suggestedAction || "Review required before final decision.",
    requiredDocuments: body.requiredDocuments || audit.requiredDocuments || [],
    documentIds: [],
    documentCount: 0,
    documentStatus: "Awaiting documents",
    analysisConfidence: audit.confidence,
    riskLevel: audit.riskLevel,
    adminDecision: null,
    adminNote: null,
    decidedAt: null,
    decidedBy: null
  };

  audit.status = "request_submitted";
  db.serviceRequests.unshift(request);
  db.auditLogs.unshift({
    auditId: id("AUD"),
    timestamp: new Date().toISOString(),
    actor: "Customer Request Workflow",
    actorUserId: audit.actorUserId || null,
    transcript: `Service request ${request.requestId} submitted from ${audit.auditId}`,
    mode: "system",
    language: audit.language || "en",
    customerId: audit.customerId,
    payrollId: audit.payrollId,
    intent: "service_request_submission",
    confidence: 100,
    riskLevel: audit.riskLevel,
    suggestedAction: "Request sent to bank queue",
    sources: audit.sources,
    engine: "request-workflow",
    model: "nexus-request-v1",
    status: "complete"
  });
  const automationWorkflow = workflowForRequest(request);
  const automation = await triggerN8nWorkflow(
    db,
    automationWorkflow,
    buildN8nPayload({
      workflowKey: automationWorkflow,
      eventType: request.type === "payroll_exception_inquiry" ? "payroll_exception_submitted" : "service_request_submitted",
      correlationId: id("CORR"),
      request,
      audit
    })
  );

  await writeDb(db);
  json(res, 201, { request, automation });
}

async function uploadServiceRequestDocuments(req, res) {
  const db = await readDb();
  const body = await readBody(req);
  const request = db.serviceRequests.find((item) => item.requestId === body.requestId);
  if (!request) return json(res, 404, { error: "Service request not found" });
  const loanLikeRequest = String(request.type || "").toLowerCase().includes("loan");
  if (!loanLikeRequest) return json(res, 400, { error: "Documents are only enabled for loan-related applications in this demo." });
  if (body.customerId && request.customerId !== body.customerId) return json(res, 403, { error: "Document upload does not match the customer session." });

  const files = Array.isArray(body.files) ? body.files : [];
  if (!files.length) return json(res, 400, { error: "No documents supplied" });
  if (files.length > 5) return json(res, 400, { error: "Upload up to 5 documents per request." });

  const now = new Date().toISOString();
  const savedDocuments = [];
  for (const file of files) {
    const parsed = parseUploadedFile(file);
    const documentId = id("DOC");
    const storedName = `${documentId}${parsed.ext}`;
    await writeFile(path.join(UPLOAD_DIR, storedName), parsed.buffer);
    const document = {
      documentId,
      requestId: request.requestId,
      customerId: request.customerId,
      uploadedByUserId: body.userId || null,
      uploadedByName: body.userName || "Customer",
      originalName: parsed.originalName,
      storedName,
      mimeType: parsed.mimeType,
      size: parsed.buffer.length,
      uploadedAt: now
    };
    db.documentUploads.unshift(document);
    savedDocuments.push(document);
  }

  request.documentIds = Array.from(new Set([...(request.documentIds || []), ...savedDocuments.map((doc) => doc.documentId)]));
  request.documentCount = request.documentIds.length;
  request.documentStatus = "Documents received";
  request.notification = "Loan documents uploaded and ready for credit operations review.";

  db.auditLogs.unshift({
    auditId: id("AUD"),
    timestamp: now,
    actor: "Customer Document Upload",
    actorUserId: body.userId || null,
    transcript: `${savedDocuments.length} document(s) uploaded for ${request.requestId}`,
    mode: "system",
    language: body.language || "en",
    customerId: request.customerId,
    payrollId: null,
    intent: "document_upload",
    confidence: 100,
    riskLevel: request.riskLevel || "Medium",
    suggestedAction: "Documents linked to loan application",
    requestType: request.type,
    recommendation: request.decisionRecommendation,
    decisionLabel: request.decisionLabel,
    decisionExplanation: request.decisionExplanation,
    requiredDocuments: request.requiredDocuments || [],
    sources: [],
    engine: "document-workflow",
    model: "nexus-document-v1",
    status: "complete"
  });
  const automation = await triggerN8nWorkflow(
    db,
    "loan_documents_intake",
    buildN8nPayload({
      workflowKey: "loan_documents_intake",
      eventType: "loan_documents_uploaded",
      correlationId: id("CORR"),
      request,
      documents: savedDocuments,
      decision: {
        recommendation: request.decisionRecommendation,
        decision_label: request.decisionLabel,
        document_status: request.documentStatus
      }
    })
  );

  await writeDb(db);
  json(res, 201, { documents: savedDocuments, request, automation });
}

async function sendDocumentFile(req, res, documentId, disposition = "attachment") {
  const db = await readDb();
  const document = db.documentUploads.find((item) => item.documentId === documentId);
  if (!document) return json(res, 404, { error: "Document not found" });

  const filePath = path.resolve(UPLOAD_DIR, document.storedName);
  const relativePath = path.relative(UPLOAD_DIR, filePath);
  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) return json(res, 403, { error: "Forbidden" });
  try {
    const file = await readFile(filePath);
    res.writeHead(200, {
      "content-type": document.mimeType || "application/octet-stream",
      "content-disposition": `${disposition}; filename="${sanitizeFileName(document.originalName)}"`,
      "cache-control": "no-store",
      ...corsHeaders()
    });
    res.end(file);
  } catch {
    json(res, 404, { error: "Document file missing" });
  }
}

async function downloadDocument(req, res, documentId) {
  return sendDocumentFile(req, res, documentId, "attachment");
}

async function viewDocument(req, res, documentId) {
  return sendDocumentFile(req, res, documentId, "inline");
}

async function decideServiceRequest(req, res) {
  const db = await readDb();
  const body = await readBody(req);
  const request = db.serviceRequests.find((item) => item.requestId === body.requestId);
  if (!request) return json(res, 404, { error: "Service request not found" });

  const decision = body.decision === "rejected" ? "rejected" : body.decision === "needs_review" ? "needs_review" : "approved";
  const statusByDecision = {
    approved: "Approved",
    rejected: "Rejected",
    needs_review: "Needs Review"
  };
  const note = String(body.note || "").trim() || request.decisionExplanation || "Decision recorded from operations inbox.";
  const approver = String(body.approver || "").trim() || "Demo Operations Officer";
  const decidedAt = new Date().toISOString();

  request.status = statusByDecision[decision];
  request.adminDecision = decision;
  request.adminNote = note;
  request.decidedAt = decidedAt;
  request.decidedBy = approver;

  const audit = db.auditLogs.find((item) => item.auditId === request.auditId);
  if (audit) audit.status = `request_${decision}`;

  db.auditLogs.unshift({
    auditId: id("AUD"),
    timestamp: decidedAt,
    actor: approver,
    actorUserId: body.actorUserId || null,
    transcript: `Service request ${request.requestId} ${statusByDecision[decision]}`,
    mode: "system",
    language: body.language || "en",
    customerId: request.customerId,
    payrollId: audit?.payrollId || null,
    intent: "service_request_decision",
    confidence: request.analysisConfidence || 100,
    riskLevel: request.riskLevel || "Low",
    suggestedAction: note,
    requestType: request.type,
    recommendation: request.decisionRecommendation,
    decisionLabel: request.decisionLabel,
    decisionExplanation: note,
    requiredDocuments: request.requiredDocuments || [],
    sources: audit?.sources || [],
    engine: "request-decision-workflow",
    model: "nexus-request-decision-v1",
    status: "complete"
  });
  const documents = (db.documentUploads || []).filter((document) => (request.documentIds || []).includes(document.documentId) || document.requestId === request.requestId);
  const automationWorkflow = request.type === "loan_application" ? "loan_decision_notification" : workflowForRequest(request);
  const automation = await triggerN8nWorkflow(
    db,
    automationWorkflow,
    buildN8nPayload({
      workflowKey: automationWorkflow,
      eventType: request.type === "loan_application" ? "loan_decision_recorded" : "service_request_decision_recorded",
      correlationId: id("CORR"),
      request,
      audit,
      documents,
      decision: {
        decision,
        status: request.status,
        note,
        decided_by: approver,
        decided_at: decidedAt
      }
    })
  );

  await writeDb(db);
  json(res, 200, { request, automation });
}

async function approve(req, res) {
  const db = await readDb();
  const body = await readBody(req);
  const audit = db.auditLogs.find((item) => item.auditId === body.auditId);
  if (!audit) return json(res, 404, { error: "Audit event not found" });

  const approval = {
    approvalId: id("APR"),
    auditId: audit.auditId,
    timestamp: new Date().toISOString(),
    approver: body.approver || "Demo Operations Officer",
    decision: body.decision || "Approved",
    note: body.note || "Approved in sandbox demo."
  };
  audit.status = "approved";
  db.approvals.unshift(approval);
  await writeDb(db);
  json(res, 201, { approval });
}

async function reset(res) {
  await copyFile(SEED_PATH, DB_PATH);
  json(res, 200, { ok: true });
}

let frontendProcess;

function startFrontendDevServer() {
  if (!USE_FRONTEND_PROXY || frontendProcess) return;
  const command = process.platform === "win32" ? process.env.ComSpec || "cmd.exe" : "npm";
  const args =
    process.platform === "win32"
      ? ["/d", "/s", "/c", "npm", "run", "dev", "--", "--host", "127.0.0.1", "--port", String(FRONTEND_DEV_PORT)]
      : ["run", "dev", "--", "--host", "127.0.0.1", "--port", String(FRONTEND_DEV_PORT)];
  frontendProcess = spawn(command, args, {
    cwd: FRONTEND_DIR,
    env: {
      ...process.env,
      VITE_API_BASE_URL: process.env.NEXUS_FRONTEND_API_BASE_URL || process.env.VITE_API_BASE_URL || ""
    },
    stdio: "ignore",
    windowsHide: true
  });

  frontendProcess.on("error", (error) => {
    console.warn(`Unable to start frontend dev server: ${error.message}`);
  });

  const stopFrontend = () => {
    if (frontendProcess && !frontendProcess.killed) frontendProcess.kill();
  };
  process.once("exit", stopFrontend);
  process.once("SIGINT", () => {
    stopFrontend();
    process.exit(0);
  });
  process.once("SIGTERM", () => {
    stopFrontend();
    process.exit(0);
  });
}

async function proxyFrontend(req, res) {
  try {
    const upstream = await fetch(`${FRONTEND_DEV_URL}${req.url}`, {
      headers: {
        accept: req.headers.accept || "*/*"
      }
    });
    const headers = {};
    upstream.headers.forEach((value, key) => {
      if (!["connection", "content-encoding", "transfer-encoding"].includes(key.toLowerCase())) {
        headers[key] = value;
      }
    });
    headers["cache-control"] = "no-store";
    res.writeHead(upstream.status, headers);
    res.end(Buffer.from(await upstream.arrayBuffer()));
  } catch {
    res.writeHead(503, {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store"
    });
    res.end(`<!doctype html>
<html>
<head><meta charset="utf-8"><meta http-equiv="refresh" content="2"><title>Nexus AI VoiceOps</title></head>
<body style="margin:0;background:#061424;color:#eaf6ff;font-family:Arial,sans-serif;display:grid;min-height:100vh;place-items:center">
  <main style="max-width:520px;padding:32px;border:1px solid rgba(255,255,255,.14);border-radius:18px;background:rgba(255,255,255,.06)">
    <h1 style="margin:0 0 12px">Nexus UI is starting</h1>
    <p style="line-height:1.6;color:#b8c7d9">Keep this window open and refresh in a few seconds. If this message stays, run npm install inside the frontend folder once.</p>
  </main>
</body>
</html>`);
  }
}

async function serveStatic(req, res) {
  const urlPath = decodeURIComponent(new URL(req.url, `http://${req.headers.host}`).pathname);
  const safePath = urlPath === "/" ? "/index.html" : urlPath;
  const filePath = path.normalize(path.join(PUBLIC_DIR, safePath));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  try {
    const file = await readFile(filePath);
    res.writeHead(200, {
      "content-type": mimeTypes[path.extname(filePath)] || "application/octet-stream",
      "cache-control": "no-store",
      ...corsHeaders()
    });
    res.end(file);
  } catch {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8", ...corsHeaders() });
    res.end("Not found");
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const { pathname } = new URL(req.url, `http://${req.headers.host}`);
    if (req.method === "OPTIONS") return sendOptions(res);
    if (req.method === "GET" && pathname === "/") {
      res.writeHead(302, { location: "/login", ...corsHeaders() });
      res.end();
      return;
    }
    if (req.method === "GET" && pathname === "/api/health") return json(res, 200, { ok: true, service: "nexus-ai-voiceops" });
    if (req.method === "GET" && pathname === "/api/state") return json(res, 200, await readDb());
    if (req.method === "GET" && pathname === "/api/evaluations/agents") {
      return json(res, 200, runAgentEvaluationSuite(await readDb()));
    }
    if (req.method === "GET" && pathname === "/api/voice-capabilities") {
      return json(res, 200, {
        serverTranscription: Boolean(process.env.OPENAI_API_KEY),
        model: process.env.OPENAI_API_KEY ? TRANSCRIBE_MODEL : null
      });
    }
    if (req.method === "POST" && pathname === "/api/analyze") return analyze(req, res);
    if (req.method === "POST" && pathname === "/api/transcribe") return transcribeAudio(req, res);
    if (req.method === "POST" && pathname === "/api/accounts") return createAccount(req, res);
    if (req.method === "POST" && pathname === "/api/tickets") return createTicket(req, res);
    if (req.method === "POST" && pathname === "/api/service-requests") return createServiceRequest(req, res);
    if (req.method === "POST" && pathname === "/api/service-requests/documents") return uploadServiceRequestDocuments(req, res);
    if (req.method === "POST" && pathname === "/api/service-requests/decision") return decideServiceRequest(req, res);
    const downloadMatch = pathname.match(/^\/api\/documents\/([^/]+)\/download$/);
    const viewMatch = pathname.match(/^\/api\/documents\/([^/]+)\/view$/);
    if (req.method === "GET" && downloadMatch) return downloadDocument(req, res, downloadMatch[1]);
    if (req.method === "GET" && viewMatch) return viewDocument(req, res, viewMatch[1]);
    if (req.method === "POST" && pathname === "/api/approve") return approve(req, res);
    if (req.method === "POST" && pathname === "/api/reset") return reset(res);
    if (pathname.startsWith("/api/")) return json(res, 404, { error: "API route not found" });
    if (req.method === "GET") return USE_FRONTEND_PROXY ? proxyFrontend(req, res) : serveStatic(req, res);
    json(res, 405, { error: "Method not allowed" });
  } catch (error) {
    json(res, 500, { error: error.message });
  }
});

await ensureDb();
startFrontendDevServer();
server.listen(PORT, () => {
  console.log(`Nexus AI VoiceOps running at http://localhost:${PORT}`);
  if (USE_FRONTEND_PROXY) {
    console.log(`Single-link UI enabled. Frontend is proxied from ${FRONTEND_DEV_URL}`);
  }
  console.log(process.env.OPENAI_API_KEY ? `OpenAI model: ${MODEL}` : "OpenAI key not set. Using deterministic sandbox engine.");
});
