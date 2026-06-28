import os
import pandas as pd
from google.cloud import datacatalog_v1, bigquery
from google.api_core.client_options import ClientOptions

PROJECT_ID = "gsb-data-driven-sandbox"
LOCATION = "us"
BQ_DATASET = f"{PROJECT_ID}.core_banking"
SAMPLE_EDC = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "sample_files", "CBS_MetadataAsset.csv"))

def get_or_create_taxonomy():
    client = datacatalog_v1.PolicyTagManagerClient(
        client_options=ClientOptions(quota_project_id=PROJECT_ID)
    )
    parent = f"projects/{PROJECT_ID}/locations/{LOCATION}"
    
    # 1. List existing taxonomies to find ours
    print(f"Searching for existing taxonomies in {parent}...")
    existing_taxonomies = list(client.list_taxonomies(parent=parent))
    tax_obj = None
    for tax in existing_taxonomies:
        if "Core Banking" in tax.display_name or "Security" in tax.display_name:
            tax_obj = tax
            break
            
    if not tax_obj:
        print("Creating new Taxonomy...")
        tax = datacatalog_v1.Taxonomy()
        tax.display_name = "Core Banking Security Taxonomy"
        tax.description = "Security classification taxonomy for Core Banking"
        tax.activated_policy_types = [datacatalog_v1.Taxonomy.PolicyType.FINE_GRAINED_ACCESS_CONTROL]
        tax_obj = client.create_taxonomy(parent=parent, taxonomy=tax)
        print(f"Created Taxonomy: {tax_obj.name}")
    else:
        print(f"Found existing Taxonomy: {tax_obj.name} ({tax_obj.display_name})")

    # 2. List policy tags in this taxonomy
    existing_tags = list(client.list_policy_tags(parent=tax_obj.name))
    tags_map = {pt.display_name: pt.name for pt in existing_tags}
    print(f"Existing Policy Tags in taxonomy: {tags_map}")

    required_tags = ["Secret", "Confidential", "Personal Data PII"]
    for rtag in required_tags:
        if rtag not in tags_map:
            print(f"Creating Policy Tag '{rtag}'...")
            ptag = datacatalog_v1.PolicyTag()
            ptag.display_name = rtag
            ptag.description = f"Policy tag for {rtag}"
            try:
                created_ptag = client.create_policy_tag(parent=tax_obj.name, policy_tag=ptag)
                tags_map[rtag] = created_ptag.name
                print(f"✅ Created Tag '{rtag}': {created_ptag.name}")
            except Exception as e:
                print(f"Error creating tag {rtag}: {e}")

    return tags_map

def apply_to_cif(tags_map):
    bq_client = bigquery.Client(project=PROJECT_ID)
    table_id = f"{BQ_DATASET}.cif"
    
    tag_conf = tags_map.get("Confidential") or tags_map.get("Secret") or list(tags_map.values())[0]
    tag_pii = tags_map.get("Personal Data PII") or tag_conf
    
    print(f"Fetching physical table schema for {table_id}...")
    table = bq_client.get_table(table_id)
    
    target_cols = {
        "ZCIZCEN": {"desc": "citizen card - issue center", "tags": [tag_pii]},
        "MNAME": {"desc": "Customer Middle Name", "tags": [tag_conf]},
        "ZCIZSDT": {"desc": "citizen card - issue date", "tags": [tag_conf]}
    }
    
    new_schema = []
    updated_count = 0
    for field in table.schema:
        if field.name in target_cols:
            meta = target_cols[field.name]
            f_dict = field.to_api_repr()
            f_dict["description"] = meta["desc"]
            f_dict["policyTags"] = {"names": meta["tags"]}
            new_schema.append(bigquery.SchemaField.from_api_repr(f_dict))
            updated_count += 1
            print(f"  + Configured Policy Tags for column `{field.name}`: {meta['tags']}")
        else:
            new_schema.append(field)
            
    table.schema = new_schema
    bq_client.update_table(table, ["schema"])
    print(f"🎉 Successfully updated physical BigQuery table schema! {updated_count} columns now have native Policy Tags attached.")

def main():
    tags_map = get_or_create_taxonomy()
    if tags_map:
        apply_to_cif(tags_map)

if __name__ == "__main__":
    main()
