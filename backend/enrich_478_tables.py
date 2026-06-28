import os
import pandas as pd
import json

SAMPLE_FILE = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "sample_files", "CBS_MetadataAsset.csv"))
OUTPUT_SQL = "/Users/kasin/.gemini/jetski/brain/7d7a0071-bbcd-4cad-8319-7fc2e3acdf56/scratch/cbs_policy_tags_enrichment.sql"
OUTPUT_JSON = "/Users/kasin/.gemini/jetski/brain/7d7a0071-bbcd-4cad-8319-7fc2e3acdf56/scratch/cbs_aspects_payload.json"

def sanitize_name(name):
    return str(name).strip().replace(" ", "_").replace("-", "_").replace("/", "_").replace(".", "_").replace("(", "").replace(")", "")

def main():
    os.makedirs(os.path.dirname(OUTPUT_SQL), exist_ok=True)
    print("--- Analyzing CBS_MetadataAsset.csv for Governance Enrichment ---")
    
    # Use line 2 (index 1) as header
    df = pd.read_csv(SAMPLE_FILE, header=1, low_memory=False)
    print(f"Parsed {len(df)} governance records from Informatica EDC export.")

    alter_statements = []
    aspect_payloads = {}

    # Simulated Taxonomy Tag IDs (In production, replace with actual Data Catalog Policy Tag resource names)
    TAXONOMY_ID = "projects/gsb-data-driven-sandbox/locations/us/taxonomies/cbs_security_tax"
    TAG_SECRET = f"{TAXONOMY_ID}/policyTags/secret_tier_4"
    TAG_CONFIDENTIAL = f"{TAXONOMY_ID}/policyTags/confidential_tier_3"
    TAG_PII = f"{TAXONOMY_ID}/policyTags/personal_data_pii"

    secret_count = 0
    confidential_count = 0
    pii_count = 0

    for _, row in df.iterrows():
        raw_id = str(row.get('id', ''))
        if not raw_id.startswith("CBS://"):
            continue
            
        parts = raw_id.replace("CBS://", "").split("/")
        if len(parts) < 3:
            continue
            
        table_name = sanitize_name(parts[1]).lower()
        col_name = sanitize_name(parts[2])
        
        classification = str(row.get('Data Classification', '')).strip()
        is_pii = "Yes" in str(row.get('PersonalData', ''))
        thai_desc = str(row.get('Business Description', '')).replace('"', "'").strip()
        owner = str(row.get('Data Owner', '')).strip()
        steward = str(row.get('Data Steward', '')).strip()

        tags = []
        tier_str = "INTERNAL"
        if "4" in classification:
            tags.append(f'"{TAG_SECRET}"')
            tier_str = "SECRET"
            secret_count += 1
        elif "3" in classification:
            tags.append(f'"{TAG_CONFIDENTIAL}"')
            tier_str = "CONFIDENTIAL"
            confidential_count += 1
            
        if is_pii:
            tags.append(f'"{TAG_PII}"')
            pii_count += 1

        # Generate ALTER TABLE SQL if policy tags apply
        if tags:
            tag_list_str = ", ".join(tags)
            stmt = f"ALTER TABLE `gsb-data-driven-sandbox.core_banking.{table_name}` ALTER COLUMN `{col_name}` SET OPTIONS(policy_tags=[{tag_list_str}]);"
            alter_statements.append(stmt)

        # Prepare Aspect Payload
        entry_key = f"gsb-data-driven-sandbox.core_banking.{table_name}.{col_name}"
        aspect_payloads[entry_key] = {
            "thai_description": thai_desc,
            "security_tier": tier_str,
            "is_personal_data": is_pii,
            "data_owner": owner,
            "data_steward": steward
        }

    # Write SQL file
    with open(OUTPUT_SQL, "w", encoding="utf-8") as f:
        f.write("-- BigQuery Policy Tags Enrichment Script\n")
        f.write(f"-- Target Taxonomy: {TAXONOMY_ID}\n\n")
        f.write("\n".join(alter_statements))
    print(f"Saved {len(alter_statements)} ALTER TABLE policy tag statements to {OUTPUT_SQL}")

    # Write Aspect JSON payload
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(aspect_payloads, f, ensure_ascii=False, indent=2)
    print(f"Saved {len(aspect_payloads)} Dataplex Aspect enrichment payloads to {OUTPUT_JSON}")

    print(f"\n📊 Enrichment Breakdown:")
    print(f"  - Columns flagged as SECRET (Tier 4): {secret_count}")
    print(f"  - Columns flagged as CONFIDENTIAL (Tier 3): {confidential_count}")
    print(f"  - Columns flagged as Personal Data (PII): {pii_count}")

if __name__ == "__main__":
    main()
