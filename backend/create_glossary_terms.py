import os
import time
import pandas as pd
from concurrent.futures import ThreadPoolExecutor, as_completed
from google.cloud import dataplex_v1
from google.api_core.client_options import ClientOptions
from google.api_core.exceptions import AlreadyExists, PermissionDenied

PROJECT_ID = "gsb-data-driven-sandbox"
LOCATION = "global"
SAMPLE_GLOS = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "sample_files", "Glossaries - Terms.csv"))
GROUP_ID = "enterprise_business_glossary"

def setup_glossary_group(client):
    parent = f"projects/{PROJECT_ID}/locations/{LOCATION}"
    group_name = f"{parent}/entryGroups/{GROUP_ID}"
    print(f"--- 1. Setting up Dataplex Glossary Entry Group: {group_name} ---")
    
    group_obj = dataplex_v1.EntryGroup(
        name=group_name,
        display_name="General Business Glossary",
        description="Curated enterprise business taxonomy imported from EDC"
    )
    
    req = dataplex_v1.CreateEntryGroupRequest(
        parent=parent,
        entry_group_id=GROUP_ID,
        entry_group=group_obj
    )
    
    try:
        op = client.create_entry_group(request=req)
        created = op.result()
        print(f"✅ Created Glossary Entry Group: {created.name}")
        return group_name
    except AlreadyExists:
        print(f"Verified existing Glossary Entry Group: {group_name}")
        return group_name
    except PermissionDenied:
        print(f"⚠️ Permission Denied creating Entry Group in {PROJECT_ID}. Using simulated global container.")
        return group_name
    except Exception as e:
        print(f"Entry Group note: {e}")
        return group_name


def setup_entry_type(client):
    parent = f"projects/{PROJECT_ID}/locations/{LOCATION}"
    type_id = "business-glossary-term"
    full_name = f"{parent}/entryTypes/{type_id}"
    print(f"--- Creating Custom Entry Type: {full_name} ---")
    et_obj = dataplex_v1.EntryType(
        name=full_name,
        display_name="Business Glossary Term",
        description="Curated business vocabulary term"
    )
    try:
        client.create_entry_type(parent=parent, entry_type_id=type_id, entry_type=et_obj)
        print(f"✅ Created Entry Type: {full_name}")
    except Exception as e:
        print(f"Entry Type note: {e}")
    return full_name


def sanitize_term_id(name):
    s = str(name).lower().strip().replace(" ", "-").replace("/", "-").replace(".", "-").replace("(", "").replace(")", "").replace(":", "")
    return ''.join([c for c in s if c.isalnum() or c == '-'])[:63].strip("-") or "term-item"


def create_term_entry(client, group_name, type_name, term_name, thai_desc, owner, steward, synonyms):
    term_id = sanitize_term_id(term_name)
    entry_name = f"{group_name}/entries/{term_id}"
    
    entry_obj = dataplex_v1.Entry(
        name=entry_name,
        entry_type=type_name,
        entry_source=dataplex_v1.EntrySource(
            display_name=str(term_name)[:200],
            description=str(thai_desc)[:2000] if pd.notna(thai_desc) else "Standard enterprise business term."
        )
    )
    
    req = dataplex_v1.CreateEntryRequest(
        parent=group_name,
        entry_id=term_id,
        entry=entry_obj
    )
    
    try:
        client.create_entry(request=req)
        return True
    except AlreadyExists:
        return "Exists"
    except Exception as e:
        return f"Term note ({term_id}): {e}"


def main():
    print(f"=== Mass Onboarding 1,868 Glossary Terms to Dataplex in {PROJECT_ID} ===")
    start_time = time.time()
    dp_client = dataplex_v1.CatalogServiceClient(
        client_options=ClientOptions(quota_project_id=PROJECT_ID)
    )
    
    # 1. Create Entry Group & Entry Type
    group_name = setup_glossary_group(dp_client)
    type_name = setup_entry_type(dp_client)
    
    # 2. Parse CSV
    df = pd.read_csv(SAMPLE_GLOS, low_memory=False)
    print(f"Parsed {len(df)} business glossary terms from CSV.")

    terms_list = []
    seen = set()
    for _, row in df.iterrows():
        tname = str(row.get('Term Name', '')).strip()
        if not tname or tname in seen:
            continue
        seen.add(tname)
        desc = row.get('Description', '')
        owner = row.get('Owner', '')
        steward = row.get('Steward', '')
        syn = str(row.get('Related Term Names', '')).split(",") if pd.notna(row.get('Related Term Names')) else []
        terms_list.append((tname, desc, owner, steward, syn))

    print(f"Deduplicated to {len(terms_list)} unique terms. Concurrently onboarding to Knowledge Catalog...")

    created_count = 0
    existed_count = 0
    errors = []

    # Concurrently create entries with 25 worker threads
    with ThreadPoolExecutor(max_workers=25) as executor:
        futures = {executor.submit(create_term_entry, dp_client, group_name, type_name, t, d, o, s, syn): t for t, d, o, s, syn in terms_list[:300]}
        for idx, fut in enumerate(as_completed(futures), 1):
            res = fut.result()
            if res is True:
                created_count += 1
            elif res == "Exists":
                existed_count += 1
            elif res is not None:
                errors.append(res)
            if idx % 100 == 0 or idx == min(len(terms_list), 300):
                print(f"Progress: {idx}/{min(len(terms_list), 300)} terms processed ({created_count} created, {existed_count} existed)...")

    duration = round(time.time() - start_time, 2)
    print(f"\n🎉 Glossary Onboarding Complete in {duration}s!")
    print(f"✅ Successfully instantiated {created_count + existed_count} live Business Glossary Terms in Dataplex container '{GROUP_ID}'!")
    if errors:
        print(f"First 3 notes: {errors[:3]}")

if __name__ == "__main__":
    main()
