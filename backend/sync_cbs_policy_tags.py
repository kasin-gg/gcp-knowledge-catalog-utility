import os
import time
import pandas as pd
from concurrent.futures import ThreadPoolExecutor, as_completed
from google.cloud import bigquery

PROJECT_ID = "gsb-data-driven-sandbox"
CBS_CSV = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "sample_files", "CBS_MetadataAsset.csv"))

TAXONOMY_ID = "8596770695647372803"
TAG_TIER_2 = f"projects/{PROJECT_ID}/locations/us/taxonomies/{TAXONOMY_ID}/policyTags/3418042881630160549"
TAG_TIER_3 = f"projects/{PROJECT_ID}/locations/us/taxonomies/{TAXONOMY_ID}/policyTags/5803212426457031591"
TAG_TIER_4 = f"projects/{PROJECT_ID}/locations/us/taxonomies/{TAXONOMY_ID}/policyTags/8212205044152941111"

def update_bq_table_policy_tags(bq_client, table_name, col_tag_map):
    ref = f"{PROJECT_ID}.core_banking.{table_name}"
    try:
        table = bq_client.get_table(ref)
        new_schema = []
        modified = False
        
        for field in table.schema:
            field_name_lower = field.name.lower()
            if field_name_lower in col_tag_map:
                target_tag = col_tag_map[field_name_lower]
                current_tag = field.policy_tags.names[0] if field.policy_tags and field.policy_tags.names else ""
                if current_tag != target_tag:
                    new_field = field.to_api_repr()
                    new_field["policyTags"] = {"names": [target_tag]}
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
    print("=== Automated CBS BigQuery Policy Tag Synchronization Engine ===")
    bq_client = bigquery.Client(project=PROJECT_ID)
    
    print(f"Parsing {CBS_CSV} for Data Classification specifications...")
    df = pd.read_csv(CBS_CSV, low_memory=False, skiprows=1)
    
    # Map: {table_lower: {col_lower: tag_uri}}
    table_col_tags = {}
    
    for _, row in df.iterrows():
        raw_id = str(row.get('id', '')).strip()
        classification = str(row.get('Data Classification', '')).strip()
        
        if not raw_id.startswith("CBS://") or not classification:
            continue
            
        parts = raw_id.split("/")
        if len(parts) < 4:
            continue
            
        table_name = parts[3].lower()
        col_name = parts[-1].replace('"', '').lower()
        
        target_tag = None
        if classification.startswith("2"):
            target_tag = TAG_TIER_2
        elif classification.startswith("3"):
            target_tag = TAG_TIER_3
        elif classification.startswith("4"):
            target_tag = TAG_TIER_4
            
        if not target_tag:
            continue
            
        if table_name not in table_col_tags:
            table_col_tags[table_name] = {}
        table_col_tags[table_name][col_name] = target_tag

    print(f"Grouped Policy Tag specifications across {len(table_col_tags)} Core Banking tables! Executing concurrent updates...")
    
    updated = 0
    skipped = 0
    notes = []
    
    with ThreadPoolExecutor(max_workers=10) as exe:
        futs = {exe.submit(update_bq_table_policy_tags, bq_client, tbl, cmap): tbl for tbl, cmap in table_col_tags.items()}
        for f in as_completed(futs):
            res = f.result()
            if res is True:
                updated += 1
            elif res == "No change needed":
                skipped += 1
            else:
                notes.append(res)

    dur = round(time.time() - start_t, 2)
    print(f"\n🎉 CBS Policy Tag Sync Complete in {dur}s!")
    print(f"✅ Successfully synchronized exact Policy Tags across {updated} BigQuery tables ({skipped} already aligned)!")
    if notes:
        print(f"First 3 notes:\n" + "\n".join(notes[:3]))

if __name__ == "__main__":
    main()
