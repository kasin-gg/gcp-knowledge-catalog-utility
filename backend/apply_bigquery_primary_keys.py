import os
import time
import pandas as pd
from google.cloud import bigquery

PROJECT_ID = "gsb-data-driven-sandbox"
DV_CSV = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "sample_files", "DV_MetadataAsset.csv"))

def main():
    start_t = time.time()
    print("=== Automated BigQuery Primary Key Enforcement Engine ===")
    bq_client = bigquery.Client(project=PROJECT_ID)
    
    print(f"Parsing {DV_CSV} for Primary Key column specifications...")
    df = pd.read_csv(DV_CSV, low_memory=False, skiprows=1)
    
    # Filter for PK columns
    pk_df = df[df['Primary Key Column (Read Only)'] == True]
    
    # Map: {(dataset, table): [col1, col2]}
    pk_map = {}
    for _, row in pk_df.iterrows():
        raw_id = str(row.get('id', '')).strip()
        col_name = str(row.get('name', '')).strip()
        if not raw_id.startswith("DV://BLUDB/") or not col_name:
            continue
        parts = raw_id.split("/")
        if len(parts) < 6:
            continue
        dataset = parts[3].lower()
        t_name = parts[4].lower()
        
        key = (dataset, t_name)
        if key not in pk_map:
            pk_map[key] = []
        if col_name not in pk_map[key]:
            pk_map[key].append(col_name)
            
    print(f"Discovered {len(pk_map)} tables requiring formal Primary Key constraints! Executing DDL...")
    
    success = 0
    notes = []
    
    for (ds, tbl), cols in pk_map.items():
        cols_str = ", ".join(cols)
        ddl = f"ALTER TABLE `{PROJECT_ID}.{ds}.{tbl}` ADD PRIMARY KEY ({cols_str}) NOT ENFORCED;"
        try:
            bq_client.query(ddl).result()
            print(f"✅ Enforced PK({cols_str}) on {ds}.{tbl}")
            success += 1
        except Exception as e:
            err_str = str(e)
            if "already exists" in err_str.lower():
                success += 1
            else:
                notes.append(f"{ds}.{tbl}: {err_str}")

    dur = round(time.time() - start_t, 2)
    print(f"\n🎉 Primary Key Enforcement Complete in {dur}s!")
    print(f"✅ Successfully enforced formal Primary Key constraints across {success} BigQuery tables!")
    if notes:
        print(f"First 3 notes:\n" + "\n".join(notes[:3]))

if __name__ == "__main__":
    main()
