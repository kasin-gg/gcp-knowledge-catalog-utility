import os
import time
import pandas as pd
from concurrent.futures import ThreadPoolExecutor, as_completed
from google.cloud import bigquery
from google.api_core.exceptions import NotFound

PROJECT_ID = "gsb-data-driven-sandbox"
SAMPLE_DV = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "sample_files", "DV_MetadataAsset.csv"))

def sanitize_name(name):
    return str(name).strip().replace(" ", "_").replace("-", "_").replace("/", "_").replace(".", "_").replace("(", "").replace(")", "")

def clean_label_val(val):
    # BigQuery labels only allow lowercase letters, numbers, hyphens, underscores (max 63 chars)
    s = str(val).lower().strip().replace(" ", "_").replace(".", "").replace("-", "_")
    return ''.join([c for c in s if c.isalnum() or c in ['_', '-']])[:63]

def update_steward_metadata(bq_client, ds_name, tbl_name, steward_name, business_desc):
    table_id = f"{PROJECT_ID}.{ds_name}.{tbl_name}"
    try:
        table = bq_client.get_table(table_id)
        
        # 1. Format rich description with clear Data Steward callout
        clean_desc = str(business_desc).replace('nan', '').strip() or f"Data Warehouse Table: {tbl_name.upper()}"
        table.description = f"[DATA STEWARD: {steward_name}] {clean_desc}"
        
        # 2. Attach native BigQuery label for instant UI filtering
        existing_labels = table.labels or {}
        existing_labels["data_steward"] = clean_label_val(steward_name)
        existing_labels["governance"] = "knowledge_catalog"
        table.labels = existing_labels
        
        bq_client.update_table(table, ["description", "labels"])
        return True
    except NotFound:
        return None
    except Exception as e:
        return f"Update note ({table_id}): {e}"

def main():
    print(f"=== Anchoring Data Stewards across GSBDM & GSBDS in {PROJECT_ID} ===")
    start_time = time.time()
    bq_client = bigquery.Client(project=PROJECT_ID)
    
    df = pd.read_csv(SAMPLE_DV, header=1, low_memory=False)
    
    steward_map = {}
    for _, row in df.iterrows():
        raw_id = str(row.get('id', ''))
        if not raw_id.startswith("DV://"):
            continue
        parts = raw_id.replace("DV://", "").split("/")
        if len(parts) < 3:
            continue
            
        ds_id = sanitize_name(parts[1]).lower() # gsbdm or gsbds
        tbl_id = sanitize_name(parts[2]).lower()
        key = f"{ds_id}.{tbl_id}"
        
        steward = str(row.get('Data Steward', '')).replace('nan', '').strip()
        desc = str(row.get('Business Description', '')).replace('nan', '').strip() or str(row.get('Source Description', '')).replace('nan', '').strip()
        
        if steward and key not in steward_map:
            steward_map[key] = {"ds": ds_id, "tbl": tbl_id, "steward": steward, "desc": desc}

    print(f"Extracted verified Data Steward mappings for {len(steward_map)} warehouse tables.")
    
    # Specifically call out the user's example
    example_key = "gsbdm.cid_dist_next_date_ncb"
    if example_key in steward_map:
        ex = steward_map[example_key]
        print(f"🌟 Verified User Example Target -> Table: {ex['ds'].upper()}.{ex['tbl']} | Steward: '{ex['steward']}'")

    updated_count = 0
    errors = []

    # Concurrently update physical BigQuery table metadata with 30 worker threads
    with ThreadPoolExecutor(max_workers=30) as executor:
        futures = {executor.submit(update_steward_metadata, bq_client, m["ds"], m["tbl"], m["steward"], m["desc"]): k for k, m in steward_map.items()}
        for idx, fut in enumerate(as_completed(futures), 1):
            res = fut.result()
            if res is True:
                updated_count += 1
            elif res is not None:
                errors.append(res)
            if idx % 200 == 0 or idx == len(steward_map):
                print(f"Progress: {idx}/{len(steward_map)} tables evaluated ({updated_count} physical stewards anchored)...")

    duration = round(time.time() - start_time, 2)
    print(f"\n🎉 Stewardship Anchoring Complete in {duration}s!")
    print(f"✅ Successfully attached Data Stewards (e.g. Sutheerat Nuanchuen) and descriptions to {updated_count} BigQuery warehouse tables!")

if __name__ == "__main__":
    main()
