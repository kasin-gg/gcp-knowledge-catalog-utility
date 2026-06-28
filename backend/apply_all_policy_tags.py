import os
import pandas as pd
import json
from concurrent.futures import ThreadPoolExecutor, as_completed
from google.cloud import datacatalog_v1, bigquery
from google.api_core.client_options import ClientOptions
from google.api_core.exceptions import NotFound

PROJECT_ID = "gsb-data-driven-sandbox"
LOCATION = "us"
BQ_DATASET = f"{PROJECT_ID}.core_banking"
SAMPLE_EDC = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "sample_files", "CBS_MetadataAsset.csv"))

def setup_exact_taxonomy():
    client = datacatalog_v1.PolicyTagManagerClient(
        client_options=ClientOptions(quota_project_id=PROJECT_ID)
    )
    parent = f"projects/{PROJECT_ID}/locations/{LOCATION}"
    
    print(f"Searching for existing taxonomies in {parent}...")
    existing_taxonomies = list(client.list_taxonomies(parent=parent))
    tax_obj = None
    for tax in existing_taxonomies:
        if "Core Banking" in tax.display_name or "Security" in tax.display_name:
            tax_obj = tax
            break
            
    if not tax_obj:
        tax = datacatalog_v1.Taxonomy()
        tax.display_name = "Core Banking Security Taxonomy"
        tax.description = "Exact EDC Data Classification Tiers (2, 3, 4)"
        tax.activated_policy_types = [datacatalog_v1.Taxonomy.PolicyType.FINE_GRAINED_ACCESS_CONTROL]
        tax_obj = client.create_taxonomy(parent=parent, taxonomy=tax)
        print(f"Created Taxonomy: {tax_obj.name}")
    else:
        print(f"Using Taxonomy: {tax_obj.name}")

    # Use clean ASCII names for Policy Tags to satisfy Data Catalog naming rules
    exact_tags_def = [
        {"name": "Tier 2 Internal Use", "desc": "2 - ใช้ภายในเท่านั้น (Internal Use)"},
        {"name": "Tier 3 Confidential", "desc": "3 - ลับ (Confidential)"},
        {"name": "Tier 4 Secret", "desc": "4 - ลับมาก (Secret)"}
    ]
    
    existing_tags = list(client.list_policy_tags(parent=tax_obj.name))
    tags_map = {pt.display_name: pt.name for pt in existing_tags}

    for tdef in exact_tags_def:
        tname = tdef["name"]
        if tname not in tags_map:
            print(f"Creating exact Policy Tag '{tname}'...")
            ptag = datacatalog_v1.PolicyTag()
            ptag.display_name = tname
            ptag.description = tdef["desc"]
            created = client.create_policy_tag(parent=tax_obj.name, policy_tag=ptag)
            tags_map[tname] = created.name
            print(f"✅ Created Tag '{tname}': {created.name}")
            
    return tags_map


def sanitize_name(name):
    return str(name).strip().replace(" ", "_").replace("-", "_").replace("/", "_").replace(".", "_").replace("(", "").replace(")", "")


def update_table_schema(bq_client, table_name, col_mappings, tags_map):
    table_id = f"{BQ_DATASET}.{table_name}"
    try:
        table = bq_client.get_table(table_id)
    except NotFound:
        return None
    except Exception as e:
        return f"Error fetching {table_name}: {e}"

    new_schema = []
    modified = False
    
    for field in table.schema:
        clean_col = sanitize_name(field.name).upper()
        if clean_col in col_mappings:
            meta = col_mappings[clean_col]
            f_dict = field.to_api_repr()
            
            # Set Thai description
            if meta["desc"]:
                f_dict["description"] = meta["desc"]
                modified = True
                
            # Set exact Policy Tag (Max 1 per column)
            cls_str = meta["class"]
            tag_uri = ""
            if "4" in cls_str and "Tier 4 Secret" in tags_map:
                tag_uri = tags_map["Tier 4 Secret"]
            elif "3" in cls_str and "Tier 3 Confidential" in tags_map:
                tag_uri = tags_map["Tier 3 Confidential"]
            elif "2" in cls_str and "Tier 2 Internal Use" in tags_map:
                tag_uri = tags_map["Tier 2 Internal Use"]
                
            if tag_uri:
                f_dict["policyTags"] = {"names": [tag_uri]}
                modified = True
                
            new_schema.append(bigquery.SchemaField.from_api_repr(f_dict))
        else:
            new_schema.append(field)

    if modified:
        try:
            table.schema = new_schema
            bq_client.update_table(table, ["schema"])
            return True
        except Exception as e:
            return f"Update note ({table_name}): {e}"
    return False


def main():
    print("=== Aligning All 477 BigQuery Tables to CBS_MetadataAsset.csv ===")
    tags_map = setup_exact_taxonomy()
    print(f"\nExact Policy Tags Mapping Active:\n{json.dumps(tags_map, indent=2, ensure_ascii=False)}")
    
    bq_client = bigquery.Client(project=PROJECT_ID)
    
    # Read EDC CSV
    df = pd.read_csv(SAMPLE_EDC, header=1, low_memory=False)
    
    # Group column metadata by table
    table_col_map = {}
    for _, row in df.iterrows():
        raw_id = str(row.get('id', ''))
        if not raw_id.startswith("CBS://"):
            continue
        parts = raw_id.replace("CBS://", "").split("/")
        if len(parts) < 3:
            continue
        tname = sanitize_name(parts[1]).lower()
        cname = sanitize_name(parts[2]).upper()
        
        desc = str(row.get('Business Description', '')).replace('nan', '').strip()
        if not desc:
            desc = str(row.get('Remark', '')).replace('nan', '').strip()
            
        classification = str(row.get('Data Classification', '')).strip()
        
        if tname not in table_col_map:
            table_col_map[tname] = {}
        table_col_map[tname][cname] = {"desc": desc, "class": classification}

    print(f"\nParsed metadata for {len(table_col_map)} distinct banking tables. Concurrently updating BigQuery schemas...")

    updated_tables = 0
    errors = []

    with ThreadPoolExecutor(max_workers=25) as executor:
        futures = {executor.submit(update_table_schema, bq_client, t, cmap, tags_map): t for t, cmap in table_col_map.items()}
        for idx, fut in enumerate(as_completed(futures), 1):
            res = fut.result()
            if res is True:
                updated_tables += 1
            elif res and res is not False and res is not None:
                errors.append(res)
            if idx % 50 == 0 or idx == len(table_col_map):
                print(f"Progress: {idx}/{len(table_col_map)} tables evaluated ({updated_tables} physical schemas enriched)...")

    print(f"\n🎉 Alignment Complete!")
    print(f"✅ Successfully attached exact Policy Tags (2, 3, 4) and Thai descriptions across {updated_tables} BigQuery tables!")
    if errors:
        print(f"First 3 notes: {errors[:3]}")

if __name__ == "__main__":
    main()
