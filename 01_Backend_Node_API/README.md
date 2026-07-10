# Nexus AI VoiceOps

Custom-code MVP for a banking AI operations dashboard.

## What it demonstrates

- Employee and customer voice intake
- Live browser speech-to-text with a reliable demo fallback
- Payroll exception analysis
- Policy-grounded sources
- AI trace / explainability
- Human approval workflow
- Employee and customer account creation
- Active account selector for demo identity context
- Role-based login screen: employee dashboard vs customer assistant
- Multi-intent banking brain: salary, balance, transactions, loans, cards, KYC, CliQ, and service requests
- Customer "Send Request to Bank" workflow and employee service request inbox
- OPS ticket creation
- Persistent audit trail stored in `data/db.json`
- Optional server-side OpenAI Responses API integration
- Arabic/English language toggle with Arabic demo transcript and `ar-JO` browser speech recognition

## Run locally

```bash
npm start
```

Open:

```text
http://localhost:4173
```

## Optional strong-model mode

Set an OpenAI API key before starting the server:

```powershell
$env:OPENAI_API_KEY="YOUR_OPENAI_API_KEY_HERE"
$env:OPENAI_MODEL="gpt-5.5"
npm start
```

If no key is set, the app uses a deterministic sandbox engine so the demo remains reliable.

## Main demo

When the app opens, it starts with a sandbox login screen:

- Choose **Employee** to see the full operations dashboard.
- Choose **Customer** to see the customer voice banking experience only.

First, use the **Accounts** section to create:

- an employee account for internal operations
- a customer account for customer-facing simulation

Then choose the active account from the top bar.

Use the transcript:

```text
Why did customer 10452 not receive his salary?
```

Or switch to Arabic and use:

```text
ليش راتب العميل 10452 ما نزل؟
```

Additional Arabic demo prompts:

```text
كم رصيدي المتاح؟
هل أقدر أقدم على قرض شخصي؟
ليش بطاقة العميل 11880 موقوفة؟
هل أحتاج أحدث وثائق KYC؟
هل أقدر أحول كليك لمستفيد جديد؟
```

Expected result:

- Intent: `payroll_exception_inquiry`
- Cause: account mismatch
- Source: `Payroll Exceptions Policy - Section 3.2`
- Confidence: around `92%`
- Action: open `OPS-12` payroll exception ticket

## Safety note

This app uses synthetic data only and does not connect to real banking systems.
