# GCP Knowledge Catalog & Dataplex Governance Utility

Automation scripts and an interactive governance portal for managing metadata, business glossaries, column-level security policy tags, data stewards, and table lineage across **Google Cloud Dataplex** and **BigQuery**.

## Architecture & Capabilities

- **Backend Automation (`backend/`, Python & FastAPI):**
  - Synchronises Dataplex Business Glossaries, categories, and term-to-column bindings (`create_console_glossary.py`, `bind_glossary_terms.py`, `sync_native_glossary.py`).
  - Automates BigQuery column-level security taxonomies and policy-tag attachment (`create_taxonomy.py`, `apply_all_policy_tags.py`).
  - Attaches custom Dataplex stewardship aspects, un-enforced BigQuery primary keys, and Data Lineage API edges (`attach_steward_aspects.py`, `apply_bigquery_primary_keys.py`, `push_cloud_lineage.py`).
  - Serves a cached FastAPI gateway (`backend/main.py`) for asset search, lazy-loaded column schemas, lineage inspection, and bulk access requests.
- **Frontend Portal (`src/`, React + TypeScript + Vite):**
  - Interactive catalog search, business glossary browser, schema/policy-tag inspector, and bulk access-request workflow.

## Quick Start

1. Authenticate Application Default Credentials and set your target Google Cloud project (`your-gcp-project-id` in the configuration modal or scripts):
   ```bash
   gcloud auth application-default login
   pip install -r backend/requirements.txt
   uvicorn backend.main:app --reload --port 8000
   ```
2. Start the React governance UI in a second terminal:
   ```bash
   npm install
   npm run dev
   ```
