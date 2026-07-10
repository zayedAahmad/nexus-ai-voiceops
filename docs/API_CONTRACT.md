# Nexus AI VoiceOps API Contract

Base URL for the one-link local demo:

```text
http://localhost:4173
```

## GET /api/state

Returns the full sandbox state used by the frontend.

Example response shape:

```json
{
  "users": [],
  "customers": [],
  "payrollRecords": [],
  "bankAccounts": [],
  "transactions": [],
  "loanApplications": [],
  "cards": [],
  "kycProfiles": [],
  "serviceRequests": [],
  "documentUploads": [],
  "n8nWorkflowRuns": [],
  "auditLogs": []
}
```

## POST /api/analyze

Analyzes a customer or employee request through the Nexus agent layer.

Request:

```json
{
  "transcript": "Can I apply for a personal loan?",
  "mode": "customer",
  "userId": "CUS-10452",
  "language": "en"
}
```

Response:

```json
{
  "auditId": "AUD-...",
  "intent": "loan_pre_eligibility_inquiry",
  "risk": "Medium",
  "confidence": 0.92,
  "answer": "Internal employee-facing explanation",
  "customerSafeResponse": "Safe customer-facing response",
  "suggestedAction": "Ask customer to upload latest salary certificate",
  "agentReports": [],
  "trace": []
}
```

## POST /api/service-requests

Creates a customer-to-bank request visible in the employee inbox.

Request:

```json
{
  "customerId": "CUS-10452",
  "requestType": "loan_application",
  "title": "Personal loan request",
  "summary": "Customer requested loan pre-eligibility review",
  "auditId": "AUD-...",
  "requiredDocuments": ["Salary certificate", "ID document"]
}
```

## POST /api/service-requests/documents

Uploads documents and associates them with a customer request.

Request:

```json
{
  "requestId": "REQ-...",
  "customerId": "CUS-10452",
  "documents": [
    {
      "fileName": "salary-certificate.png",
      "mimeType": "image/png",
      "contentBase64": "..."
    }
  ]
}
```

Response:

```json
{
  "documents": [
    {
      "documentId": "DOC-...",
      "requestId": "REQ-...",
      "customerId": "CUS-10452",
      "fileName": "salary-certificate.png",
      "viewUrl": "/api/documents/DOC-.../view",
      "downloadUrl": "/api/documents/DOC-.../download"
    }
  ]
}
```

## GET /api/documents/:documentId/view

Views an uploaded document inline when the browser supports the file type.

## GET /api/documents/:documentId/download

Downloads an uploaded document.

## POST /api/service-requests/decision

Employee/admin decision for a customer request.

Request:

```json
{
  "requestId": "REQ-...",
  "decision": "approved",
  "note": "Approved after reviewing salary certificate",
  "decidedBy": "EMP-1001"
}
```

## POST /api/tickets

Creates an operations ticket from an AI decision.

## POST /api/approve

Approves an AI audit decision in the demo environment.

## GET /api/evaluations/agents

Returns the agent evaluation demo suite used to show readiness and quality checks.
