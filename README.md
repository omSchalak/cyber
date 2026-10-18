# Secure Electronic Mail Gateway with S/MIME and OpenPGP Interoperability

**Academic Cybersecurity Research Demonstration**  
**Domain:** Network Security and Secure Communication Protocols  
**Website Creator & Project Designer:** **Mansi Chalak**  
**Deployment Target:** Vercel (Serverless Architecture)

---

## 1. Executive Summary

This project delivers a complete, responsive, full-stack web application designed for academic cybersecurity evaluation. The gateway demonstrates end-to-end electronic mail security, public-key infrastructure (PKI), digital signatures, X.509 certificate validation, OpenPGP key management, and controlled cryptographic cross-protocol interoperability between **S/MIME (RFC 5751 / RFC 8551)** and **OpenPGP (RFC 4880 / RFC 9580)**.

The interface adheres to an editorial **maximalist visual design** governed by the `#79616f` and `#FFFFFF` color palette with brutalist offset shadows, asymmetric cards, and technical micro-labels.

---

## 2. Visual Design System

- **Main Brand Color:** `#79616f` (Prominent across heroes, primary buttons, headers)
- **White (Content Panels):** `#FFFFFF` (Card surfaces, inputs, modal containers)
- **Light Background:** `#F8F5F7`
- **Pale Mauve:** `#E9DFE5` (Secondary highlights, table rows, accents)
- **Deep Mauve:** `#51404B` (Borders, brutal shadows, footers, deep contrast)
- **Dark Text:** `#252126` (Primary typography)
- **Subtle Borders:** `#D7CBD2`
- **Typography:** Space Grotesk, Inter, and JetBrains Mono for cryptographic blocks.
- **Micro-Styling:** Thick offset borders (`shadow-brutal`: `4px 4px 0px 0px #51404B`), monospace badges, and reduced-motion compliance.

---

## 3. Technology Architecture

```
Frontend:   React 18 + TypeScript + Vite 5 + Tailwind CSS + React Router v6 + Lucide Icons
Backend:    Node.js + Vercel Serverless Functions (/api/*.ts) + Unified Router
Crypto:     node-forge (PKCS#7 / CMS / X.509 ASN.1/DER) + OpenPGP.js v5 (RFC 4880)
Testing:    Vitest 2.1 (Cryptographic Unit Tests + API Route Coverage)
Deploy:     Vercel (Zero-configuration serverless + SPA rewrite isolation)
```

---

## 4. Root Cause & Architectural Resolution of Previous HTTP 404 Error

### The Incident
Previously, users encountered the error:
`Cryptographic Processing Error: HTTP error 404`
specifically during Step 2 of the email composer's pre-execution cryptographic review, and in the S/MIME certificate inspector.

### Root Cause Analysis
1. **Dev Server / Proxy Disconnect:** In standard Vite applications, running `vite` on port 5173 without registered API middleware causes any fetch to `/api/...` to be handled by Vite's static asset router. Vite returned a 404 or served `index.html` (which gave either an HTTP 404 or a JSON parsing syntax error: `"Unexpected token < in JSON at position 0"`).
2. **Vercel SPA Route Fallback Collision:** When deploying to Vercel without strict route precedence, a wildcard rewrite (`/(.*) -> /index.html`) can swallow unmatched API paths, transforming backend errors into frontend HTML responses.
3. **Missing Discrete Handlers:** Step 2 of the email composer previously called an unregistered or mismatched endpoint path.

### The Permanent Architectural Resolution
1. **Integrated Vite Dev Server Middleware (`vite.config.ts`):** Vite's dev server now mounts an internal API middleware plugin. When `npm run dev` runs, any request starting with `/api/` is executed by the serverless handler on the exact same port (`localhost:5173/api/...`). There is zero proxy mismatch and 100% parity with Vercel.
2. **Isolated Serverless Routing (`vercel.json`):**
   ```json
   {
     "cleanUrls": true,
     "rewrites": [
       { "source": "/api/(.*)", "destination": "/api/$1" },
       { "source": "/(.*)", "destination": "/index.html" }
     ]
   }
   ```
   The `/api/(.*)` rewrite precedes the SPA fallback, guaranteeing that API requests are never converted into HTML documents.
3. **Discrete Handlers Registered:** Both individual file routes (e.g. `/api/keys/check-recipient.ts`, `/api/smime/inspect-certificate.ts`, `/api/health.ts`) and a unified fallback router in `api/index.ts` are implemented.
4. **Automated Route Test Coverage:** `tests/routes.test.ts` validates that every single frontend endpoint responds with valid JSON and a proper status code.

---

## 5. Website Navigation & Module Index

1. **Home (`/`)**: Hero section, message transition flow, 6 core feature panels, S/MIME vs OpenPGP protocol matrix, and educational encryption vs digital signature analysis.
2. **Security Dashboard (`/dashboard`)**: Live API health telemetry, operational metrics, protocol usage chart, cryptographic self-test, and recent audit feed.
3. **Secure Email Composer (`/composer`)**: Complete 5-step workflow: Input parameters → Pre-flight credential check → Cryptographic execution → Result inspection → Audit trace.
4. **Interoperability Lab (`/interop-lab`)**: Academic showcase with 8 interactive scenarios (direct, cross-protocol, missing key, invalid signature, decryption failure, unsupported format).
5. **S/MIME Module (`/smime`)**: X.509 Certificate Inspector, Sign & Verify with tamper testing, and Encrypt & Decrypt using PKCS#7 EnvelopedData.
6. **OpenPGP Module (`/openpgp`)**: 2048-bit keypair generation, public key inspection, ASCII armor encryption, private key decryption, and cleartext signature validation.
7. **Keys & Certificates (`/keys-certificates`)**: Central public repository for S/MIME certificates and OpenPGP public keys with live email compatibility query tool.
8. **Audit Logs (`/audit-logs`)**: Searchable, filterable audit ledger with CSV and JSON exports. Strictly enforces zero-knowledge privacy (no plaintexts or private keys).
9. **Documentation (`/documentation`)**: In-depth educational reference covering PKI, Web of Trust, key encapsulation, threat models, and gateway boundaries.
10. **About Project (`/about`)**: Project attribution to **Mansi Chalak**, curriculum alignment, technology stack, and operational disclaimers.

---

## 6. Registered API Route Inventory

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Live system health, engine statuses, and route catalog |
| `GET` | `/api/dashboard` | Dashboard metrics, statistics, and recent activity |
| `GET` | `/api/audit-logs` | Query audit trail with search, status, and protocol filters |
| `POST` | `/api/audit-logs/clear` | Clear demonstration audit events |
| `GET` | `/api/keys` | Retrieve public S/MIME certificates and OpenPGP keyrings |
| `POST` | `/api/keys/check-recipient` | Check recipient credential availability and recommended protocol |
| `POST` | `/api/smime/inspect-certificate` | Parse, validate, and inspect X.509 Certificate PEM |
| `POST` | `/api/smime/sign` | Create S/MIME PKCS#7 SignedData structure |
| `POST` | `/api/smime/verify-signature` | Verify PKCS#7 signature and detect tampering |
| `POST` | `/api/smime/encrypt` | Encrypt into PKCS#7 EnvelopedData (AES-256-CBC) |
| `POST` | `/api/smime/decrypt` | Decrypt PKCS#7 EnvelopedData with private key |
| `POST` | `/api/openpgp/generate-key` | Generate 2048-bit OpenPGP demonstration key pair |
| `POST` | `/api/openpgp/inspect-key` | Parse OpenPGP ASCII armored key packets |
| `POST` | `/api/openpgp/encrypt` | Encrypt message into OpenPGP ASCII armor (RFC 4880) |
| `POST` | `/api/openpgp/decrypt` | Decrypt OpenPGP ciphertext using private key |
| `POST` | `/api/openpgp/sign` | Generate cleartext or detached OpenPGP digital signature |
| `POST` | `/api/openpgp/verify` | Verify OpenPGP digital signature against public key |
| `POST` | `/api/gateway/process` | Main 5-stage email gateway processor |
| `POST` | `/api/gateway/simulate-interoperability` | Execute academic cross-protocol test scenarios 1-8 |
| `POST` | `/api/demo/process-message` | Composer compatibility alias |

---

## 7. Commands to Run Locally

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Automated Test Suites
```bash
npm test
```
*Executes all 17 automated tests covering S/MIME operations, OpenPGP operations, tamper detection, and API route coverage.*

### 3. Start Local Development Server
```bash
npm run dev
```
*Starts the Vite dev server at `http://localhost:5173`. Frontend and all `/api/...` endpoints run synchronously on this port.*

### 4. Build for Production
```bash
npm run build
```
*Compiles TypeScript and bundles assets into `dist/`.*

---

## 8. Deployment to Vercel

The application is natively configured for Vercel deployment:
1. Push the code repository to GitHub, GitLab, or Bitbucket.
2. In the Vercel Dashboard, select **Add New Project** and import the repository.
3. Configure the Project Settings:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
4. Deploy. Vercel will automatically discover the `/api` directory as serverless functions and route requests according to `vercel.json`.

---

## 9. Security & Operational Disclaimers

- **Academic Demonstration:** Built strictly for research and educational presentation in Network Security.
- **Local / Serverless Execution:** Processes cryptography through pure-Node.js cryptographic engines in memory. No external SMTP connections are established (`Processed locally — no external email sent`).
- **Credential Hygiene:** Demonstrations use pre-seeded test certificates and keys for Alice and Bob. All private keys generated via the web UI remain transient and are never saved to persistent storage.
