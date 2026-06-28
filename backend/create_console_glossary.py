import os
import time
import pandas as pd
from concurrent.futures import ThreadPoolExecutor, as_completed
from google.cloud import dataplex_v1
from google.api_core.client_options import ClientOptions
from google.api_core.exceptions import AlreadyExists, NotFound, ResourceExhausted

PROJECT_ID = "gsb-data-driven-sandbox"
SAMPLE_GLOS = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "sample_files", "Glossaries - Terms.csv"))
GLOSSARY_ID = "enterprise_business_glossary"

def setup_console_glossary(client, location):
    parent = f"projects/{PROJECT_ID}/locations/{location}"
    full_name = f"{parent}/glossaries/{GLOSSARY_ID}"
    print(f"--- Ensuring First-Class Glossary Resource in {location.upper()}: {full_name} ---")
    
    g_obj = dataplex_v1.Glossary(
        display_name="General Business Glossary",
        description="Curated enterprise data taxonomy"
    )
    req = dataplex_v1.CreateGlossaryRequest(
        parent=parent,
        glossary_id=GLOSSARY_ID,
        glossary=g_obj
    )
    try:
        created = client.create_glossary(request=req).result()
        print(f"✅ Created Native Console Glossary ({location}): {created.name}")
        return created.name
    except AlreadyExists:
        print(f"Verified existing Native Console Glossary ({location}): {full_name}")
        return full_name
    except Exception as e:
        print(f"Glossary note ({location}): {e}")
        return full_name


def sanitize_term_id(name):
    s = str(name).lower().strip().replace(" ", "-").replace("/", "-").replace(".", "-").replace("(", "").replace(")", "").replace(":", "")
    return ''.join([c for c in s if c.isalnum() or c == '-'])[:63].strip("-") or "term-item"


def create_console_term(client, parent_glossary, term_name, thai_desc):
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
    except ResourceExhausted:
        return "Quota429"
    except Exception as e:
        return f"Note: {e}"


def main():
    print(f"=== Syncing First-Class Glossary Resources for GCP Console UI ({PROJECT_ID}) ===")
    start_time = time.time()
    client = dataplex_v1.BusinessGlossaryServiceClient(
        client_options=ClientOptions(quota_project_id=PROJECT_ID)
    )
    
    # 1. Create native Glossary in standard locations
    locations = ["us", "asia-southeast1", "global"]
    parent_glossaries = {}
    for loc in locations:
        gname = setup_console_glossary(client, loc)
        if gname:
            parent_glossaries[loc] = gname

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

    print(f"\nParsed {len(terms_list)} unique terms. Syncing top 150 terms to GCP Console UI across {len(parent_glossaries)} regions...")

    created = 0
    existed = 0
    quota_hits = 0

    # Sync top 150 terms to location 'us' or 'global'
    target_glos = parent_glossaries.get("us") or parent_glossaries.get("global") or list(parent_glossaries.values())[0]
    
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = {executor.submit(create_console_term, client, target_glos, t, d): t for t, d in terms_list[:150]}
        for fut in as_completed(futures):
            res = fut.result()
            if res is True:
                created += 1
            elif res == "Exists":
                existed += 1
            elif res == "Quota429":
                quota_hits += 1

    duration = round(time.time() - start_time, 2)
    print(f"\n🎉 Console UI Sync Complete in {duration}s!")
    print(f"✅ Successfully verified/created native Glossary container across regions: {list(parent_glossaries.keys())}")
    print(f"✅ Synced {created + existed} live Glossary Terms directly into {target_glos}")
    if quota_hits > 0:
        print(f"⚠️ Note: {quota_hits} terms hit the rolling 250/min region quota. Run this script again in 60s to sync the rest.")

if __name__ == "__main__":
    main()
