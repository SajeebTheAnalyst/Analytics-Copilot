# Analytics Copilot

> An AI-powered, multi-dataset analytics workspace for connecting, cleaning, analyzing, and visualizing real-world data.

[🚀 Live Demo](https://analyticscopilot.netlify.app/)

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=flat&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=flat&logo=express&logoColor=white)
![Gemini API](https://img.shields.io/badge/Gemini_API-8E75B2?style=flat&logo=google&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white)
![Netlify](https://img.shields.io/badge/Netlify-00C7B7?style=flat&logo=netlify&logoColor=white)

---

## 📋 Overview

**Analytics Copilot** is a web-based business intelligence and analytical workspace designed for multi-table data exploration, relationship mapping, automated cleaning, interactive dashboarding, and natural-language AI insights.

Unlike simple CSV viewers or basic LLM wrappers, Analytics Copilot combines a **client-side local analytics engine** with a **secure server-side AI proxy**:
- **Data computations** (joins, aggregations, filtering, group-bys, summary statistics) execute locally inside your browser using JavaScript algorithms.
- **AI interpretation** uses structured statistical summaries sent to a server-side Gemini API proxy, ensuring raw dataset contents are never exposed to client-side keys or unneeded transmission.

### Analytical Workflow
`Import` ➔ `Connect` ➔ `Understand` ➔ `Clean` ➔ `Analyze` ➔ `Visualize` ➔ `Ask AI`

---

## 🚀 Live Demo

Access the live production instance at: **[https://analyticscopilot.netlify.app/](https://analyticscopilot.netlify.app/)**

> **Try without uploading**: Click **"Try Demo Workspace"** on the upload screen to instantly explore a pre-populated multi-column business sales dataset without needing your own CSV/Excel files.

---

## ✨ Key Features

### 📁 Multi-Dataset Workspace
- **Multi-Format Support**: Parse CSV (`PapaParse`) and Excel files (`XLSX`) directly in browser memory.
- **Unified Explorer**: View dataset metadata, total rows, memory footprint, column type distributions, and missing value counts.
- **Paginated Preview**: Inspect raw records with a 20-row paginated grid and debounced search filtering.

### 🔗 Automatic Relationship Detection
- **Key Discovery**: Detect potential primary keys and foreign key candidates across imported tables.
- **Confidence Scoring**: Compute column similarity and value overlap metrics to assign confidence ratings.
- **User Verification**: Review suggested join paths before relationships are applied to multi-dataset queries.

### 🧹 AI-Assisted Data Cleaning
- **Issue Scanning**: Detect missing fields, duplicate rows, whitespace inconsistencies, date formatting mismatches, and numeric outliers.
- **Action Approval**: Inspect proposed fixes before applying them to the dataset.
- **Audit Log & Undo**: Maintain a complete history of approved cleaning actions with instant single-click undo and original data recovery.

### 📊 Intelligent Dashboard Builder
- **Cross-Dataset Widgets**: Build real-time KPI metrics, line trends, bar breakdowns, pie charts, and scatter plots.
- **Dynamic Aggregations**: Compute real-time `SUM`, `AVG`, `COUNT`, `DISTINCT COUNT`, `MIN`, and `MAX` operations.
- **Global Dashboard Filters**: Apply interactive time and category filters that propagate dynamically across dashboard widgets.

### 💬 Conversational Analytics Copilot
Ask questions in plain English:
- *"Why did sales decrease in Q3?"*
- *"Which product category yielded the highest margin?"*
- *"Give me an executive summary of customer retention."*

The copilot analyzes your request, queries the local dataset via internal analytical plans, and generates structured business summaries with Gemini.

---

## 🛡️ Privacy-First Architecture

1. **Local Computations**: All row-level filtering, sorting, joins, and aggregations run locally inside your browser tab.
2. **Local Persistence**: Workspace state (datasets, relationships, dashboards) persists securely to browser storage via `IndexedDB` (`idb-keyval`).
3. **Server Proxy Security**: Conversational AI requests communicate strictly with a server-side Node/Express proxy (`/api/chat`).
4. **Zero Client Secret Leakage**: The Gemini API key (`GEMINI_API_KEY`) is stored exclusively in server environment variables—never exposed in client bundles or network requests.
5. **Metadata Payload**: The AI receives only statistical metadata (schema names, data types, row counts, aggregated summary tables) rather than raw individual dataset rows.

---

## 🏗️ Architecture Diagram

```
+-------------------------------------------------------------------+
|                           BROWSER CLIENT                          |
|  +--------------------+   +-------------------+   +------------+  |
|  | File Upload/Parsers|   |  Local Analytics  |   | IndexedDB  |  |
|  | (PapaParse / XLSX) |-->|   (queryEngine)   |<->| (Storage)  |  |
|  +--------------------+   +-------------------+   +------------+  |
+-------------------------------------+-----------------------------+
                                      |
                            POST /api/chat
                      (Statistical Summary Only)
                                      |
                                      v
+-------------------------------------------------------------------+
|                        NODE.JS / EXPRESS PROXY                    |
|  - Server-side environment variable validation                    |
|  - @google/genai SDK Initialization (GEMINI_API_KEY)              |
|  - Context formatting & prompt safety constraints                 |
+-------------------------------------+-----------------------------+
                                      |
                                      v
+-------------------------------------------------------------------+
|                          GOOGLE GEMINI API                        |
|  - Model: gemini-3.6-flash                                        |
+-------------------------------------------------------------------+
```

---

## 🛠️ Technology Stack

- **Frontend Core**: React 18, TypeScript, Vite
- **Styling & UI**: Tailwind CSS, Lucide React Icons, Motion, Class Variance Authority
- **Data Processing**: PapaParse (CSV), XLSX (Excel Sheet JS)
- **Data Visualization**: Recharts
- **Storage**: IndexedDB via `idb-keyval`
- **Backend Proxy**: Node.js, Express, ESBuild
- **AI Integration**: `@google/genai` (Server-side SDK using Gemini 3.6 Flash)
- **Error Handling**: `react-error-boundary`

---

## ⚡ Performance & Data Safety

- **Paginated DOM**: Data tables load in small, virtualized pages to prevent browser layout thrashing on multi-thousand row datasets.
- **Debounced Operations**: Search and filter inputs use 300ms debouncing to keep the main thread responsive.
- **Immutable Originals**: Datasets store both `originalData` and `fullData` arrays. Cleaning operations mutate `fullData` non-destructively, allowing complete reversion at any time.
- **Memory Considerations**: Browser tab RAM constrains processing for datasets exceeding ~250,000 rows.

---

## 💻 Local Development Setup

### 1. Clone & Install
```bash
git clone https://github.com/your-username/analytics-copilot.git
cd analytics-copilot
npm install
```

### 2. Environment Configuration
Copy the example environment file and add your Gemini API key:
```bash
cp .env.example .env
```

In `.env`:
```env
GEMINI_API_KEY=your_actual_gemini_api_key_here
PORT=3000
```

### 3. Start Development Server
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.

---

## 📦 Production Build & Execution

To compile and launch the production-ready server bundle:

```bash
# Build Vite client assets and bundle server.ts with esbuild
npm run build

# Start production server
npm start
```

The production server starts on port `3000` (or `process.env.PORT`) serving both static frontend assets and `/api/*` endpoints.

---

## 📂 Project Structure

```
├── server.ts                 # Express backend server & Gemini API proxy
├── src/
│   ├── App.tsx               # Main app state & IndexedDB persistence logic
│   ├── main.tsx              # React entry point
│   ├── types.ts              # Global TypeScript interfaces & dataset models
│   ├── components/
│   │   ├── layout/           # TopNav, Sidebar, RightPanel (AI Copilot UI)
│   │   ├── workspace/        # DataUploader, DataPreview, DatasetManager
│   │   ├── cleaning/         # CleaningView, IssueCard, CleaningHistory
│   │   ├── relationships/    # RelationshipView, EntityNode
│   │   └── dashboards/       # DashboardView, WidgetRenderer, FilterBar
│   └── lib/
│       ├── analyzer.ts       # CSV/XLSX parsing & data profiling logic
│       ├── analyticsEngine.ts# Aggregations, groupings, & KPI calculation
│       ├── dataCleaner.ts    # Issue detection & cleaning operations
│       ├── queryEngine.ts    # Multi-dataset query execution engine
│       └── relationshipDetector.ts # Foreign key candidate matching
├── .env.example              # Environment variable template
├── index.html                # Main HTML entry with SEO metadata
└── package.json              # Project dependencies & build scripts
```

---

## ⚠️ Limitations

- **Browser Storage Bounds**: Workspace state is stored per browser/device in IndexedDB. Clearing browser cache clears local workspace data.
- **Tab Memory Limits**: Processing large datasets (>250,000 rows) occurs on the client thread and can be constrained by browser RAM limits.
- **Offline AI Capability**: While data preview, cleaning, dashboards, and local queries work completely offline, conversational AI features require an active internet connection to reach the Gemini server proxy.

---

## 🗺️ Future Roadmap

- [ ] **WebWorker Threading**: Offload heavy dataset calculations and joins to background WebWorkers.
- [ ] **Data Export Capabilities**: Export cleaned datasets back to CSV, Excel, or SQL scripts.
- [ ] **Cloud Workspace Sync**: Optional cloud database persistence for multi-device synchronization.
- [ ] **Advanced ML Profiling**: Automated anomaly detection and predictive trend forecasting models.

---

## 👨‍💻 Portfolio Context

**Analytics Copilot** was built to demonstrate practical, production-grade capabilities in **full-stack web development**, **data engineering**, **AI architecture**, and **interactive data visualization**. It highlights clean UI craft, privacy-first security patterns, robust error handling, and complex state management.

---

## 📸 Screenshots

*Screenshots will be added soon.*

---

## 📄 License

This project is open-source under the MIT License.
