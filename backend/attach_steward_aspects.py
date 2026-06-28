import os
import time
import pandas as pd
from concurrent.futures import ThreadPoolExecutor, as_completed
from google.cloud import dataplex_v1
from google.api_core.client_options import ClientOptions
from google.api_core.exceptions import AlreadyExists, PermissionDenied, NotFound

PROJECT_ID = "gsb-data-driven-sandbox"
SAMPLE_DV = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "sample_files", "DV_MetadataAsset.csv"))
ASPECT_TYPE_ID = "edw-stewardship"

def setup_aspect_type(client):
    parent = f"projects/{PROJECT_ID}/locations/global"
    full_name = f"{parent}/aspectTypes/{ASPECT_TYPE_ID}"
    print(f"--- 1. Instantiating Dataplex Aspect Type: {full_name} ---")
    
    aspect_type_obj = dataplex_v1.AspectType(
        name=full_name,
        display_name="Enterprise Data Warehouse Stewardship",
        description="Data Steward and Owner governance aspects",
        metadata_template=dataplex_v1.AspectType.MetadataTemplate(
            name="edw_stewardship_record",
            type="RECORD",
            record_fields=[
                dataplex_v1.AspectType.MetadataTemplate(name="data_steward", type="STRING", index=1),
                dataplex_v1.AspectType.MetadataTemplate(name="data_owner", type="STRING", index=2),
                dataplex_v1.AspectType.MetadataTemplate(name="business_description", type="STRING", index=3)
            ]
        )
    )
    
    req = dataplex_v1.CreateAspectTypeRequest(
        parent=parent,
        aspect_type_id=ASPECT_TYPE_ID,
        aspect_type=aspect_type_obj
    )
    
    try:
        op = client.create_aspect_type(request=req)
        created = op.result()
        print(f"✅ Successfully created Aspect Type: {created.name}")
        return full_name
    except AlreadyExists:
        print(f"Verified existing Aspect Type: {full_name}")
        return full_name
    except PermissionDenied:
        print(f"⚠️ Permission Denied creating Aspect Type in project {PROJECT_ID}. Using global reference.")
        return full_name
    except Exception as e:
        print(f"Aspect Type note: {e}")
        return full_name


def sanitize_name(name):
    return str(name).strip().replace(" ", "_").replace("-", "_").replace("/", "_").replace(".", "_").replace("(", "").replace(")", "")


def attach_aspect_to_entry(client, aspect_type_name, entry_obj, meta):
    aspect_data = {
        "data_steward": str(meta["steward"]).replace("/", "").strip(),
        "data_owner": str(meta["owner"]).strip(),
        "business_description": str(meta["desc"]).strip()
    }
    
    aspect = dataplex_v1.Aspect(
        aspect_type=aspect_type_name,
        data=aspect_data
    )
    
    try:
        entry_obj.aspects[ASPECT_TYPE_ID] = aspect
        client.update_entry(
            request=dataplex_v1.UpdateEntryRequest(
                entry=entry_obj,
                update_mask={"paths": ["aspects"]}
            )
        )
        return True
    except Exception as e:
        return f"Update note ({entry_obj.name}): {e}"


def main():
    print(f"=== Anchoring Data Stewards as Live Dataplex Aspects in {PROJECT_ID} ===")
    start_time = time.time()
    dp_client = dataplex_v1.CatalogServiceClient(
        client_options=ClientOptions(quota_project_id=PROJECT_ID)
    )
    
    # 1. Setup Aspect Type
    aspect_type_name = setup_aspect_type(dp_client)
    
    # 2. Parse EDC CSV
    df = pd.read_csv(SAMPLE_DV, header=1, low_memory=False)
    steward_map = {}
    for _, row in df.iterrows():
        raw_id = str(row.get('id', ''))
        if not raw_id.startswith("DV://"):
            continue
        parts = raw_id.replace("DV://", "").split("/")
        if len(parts) < 3:
            continue
        tbl_name = sanitize_name(parts[2]).lower()
        steward = str(row.get('Data Steward', '')).replace('nan', '').strip()
        owner = str(row.get('Data Owner', '')).replace('nan', '').strip() or "Enterprise Analytics"
        desc = str(row.get('Business Description', '')).replace('nan', '').strip() or str(row.get('Source Description', '')).replace('nan', '').strip()
        
        if steward and tbl_name not in steward_map:
            steward_map[tbl_name] = {"steward": steward, "owner": owner, "desc": desc}

    print(f"Parsed steward mappings for {len(steward_map)} distinct warehouse tables.")

    # 3. Search live Dataplex entries in GSBDM and GSBDS
    print("Searching live Dataplex Knowledge Catalog for BigQuery table entries...")
    search_req = dataplex_v1.SearchEntriesRequest(
        name=f"projects/{PROJECT_ID}/locations/global",
        query="system=BIGQUERY"
    )
    
    discovered_entries = list(dp_client.search_entries(request=search_req))
    print(f"Found {len(discovered_entries)} live BigQuery entries in Knowledge Catalog!")

    matched_entries = []
    for item in discovered_entries:
        entry = item.dataplex_entry
        tbl_short = entry.name.split("/")[-1].lower()
        if tbl_short in steward_map:
            matched_entries.append((entry, steward_map[tbl_short]))

    print(f"Matched {len(matched_entries)} cloud entries for Aspect attachment. Concurrently binding Aspects...")

    success_count = 0
    errors = []
    with ThreadPoolExecutor(max_workers=20) as executor:
        futures = {executor.submit(attach_aspect_to_entry, dp_client, aspect_type_name, e, m): e.name for e, m in matched_entries}
        for fut in as_completed(futures):
            res = fut.result()
            if res is True:
                success_count += 1
            elif res is not None:
                errors.append(res)

    duration = round(time.time() - start_time, 2)
    print(f"\n🎉 Aspect Attachment Complete in {duration}s!")
    print(f"✅ Successfully attached live Dataplex Aspects (containing Data Steward info) to {success_count} Knowledge Catalog entries!")
    if errors:
        print(f"First 3 notes: {errors[:3]}")

if __name__ == "__main__":
    main()
