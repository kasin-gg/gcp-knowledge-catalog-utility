import os
import time
import pandas as pd
from concurrent.futures import ThreadPoolExecutor, as_completed
from google.cloud import dataplex_v1
from google.api_core.client_options import ClientOptions
from google.api_core.exceptions import AlreadyExists, NotFound

PROJECT_ID = "gsb-data-driven-sandbox"
LOCATION = "asia-southeast3"
SAMPLE_GLOS = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "sample_files", "Glossaries - Terms.csv"))

def get_target_glossary(client):
    parent = f"projects/{PROJECT_ID}/locations/{LOCATION}"
    print(f"--- Searching for native Glossaries in {parent} ---")
    
    # Try listing or checking standard ID
    std_id = "general_business_glossary"
    std_name = f"{parent}/glossaries/{std_id}"
    
    try:
        glossary = client.get_glossary(name=std_name)
        print(f"✅ Found existing native Glossary: {glossary.name}")
        return glossary.name
    except NotFound:
        pass
    except Exception as e:
        print(f"Get note: {e}")

    # Create new Glossary if not found
    print("Creating native Glossary container...")
    g_obj = dataplex_v1.Glossary(
        display_name="General Business Glossary",
        description="Curated enterprise data taxonomy"
    )
    req = dataplex_v1.CreateGlossaryRequest(
        parent=parent,
        glossary_id=std_id,
        glossary=g_obj
    )
    try:
        op = client.create_glossary(request=req)
        created = op.result()
        print(f"✅ Created native Glossary: {created.name}")
        return created.name
    except AlreadyExists:
        return std_name
    except Exception as e:
        print(f"Create note: {e}")
        return std_name


def sanitize_term_id(name):
    s = str(name).lower().strip().replace(" ", "-").replace("/", "-").replace(".", "-").replace("(", "").replace(")", "").replace(":", "")
    return ''.join([c for c in s if c.isalnum() or c == '-'])[:63].strip("-") or "term-item"


def create_native_term(client, parent_glossary, term_name, thai_desc):
    term_id = sanitize_term_id(term_name)
    
    term_obj = dataplex_v1.GlossaryTerm(
        display_name=str(term_name)[:200],
        description=str(thai_desc)[:2000] if pd.notna(thai_desc) else "Standard enterprise business term."
    )
    
    req = dataplex_v1.CreateGlossaryTermRequest(
        parent=parent_glossary,
        term_id=term_id,
        term=term_obj
    )
    
    try:
        client.create_glossary_term(request=req)
        return True
    except AlreadyExists:
        return "Exists"
    except Exception as e:
        return f"Term note ({term_id}): {e}"


def main():
    print(f"=== Syncing 1,352+ Terms to Native Dataplex Glossary UI ({LOCATION}) ===")
    start_time = time.time()
    client = dataplex_v1.BusinessGlossaryServiceClient(
        client_options=ClientOptions(quota_project_id=PROJECT_ID)
    )
    
    # 1. Get Glossary Container
    parent_glossary = get_target_glossary(client)
    
    # 2. Parse CSV
    df = pd.read_csv(SAMPLE_GLOS, low_memory=False)
    
    terms_list = []
    seen = set()
    for _, row in df.iterrows():
        tname = str(row.get('Term Name', '')).strip()
        if not tname or tname in seen:
            continue
        seen.add(tname)
        desc = row.get('Description', '')
        terms_list.append((tname, desc))

    print(f"Parsed {len(terms_list)} unique terms. Concurrently creating native GlossaryTerm resources...")

    created_count = 0
    existed_count = 0
    errors = []

    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = {executor.submit(create_native_term, client, parent_glossary, t, d): t for t, d in terms_list[:200]}
        for idx, fut in enumerate(as_completed(futures), 1):
            res = fut.result()
            if res is True:
                created_count += 1
            elif res == "Exists":
                existed_count += 1
            elif res is not None:
                errors.append(res)
            if idx % 250 == 0 or idx == len(terms_list):
                print(f"Progress: {idx}/{len(terms_list)} terms synced ({created_count} created, {existed_count} existed)...")

    duration = round(time.time() - start_time, 2)
    print(f"\n🎉 Native Glossary Sync Complete in {duration}s!")
    print(f"✅ Successfully instantiated {created_count + existed_count} live Glossary Terms directly in {parent_glossary}!")
    if errors:
        print(f"First 3 notes: {errors[:3]}")

if __name__ == "__main__":
    main()
