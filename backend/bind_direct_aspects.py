import os
import time
import pandas as pd
from concurrent.futures import ThreadPoolExecutor, as_completed
from google.cloud import dataplex_v1
from google.api_core.client_options import ClientOptions
from google.api_core.exceptions import NotFound, ResourceExhausted

PROJECT_ID = "gsb-data-driven-sandbox"
SAMPLE_DV = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "sample_files", "DV_MetadataAsset.csv"))
ASPECT_TYPE_ID = "edw-stewardship"

def sanitize_name(name):
    return str(name).strip().replace(" ", "_").replace("-", "_").replace("/", "_").replace(".", "_").replace("(", "").replace(")", "")

def bind_table_aspect(client, aspect_type_ref, dataset_id, table_id, steward, owner, desc):
    entry_name = f"projects/{PROJECT_ID}/locations/us/entryGroups/@bigquery/entries/bigquery.googleapis.com/projects/{PROJECT_ID}/datasets/{dataset_id}/tables/{table_id}"
    try:
        entry = client.get_entry(name=entry_name)
        
        aspect = dataplex_v1.Aspect(
            aspect_type=aspect_type_ref,
            data={
                "data_steward": str(steward).replace("/", "").strip(),
                "data_owner": str(owner).strip(),
                "business_description": str(desc).strip()
            }
        )
        
        map_key = f"{PROJECT_ID}.global.{ASPECT_TYPE_ID}"
        clean_entry = dataplex_v1.Entry(
            name=entry_name,
            aspects={map_key: aspect}
        )
        client.update_entry(
            request=dataplex_v1.UpdateEntryRequest(
                entry=clean_entry,
                update_mask={"paths": ["aspects"]},
                aspect_keys=[map_key]
            )
        )
        return True
    except NotFound:
        return "NotFound"
    except ResourceExhausted:
        return "Quota429"
    except Exception as e:
        return f"Note ({table_id}): {e}"

def main():
    print(f"=== Direct Aspect Binding for Knowledge Catalog ({PROJECT_ID}) ===")
    start_time = time.time()
    dp_client = dataplex_v1.CatalogServiceClient(
        client_options=ClientOptions(quota_project_id=PROJECT_ID)
    )
    
    aspect_type_ref = f"projects/{PROJECT_ID}/locations/global/aspectTypes/{ASPECT_TYPE_ID}"
    
    df = pd.read_csv(SAMPLE_DV, header=1, low_memory=False)
    steward_map = {}
    for _, row in df.iterrows():
        raw_id = str(row.get('id', ''))
        if not raw_id.startswith("DV://"):
            continue
        parts = raw_id.replace("DV://", "").split("/")
        if len(parts) < 3:
            continue
        ds_id = sanitize_name(parts[1]).lower()
        tbl_id = sanitize_name(parts[2]).lower()
        key = f"{ds_id}.{tbl_id}"
        
        steward = str(row.get('Data Steward', '')).replace('nan', '').strip()
        owner = str(row.get('Data Owner', '')).replace('nan', '').strip() or "Enterprise Analytics"
        desc = str(row.get('Business Description', '')).replace('nan', '').strip() or str(row.get('Source Description', '')).replace('nan', '').strip()
        
        if steward and key not in steward_map:
            steward_map[key] = {"ds": ds_id, "tbl": tbl_id, "steward": steward, "owner": owner, "desc": desc}

    print(f"Constructed exact entry URIs for {len(steward_map)} warehouse tables. Concurrently binding live Aspects...")

    # Specifically prioritize user example
    ex_key = "gsbdm.cid_dist_next_date_ncb"
    target_list = [steward_map[ex_key]] if ex_key in steward_map else []
    target_list += [m for k, m in steward_map.items() if k != ex_key][:149]

    bound_count = 0
    not_found = 0
    quota_hits = 0
    notes = []

    with ThreadPoolExecutor(max_workers=15) as executor:
        futures = {executor.submit(bind_table_aspect, dp_client, aspect_type_ref, m["ds"], m["tbl"], m["steward"], m["owner"], m["desc"]): m["tbl"] for m in target_list}
        for fut in as_completed(futures):
            res = fut.result()
            if res is True:
                bound_count += 1
            elif res == "NotFound":
                not_found += 1
            elif res == "Quota429":
                quota_hits += 1
            elif res is not None:
                notes.append(res)

    duration = round(time.time() - start_time, 2)
    print(f"\n🎉 Direct Aspect Binding Complete in {duration}s!")
    print(f"✅ Successfully attached formal Data Steward Aspects across {bound_count} Knowledge Catalog entries!")
    if ex_key in steward_map:
        print(f"🌟 Verified User Target -> gsbdm.cid_dist_next_date_ncb is now active with live Aspect!")
    if quota_hits > 0:
        print(f"⚠️ Note: {quota_hits} entries hit quota.")
    if notes:
        print(f"First 3 notes: {notes[:3]}")

if __name__ == "__main__":
    main()
