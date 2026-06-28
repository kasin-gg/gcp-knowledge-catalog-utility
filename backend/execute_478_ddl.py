import os
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from google.cloud import bigquery

PROJECT_ID = "gsb-data-driven-sandbox"
DATASET_ID = f"{PROJECT_ID}.core_banking"
SQL_FILE = "/Users/kasin/.gemini/jetski/brain/7d7a0071-bbcd-4cad-8319-7fc2e3acdf56/scratch/cbs_478_tables_ddl.sql"

def create_table(client, ddl):
    stmt = ddl.strip()
    if not stmt:
        return None
    try:
        query_job = client.query(stmt)
        query_job.result() # Wait for table creation
        return True
    except Exception as e:
        return f"Error: {e}"

def main():
    print(f"--- Initiating Triumphant Deployment of 478 Tables to {DATASET_ID} ---")
    start_time = time.time()
    client = bigquery.Client(project=PROJECT_ID)
    
    # 1. Ensure target dataset exists
    ds = bigquery.Dataset(DATASET_ID)
    ds.location = "US"
    try:
        client.create_dataset(ds, exists_ok=True)
        print(f"Verified target BigQuery dataset: {DATASET_ID}")
    except Exception as e:
        print(f"Dataset verification note: {e}")

    # 2. Read and parse DDL statements
    with open(SQL_FILE, "r", encoding="utf-8") as f:
        content = f.read()

    # Split by semicolon
    raw_statements = [s.strip() for s in content.split(";") if s.strip() and not s.strip().startswith("--")]
    print(f"Parsed {len(raw_statements)} DDL statements ready for concurrent cloud execution.")

    success_count = 0
    error_count = 0
    errors = []

    # 3. Concurrently execute DDLs with 25 worker threads
    with ThreadPoolExecutor(max_workers=25) as executor:
        futures = {executor.submit(create_table, client, stmt): stmt for stmt in raw_statements}
        
        for idx, future in enumerate(as_completed(futures), 1):
            res = future.result()
            if res is True:
                success_count += 1
            elif res is not None:
                error_count += 1
                errors.append(res)
            
            if idx % 50 == 0 or idx == len(raw_statements):
                print(f"Progress: {idx}/{len(raw_statements)} tables processed ({success_count} created, {error_count} failed)...")

    duration = round(time.time() - start_time, 2)
    print(f"\n🎉 Deployment Complete in {duration} seconds!")
    print(f"✅ Successfully instantiated {success_count} native BigQuery tables in {DATASET_ID}")
    if error_count > 0:
        print(f"⚠️ Encountered {error_count} errors. First 3 errors:")
        for err in errors[:3]:
            print(f"  - {err}")

if __name__ == "__main__":
    main()
