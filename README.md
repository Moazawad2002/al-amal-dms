# Google Apps Script Distribution Management System (DMS)
### Cloud-Native Serverless ERP on Google Workspace

[![Platform: Google Workspace](https://img.shields.io/badge/Platform-Google%20Workspace-4285F4?logo=google&logoColor=white)](https://workspace.google.com/)
[![Runtime: Apps Script V8](https://img.shields.io/badge/Runtime-Google%20Apps%20Script%20(V8)-0F9D58?logo=google-drive&logoColor=white)](https://developers.google.com/apps-script)
[![Backend: JavaScript](https://img.shields.io/badge/Language-JavaScript%20ES6+-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/)

---

## ☁️ Overview & Value Proposition

A modular, serverless ERP and distribution management engine built entirely within **Google Apps Script** using **Google Sheets as an ACID-compliant relational cloud database**. 

Engineered specifically for growing distribution businesses seeking enterprise financial controls, multi-user role management, and automated document generation without incurring recurring monthly SaaS or cloud hosting costs.

---

## 📂 Modular Architecture & Script Breakdown

The codebase follows enterprise design principles with strict separation of concerns across `.gs` modules:

| Module File | Architectural Responsibility |
|:---|:---|
| **`Config.gs`** | Central configuration: currency (EGP), default VAT rate (14%), maximum allowed rep discount (5%), credit limits, session lockout windows, and document prefixes. |
| **`Auth.gs`** | Authentication engine: session token generation, user validation, role authorization, and brute-force lockout safeguards. |
| **`Database.gs`** | Data access layer (DAL): abstracted CRUD operations, index lookups, relational table joins, and transactional batch commits. |
| **`Audit.gs`** | Security logging: immutable audit trail recording every document creation, modification, user ID, timestamp, and financial delta. |
| **`Users.gs`** | Role definitions: Manager vs. Sales Representative profiles and territory access rules. |
| **`Utils.gs`** | Business utility engine: automated document code generation (`INV-YYYY-XXXX`, `PO`, `RCP`), financial rounding, and Egyptian date formatters. |

---

## 🛡️ Business Safeguards & Features

- **Sequential Numbering:** Automated, non-duplicable document identifiers (`INV` for Invoices, `PO` for Purchase Orders, `RCP` for Cash Receipts, `RET` for Returns, `EXP` for Operating Expenses).
- **Hard 5% Rep Discount Cap:** Enforces pricing discipline directly in the script backend; field reps cannot submit transactions exceeding 5% discount.
- **Credit Limit Ceiling:** Real-time customer balance checks; accounts exceeding the designated ceiling (e.g. 50,000 EGP) are automatically flagged for manager review.
- **Concurrency Locking (`LockService`):** Employs script-level mutex locking to prevent row-overwrite collisions when multiple field reps submit orders concurrently.
- **100% Zero Hosting Cost:** Runs completely within the client's existing Google Drive / Sheets infrastructure.

---

## 🚀 Setup & Deployment

1. Create a new Google Spreadsheet in Google Drive.
2. Navigate to **Extensions** → **Apps Script**.
3. Create the respective `.gs` files (`Config.gs`, `Auth.gs`, `Database.gs`, `Audit.gs`, `Users.gs`, `Utils.gs`) and paste the codebase files.
4. Replace `SPREADSHEET_ID` in `Config.gs` with your Google Spreadsheet ID from the URL.
5. Deploy as a Web App or trigger functions from custom Google Sheet menu bars.

---

## 🏷️ Recommended Repository Topics
`google-apps-script`, `google-sheets-database`, `serverless`, `erp`, `distribution-management`, `javascript`, `automation`, `internal-controls`, `fmcg`

---

## 👨‍💻 Author
**Moaz Awad** — Business Systems Developer  
- Portfolio: [moazawad2002.github.io](https://moazawad2002.github.io/)  
- Email: [moaz14714@gmail.com](mailto:moaz14714@gmail.com)  
- GitHub: [@Moazawad2002](https://github.com/Moazawad2002)
