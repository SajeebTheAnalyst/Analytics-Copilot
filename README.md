# Analytics Copilot

An AI-powered analytics workspace for importing, connecting, cleaning, analyzing, and visualizing multiple datasets.

## Key Features
- **Multi-Dataset Support**: Import multiple CSV and Excel files.
- **Relationship Engine**: Detects relationships between different datasets.
- **Data Cleaning**: Automatically detects issues and offers safe cleaning actions.
- **Interactive Dashboards**: Build cross-dataset dashboards with KPIs and charts.
- **AI Copilot**: Ask natural language questions. All computations run locally and securely, with only statistical results sent to Gemini for interpretation.

## Architecture
- Client-Side Engine: Handles data storage (`idb-keyval`), relationship mapping, and aggregations.
- Server-Side Gemini Proxy (`server.ts`): Ensures API keys are never exposed to the browser.
- Privacy-First: Raw rows are processed locally. Only structured statistical summaries are sent to the AI.

## Installation & Deployment
Make sure to copy `.env.example` to `.env` and provide your `GEMINI_API_KEY`.
Run `npm run build` and `npm start` for production deployment.
