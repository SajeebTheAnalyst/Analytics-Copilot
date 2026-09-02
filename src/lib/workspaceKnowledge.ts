/**
 * Structured Workspace Knowledge System for Analytics Copilot
 * 
 * Developed by Sajeeb The Analyst
 * Provides structured, comprehensive domain knowledge about the entire
 * Analytics Copilot application, its tools, workflows, connections, and troubleshooting.
 */

export interface WorkspaceToolKnowledge {
  id: string;
  name: string;
  category: 'DATA WORKSPACE' | 'ANALYSIS' | 'REPORTING' | 'ASSETS' | 'ASSISTANT';
  tagline: string;
  whatItDoes: string;
  whenToUse: string;
  requiredDataOrConfig: string[];
  keyFeatures: string[];
  workflowConnections: {
    receivesFrom: string[];
    sendsTo: string[];
    interactionNotes: string;
  };
  commonIssuesAndTroubleshooting: {
    issue: string;
    cause: string;
    resolution: string;
  }[];
}

export interface WorkspaceWorkflowStep {
  stepNumber: number;
  stepName: string;
  tool: string;
  description: string;
  input: string;
  output: string;
  bestPractice: string;
}

export interface ChartRecommendation {
  chartType: string;
  bestUsedFor: string;
  dataRequirements: string;
  exampleUseCases: string[];
  avoidWhen: string;
}

export const WORKSPACE_IDENTITY = {
  name: "Analytics Copilot",
  author: "Sajeeb The Analyst",
  tagline: "An AI-powered analytics assistant developed by Sajeeb The Analyst",
  roleDescription: "An expert AI data partner and analytics guide designed to help users understand, prepare, model, visualize, and report data across the entire Analytics Copilot workspace.",
};

export const WORKSPACE_TOOLS_KNOWLEDGE: Record<string, WorkspaceToolKnowledge> = {
  home: {
    id: "home",
    name: "Home / Workspace Overview",
    category: "DATA WORKSPACE",
    tagline: "The central hub for active datasets, quick metrics, and workspace navigation.",
    whatItDoes: "Displays active workspace datasets, system health, quick dataset switching, recent activities, and provides instant access to all analysis modules.",
    whenToUse: "Use when opening the application to review available datasets, switch active projects, or jump into a specific workflow step.",
    requiredDataOrConfig: ["At least one uploaded dataset for full workspace activation, or explore with built-in demo datasets."],
    keyFeatures: [
      "Dataset selector and active dataset badge",
      "Quick summary metrics (total rows, columns, data health score)",
      "Direct shortcuts to Data Cleaning, Explorer, KPI Builder, and Dashboards",
      "Workspace project management and demo dataset loader"
    ],
    workflowConnections: {
      receivesFrom: ["Initial user uploads or demo templates"],
      sendsTo: ["Data Import & Profile", "Data Cleaning", "Data Explorer", "KPI Builder", "Dashboards", "MIS Reports"],
      interactionNotes: "Serves as the entry point that orients the user to their current dataset state."
    },
    commonIssuesAndTroubleshooting: [
      {
        issue: "Workspace appears empty or locked",
        cause: "No dataset has been uploaded or selected yet.",
        resolution: "Click 'Data Import & Profile' or 'Upload Dataset' to load a CSV, Excel, or JSON file, or load a demo dataset."
      }
    ]
  },

  "data-manager": {
    id: "data-manager",
    name: "Data Import & Profile",
    category: "DATA WORKSPACE",
    tagline: "Import raw tabular files, inspect schema types, and review automated statistical profiles.",
    whatItDoes: "Allows users to upload CSV, Excel (.xlsx, .xls), and JSON files, auto-detects column headers, infers technical data types (numeric, categorical, date, boolean, text), and generates comprehensive statistical distributions (min, max, mean, median, standard deviation, quartiles, missing counts, uniqueness).",
    whenToUse: "Use at the beginning of any analytics project when onboarding raw data files or adding secondary datasets for relational modeling.",
    requiredDataOrConfig: [
      "Supported file formats: CSV (comma, semicolon, or tab-delimited), XLSX, XLS, JSON (array of objects)",
      "First row containing clear column headers"
    ],
    keyFeatures: [
      "Drag-and-drop file uploader with multi-sheet Excel selection",
      "Automatic delimiter detection and character encoding support",
      "Interactive data grid preview with column type badges",
      "Statistical column profiling (histograms, value frequencies, null percentage)",
      "Dataset renaming, metadata management, and deletion controls",
      "Initial Data Readiness & Quality health check badge"
    ],
    workflowConnections: {
      receivesFrom: ["Local user files or cloud data sources"],
      sendsTo: ["Data Cleaning (for sanitization)", "Data Model & Relationships (for multi-table joins)", "Data Dictionary (for metadata documentation)"],
      interactionNotes: "Provides the raw, immutable ground truth data that all subsequent analytics stages rely upon."
    },
    commonIssuesAndTroubleshooting: [
      {
        issue: "Upload fails or columns are grouped into a single header",
        cause: "Non-standard delimiter (e.g., semicolons or pipes) or broken quotes in CSV.",
        resolution: "Ensure standard CSV formatting or check that text columns with commas are enclosed in quotes."
      },
      {
        issue: "Dates or numbers recognized as text",
        cause: "Inconsistent date formats, currency symbols ($), or percentage signs (%) in the raw text.",
        resolution: "Navigate to 'Data Cleaning' to automatically standardize date formats and strip text currency symbols."
      }
    ]
  },

  cleaning: {
    id: "cleaning",
    name: "Data Cleaning",
    category: "DATA WORKSPACE",
    tagline: "Automated data quality auditing, anomaly detection, and deterministic cleaning with full audit trail.",
    whatItDoes: "Scans datasets for 14+ distinct quality defects, calculates a Data Health Score (0-100%), and provides one-click deterministic transformations with visual before/after diffs, an undo/redo stack, and an immutable original data backup.",
    whenToUse: "Use immediately after importing data and before building KPIs, charts, or MIS reports to ensure data integrity and avoid distorted calculations.",
    requiredDataOrConfig: [
      "An active loaded dataset with at least one row and column"
    ],
    keyFeatures: [
      "14+ Issue Detectors: Duplicate rows, missing values, empty columns/rows, invalid/mixed dates, numeric-as-text, percentage-as-text, whitespace anomalies, inconsistent casing, statistical outliers (IQR/Z-score), inconsistent categorical variations (typos/synonyms), orphan keys, mixed types",
      "Deterministic Operations: Trim whitespace, text capitalization (UPPER, lower, Title), find & replace, merge categorical variations, fill missing values (mean, median, mode, constant), remove duplicate/blank rows, clear cells, delete columns",
      "Data Health Score (0-100%) metric with real-time score updates upon applying changes",
      "Visual Before & After diff preview cards for user confirmation before execution",
      "Full Audit Trail logging every transformation with timestamp, operation type, and affected rows",
      "Non-destructive Undo/Redo stack with immutable original data preservation",
      "AI Cleaning Copilot providing tailored cleaning action suggestions and MIS readiness assessments"
    ],
    workflowConnections: {
      receivesFrom: ["Data Import & Profile (raw dataset)"],
      sendsTo: ["Data Explorer", "KPI Builder", "Dashboards", "MIS Executive Report"],
      interactionNotes: "Sanitizes raw records so downstream metrics and aggregations are 100% mathematically reliable."
    },
    commonIssuesAndTroubleshooting: [
      {
        issue: "Data Health Score is low",
        cause: "Dataset contains missing values, duplicate records, inconsistent text variations, or malformed dates.",
        resolution: "Review the 'Detected Issues' list and click 'Confirm and Apply' on recommended cleaning actions."
      },
      {
        issue: "Accidentally removed desired rows or modified a column incorrectly",
        cause: "Accidental cleaning action execution.",
        resolution: "Click the 'Undo' button in the toolbar or restore the dataset to its original uploaded state."
      }
    ]
  },

  explorer: {
    id: "explorer",
    name: "Data Explorer",
    category: "ANALYSIS",
    tagline: "Interactive ad-hoc slice-and-dice, multi-column filtering, sorting, and dynamic metric grouping.",
    whatItDoes: "Provides an interactive sandbox for inspecting tabular records, creating complex multi-operator filters, performing multi-column sorting, grouping by categorical dimensions with real-time aggregations (SUM, AVG, COUNT, MIN, MAX, DISTINCT_COUNT), and saving custom exploration views.",
    whenToUse: "Use when investigating specific subsets of data, testing filter hypotheses, finding specific records, or prototyping metric aggregations before formalizing them into KPIs or dashboard widgets.",
    requiredDataOrConfig: [
      "An active dataset (clean data recommended for accurate aggregation)"
    ],
    keyFeatures: [
      "Multi-column Advanced Filtering with operators: equals, does_not_equal, contains, starts_with, ends_with, greater_than, less_than, between, before, after, in, not_in, is_empty, is_not_empty",
      "Global search across all columns with instant highlighting",
      "Multi-column sort rules with ascending/descending toggles",
      "Column visibility and layout management",
      "Dynamic 'Group By' engine aggregating numerical measures across categorical dimensions",
      "Quick Metric Cards displaying immediate aggregations (e.g. Total Revenue, Average Quantity)",
      "Saved Explorer Views for quick recall of specific filter/sort configurations",
      "Data export to CSV or JSON format"
    ],
    workflowConnections: {
      receivesFrom: ["Data Import & Profile", "Data Cleaning"],
      sendsTo: ["KPI Builder (for saving verified aggregations as permanent metrics)", "Dashboards (for converting group-by tables into charts)"],
      interactionNotes: "The primary diagnostic and prototyping workbench for deep-dive investigation."
    },
    commonIssuesAndTroubleshooting: [
      {
        issue: "Zero records returned in table",
        cause: "Overly restrictive or conflicting filter conditions (e.g. 'Status equals Pending' AND 'Status equals Completed').",
        resolution: "Review active filters in the filter bar and remove or adjust restrictive rules."
      },
      {
        issue: "Group By aggregation returns NaN or 0",
        cause: "Aggregating a column that contains non-numeric text values.",
        resolution: "Clean the column in 'Data Cleaning' using numeric conversion, or pick a numeric measure column."
      }
    ]
  },

  relationships: {
    id: "relationships",
    name: "Data Model & Relationships",
    category: "ANALYSIS",
    tagline: "Visual entity-relationship modeling, automatic key detection, join cardinality, and schema integrity.",
    whatItDoes: "Enables multi-dataset relational modeling by discovering common keys across datasets, determining join cardinality (1:1, 1:N, N:1, N:M), validating referential integrity (checking for orphan records), and rendering an interactive entity-relationship schema diagram.",
    whenToUse: "Use when working with relational schemas (e.g., Orders + Customers + Products) to link datasets for cross-table analytics and unified reporting.",
    requiredDataOrConfig: [
      "Two or more datasets uploaded to the workspace",
      "Candidate key columns with overlapping values (e.g., CustomerID, ProductSKU, StoreID)"
    ],
    keyFeatures: [
      "Automated Relationship Discovery engine analyzing column names, data types, and value intersections",
      "Cardinality Estimation (One-to-One, One-to-Many, Many-to-One, Many-to-Many)",
      "Visual Entity-Relationship (ER) Schema Canvas with drag-and-drop table nodes and link connectors",
      "Manual relationship creation tool with source/target dataset and key column pickers",
      "Model Integrity & Referential Integrity Validator detecting orphan records and join mismatches",
      "Relationship status management (Accept, Reject, Delete suggested relationships)"
    ],
    workflowConnections: {
      receivesFrom: ["Data Import & Profile (multiple datasets)"],
      sendsTo: ["KPI Builder (for cross-dataset metrics)", "Dashboards (for cross-table visualizations)", "MIS Reports"],
      interactionNotes: "Creates the foundational data model that connects disparate tables into a cohesive relational database."
    },
    commonIssuesAndTroubleshooting: [
      {
        issue: "No automatic relationships detected",
        cause: "Column names differ significantly or there are no overlapping values between tables.",
        resolution: "Use the 'Add Manual Relationship' button to explicitly specify the source and target join columns."
      },
      {
        issue: "High orphan record warning",
        cause: "Foreign key values in the child table do not exist in the parent table's primary key column.",
        resolution: "Check 'Data Cleaning' to inspect missing keys or verify if the correct dataset version was uploaded."
      }
    ]
  },

  "kpi-builder": {
    id: "kpi-builder",
    name: "KPI Builder",
    category: "ANALYSIS",
    tagline: "Standardize enterprise metrics, build token-based formulas, set targets, and track period-over-period growth.",
    whatItDoes: "Allows users to define, calculate, validate, and govern standardized business metrics. Supports simple aggregations (SUM, AVG, COUNT, MIN, MAX, DISTINCT_COUNT) and complex calculated metrics using token-based arithmetic formulas (`+`, `-`, `*`, `/`, `(`, `)`), constants, and references to other saved KPIs.",
    whenToUse: "Use whenever establishing official business metrics (e.g., Total Revenue, Gross Margin %, Average Order Value, Customer Churn Rate, YoY Revenue Growth) to ensure consistent calculations across dashboards and reports.",
    requiredDataOrConfig: [
      "An active dataset with numeric metric columns",
      "Optional date column for Month-over-Month (MoM) or Year-over-Year (YoY) comparison",
      "Optional target value for achievement tracking"
    ],
    keyFeatures: [
      "Simple Metric Builder: Column selection with 6 aggregation functions (SUM, AVG, COUNT, DISTINCT COUNT, MIN, MAX)",
      "Calculated Formula Builder: Interactive token-based formula editor supporting arithmetic, nested parentheses, numeric constants, and KPI references (e.g. `[Total Revenue] - [Total Cost]`)",
      "Time Comparisons: Month-over-Month (MoM) and Year-over-Year (YoY) percentage change calculations",
      "Target Setting & Achievement Tracking (e.g. Target: $500,000, Actual: $520,000 → 104% achievement)",
      "Conditional Formatting with customizable threshold colors (Above Target, On Target, Below Target)",
      "Formatting Options: Currency ($/BDT/EUR/GBP/INR), Percentages, Decimals, and Compact Notation (K, M, B)",
      "KPI Health & Status Validator: Flags KPIs as 'Active', 'Needs Attention', or 'Invalid' if referenced columns/formulas break",
      "Direct integration into Dashboards and MIS Executive Reports"
    ],
    workflowConnections: {
      receivesFrom: ["Data Cleaning (clean numeric columns)", "Data Explorer (validated filter aggregations)"],
      sendsTo: ["Dashboards (KPI Card widgets)", "MIS Executive Report (KPI Scorecards)", "AI Copilot (evaluated metrics)"],
      interactionNotes: "Serves as the single source of truth for business logic and metric definitions."
    },
    commonIssuesAndTroubleshooting: [
      {
        issue: "KPI displays 'Invalid' status or #ERROR",
        cause: "Division by zero in formula, missing column reference, or circular formula dependency.",
        resolution: "Edit the KPI in KPI Builder, check token order, and ensure the denominator in division formulas cannot evaluate to zero."
      },
      {
        issue: "MoM or YoY growth displays 'N/A'",
        cause: "No date column was selected for the time comparison, or the dataset does not span multiple time periods.",
        resolution: "Select a valid Date column in the KPI configuration and verify that date records span multiple months/years."
      }
    ]
  },

  dashboards: {
    id: "dashboards",
    name: "Dashboard",
    category: "REPORTING",
    tagline: "Interactive executive dashboards with 18+ visual widget types, cross-filtering, multi-level drill-downs, and presentation mode.",
    whatItDoes: "Provides a flexible canvas to arrange interactive visualization widgets, KPI cards, tables, and filters. Supports interactive cross-filtering where clicking any chart filters the rest of the dashboard, hierarchical drill-downs, presentation mode, saved view bookmarks, and high-resolution export (PDF, PNG, Print).",
    whenToUse: "Use to build executive summaries, operational monitoring dashboards, trend visualizers, and interactive analytical presentations for stakeholders.",
    requiredDataOrConfig: [
      "One or more workspace datasets",
      "Cleaned data for accurate charting",
      "Optional saved KPIs from KPI Builder"
    ],
    keyFeatures: [
      "18+ Widget Types: KPI Cards, Line Charts, Bar Charts, Column Charts, Area Charts, Donut/Pie Charts, Scatter Plots (with trendlines & log scale), Waterfall Charts, Gauges (with KPI targets), Funnel Charts (with custom stage ordering), Heatmaps, Matrix/Pivot Tables (2-level hierarchy, subtotals, data bars), Ranking Tables, Data Tables, Combo Charts (dual-axis bar + line), Text blocks, and Interactive Filters",
      "Interactive Cross-Filtering: Selecting a slice or bar instantly filters all other widgets across the canvas",
      "Multi-Level Hierarchical Drill-Down: Categorical (e.g. Region → Country → City) and Date (Year → Quarter → Month → Day) drill paths",
      "Modal Drill-Through: Click any data point to inspect underlying raw records in a detailed modal",
      "Top N / Bottom N filtering, custom sort directions, and custom metric aggregations",
      "Professional Visual Themes: Professional, Ocean, Sunset, Emerald, Amber, and Custom color palettes",
      "Saved View Bookmarks: Save, recall, and share specific filter and drill states with unique URLs",
      "Presentation Mode: Fullscreen auto-play carousel with timer intervals and KPI summary overlay",
      "Export Suite: High-fidelity PDF (A4, Letter, A3 in Portrait/Landscape), PNG image, and clean Print layouts",
      "AI Smart Visual: One-click creation of charts directly from AI Copilot suggestions"
    ],
    workflowConnections: {
      receivesFrom: ["Data Cleaning", "Data Explorer", "KPI Builder", "AI Copilot (Smart Visuals)"],
      sendsTo: ["Executive stakeholders, presentations, PDF exports, and MIS Executive Reports"],
      interactionNotes: "The primary interactive storytelling and operational monitoring interface."
    },
    commonIssuesAndTroubleshooting: [
      {
        issue: "Chart shows 'No Data' or empty bars",
        cause: "Active dashboard filter or cross-filter excludes all records, or a non-numeric column is mapped to the metric Y-axis.",
        resolution: "Click 'Clear All Filters' in the filter bar and ensure a numeric column is selected for aggregation."
      },
      {
        issue: "Drill-down button is disabled",
        cause: "No hierarchy was configured for the widget.",
        resolution: "Edit widget configuration and select 2 or more categorical columns or a date column for the drill hierarchy."
      }
    ]
  },

  "mis-report": {
    id: "mis-report",
    name: "MIS Executive Report",
    category: "REPORTING",
    tagline: "Formal structured Management Information System reports for C-suite reviews with data quality badges.",
    whatItDoes: "Generates standardized, executive-ready Management Information System (MIS) reports complete with Executive Summaries, Data Readiness & Quality Audit badges, KPI Scorecards, Segment Ranking Tables, and Period Variance Breakdowns.",
    whenToUse: "Use for formal management meetings, monthly/quarterly executive reviews, board decks, and operational performance audits.",
    requiredDataOrConfig: [
      "A cleaned dataset with validated data health",
      "Optional date column for period-based executive filtering",
      "Saved KPIs from KPI Builder for scorecard populating"
    ],
    keyFeatures: [
      "Executive Header & Metadata (Organization, Prepared By, Report ID, Period Range)",
      "Data Quality & Integrity Audit Badge certifying that the report is backed by verified, clean data",
      "KPI Scorecard Section displaying primary metrics, targets, achievement percentages, and trend indicators",
      "Dimension Breakdown & Top/Bottom Ranking Tables highlighting key drivers and underperforming segments",
      "Period Variance & Trend Analysis showing historical progression",
      "Executive Narrative and AI-assisted summary interpretations",
      "Print-ready and PDF export layouts formatted specifically for executive distribution"
    ],
    workflowConnections: {
      receivesFrom: ["Data Cleaning (health score)", "KPI Builder (scorecard metrics)", "Dashboards (visual layouts)"],
      sendsTo: ["C-Suite leadership, board members, executive PDF printouts"],
      interactionNotes: "Consolidates all workspace outputs into a formal, governance-compliant executive report."
    },
    commonIssuesAndTroubleshooting: [
      {
        issue: "MIS Report warns that dataset is 'Not Ready for MIS'",
        cause: "The dataset has low Data Health Score or unresolved high-risk cleaning issues in Data Cleaning.",
        resolution: "Navigate to 'Data Cleaning', apply pending cleaning actions to achieve >85% health score, then re-generate the MIS report."
      },
      {
        issue: "Scorecard KPIs are blank",
        cause: "No saved KPIs have been created in KPI Builder for this dataset.",
        resolution: "Open 'KPI Builder' to create at least 1-3 key metrics (e.g. Total Revenue, Total Volume) to populate the scorecard."
      }
    ]
  },

  "data-dictionary": {
    id: "data-dictionary",
    name: "Data Dictionary",
    category: "ASSETS",
    tagline: "Central metadata catalog, column definitions, semantic tagging, and governance documentation.",
    whatItDoes: "Provides a centralized data catalog documenting technical data types, business descriptions, semantic tags (Identifier, Dimension, Metric, Temporal, Geographic, Categorical), completeness rates, distinct value counts, and sample values across all datasets.",
    whenToUse: "Use to document column meanings, establish organizational data governance, define business glossaries, and ensure team alignment on field semantics.",
    requiredDataOrConfig: [
      "One or more uploaded datasets in the workspace"
    ],
    keyFeatures: [
      "Automated technical metadata extraction: Column name, technical data type, null count, completeness percentage, unique cardinality",
      "Business description editor for assigning clear operational meanings to ambiguous column names",
      "Semantic Tagging (Identifier, Financial Metric, Dimension, Date/Time, Geographic, PII / Confidential)",
      "Sample values browser showing representative data points for each field",
      "Search and filter controls to quickly locate fields across multiple tables",
      "Direct integration into AI Copilot to ground natural language queries in business terminology"
    ],
    workflowConnections: {
      receivesFrom: ["Data Import & Profile (raw schemas)"],
      sendsTo: ["AI Copilot (contextual understanding)", "KPI Builder", "Dashboards"],
      interactionNotes: "Ensures everyone (and the AI Copilot) understands the exact business definition of every data attribute."
    },
    commonIssuesAndTroubleshooting: [
      {
        issue: "Columns appear with 'Unknown' or unhelpful names (e.g. col_1, var_a)",
        cause: "Raw dataset had missing or cryptic header names.",
        resolution: "Use the Data Dictionary to add clear business descriptions and semantic tags so the AI and team understand their meaning."
      }
    ]
  },

  "ai-copilot": {
    id: "ai-copilot",
    name: "AI Copilot (AI Analyst)",
    category: "ASSISTANT",
    tagline: "Intelligent analytics partner developed by Sajeeb The Analyst for guidance, computations, and workflows.",
    whatItDoes: "Acts as a Senior Data Analyst and intelligent workspace co-pilot. Answers analytical questions, performs deterministic calculations without hallucinating statistics, suggests KPIs, creates dashboard widgets, recommends data cleaning actions, and guides users through every workspace tool.",
    whenToUse: "Available continuously via the right drawer or top navigation for queries, calculations, recommendations, and workspace navigation.",
    requiredDataOrConfig: [
      "Works with or without loaded datasets (provides workspace guidance generally, and surgical calculations when data is loaded)"
    ],
    keyFeatures: [
      "Intent-Aware Query Processing: Accurately separates general conversational queries, workspace help, data quality, KPI creation, chart suggestions, and data analysis",
      "Deterministic Evidence Engine: Computes exact math from datasets before responding to guarantee 100% statistical accuracy",
      "Actionable Action Cards: Interactive UI cards to switch workspace views, create KPIs, execute cleaning transformations, and add Smart Visuals directly to dashboards",
      "Deep Workspace Knowledge: Expert understanding of every tool, chart type, formula syntax, and troubleshooting workflow",
      "Multi-Step Workflow Orchestration: Capable of planning and executing compound tasks (e.g., 'Clean dates, create Revenue KPI, and add bar chart')"
    ],
    workflowConnections: {
      receivesFrom: ["User prompts, active dataset context, dashboard metadata, and quality profiles"],
      sendsTo: ["All workspace tools via interactive action cards and calculated insights"],
      interactionNotes: "The intelligent connective tissue bridging raw data, business logic, and executive presentation."
    },
    commonIssuesAndTroubleshooting: [
      {
        issue: "AI Copilot states it cannot calculate a specific metric",
        cause: "The required column is missing from the dataset or is stored as unparsed text.",
        resolution: "Ensure the dataset is loaded and visit 'Data Cleaning' to ensure the target column is numeric."
      }
    ]
  }
};

export const WORKSPACE_END_TO_END_WORKFLOW: WorkspaceWorkflowStep[] = [
  {
    stepNumber: 1,
    stepName: "Import Data",
    tool: "Data Import & Profile",
    description: "Upload your raw tabular files (CSV, Excel, or JSON). The system parses delimiters, headers, and constructs initial data tables.",
    input: "Raw CSV/Excel/JSON files",
    output: "Indexed dataset with row/column counts and table preview",
    bestPractice: "Ensure the first row contains clean, descriptive column headers."
  },
  {
    stepNumber: 2,
    stepName: "Profile Data",
    tool: "Data Import & Profile",
    description: "Inspect the automated statistical profile, column data types, distribution histograms, and initial completeness scores.",
    input: "Uploaded dataset",
    output: "Statistical summary (min, max, mean, median, uniqueness, null rates)",
    bestPractice: "Verify that numeric and date columns are correctly typed rather than stored as text."
  },
  {
    stepNumber: 3,
    stepName: "Check Data Quality",
    tool: "Data Cleaning",
    description: "Review the Data Health Score (0-100%) and scan for 14+ automated defect types like duplicates, missing values, typos, and outliers.",
    input: "Profiled dataset",
    output: "List of detected quality issues with risk ratings (High/Medium/Low)",
    bestPractice: "Focus first on high-risk issues like duplicate rows and invalid date formats."
  },
  {
    stepNumber: 4,
    stepName: "Clean Data",
    tool: "Data Cleaning",
    description: "Apply deterministic cleaning actions (fill nulls, trim whitespace, standardize casing, merge categorical variants, remove duplicates) with before/after diff verification.",
    input: "Detected quality issues",
    output: "Sanitized dataset with updated health score and immutable audit trail",
    bestPractice: "Always review the before/after preview diff before confirming irreversible transformations."
  },
  {
    stepNumber: 5,
    stepName: "Explore Data",
    tool: "Data Explorer",
    description: "Slice and dice records using multi-column filters, multi-column sorting, and Group By aggregations to validate hypotheses and uncover patterns.",
    input: "Cleaned dataset",
    output: "Filtered record subsets, grouping tables, and saved exploration views",
    bestPractice: "Save recurring filter setups as Saved Explorer Views for quick future access."
  },
  {
    stepNumber: 6,
    stepName: "Build KPIs",
    tool: "KPI Builder",
    description: "Define standardized simple and calculated business metrics using token formulas (`+`, `-`, `*`, `/`), set targets, and configure MoM/YoY comparisons.",
    input: "Clean numeric columns or existing base KPIs",
    output: "Governed KPI library with status tracking (Active, Needs Attention, Invalid)",
    bestPractice: "Use descriptive names, specify currency/percentage units, and define target values for achievement tracking."
  },
  {
    stepNumber: 7,
    stepName: "Create Dashboard",
    tool: "Dashboard",
    description: "Assemble interactive executive dashboards with 18+ widget types (Line, Bar, Donut, Scatter, Matrix, Gauges), cross-filtering, and multi-level drill-downs.",
    input: "Datasets and saved KPIs",
    output: "Interactive executive dashboard, presentation view, and PDF/PNG exports",
    bestPractice: "Choose the right chart archetype for each insight and enable cross-filtering for interactive exploration."
  },
  {
    stepNumber: 8,
    stepName: "Generate MIS Report",
    tool: "MIS Executive Report",
    description: "Produce a formal Management Information System report featuring Executive Summaries, Data Quality Audit badges, KPI scorecards, and ranking tables.",
    input: "Cleaned dataset, saved KPIs, and optional dashboard context",
    output: "C-suite executive report formatted for management review and PDF distribution",
    bestPractice: "Ensure data health is above 85% before finalizing an MIS report for leadership."
  }
];

export const CHART_SELECTION_GUIDE: ChartRecommendation[] = [
  {
    chartType: "Line Chart / Area Chart",
    bestUsedFor: "Showing trends, continuous progression, and temporal fluctuations over time.",
    dataRequirements: "1 Date/Time dimension on X-axis + 1 or more Numeric measures on Y-axis.",
    exampleUseCases: ["Monthly Revenue Trend", "Daily Active Users", "Temperature changes over time"],
    avoidWhen: "Comparing non-sequential unordered categorical groups (e.g. Sales by Product Category)."
  },
  {
    chartType: "Bar Chart (Horizontal)",
    bestUsedFor: "Comparing discrete categorical groups, rankings, and when category labels are long.",
    dataRequirements: "1 Categorical dimension + 1 Numeric measure.",
    exampleUseCases: ["Top 10 Customers by Revenue", "Sales by Country", "Department Budget Comparisons"],
    avoidWhen: "Displaying continuous time-series data where chronological left-to-right flow is essential."
  },
  {
    chartType: "Column Chart (Vertical)",
    bestUsedFor: "Comparing discrete categories (few items) or discrete time periods (e.g. Q1-Q4).",
    dataRequirements: "1 Categorical or Discrete time dimension + 1 Numeric measure.",
    exampleUseCases: ["Quarterly Sales Performance", "Revenue by Region (3-5 regions)"],
    avoidWhen: "You have more than 10-12 categories or very long category label names that collide."
  },
  {
    chartType: "Donut / Pie Chart",
    bestUsedFor: "Displaying part-to-whole percentage compositions of a single total.",
    dataRequirements: "1 Categorical dimension (ideally 3 to 6 categories max) + 1 Positive Numeric measure.",
    exampleUseCases: ["Market Share Breakdown", "Revenue by Channel (Online vs Retail vs Wholesale)"],
    avoidWhen: "You have more than 7 categories, negative values, or when precise value comparisons are critical."
  },
  {
    chartType: "Scatter Plot",
    bestUsedFor: "Uncovering correlations, relationships, clusters, and outliers between two continuous numerical variables.",
    dataRequirements: "2 Numeric measures (X and Y axes), optional Categorical group and Size metric.",
    exampleUseCases: ["Marketing Spend vs Revenue", "Price vs Units Sold", "Customer Age vs Order Value"],
    avoidWhen: "You only have discrete categorical data or a single metric."
  },
  {
    chartType: "Waterfall Chart",
    bestUsedFor: "Illustrating how an initial value is affected by a series of positive and negative intermediate contributions.",
    dataRequirements: "1 Sequential category dimension + 1 Signed (+/-) Numeric measure.",
    exampleUseCases: ["Gross Revenue to Net Profit bridge", "Inventory additions and deductions", "Cash flow variance"],
    avoidWhen: "Data is purely static with no cumulative sequential changes."
  },
  {
    chartType: "Gauge Widget",
    bestUsedFor: "Tracking immediate progress of a single metric against a predefined threshold or KPI target.",
    dataRequirements: "1 Numeric metric value + 1 Target/Max value.",
    exampleUseCases: ["Quarterly Revenue Goal Achievement", "Server Uptime %", "Customer Satisfaction Score"],
    avoidWhen: "You need to show historical trends or multi-category comparisons."
  },
  {
    chartType: "Funnel Chart",
    bestUsedFor: "Visualizing sequential multi-stage processes and conversion/drop-off rates across stages.",
    dataRequirements: "1 Stage dimension (ordered) + 1 Numeric volume measure.",
    exampleUseCases: ["Sales Pipeline (Lead → Qualified → Proposal → Won)", "User Onboarding Conversion"],
    avoidWhen: "Stages are independent and do not follow a strict sequential attrition funnel."
  },
  {
    chartType: "Matrix / Pivot Table",
    bestUsedFor: "Multidimensional cross-tabulation with hierarchical 2-level row grouping, column dimensions, and subtotals.",
    dataRequirements: "1-2 Row dimensions + 1 Column dimension + 1-2 Numeric measures.",
    exampleUseCases: ["Sales by Region and Product Category", "Monthly P&L by Cost Center"],
    avoidWhen: "A quick high-level visual trend is needed rather than granular numerical inspection."
  },
  {
    chartType: "Heatmap",
    bestUsedFor: "Displaying density patterns, activity intensity, and 2D matrix correlations with color gradations.",
    dataRequirements: "2 Categorical/Temporal dimensions + 1 Numeric intensity measure.",
    exampleUseCases: ["User activity by Day of Week and Hour of Day", "Store performance across districts and months"],
    avoidWhen: "Precise numerical differences need to be compared across non-matrix data."
  },
  {
    chartType: "Combo Chart (Bar + Line)",
    bestUsedFor: "Comparing a primary volume measure (Bar) with a secondary rate/percentage measure (Line) on dual axes.",
    dataRequirements: "1 Dimension + 2 Numeric measures with different scales (e.g. Volume + % Margin).",
    exampleUseCases: ["Revenue (Bars) vs Profit Margin % (Line)", "Units Sold (Bars) vs Return Rate % (Line)"],
    avoidWhen: "Both metrics have the exact same unit and scale (use multi-bar or multi-line instead)."
  },
  {
    chartType: "Ranking Table / Data Table",
    bestUsedFor: "Detailed record inspection, top/bottom leaderboards, and structured numerical tabular review.",
    dataRequirements: "Multiple dimensions and measures.",
    exampleUseCases: ["Top 20 Products by Sales with Units and Margin", "Detailed Transaction Log"],
    avoidWhen: "Visual pattern recognition or quick executive at-a-glance consumption is required."
  }
];

/**
 * Formats full workspace knowledge into an enriched markdown prompt for Gemini or fallback systems.
 */
export function generateWorkspaceKnowledgePrompt(): string {
  const toolsSummary = Object.values(WORKSPACE_TOOLS_KNOWLEDGE).map(tool => {
    return `### [WORKSPACE TOOL: ${tool.name}] (${tool.category})
- **Purpose**: ${tool.whatItDoes}
- **When to Use**: ${tool.whenToUse}
- **Required Data / Config**: ${tool.requiredDataOrConfig.join('; ')}
- **Key Features**: ${tool.keyFeatures.join('; ')}
- **Connections**: Receives data from [${tool.workflowConnections.receivesFrom.join(', ')}] -> Feeds data to [${tool.workflowConnections.sendsTo.join(', ')}]. (${tool.workflowConnections.interactionNotes})
- **Troubleshooting**: ${tool.commonIssuesAndTroubleshooting.map(t => `Issue: "${t.issue}" -> Cause: ${t.cause} | Solution: ${t.resolution}`).join('; ')}
`;
  }).join('\n');

  const workflowSummary = WORKSPACE_END_TO_END_WORKFLOW.map(w => {
    return `${w.stepNumber}. **${w.stepName}** (${w.tool}): ${w.description} (Input: ${w.input} -> Output: ${w.output} | Best Practice: ${w.bestPractice})`;
  }).join('\n');

  const chartSummary = CHART_SELECTION_GUIDE.map(c => {
    return `- **${c.chartType}**: ${c.bestUsedFor} | Requirements: ${c.dataRequirements} | Example: ${c.exampleUseCases.join(', ')} | Avoid when: ${c.avoidWhen}`;
  }).join('\n');

  return `
WORKSPACE IDENTITY & MISSION:
- Application Name: ${WORKSPACE_IDENTITY.name}
- Creator & Developer: ${WORKSPACE_IDENTITY.author}
- Identity: ${WORKSPACE_IDENTITY.tagline}
- Role: ${WORKSPACE_IDENTITY.roleDescription}

END-TO-END ANALYTICS WORKFLOW:
${workflowSummary}

WORKSPACE TOOLS & CAPABILITIES:
${toolsSummary}

CHART SELECTION & VISUALIZATION GUIDE:
${chartSummary}

ESSENTIAL ARCHITECTURAL CONCEPTS & DISTINCTIONS:
- **KPI Builder vs Dashboard**:
  - *KPI Builder*: Metric definition and governance layer. Standardizes business logic (formulas, aggregations, targets, currency/percentages, comparison logic like MoM/YoY).
  - *Dashboard*: Visual presentation and exploration layer. Consumes saved KPIs and raw datasets to render visual charts, cross-filtering, layouts, and drill-down journeys.

- **Data Explorer vs Data Cleaning**:
  - *Data Explorer*: Ad-hoc investigative tool for slicing, filtering, sorting, and grouping records to explore hypotheses.
  - *Data Cleaning*: Deterministic data sanitization engine that fixes defects (nulls, duplicates, typos, dates) with an audit trail, health score, and before/after verification.

- **MIS Executive Report vs Dashboard**:
  - *Dashboard*: An interactive operational canvas for real-time exploratory slicing, cross-filtering, and ad-hoc visual drill-downs.
  - *MIS Executive Report*: A formal, structured document with data quality certification badges, KPI scorecards, and ranking tables designed for C-suite governance, audit readiness, and PDF distribution.

- **Data Dictionary**:
  - Central metadata catalog for governance. Documents technical data types, business descriptions, semantic tags (Identifier, Financial Metric, Categorical, Geographic, Temporal), and data completeness.
`;
}

/**
 * Dynamic fallback answer generator for workspace queries when API is offline or unconfigured.
 */
export function getWorkspaceKnowledgeAnswer(query: string): string | null {
  const q = query.toLowerCase();

  // 1. Identity
  if (/(what|who)\s+(is|are)\s+(your\s+name|you)\b/i.test(q) || /(who\s+created|who\s+built|who\s+developed|who\s+made)\s+you/i.test(q)) {
    return `### Identity & Role
I am **${WORKSPACE_IDENTITY.name}**, an AI-powered analytics assistant developed by **${WORKSPACE_IDENTITY.author}**.

My role is to serve as your intelligent data analyst partner across this workspace:
- Guiding your end-to-end analytics workflow from raw data ingestion to C-suite reporting
- Assisting with data profiling, anomaly detection, and deterministic data cleaning
- Helping define standardized KPIs with formulas, targets, and period comparisons
- Suggesting the right chart archetypes and designing interactive executive dashboards
- Generating formal Management Information System (MIS) executive reports`;
  }

  // 2. Data Cleaning
  if (/(what can i do in|how does|what is)\s+data cleaning/i.test(q) || /clean(ing)? data\b/i.test(q)) {
    const tool = WORKSPACE_TOOLS_KNOWLEDGE.cleaning;
    return `### Data Cleaning in Analytics Copilot
**${tool.tagline}**

#### What It Does:
${tool.whatItDoes}

#### Key Capabilities & Features:
- **14+ Issue Detectors**: Scans for duplicate rows, missing values, empty rows/columns, malformed dates, text casing inconsistencies, numeric stored as text, statistical outliers (IQR/Z-score), and typos.
- **Deterministic Transformations**: Fill missing values (mean, median, mode, constant), trim whitespace, standardize casing (UPPER, lower, Title), remove duplicates, delete empty columns, and fix date formats.
- **Data Health Score (0-100%)**: Evaluates dataset cleanliness in real time.
- **Safety & Audit Trail**: Visual before/after diff preview before execution, full non-destructive undo/redo stack, and immutable original data preservation.

#### When to Use:
${tool.whenToUse}

#### How It Connects:
Receives raw files from **Data Import & Profile** and produces sanitized, trustworthy data for **Data Explorer**, **KPI Builder**, **Dashboards**, and **MIS Executive Reports**.`;
  }

  // 3. KPI Builder vs Dashboard distinction
  if (/difference between kpi builder and dashboard/i.test(q) || /kpi builder vs dashboard/i.test(q)) {
    return `### KPI Builder vs. Dashboard: Key Differences

| Feature / Aspect | **KPI Builder** (Governance Layer) | **Dashboard** (Presentation Layer) |
| :--- | :--- | :--- |
| **Primary Purpose** | Define, standardize, and govern business metrics and mathematical logic | Present visual charts, KPI cards, and trends in an interactive layout |
| **What You Do** | Create simple aggregations (SUM, AVG) or token formulas (e.g. \`[Revenue] - [Cost]\`), set targets, configure MoM/YoY growth | Arrange 18+ visual widgets (Line, Bar, Donut, Scatter, Matrix, Gauges) |
| **Interactivity** | Formula validation, threshold coloring, metric health status | Cross-filtering, hierarchical drill-downs, presentation mode, PDF export |
| **Relationship** | Serves as the **source of truth** for metric definitions | **Consumes** saved KPIs and raw datasets to render visual storytelling |

**In summary**: Define your business metrics in the **KPI Builder** first, then visualize them on your **Dashboard**!`;
  }

  // 4. KPI Builder
  if (/(how do i create|how to create|how do i build|how to build|what is)\s+(a\s+)?kpi/i.test(q) || /kpi builder/i.test(q)) {
    const tool = WORKSPACE_TOOLS_KNOWLEDGE["kpi-builder"];
    return `### Creating KPIs in KPI Builder
**${tool.tagline}**

#### How to Create a KPI:
1. Navigate to **KPI Builder** from the sidebar or click the shortcut.
2. Choose between **Simple KPI** or **Calculated KPI**:
   - **Simple KPI**: Select a numeric column and an aggregation function (**SUM**, **AVG**, **COUNT**, **DISTINCT COUNT**, **MIN**, **MAX**).
   - **Calculated KPI**: Use the interactive visual token formula builder to combine columns, arithmetic operators (\`+\`, \`-\`, \`*\`, \`/\`, parentheses), constants, or existing saved KPIs (e.g., \`[Total Revenue] - [Total Cost]\`).
3. **Set Targets & Formatting**:
   - Specify an optional target value to track achievement percentages (e.g. Target: $500,000).
   - Configure formatting: Currency ($/BDT/EUR/GBP/INR), Percentage, Decimals, or Compact Notation (K, M, B).
4. **Configure Time Comparisons**:
   - Select a Date column to enable automatic Month-over-Month (MoM) or Year-over-Year (YoY) percentage change tracking.
5. **Save & Monitor**:
   - The system validates your formula and tags the KPI as **Active**, **Needs Attention**, or **Invalid**. Saved KPIs can be embedded directly into **Dashboards** and **MIS Executive Reports**.`;
  }

  // 5. Chart Selection Guide
  if (/(which chart|what chart|chart recommendation|choose a chart|which visual)/i.test(q)) {
    return `### Chart Selection Guide: Which Visual Should You Use?

Select your chart archetype based on your analytical question:

- 📈 **Line Chart / Area Chart**: Best for **trends over time** and continuous chronological fluctuations (e.g., Monthly Revenue, Daily Active Users).
- 📊 **Bar Chart (Horizontal)**: Best for **comparing discrete categories** and ranking top/bottom items, especially when category names are long (e.g., Top 10 Customers, Sales by Country).
- 🏛️ **Column Chart (Vertical)**: Best for comparing **few categories** (3-7 items) or discrete periods like quarters (e.g., Q1 vs Q2 vs Q3 vs Q4).
- 🍩 **Donut / Pie Chart**: Best for **part-to-whole percentage breakdowns** with 3 to 6 categories (e.g., Revenue by Sales Channel).
- 🟣 **Scatter Plot**: Best for discovering **correlations, clusters, and relationships** between two numerical variables with trendlines (e.g., Marketing Spend vs Revenue).
- 🪜 **Waterfall Chart**: Best for **cumulative positive and negative step contributions** (e.g., Gross Revenue to Net Profit bridge).
- 🎯 **Gauge Widget**: Best for **tracking progress toward a single goal or KPI target** (e.g., Quarterly Sales Achievement %).
- 🌪️ **Funnel Chart**: Best for **multi-stage sequential drop-off processes** (e.g., Lead → Qualified → Proposal → Won).
- 🗂️ **Matrix / Pivot Table**: Best for **multidimensional cross-tabulation** with 2-level row hierarchy, column dimensions, subtotals, and data bar formatting.
- 📉 **Combo Chart (Bar + Line)**: Best for comparing **volume** (Bar) and **rate / margin %** (Line) on dual axes.`;
  }

  // 6. MIS Executive Report
  if (/(how do i create|how to create|what is)\s+(an\s+)?mis report/i.test(q) || /mis executive report/i.test(q)) {
    const tool = WORKSPACE_TOOLS_KNOWLEDGE["mis-report"];
    return `### MIS Executive Reports
**${tool.tagline}**

#### What It Does:
${tool.whatItDoes}

#### How to Generate an MIS Executive Report:
1. **Ensure Data Quality**: Make sure your active dataset has achieved a high Data Health Score (>85%) in **Data Cleaning**.
2. **Define Base KPIs**: Ensure key metrics (Revenue, Volume, Margins) are defined in **KPI Builder**.
3. **Navigate to MIS Executive Report**: Click the **MIS Executive Report** tab in the sidebar.
4. **Configure Report Parameters**:
   - Set Organization Name, Prepared By, Report ID, and select the reporting Date Range.
   - The report automatically compiles an **Executive Summary**, **Data Quality Audit Badge**, **Top KPI Scorecard**, **Segment Performance Ranking Tables**, and **Period Variance Breakdown**.
5. **Export & Share**: Print or export as high-fidelity executive PDF for C-suite meetings and governance audits.`;
  }

  // 7. Data Explorer
  if (/(what does|how does|what is)\s+data explorer/i.test(q) || /explore data/i.test(q)) {
    const tool = WORKSPACE_TOOLS_KNOWLEDGE.explorer;
    return `### Data Explorer
**${tool.tagline}**

#### What It Does:
${tool.whatItDoes}

#### Key Features:
- **Advanced Multi-Column Filtering**: Filter by text, numbers, dates, ranges, and nulls with 14+ conditional operators.
- **Global Search & Sorting**: Instant multi-column ascending/descending sorting with live highlighting.
- **Dynamic Group By Engine**: Group by any categorical dimension with real-time aggregations (SUM, AVG, COUNT, DISTINCT COUNT, MIN, MAX).
- **Quick Metric Cards**: Immediate high-level metrics for selected views.
- **Saved Explorer Views**: Save filter/sort configurations for quick future recall.
- **Data Export**: Export filtered subsets to CSV or JSON.`;
  }

  // 8. Data Model & Relationships
  if (/(what does|how does|what is)\s+(data model|relationship)/i.test(q) || /model & relationships/i.test(q)) {
    const tool = WORKSPACE_TOOLS_KNOWLEDGE.relationships;
    return `### Data Model & Relationships
**${tool.tagline}**

#### What It Does:
${tool.whatItDoes}

#### Key Features:
- **Automated Relationship Discovery**: Scans column names, types, and value intersections to detect candidate foreign keys.
- **Cardinality Estimation**: Identifies 1:1, 1:N, N:1, and N:M relationships.
- **Interactive ER Canvas**: Visual node-and-connector entity-relationship diagram.
- **Integrity Validation**: Detects orphan records where child foreign keys don't match parent primary keys.
- **Cross-Table Analytics**: Powers cross-dataset KPI calculations and unified dashboard visualizations.`;
  }

  // 9. Data Dictionary
  if (/(what does|how does|what is)\s+data dictionary/i.test(q)) {
    const tool = WORKSPACE_TOOLS_KNOWLEDGE["data-dictionary"];
    return `### Data Dictionary
**${tool.tagline}**

#### What It Does:
${tool.whatItDoes}

#### Key Features:
- **Technical Metadata Extraction**: Auto-extracts technical data types, null counts, completeness percentages, and unique cardinality.
- **Business Descriptions**: Add clear operational definitions to clarify cryptic column names.
- **Semantic Tagging**: Tag fields as Identifier, Financial Metric, Dimension, Date/Time, Geographic, or Confidential/PII.
- **Sample Values Browser**: Review representative values for every field.
- **AI Grounding**: Helps AI Copilot understand the business context and semantics of your data.`;
  }

  // 10. End to End Workflow
  if (/(what is the workflow|how do i use this app|analytics workflow|steps in the app)/i.test(q)) {
    return `### Complete Analytics Workflow in Analytics Copilot

1. 📥 **Import Data** (*Data Import & Profile*): Upload raw CSV, Excel, or JSON files.
2. 🔍 **Profile Data** (*Data Import & Profile*): Review data types, statistical distributions, and missing rates.
3. 🛡️ **Check Data Quality** (*Data Cleaning*): Review Data Health Score (0-100%) and 14+ detected anomaly types.
4. 🧹 **Clean Data** (*Data Cleaning*): Apply deterministic transformations (fill nulls, trim spaces, fix dates, merge typos) with before/after diff verification.
5. 🔬 **Explore Data** (*Data Explorer*): Sift, filter, sort, and group records to investigate hypotheses.
6. 📈 **Build KPIs** (*KPI Builder*): Define standardized simple and calculated business metrics with token formulas and target thresholds.
7. 📊 **Create Dashboard** (*Dashboard*): Compose interactive executive views with 18+ widget types, cross-filtering, and drill-downs.
8. 📑 **Generate MIS Report** (*MIS Executive Report*): Produce formal, C-suite ready reports with quality audit badges and scorecards.`;
  }

  return null;
}
