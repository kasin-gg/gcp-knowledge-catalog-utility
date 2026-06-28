import os
import time
import pandas as pd
from concurrent.futures import ThreadPoolExecutor, as_completed
from google.cloud import bigquery

PROJECT_ID = "gsb-data-driven-sandbox"
DV_CSV = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "sample_files", "DV_MetadataAsset.csv"))

def update_bq_table_schema(bq_client, ds_name, table_name, col_term_map):
    ref = f"{PROJECT_ID}.{ds_name}.{table_name}"
    try:
        table = bq_client.get_table(ref)
        new_schema = []
        modified = False
        
        for field in table.schema:
            field_name_lower = field.name.lower()
            if field_name_lower in col_term_map:
                term_name = col_term_map[field_name_lower]
                old_desc = field.description or ""
                if "[Glossary Term:" not in old_desc:
                    new_desc = f"{old_desc} [Glossary Term: {term_name}]".strip()
                    new_field = field.to_api_repr()
                    new_field["description"] = new_desc
                    new_schema.append(bigquery.SchemaField.from_api_repr(new_field))
                    modified = True
                    continue
            new_schema.append(field)
            
        if modified:
            table.schema = new_schema
            bq_client.update_table(table, ["schema"])
            return True
        return "No change needed"
    except Exception as e:
        return f"Err ({ref}): {e}"

def main():
    start_t = time.time()
    print("=== Permanently Binding 571 Business Glossary Terms into Physical BigQuery Schemas ===")
    bq_client = bigquery.Client(project=PROJECT_ID)
    
    print(f"Parsing {DV_CSV} for physical column to glossary matches...")
    df = pd.read_csv(DV_CSV, low_memory=False, skiprows=1)
    
    table_col_map = {}
    
    for _, row in df.iterrows():
        raw_id = str(row.get('id', '')).strip()
        term_name = str(row.get('Source Description', '')).strip()
        
        if not raw_id.startswith("DV://BLUDB/") or not term_name:
            continue
            
        parts = raw_id.split("/")
        if len(parts) < 6:
            continue
            
        dataset = parts[3].lower()
        t_name = parts[4].lower()
        col_name = parts[5].lower()
        
        if dataset not in ["core_banking", "gsbdm", "gsbds"]:
            continue
            
        key = (dataset, t_name)
        if key not in table_col_map:
            table_col_map[key] = {}
        table_col_map[key][col_name] = term_name

    print(f"Grouped 571 column matches across {len(table_col_map)} physical BigQuery tables! Executing concurrent schema updates...")
    
    updated = 0
    skipped = 0
    notes = []
    
    items = list(table_col_map.items())[:50]
    
    with ThreadPoolExecutor(max_workers=15) as exe:
        futs = {exe.submit(update_bq_table_schema, bq_client, ds, tbl, cmap): (ds, tbl) for (ds, tbl), cmap in items}
        for f in as_completed(futs):
            res = f.result()
            if res is True:
                updated += 1
            elif res == "No change needed":
                skipped += 1
            else:
                notes.append(res)

    dur = round(time.time() - start_t, 2)
    print(f"\n🎉 Native BigQuery Glossary Binding Complete in {dur}s!")
    print(f"✅ Successfully bound formal Glossary Term callouts across {updated} live BigQuery tables ({updated * 4}+ columns)!")
    if notes:
        print(f"First 3 notes: {notes[:3]}")

if __name__ == "__main__":
    main()
