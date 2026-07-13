const state = {
  mode: "employee",
  voiceMode: "live",
  language: localStorage.getItem("nexus-language") || "en",
  recognition: null,
  isListening: false,
  lastAnalysis: null,
  stagedLoanDocuments: [],
  uploadedDocumentStatus: "",
  db: null,
  activeUserId: localStorage.getItem("nexus-active-user") || "EMP-1001",
  loginRole: "customer",
  session: null
};

function requestedLoginRole() {
  try {
    const role = new URLSearchParams(window.location.search).get("role");
    return role === "employee" || role === "customer" ? role : null;
  } catch {
    return null;
  }
}

function syncLoginRoleFromUrl() {
  state.loginRole = requestedLoginRole() || state.loginRole || "customer";
  $$("[data-login-role]").forEach((button) => {
    button.classList.toggle("active", button.dataset.loginRole === state.loginRole);
  });
}

function updateLoginRoleUrl(role) {
  const url = new URL(window.location.href);
  url.searchParams.set("role", role);
  window.history.replaceState({}, "", url);
}

const demoTranscripts = {
  employee: {
    en: "Why did customer 10452 not receive his salary?",
    ar: "ليش راتب العميل 10452 ما نزل؟"
  },
  customer: {
    en: "Why did my salary not arrive?",
    ar: "ليش راتبي ما نزل؟"
  }
};

const scenarioTranscripts = {
  employee: {
    salary: { en: "Why did customer 10452 not receive his salary?", ar: "ليش راتب العميل 10452 ما نزل؟" },
    balance: { en: "Show the balance for customer 10452", ar: "اعرض رصيد العميل 10452" },
    transactions: { en: "Show the latest transactions for customer 10452", ar: "اعرض آخر عمليات العميل 10452" },
    loan: { en: "Check loan eligibility for customer 10452", ar: "افحص أهلية القرض للعميل 10452" },
    card: { en: "Why is the card for customer 11880 blocked?", ar: "ليش بطاقة العميل 11880 موقوفة؟" },
    kyc: { en: "What KYC documents are missing for customer 22017?", ar: "ما هي مستندات KYC الناقصة للعميل 22017؟" },
    cliq: { en: "Can customer 10452 transfer by CliQ to a new beneficiary?", ar: "هل يستطيع العميل 10452 التحويل عبر كليك لمستفيد جديد؟" },
    complaint: { en: "Create a complaint request for customer 10452 about salary delay", ar: "أنشئ طلب شكوى للعميل 10452 بسبب تأخر الراتب" }
  },
  customer: {
    salary: { en: "Why did my salary not arrive?", ar: "ليش راتبي ما نزل؟" },
    balance: { en: "What is my available balance?", ar: "كم رصيدي المتاح؟" },
    transactions: { en: "Show my latest transactions", ar: "اعرض آخر عملياتي" },
    loan: { en: "Can I apply for a personal loan?", ar: "هل أقدر أقدم على قرض شخصي؟" },
    card: { en: "What is my card status?", ar: "ما حالة بطاقتي؟" },
    kyc: { en: "Do I need to update my KYC documents?", ar: "هل أحتاج أحدث وثائق KYC؟" },
    cliq: { en: "Can I send a CliQ transfer to a new beneficiary?", ar: "هل أقدر أحول كليك لمستفيد جديد؟" },
    complaint: { en: "I want to send a complaint to the bank", ar: "بدي أرسل شكوى للبنك" }
  }
};

const personaDemos = [
  {
    id: "perfect-loan",
    title: "Perfect Candidate",
    tag: "Approve",
    customerId: "33045",
    expected: "CreditRiskAgent should approve.",
    script: "Customer 33045 Sara Mansour wants a personal loan of 12,000 JOD for home renovation. Her monthly salary is 2,450 JOD, her debt-to-income ratio is 22%, her salary certificate, bank statement, and ID are already verified. Please check eligibility."
  },
  {
    id: "high-risk",
    title: "High-Risk Candidate",
    tag: "Reject",
    customerId: "11880",
    expected: "CreditRiskAgent should reject.",
    script: "Customer 11880 Maya Al-Khatib wants an 18,000 JOD debt consolidation loan. Her monthly salary is 1,350 JOD, she has late payments, high card utilization, and a 67% debt-to-income ratio. Please assess the loan request."
  },
  {
    id: "missing-doc",
    title: "Missing Document",
    tag: "Ask docs",
    customerId: "22017",
    expected: "PolicyAgent should request salary certificate.",
    script: "Customer 22017 Yazan Saleh is asking for a 14,500 JOD car loan. He uploaded his bank statements and national ID, but the official salary certificate is missing. Can the bank check eligibility?"
  },
  {
    id: "fraud-transfer",
    title: "FraudAgent Trigger",
    tag: "Step-up",
    customerId: "55601",
    expected: "FraudAgent should block auto execution.",
    script: "Customer 55601 Leen Nasser wants to send 9,200 JOD urgently by CliQ to a new overseas beneficiary in Estonia called Nordic Trade FZE. This is her first transfer to this beneficiary. Can you process it now?"
  },
  {
    id: "vip-policy",
    title: "VIP Policy Query",
    tag: "Policy",
    customerId: "99077",
    expected: "PolicyAgent and ComplianceAgent should route to private banking approval.",
    script: "Customer 99077 Faisal Al-Mansour is a private banking VIP client requesting a 75,000 JOD secured credit facility using his investment portfolio as collateral. Does bank policy allow this, and what approvals or documents are required?"
  }
];

const languageCopy = {
  en: {
    ready: "Ready for voice command",
    demoReady: "Demo mode ready",
    unavailable: "Browser STT unavailable",
    listening: "Listening...",
    hint: "Try: Why did customer 10452 not receive his salary?",
    loaded: "Demo transcript loaded.",
    analyzed: "Decision generated and audit event saved.",
    approved: "Decision approved and logged.",
    reset: "Sandbox data reset.",
    noTranscript: "Write or record a transcript first.",
    analyze: "Analyze Query",
    analyzing: "Analyzing...",
    play: "Play Demo Scenario",
    speakLang: "en-US"
  },
  ar: {
    ready: "جاهز للأمر الصوتي",
    demoReady: "وضع العرض جاهز",
    unavailable: "التعرف الصوتي غير متاح في هذا المتصفح",
    listening: "أستمع الآن...",
    hint: "جرّب: ليش راتب العميل 10452 ما نزل؟",
    loaded: "تم تحميل السيناريو العربي.",
    analyzed: "تم توليد القرار وحفظه في سجل التدقيق.",
    approved: "تم اعتماد القرار وتسجيله.",
    reset: "تمت إعادة بيانات التجربة.",
    noTranscript: "اكتب أو سجل النص أولًا.",
    analyze: "تحليل الطلب",
    analyzing: "جاري التحليل...",
    play: "تشغيل السيناريو",
    speakLang: "ar-JO"
  }
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const els = {
  transcript: $("#transcript"),
  loginScreen: $("#loginScreen"),
  appShell: $("#appShell"),
  loginBtn: $("#loginBtn"),
  loginEmailInput: $("#loginEmailInput"),
  loginEmailOptions: $("#loginEmailOptions"),
  loginPasswordInput: $("#loginPasswordInput"),
  loginAccountSelect: $("#loginAccountSelect"),
  loginEyebrow: $("#loginEyebrow"),
  loginHeadline: $("#loginHeadline"),
  loginDescription: $("#loginDescription"),
  visualCaptionLabel: $("#visualCaptionLabel"),
  visualCaptionText: $("#visualCaptionText"),
  logoutBtn: $("#logoutBtn"),
  roleBadge: $("#roleBadge"),
  activeAccountLabel: $("#activeAccountLabel"),
  micBtn: $("#micBtn"),
  voicePad: $("#voicePad"),
  voiceState: $("#voiceState"),
  personaGrid: $("#personaGrid"),
  analyzeBtn: $("#analyzeBtn"),
  playScenarioBtn: $("#playScenarioBtn"),
  playScenarioTop: $("#playScenarioTop"),
  speakAnswerBtn: $("#speakAnswerBtn"),
  sendRequestBtn: $("#sendRequestBtn"),
  approveBtn: $("#approveBtn"),
  createTicketBtn: $("#createTicketBtn"),
  resetDataBtn: $("#resetDataBtn"),
  emptyState: $("#emptyState"),
  answerContent: $("#answerContent"),
  engineBadge: $("#engineBadge"),
  responseEyebrow: $("#responseEyebrow"),
  responseTitle: $("#responseTitle"),
  intentValue: $("#intentValue"),
  riskValue: $("#riskValue"),
  confidenceValue: $("#confidenceValue"),
  answerText: $("#answerText"),
  customerResponse: $("#customerResponse"),
  customerResponseTitle: $("#customerResponseTitle"),
  customerReasonCard: $("#customerReasonCard"),
  customerReasonTitle: $("#customerReasonTitle"),
  customerReasonText: $("#customerReasonText"),
  caseReasonCard: $("#caseReasonCard"),
  caseReasonText: $("#caseReasonText"),
  suggestedAction: $("#suggestedAction"),
  agentSummary: $("#agentSummary"),
  agentGrid: $("#agentGrid"),
  documentUploadPanel: $("#documentUploadPanel"),
  documentRequirementText: $("#documentRequirementText"),
  loanDocumentInput: $("#loanDocumentInput"),
  loanDocumentList: $("#loanDocumentList"),
  loanUploadStatus: $("#loanUploadStatus"),
  traceList: $("#traceList"),
  sourcesList: $("#sourcesList"),
  recordGrid: $("#recordGrid"),
  policyList: $("#policyList"),
  requestsBoard: $("#requestsBoard"),
  loanDocumentBoard: $("#loanDocumentBoard"),
  customerRequestsTable: $("#customerRequestsTable"),
  ticketsTable: $("#ticketsTable"),
  automationTable: $("#automationTable"),
  auditTable: $("#auditTable"),
  auditIdBadge: $("#auditIdBadge"),
  metricAudit: $("#metricAudit"),
  metricUsers: $("#metricUsers"),
  metricTickets: $("#metricTickets"),
  metricApprovals: $("#metricApprovals"),
  metricConfidence: $("#metricConfidence"),
  voiceHint: $("#voiceHint"),
  activeAccountSelect: $("#activeAccountSelect"),
  accountForm: $("#accountForm"),
  accountType: $("#accountType"),
  accountName: $("#accountName"),
  accountEmail: $("#accountEmail"),
  accountRoleCompany: $("#accountRoleCompany"),
  accountsTable: $("#accountsTable"),
  toast: $("#toast")
};

function copy() {
  return languageCopy[state.language] || languageCopy.en;
}

function toast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  window.setTimeout(() => els.toast.classList.remove("show"), 2600);
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "content-type": "application/json" },
    ...options
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "Request failed");
  return payload;
}

function formatDate(value) {
  if (!value) return "--";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function money(value, currency = "JOD") {
  if (value == null) return "--";
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: 2
  }).format(value);
}

function fileSize(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function automationSuffix(automation) {
  if (!automation?.correlationId) return "";
  const underway = automation.status === "success" || automation.status === "sandbox_queued";
  return underway ? ` Process underway: ${automation.correlationId}` : ` Automation status: ${automation.status}`;
}

function riskClass(risk) {
  if (risk === "High") return "var(--red)";
  if (risk === "Medium") return "var(--amber)";
  return "var(--green)";
}

function activePersonaDemos() {
  return state.db?.demoPersonas?.length ? state.db.demoPersonas : personaDemos;
}

function renderPersonaDemos(personas = activePersonaDemos()) {
  if (!els.personaGrid) return;
  els.personaGrid.innerHTML = personas
    .map((persona) => `
      <button type="button" class="persona-card" data-persona="${persona.id}">
        <span>${persona.tag}</span>
        <strong>${persona.title}</strong>
        <small>${persona.expected}</small>
      </button>
    `)
    .join("");
}

function renderMetrics(db) {
  els.metricAudit.textContent = db.auditLogs.length;
  els.metricUsers.textContent = db.users?.length || 0;
  els.metricTickets.textContent = db.tickets.filter((ticket) => ticket.status === "Open").length;
  els.metricApprovals.textContent = db.approvals.length;
  const confidenceEvents = db.auditLogs.filter((event) => Number.isFinite(event.confidence));
  const avg = confidenceEvents.length
    ? Math.round(confidenceEvents.reduce((sum, event) => sum + event.confidence, 0) / confidenceEvents.length)
    : null;
  els.metricConfidence.textContent = avg ? `${avg}%` : "--";
}

function currentUser() {
  return state.db?.users?.find((user) => user.userId === state.activeUserId) || state.db?.users?.[0] || null;
}

function activeRole() {
  return sessionUser()?.type || state.session?.role || "employee";
}

function selectedDemoTranscript() {
  const role = activeRole();
  return demoTranscripts[role]?.[state.language] || demoTranscripts.employee.en;
}

function selectedScenarioTranscript(scenario) {
  const role = activeRole();
  return scenarioTranscripts[role]?.[scenario]?.[state.language] || selectedDemoTranscript();
}

function sessionUser() {
  return state.db?.users?.find((user) => user.userId === state.session?.userId) || currentUser();
}

function roleUsers(role) {
  return (state.db?.users || []).filter((user) => user.type === role);
}

function renderLoginRoleCopy() {
  const employee = state.loginRole === "employee";
  const ar = state.language === "ar";
  if (employee) {
    els.visualCaptionLabel.textContent = "VoiceOps Multi-Agent Mesh";
    els.visualCaptionText.textContent = "Secure voice decisions, routed through specialized banking AI agents.";
    els.loginEyebrow.textContent = "Secure multi-agent banking layer";
    els.loginHeadline.textContent = "Access the intelligent operations vault";
    els.loginDescription.textContent = "Voice-enabled banking operations with explainability, audit trails, and human approval workflows.";
    els.loginBtn.textContent = "Login to Employee Workspace";
    return;
  }

  els.visualCaptionLabel.textContent = ar ? "بوابة مصرفية صوتية" : "Voice Banking Portal";
  els.visualCaptionText.textContent = ar
    ? "تجربة خاصة وآمنة لطلبات الراتب والقروض والبطاقات والتحويلات."
    : "Private voice banking for salary, loan, card, and transfer support.";
  els.loginEyebrow.textContent = ar ? "بوابة عميل آمنة" : "Secure customer banking portal";
  els.loginHeadline.textContent = ar ? "ادخل إلى مساعدك البنكي الصوتي" : "Access your voice banking assistant";
  els.loginDescription.textContent = ar
    ? "اسأل عن راتبك، قروضك، بطاقاتك، تحويلاتك، وطلباتك بدون عرض أي تفاصيل تشغيلية داخلية."
    : "Ask about salary, loans, cards, transfers, and requests through a private banking experience.";
  els.loginBtn.textContent = ar ? "الدخول إلى بوابة العميل" : "Login to Customer Portal";
}

function renderDecisionShellCopy() {
  const customer = activeRole() === "customer";
  const ar = state.language === "ar";
  if (customer) {
    els.responseEyebrow.textContent = ar ? "رد بنكي آمن" : "Secure banking response";
    els.responseTitle.textContent = ar ? "رد البنك" : "Bank response";
    els.customerResponseTitle.textContent = ar ? "الرد" : "Response";
    els.customerReasonTitle.textContent = ar ? "سبب التأخير" : "Reason";
    els.emptyState.innerHTML = ar
      ? `<strong>اسأل البنك عن راتبك أو قرضك أو بطاقتك.</strong><p>ستظهر لك إجابة آمنة ومختصرة، ويمكنك إرسال الطلب ورفع المستندات المطلوبة عند الحاجة.</p>`
      : `<strong>Ask the bank about your salary, loan, card, or account.</strong><p>You will see a secure customer response, with request submission and document upload when needed.</p>`;
    return;
  }

  els.responseEyebrow.textContent = "Grounded response";
  els.responseTitle.textContent = "Decision output";
  els.customerResponseTitle.textContent = "Customer-safe response";
  els.customerReasonTitle.textContent = "Reason";
  els.emptyState.innerHTML = `<strong>Run the payroll demo to generate a bank-grade response.</strong><p>The answer will include source citations, confidence, risk, and a human approval workflow.</p>`;
}

function renderReasonCards(result = {}) {
  const customerReason = result.customerReason || "";
  const caseReason = result.caseReason || "";
  els.customerReasonText.textContent = customerReason;
  els.caseReasonText.textContent = caseReason;
  els.customerReasonCard.classList.toggle("hidden", !customerReason);
  els.caseReasonCard.classList.toggle("hidden", !caseReason);
}

function renderLoginAccounts() {
  renderLoginRoleCopy();
  const users = roleUsers(state.loginRole);
  if (!users.length) {
    els.loginAccountSelect.innerHTML = `<option value="">No ${state.loginRole} accounts found</option>`;
    if (els.loginEmailOptions) els.loginEmailOptions.innerHTML = "";
    if (els.loginEmailInput) els.loginEmailInput.value = "";
    els.loginBtn.disabled = true;
    return;
  }
  els.loginBtn.disabled = false;
  els.loginAccountSelect.innerHTML = users
    .map((user) => `
      <option value="${user.userId}">${user.name} · ${user.email}</option>
    `)
    .join("");
  if (els.loginEmailOptions) {
    els.loginEmailOptions.innerHTML = users
      .map((user) => `<option value="${user.email}" label="${user.name}"></option>`)
      .join("");
  }
  const typed = els.loginEmailInput?.value.trim().toLowerCase();
  const selectedUser = users.find((user) => (
    user.email.toLowerCase() === typed ||
    user.userId.toLowerCase() === typed ||
    user.name.toLowerCase() === typed
  )) || users[0];
  els.loginAccountSelect.value = selectedUser.userId;
  if (els.loginEmailInput) els.loginEmailInput.value = selectedUser.email;
}

function applyRoleView() {
  const user = sessionUser();
  const role = activeRole();
  const customer = role === "customer";
  const ar = state.language === "ar";
  document.body.classList.toggle("role-customer", role === "customer");
  document.body.classList.toggle("role-employee", role === "employee");
  state.mode = role === "customer" ? "customer" : "employee";
  $$("input[name='userMode']").forEach((input) => {
    input.checked = input.value === state.mode;
  });
  els.roleBadge.textContent = role === "customer" ? "Customer" : "Employee";
  els.activeAccountLabel.textContent = role === "customer" ? "Logged in as" : "Active account";
  if (customer) {
    els.analyzeBtn.textContent = ar ? "اسأل البنك" : "Ask Bank";
    els.playScenarioBtn.textContent = ar ? "سؤال جاهز" : "Use Sample Question";
    els.playScenarioTop.textContent = ar ? "اسأل عن راتبي" : "Ask about my salary";
  } else {
    els.analyzeBtn.textContent = copy().analyze;
    els.playScenarioBtn.textContent = copy().play;
    els.playScenarioTop.textContent = copy().play;
  }
  renderDecisionShellCopy();
}

function showLogin() {
  els.loginScreen.classList.remove("hidden");
  els.appShell.classList.add("hidden-shell");
  renderLoginAccounts();
}

function showApp() {
  els.loginScreen.classList.add("hidden");
  els.appShell.classList.remove("hidden-shell");
  applyRoleView();
}

function syncSessionFromStorage() {
  if (state.session?.userId) state.activeUserId = state.session.userId;
}

function renderActiveAccount(db) {
  const users = db.users || [];
  if (!users.length) {
    els.activeAccountSelect.innerHTML = `<option>No accounts</option>`;
    return;
  }

  const visibleUsers = state.session?.role === "customer"
    ? users.filter((user) => user.userId === state.session.userId)
    : users.filter((user) => user.type === "employee");

  if (!visibleUsers.some((user) => user.userId === state.activeUserId)) {
    state.activeUserId = visibleUsers[0]?.userId || users[0].userId;
  }
  localStorage.setItem("nexus-active-user", state.activeUserId);

  els.activeAccountSelect.innerHTML = visibleUsers
    .map((user) => `
      <option value="${user.userId}" ${user.userId === state.activeUserId ? "selected" : ""}>
        ${user.name} · ${user.type}
      </option>
    `)
    .join("");
}

function renderAccounts(db) {
  const users = db.users || [];
  if (!users.length) {
    els.accountsTable.innerHTML = `<tr><td colspan="7">No user accounts yet.</td></tr>`;
    return;
  }

  els.accountsTable.innerHTML = users
    .map((user) => `
      <tr>
        <td><strong>${user.userId}</strong><br><span>${formatDate(user.createdAt)}</span></td>
        <td>${user.type}</td>
        <td>${user.name}</td>
        <td>${user.email}</td>
        <td>${user.role || user.department || "--"}</td>
        <td>${user.linkedCustomerId || "--"}</td>
        <td>${user.status}</td>
      </tr>
    `)
    .join("");
}

function renderPolicies(db) {
  els.policyList.innerHTML = db.policies
    .map((policy) => `
      <article class="policy-card">
        <strong>${policy.title}</strong>
        <p>${policy.section}</p>
        <p>${policy.excerpt}</p>
      </article>
    `)
    .join("");
}

function renderTickets(db) {
  if (!db.tickets.length) {
    els.ticketsTable.innerHTML = `<tr><td colspan="6">No tickets yet.</td></tr>`;
    return;
  }
  els.ticketsTable.innerHTML = db.tickets
    .map((ticket) => `
      <tr>
        <td><strong>${ticket.ticketId}</strong><br><span>${formatDate(ticket.createdAt)}</span></td>
        <td>${ticket.customerId || "--"}</td>
        <td>${ticket.payrollId || "--"}</td>
        <td>${ticket.status}</td>
        <td>${ticket.priority}</td>
        <td>${ticket.owner}</td>
      </tr>
    `)
    .join("");
}

function requestStatusTone(status = "") {
  if (status === "Approved") return "success";
  if (status === "Rejected") return "danger";
  if (status === "Needs Review") return "warning";
  return "neutral";
}

function recommendationTone(recommendation = "") {
  if (recommendation.includes("approval") || recommendation === "approve") return "success";
  if (recommendation.includes("reject")) return "danger";
  return "warning";
}

function documentsForRequest(db, request) {
  const ids = new Set(request.documentIds || []);
  return (db.documentUploads || []).filter((document) => ids.has(document.documentId) || document.requestId === request.requestId);
}

function renderDocumentLinks(documents = []) {
  if (!documents.length) return `<div class="muted-item compact">No documents uploaded yet.</div>`;
  return documents
    .map((document) => {
      const viewUrl = `/api/documents/${document.documentId}/view`;
      const downloadUrl = `/api/documents/${document.documentId}/download`;
      const isImage = String(document.mimeType || "").startsWith("image/");
      const fileLabel = document.mimeType === "application/pdf" ? "PDF" : "FILE";
      return `
        <article class="document-preview">
          <a class="document-preview-frame" href="${viewUrl}" target="_blank" rel="noreferrer" aria-label="Open ${document.originalName}">
            ${isImage
              ? `<img src="${viewUrl}" alt="${document.originalName}" loading="lazy">`
              : `<div class="file-preview"><strong>${fileLabel}</strong><span>Document preview</span></div>`}
          </a>
          <div class="document-preview-meta">
            <strong>${document.originalName}</strong>
            <span>${fileSize(document.size)} &middot; ${formatDate(document.uploadedAt)}</span>
            <div class="document-preview-actions">
              <a href="${viewUrl}" target="_blank" rel="noreferrer">Open</a>
              <a href="${downloadUrl}" target="_blank" rel="noreferrer">Download</a>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderLoanDocumentQueue(db) {
  const requests = (db.serviceRequests || []).filter((request) => (
    request.type === "loan_application" &&
    request.status !== "Approved" &&
    request.status !== "Rejected"
  ));

  if (!requests.length) {
    els.loanDocumentBoard.innerHTML = `<div class="muted-item">No pending loan documents yet.</div>`;
    return;
  }

  els.loanDocumentBoard.innerHTML = requests
    .map((request) => {
      const documents = documentsForRequest(db, request);
      return `
        <article class="request-card ${documents.length ? "success" : "warning"}">
          <div class="request-card-head">
            <div>
              <span class="eyebrow">Loan application</span>
              <h3>${request.customerName || request.customerId || "Customer"} · ${request.requestId}</h3>
              <p>${request.decisionLabel || "Credit review"} · ${request.documentStatus || "Awaiting documents"}</p>
            </div>
            <div class="request-meta">
              <strong>${documents.length} file${documents.length === 1 ? "" : "s"}</strong>
              <span>${request.assignedQueue || "Credit Operations"}</span>
            </div>
          </div>
          <div class="request-explanation">
            <span>Credit note</span>
            <p>${request.decisionExplanation || "Review the uploaded income documents before final decision."}</p>
          </div>
          <div class="document-downloads">
            ${renderDocumentLinks(documents)}
          </div>
        </article>
      `;
    })
    .join("");
}

function renderRequests(db) {
  const requests = db.serviceRequests || [];
  if (!requests.length) {
    els.requestsBoard.innerHTML = `<div class="muted-item">No customer requests yet.</div>`;
    return;
  }

  const customersById = new Map((db.customers || []).map((customer) => [customer.customerId, customer]));
  const ar = state.language === "ar";
  els.requestsBoard.innerHTML = requests
    .map((request) => {
      const customer = customersById.get(request.customerId);
      const docs = request.requiredDocuments || [];
      const uploadedDocuments = documentsForRequest(db, request);
      const locked = request.status === "Approved" || request.status === "Rejected";
      const decisionText = request.adminDecision ? request.status : (request.decisionLabel || "Operations review");
      return `
        <article class="request-card ${requestStatusTone(request.status)}">
          <div class="request-card-head">
            <div>
              <span class="eyebrow">${request.type}</span>
              <h3>${request.summary || request.requestId}</h3>
              <p>${request.customerName || customer?.name || request.customerId || "--"} · ${request.customerId || "--"}</p>
            </div>
            <div class="request-meta">
              <strong>${request.requestId}</strong>
              <span>${formatDate(request.createdAt)}</span>
            </div>
          </div>

          <div class="request-facts">
            <div>
              <span>${ar ? "الحالة" : "Status"}</span>
              <strong class="status-pill ${requestStatusTone(request.status)}">${request.status}</strong>
            </div>
            <div>
              <span>${ar ? "قرار الذكاء الاصطناعي" : "AI recommendation"}</span>
              <strong class="status-pill ${recommendationTone(request.decisionRecommendation)}">${decisionText}</strong>
            </div>
            <div>
              <span>${ar ? "الأولوية" : "Priority"}</span>
              <strong>${request.priority}</strong>
            </div>
            <div>
              <span>${ar ? "القسم" : "Queue"}</span>
              <strong>${request.assignedQueue}</strong>
            </div>
            <div>
              <span>${ar ? "المستندات" : "Documents"}</span>
              <strong>${request.documentStatus || "Awaiting documents"} · ${request.documentCount || 0}</strong>
            </div>
          </div>

          <div class="request-explanation">
            <span>${ar ? "شرح القرار" : "Decision explanation"}</span>
            <p>${request.adminNote || request.decisionExplanation || "Review required before final decision."}</p>
          </div>

          <div class="document-strip">
            <span>${ar ? "المستندات المطلوبة" : "Required documents"}</span>
            <div>
              ${docs.length ? docs.map((doc) => `<em>${doc}</em>`).join("") : `<em>${ar ? "لا يوجد" : "None"}</em>`}
            </div>
          </div>

          ${uploadedDocuments.length ? `
            <div class="uploaded-documents-panel">
              <span>${ar ? "المستندات المرفوعة" : "Uploaded documents"}</span>
              <div class="document-downloads request-document-previews">
                ${renderDocumentLinks(uploadedDocuments)}
              </div>
            </div>
          ` : ""}

          <div class="request-actions">
            ${locked
              ? `<span>${ar ? "تم تسجيل القرار بواسطة" : "Decision recorded by"} ${request.decidedBy || "Operations"}</span>`
              : `
                <button class="primary-button" data-request-decision="approved" data-request-id="${request.requestId}">${ar ? "قبول الطلب" : "Approve"}</button>
                <button class="secondary-button" data-request-decision="needs_review" data-request-id="${request.requestId}">${ar ? "مراجعة" : "Needs Review"}</button>
                <button class="secondary-button danger-button" data-request-decision="rejected" data-request-id="${request.requestId}">${ar ? "رفض" : "Reject"}</button>
              `}
          </div>
        </article>
      `;
    })
    .join("");

  $$("[data-request-decision]").forEach((button) => {
    button.addEventListener("click", () => decideServiceRequest(button.dataset.requestId, button.dataset.requestDecision));
  });
}

function renderCustomerRequests(db) {
  const linkedCustomerId = sessionUser()?.linkedCustomerId || currentUser()?.linkedCustomerId;
  const requests = (db.serviceRequests || []).filter((request) => request.customerId === linkedCustomerId);
  if (!requests.length) {
    els.customerRequestsTable.innerHTML = `<tr><td colspan="7">No requests submitted yet.</td></tr>`;
    return;
  }
  els.customerRequestsTable.innerHTML = requests
    .map((request) => `
      <tr>
        <td><strong>${request.requestId}</strong></td>
        <td>${request.type}</td>
        <td>${request.status}</td>
        <td>${request.adminDecision ? request.status : (request.decisionLabel || "--")}</td>
        <td>${request.documentStatus || "--"}${request.documentCount ? ` · ${request.documentCount}` : ""}</td>
        <td>${request.priority}</td>
        <td>${formatDate(request.createdAt)}</td>
      </tr>
    `)
    .join("");
}

function renderAudit(db) {
  if (!db.auditLogs.length) {
    els.auditTable.innerHTML = `<tr><td colspan="6">No audit events yet.</td></tr>`;
    return;
  }
  els.auditTable.innerHTML = db.auditLogs
    .slice(0, 12)
    .map((event) => `
      <tr>
        <td>${formatDate(event.timestamp)}</td>
        <td><strong>${event.auditId}</strong><br><span>${event.model}</span></td>
        <td>${event.actor}</td>
        <td>${event.intent}</td>
        <td>${event.confidence}%</td>
        <td>${event.status}</td>
      </tr>
    `)
    .join("");
}

function renderAutomationRuns(db) {
  const runs = db.n8nWorkflowRuns || [];
  if (!runs.length) {
    els.automationTable.innerHTML = `<tr><td colspan="6">No n8n workflow triggers yet.</td></tr>`;
    return;
  }
  els.automationTable.innerHTML = runs
    .slice(0, 12)
    .map((run) => `
      <tr>
        <td><strong>${run.workflowName || run.workflowId}</strong><br><span>${run.workflowId}</span></td>
        <td><strong>${run.correlationId}</strong><br><span>${run.runId}</span></td>
        <td>${run.eventType}</td>
        <td><span class="status-pill ${run.status === "failed" ? "danger" : run.status === "success" ? "success" : "warning"}">${run.status}</span></td>
        <td><span>${run.webhook?.method || "POST"}</span><br><small>${run.webhook?.url || "--"}</small></td>
        <td>${formatDate(run.requestedAt)}</td>
      </tr>
    `)
    .join("");
}

function renderDb(db) {
  state.db = db;
  syncSessionFromStorage();
  syncLoginRoleFromUrl();
  renderLoginAccounts();
  renderPersonaDemos(db.demoPersonas || personaDemos);
  renderMetrics(db);
  renderActiveAccount(db);
  renderAccounts(db);
  renderPolicies(db);
  renderRequests(db);
  renderLoanDocumentQueue(db);
  renderCustomerRequests(db);
  renderDocumentUploadPanel();
  renderTickets(db);
  renderAutomationRuns(db);
  renderAudit(db);
  if (state.session?.userId && db.users.some((user) => user.userId === state.session.userId)) {
    state.activeUserId = state.session.userId;
    showApp();
  } else {
    showLogin();
  }
}

async function loadState() {
  renderDb(await api("/api/state"));
}

function renderTrace(trace = []) {
  if (!trace.length) {
    els.traceList.innerHTML = `<li class="muted-item">Trace appears after analysis.</li>`;
    return;
  }
  els.traceList.innerHTML = trace
    .map((item, index) => `
      <li>
        <span class="trace-index">${index + 1}</span>
        <div>
          <strong>${item.step}</strong>
          <p>${item.detail}</p>
        </div>
      </li>
    `)
    .join("");
}

function renderAgentMesh(orchestration) {
  const reports = orchestration?.agentReports || [];
  if (!reports.length) {
    els.agentSummary.textContent = "No agent run yet";
    els.agentGrid.innerHTML = `<div class="muted-item">Run analysis to show routed banking agents.</div>`;
    return;
  }

  els.agentSummary.textContent = `${orchestration.pattern} · ${reports.length} agents`;
  els.agentGrid.innerHTML = reports
    .map((agent) => `
      <article class="agent-card ${agent.status === "warning" ? "warning" : "complete"}">
        <div class="agent-card-head">
          <div>
            <span>${agent.role}</span>
            <strong>${agent.agentId}</strong>
          </div>
          <em>${agent.confidence}%</em>
        </div>
        <p>${agent.output}</p>
        <div class="agent-signal">
          <span>${agent.signal}</span>
          <strong>${agent.status}</strong>
        </div>
      </article>
    `)
    .join("");
}

function renderSources(sources = []) {
  if (!sources.length) {
    els.sourcesList.innerHTML = `<div class="muted-item">Policy citations appear here.</div>`;
    return;
  }
  els.sourcesList.innerHTML = sources
    .map((source) => `
      <article class="source-card">
        <strong>${source.source}</strong>
        <p>${source.excerpt}</p>
      </article>
    `)
    .join("");
}

function renderRecord(record, customer, contextCards = []) {
  if (contextCards.length) {
    els.recordGrid.innerHTML = contextCards
      .map((item) => `
        <div>
          <span>${item.label}</span>
          <strong>${item.value}</strong>
        </div>
      `)
      .join("");
    return;
  }

  if (!record) {
    els.recordGrid.innerHTML = `<div class="muted-item">No customer context found.</div>`;
    return;
  }
  const items = [
    ["Customer", customer ? `${customer.name} (${customer.customerId})` : record.customerId],
    ["Company", record.company],
    ["Amount", money(record.amount, record.currency)],
    ["Status", record.status],
    ["Exception", record.exceptionCode || "None"],
    ["Batch", record.batchId],
    ["Scheduled", record.scheduledDate],
    ["Masked account", customer?.maskedAccount || "--"]
  ];
  els.recordGrid.innerHTML = items
    .map(([label, value]) => `
      <div>
        <span>${label}</span>
        <strong>${value}</strong>
      </div>
    `)
    .join("");
}

function clearCurrentDecision() {
  state.lastAnalysis = null;
  resetLoanDocumentUpload();
  els.answerContent.classList.add("hidden");
  els.emptyState.classList.remove("hidden");
  renderDecisionShellCopy();
  els.engineBadge.textContent = "Awaiting analysis";
  els.auditIdBadge.textContent = "No audit ID";
  els.speakAnswerBtn.disabled = true;
  renderReasonCards({});
  renderTrace([]);
  renderAgentMesh(null);
  renderSources([]);
  els.recordGrid.innerHTML = `<div class="muted-item">Run analysis to show customer context.</div>`;
}

function setButtonsDuringRun(isRunning) {
  els.analyzeBtn.disabled = isRunning;
  els.playScenarioBtn.disabled = isRunning;
  els.playScenarioTop.disabled = isRunning;
  if (isRunning) {
    els.analyzeBtn.textContent = copy().analyzing;
  } else {
    applyRoleView();
  }
}

async function analyze() {
  const transcript = els.transcript.value.trim();
  if (!transcript) {
    toast(copy().noTranscript);
    return;
  }

  setButtonsDuringRun(true);
  try {
    const result = await api("/api/analyze", {
      method: "POST",
      body: JSON.stringify({
        transcript,
        mode: state.mode,
        language: state.language,
        actorUserId: currentUser()?.userId,
        actorName: currentUser()?.name,
        actorCustomerId: currentUser()?.linkedCustomerId
      })
    });
    state.lastAnalysis = result;
    state.stagedLoanDocuments = [];
    state.uploadedDocumentStatus = "";
    if (els.loanDocumentInput) els.loanDocumentInput.value = "";
    renderDecisionShellCopy();
    els.emptyState.classList.add("hidden");
    els.answerContent.classList.remove("hidden");
    els.engineBadge.textContent = `${result.engine} · ${result.model}`;
    els.intentValue.textContent = result.intent;
    els.riskValue.textContent = result.riskLevel;
    els.riskValue.style.color = riskClass(result.riskLevel);
    els.confidenceValue.textContent = `${Math.round(result.confidence)}%`;
    els.answerText.textContent = result.answer;
    els.customerResponse.textContent = result.customerSafeResponse;
    renderReasonCards(result);
    els.suggestedAction.textContent = result.suggestedAction;
    els.auditIdBadge.textContent = result.auditId;
    els.speakAnswerBtn.disabled = false;
    renderTrace(result.trace);
    renderAgentMesh(result.agentOrchestration);
    renderSources(result.sourceCitations);
    renderRecord(result.payrollRecord, result.customer, result.contextCards || []);
    renderDocumentUploadPanel();
    if (result.openAiError) {
      toast(`OpenAI fallback used: ${result.openAiError}`);
    } else {
      toast(copy().analyzed);
    }
    await loadState();
  } catch (error) {
    toast(error.message);
  } finally {
    setButtonsDuringRun(false);
  }
}

async function createAccount(event) {
  event.preventDefault();
  const name = els.accountName.value.trim();
  const email = els.accountEmail.value.trim();
  const roleOrCompany = els.accountRoleCompany.value.trim();
  if (!name || !email) {
    toast("Name and email are required.");
    return;
  }

  const payload = await api("/api/accounts", {
    method: "POST",
    body: JSON.stringify({
      type: els.accountType.value,
      name,
      email,
      roleOrCompany
    })
  });

  state.activeUserId = payload.user.userId;
  localStorage.setItem("nexus-active-user", state.activeUserId);
  els.accountForm.reset();
  toast(`Account ${payload.user.userId} created.`);
  await loadState();
}

function login() {
  const typed = els.loginEmailInput?.value.trim().toLowerCase();
  const roleScopedUsers = roleUsers(state.loginRole);
  const typedUser = roleScopedUsers.find((item) => (
    item.email.toLowerCase() === typed ||
    item.userId.toLowerCase() === typed ||
    item.name.toLowerCase() === typed
  ));
  const userId = typedUser?.userId || els.loginAccountSelect.value;
  const user = state.db?.users?.find((item) => item.userId === userId);
  if (!user) {
    toast("Select a valid account.");
    return;
  }
  state.session = { userId: user.userId, role: user.type };
  state.activeUserId = user.userId;
  localStorage.setItem("nexus-active-user", state.activeUserId);
  showApp();
  toast(`Logged in as ${user.name}`);
}

function logout() {
  state.session = null;
  state.lastAnalysis = null;
  resetLoanDocumentUpload();
  showLogin();
}

function loanDocumentsRequired() {
  return (
    activeRole() === "customer" &&
    state.lastAnalysis &&
    (state.lastAnalysis.requestType === "loan_application" || state.lastAnalysis.intent === "loan_eligibility") &&
    (state.lastAnalysis.requiredDocuments || []).length > 0
  );
}

function renderDocumentUploadPanel() {
  if (!els.documentUploadPanel) return;
  if (!loanDocumentsRequired()) {
    els.documentUploadPanel.classList.add("hidden");
    return;
  }

  const required = state.lastAnalysis.requiredDocuments || [];
  els.documentUploadPanel.classList.remove("hidden");
  els.documentRequirementText.textContent = `Required: ${required.join(", ")}`;
  els.loanDocumentList.innerHTML = state.stagedLoanDocuments.length
    ? state.stagedLoanDocuments
        .map((file) => `
          <div class="upload-item">
            <strong>${file.name}</strong>
            <span>${file.type || "document"} · ${fileSize(file.size)}</span>
          </div>
        `)
        .join("")
    : `<span>No documents selected.</span>`;
  els.loanUploadStatus.textContent = state.uploadedDocumentStatus || "Documents will upload when you send the request.";
}

function resetLoanDocumentUpload() {
  state.stagedLoanDocuments = [];
  state.uploadedDocumentStatus = "";
  if (els.loanDocumentInput) els.loanDocumentInput.value = "";
  renderDocumentUploadPanel();
}

function handleLoanDocumentSelection() {
  const allowed = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
  const files = Array.from(els.loanDocumentInput.files || []);
  const validFiles = files.filter((file) => {
    const typeOk = allowed.includes(file.type);
    const extOk = /\.(pdf|png|jpe?g|webp)$/i.test(file.name);
    return (typeOk || extOk) && file.size <= 4 * 1024 * 1024;
  });

  if (validFiles.length !== files.length) {
    toast("Only PDF/images up to 4MB each are allowed.");
  }
  state.stagedLoanDocuments = validFiles.slice(0, 5);
  state.uploadedDocumentStatus = state.stagedLoanDocuments.length
    ? `${state.stagedLoanDocuments.length} document(s) ready to upload.`
    : "";
  renderDocumentUploadPanel();
}

function fileToPayload(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    let mimeType = file.type;
    if (!mimeType && /\.pdf$/i.test(file.name)) mimeType = "application/pdf";
    if (!mimeType && /\.png$/i.test(file.name)) mimeType = "image/png";
    if (!mimeType && /\.jpe?g$/i.test(file.name)) mimeType = "image/jpeg";
    if (!mimeType && /\.webp$/i.test(file.name)) mimeType = "image/webp";
    reader.onload = () => resolve({
      name: file.name,
      type: mimeType || "application/octet-stream",
      size: file.size,
      dataUrl: reader.result
    });
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

async function uploadLoanDocumentsForRequest(request) {
  if (!state.stagedLoanDocuments.length) return [];
  state.uploadedDocumentStatus = "Uploading documents...";
  renderDocumentUploadPanel();
  const user = currentUser();
  const files = await Promise.all(state.stagedLoanDocuments.map(fileToPayload));
  const payload = await api("/api/service-requests/documents", {
    method: "POST",
    body: JSON.stringify({
      requestId: request.requestId,
      customerId: request.customerId,
      userId: user?.userId,
      userName: user?.name,
      language: state.language,
      files
    })
  });
  state.stagedLoanDocuments = [];
  if (els.loanDocumentInput) els.loanDocumentInput.value = "";
  state.uploadedDocumentStatus = `${payload.documents.length} document(s) uploaded to ${request.requestId}.${automationSuffix(payload.automation)}`;
  renderDocumentUploadPanel();
  return payload;
}

async function decideServiceRequest(requestId, decision) {
  const labelByDecision = {
    approved: state.language === "ar" ? "تم قبول الطلب" : "Request approved",
    rejected: state.language === "ar" ? "تم رفض الطلب" : "Request rejected",
    needs_review: state.language === "ar" ? "تم تحويل الطلب للمراجعة" : "Request moved to review"
  };
  const current = currentUser();
  const payload = await api("/api/service-requests/decision", {
    method: "POST",
    body: JSON.stringify({
      requestId,
      decision,
      language: state.language,
      actorUserId: current?.userId,
      approver: current?.name,
      note: labelByDecision[decision]
    })
  });
  toast(`${labelByDecision[decision] || "Decision saved."}${automationSuffix(payload.automation)}`);
  await loadState();
}

async function approveDecision() {
  if (!state.lastAnalysis?.auditId) {
    toast("Run an analysis first.");
    return;
  }
  await api("/api/approve", {
    method: "POST",
    body: JSON.stringify({ auditId: state.lastAnalysis.auditId })
  });
  toast(copy().approved);
  await loadState();
}

async function createTicket() {
  if (!state.lastAnalysis?.auditId) {
    toast("Run an analysis first.");
    return;
  }
  const payload = await api("/api/tickets", {
    method: "POST",
    body: JSON.stringify({
      auditId: state.lastAnalysis.auditId,
      title: state.lastAnalysis.suggestedAction
    })
  });
  toast(`${payload.ticket.ticketId} created.${automationSuffix(payload.automation)}`);
  await loadState();
}

async function sendRequestToBank() {
  if (!state.lastAnalysis?.auditId) {
    toast(state.language === "ar" ? "حلّل الطلب أولًا." : "Run an analysis first.");
    return;
  }
  if (loanDocumentsRequired() && !state.stagedLoanDocuments.length) {
    toast("Attach the required loan documents before sending.");
    renderDocumentUploadPanel();
    return;
  }

  const payload = await api("/api/service-requests", {
    method: "POST",
    body: JSON.stringify({
      auditId: state.lastAnalysis.auditId,
      requestType: state.lastAnalysis.requestType || state.lastAnalysis.intent,
      summary: state.lastAnalysis.suggestedAction,
      recommendation: state.lastAnalysis.recommendation,
      decisionLabel: state.lastAnalysis.decisionLabel,
      decisionExplanation: state.lastAnalysis.decisionExplanation,
      requiredDocuments: state.lastAnalysis.requiredDocuments || []
    })
  });
  await uploadLoanDocumentsForRequest(payload.request);
  const message = state.language === "ar" ? `تم إرسال الطلب ${payload.request.requestId} للبنك.` : `${payload.request.requestId} sent to bank.`;
  toast(`${message}${automationSuffix(payload.automation)}`);
  await loadState();
}

async function resetData() {
  await api("/api/reset", { method: "POST", body: "{}" });
  state.lastAnalysis = null;
  resetLoanDocumentUpload();
  els.answerContent.classList.add("hidden");
  els.emptyState.classList.remove("hidden");
  renderDecisionShellCopy();
  els.engineBadge.textContent = "No run yet";
  els.auditIdBadge.textContent = "No audit ID";
  renderReasonCards({});
  renderTrace([]);
  renderAgentMesh(null);
  renderSources([]);
  els.recordGrid.innerHTML = `<div class="muted-item">Payroll record appears after analysis.</div>`;
  els.speakAnswerBtn.disabled = true;
  toast(copy().reset);
  await loadState();
}

function playScenario() {
  state.voiceMode = "demo";
  updateVoiceMode();
  els.transcript.value = selectedDemoTranscript();
  toast(copy().loaded);
  analyze();
}

function speakAnswer() {
  if (!state.lastAnalysis) return;
  if (!("speechSynthesis" in window)) {
    toast("Text-to-speech is not supported in this browser.");
    return;
  }
  const utterance = new SpeechSynthesisUtterance(state.lastAnalysis.customerSafeResponse || state.lastAnalysis.answer);
  utterance.lang = copy().speakLang;
  utterance.rate = 0.95;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function setupSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    els.voiceState.textContent = copy().unavailable;
    els.micBtn.disabled = true;
    return;
  }
  const recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = state.language === "ar" ? "ar-JO" : "en-US";
  recognition.onstart = () => {
    state.isListening = true;
    els.voicePad.classList.add("listening");
    els.voiceState.textContent = copy().listening;
  };
  recognition.onend = () => {
    state.isListening = false;
    els.voicePad.classList.remove("listening");
    els.voiceState.textContent = copy().ready;
  };
  recognition.onerror = (event) => {
    toast(`Voice error: ${event.error}. Use Demo Mode fallback.`);
  };
  recognition.onresult = (event) => {
    const transcript = Array.from(event.results)
      .map((result) => result[0]?.transcript || "")
      .join(" ")
      .trim();
    els.transcript.value = transcript;
    const last = event.results[event.results.length - 1];
    if (last?.isFinal) analyze();
  };
  state.recognition = recognition;
}

function toggleMic() {
  if (state.voiceMode === "demo") {
    playScenario();
    return;
  }
  if (!state.recognition) {
    toast("Speech recognition is not available. Use Demo Mode.");
    return;
  }
  if (state.isListening) {
    state.recognition.stop();
  } else {
    state.recognition.start();
  }
}

function updateVoiceMode() {
  $$("[data-mode-toggle]").forEach((button) => {
    button.classList.toggle("active", button.dataset.modeToggle === state.voiceMode);
  });
  $$("[data-language-toggle]").forEach((button) => {
    button.classList.toggle("active", button.dataset.languageToggle === state.language);
  });
  localStorage.setItem("nexus-language", state.language);
  document.documentElement.lang = state.language === "ar" ? "ar" : "en";
  document.body.classList.toggle("arabic-active", state.language === "ar");
  els.voiceHint.textContent = copy().hint;
  if (activeRole() === "customer") {
    els.voiceHint.textContent = state.language === "ar" ? "جرّب: ليش راتبي ما نزل؟" : "Try: Why did my salary not arrive?";
  }
  els.analyzeBtn.textContent = copy().analyze;
  els.playScenarioBtn.textContent = copy().play;
  els.playScenarioTop.textContent = copy().play;
  renderLoginRoleCopy();
  applyRoleView();
  if (state.recognition) state.recognition.lang = state.language === "ar" ? "ar-JO" : "en-US";
  els.voiceState.textContent =
    state.voiceMode === "demo" ? copy().demoReady : state.recognition ? copy().ready : copy().unavailable;
}

function wireEvents() {
  els.analyzeBtn.addEventListener("click", analyze);
  els.playScenarioBtn.addEventListener("click", playScenario);
  els.playScenarioTop.addEventListener("click", playScenario);
  els.micBtn.addEventListener("click", toggleMic);
  els.speakAnswerBtn.addEventListener("click", speakAnswer);
  els.sendRequestBtn.addEventListener("click", sendRequestToBank);
  els.loanDocumentInput.addEventListener("change", handleLoanDocumentSelection);
  els.approveBtn.addEventListener("click", approveDecision);
  els.createTicketBtn.addEventListener("click", createTicket);
  els.resetDataBtn.addEventListener("click", resetData);
  els.transcript.addEventListener("input", clearCurrentDecision);
  els.personaGrid.addEventListener("click", (event) => {
    const card = event.target.closest("[data-persona]");
    if (!card) return;
    const persona = activePersonaDemos().find((item) => item.id === card.dataset.persona);
    if (!persona) return;
    state.voiceMode = "demo";
    updateVoiceMode();
    els.transcript.value = persona.script;
    clearCurrentDecision();
    toast(`Loaded persona: ${persona.title}`);
    analyze();
  });
  els.loginBtn.addEventListener("click", login);
  els.loginEmailInput.addEventListener("input", () => {
    const typed = els.loginEmailInput.value.trim().toLowerCase();
    const matched = roleUsers(state.loginRole).find((user) => (
      user.email.toLowerCase() === typed ||
      user.userId.toLowerCase() === typed ||
      user.name.toLowerCase() === typed
    ));
    if (matched) els.loginAccountSelect.value = matched.userId;
  });
  els.logoutBtn.addEventListener("click", logout);
  els.accountForm.addEventListener("submit", createAccount);
  els.activeAccountSelect.addEventListener("change", () => {
    state.activeUserId = els.activeAccountSelect.value;
    localStorage.setItem("nexus-active-user", state.activeUserId);
    toast(`Active account: ${currentUser()?.name || state.activeUserId}`);
  });

  $$("[data-login-role]").forEach((button) => {
    button.addEventListener("click", () => {
      state.loginRole = button.dataset.loginRole;
      updateLoginRoleUrl(state.loginRole);
      if (els.loginEmailInput) els.loginEmailInput.value = "";
      $$("[data-login-role]").forEach((roleButton) => {
        roleButton.classList.toggle("active", roleButton.dataset.loginRole === state.loginRole);
      });
      renderLoginAccounts();
    });
  });

  $$("[data-scenario]").forEach((button) => {
    button.addEventListener("click", () => {
      els.transcript.value = selectedScenarioTranscript(button.dataset.scenario);
      analyze();
    });
  });

  $$("[data-mode-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      state.voiceMode = button.dataset.modeToggle;
      updateVoiceMode();
    });
  });

  $$("[data-language-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      state.language = button.dataset.languageToggle;
      updateVoiceMode();
      const allDemoTexts = Object.values(demoTranscripts).flatMap((entry) => Object.values(entry));
      if (allDemoTexts.includes(els.transcript.value.trim())) {
        els.transcript.value = selectedDemoTranscript();
      }
    });
  });

  $$("input[name='userMode']").forEach((input) => {
    input.addEventListener("change", () => {
      state.mode = input.value;
    });
  });
}

setupSpeechRecognition();
wireEvents();
renderPersonaDemos();
updateVoiceMode();
loadState().catch((error) => toast(error.message));
