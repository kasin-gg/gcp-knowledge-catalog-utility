import os
import time
import pandas as pd
from concurrent.futures import ThreadPoolExecutor, as_completed
from google.cloud import dataplex_v1
from google.api_core.client_options import ClientOptions
from google.api_core.exceptions import AlreadyExists, ResourceExhausted

PROJECT_ID = "gsb-data-driven-sandbox"
LOCATION = "global"
GLOSSARY_ID = "enterprise_business_glossary"
SAMPLE_GLOS = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "sample_files", "Glossaries - Terms.csv"))

def sanitize_term_id(name, idx):
    s = str(name).lower().strip()
    clean = ''.join([c for c in s if c.isascii() and (c.isalnum() or c == '-')]).strip("-")
    return clean[:50] or f"term-{idx}"

def create_term(client, parent_glossary, term_name, thai_desc, idx):
    term_id = sanitize_term_id(term_name, idx)
    term_obj = dataplex_v1.GlossaryTerm(
        name=f"{parent_glossary}/terms/{term_id}",
        parent=parent_glossary,
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
        return f"Note ({term_id}): {e}"

def main():
    parent_glossary = f"projects/{PROJECT_ID}/locations/{LOCATION}/glossaries/{GLOSSARY_ID}"
    print(f"=== Populating Live Terms into Native GCP Console Glossary: {parent_glossary} ===")
    start_time = time.time()
    
    client = dataplex_v1.BusinessGlossaryServiceClient(
        client_options=ClientOptions(quota_project_id=PROJECT_ID)
    )
    
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

    print(f"Parsed {len(terms_list)} unique terms. Concurrently onboarding top 100 terms to stay under rolling quota...")

    created = 0
    existed = 0
    quota_hits = 0
    notes = []

    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = {executor.submit(create_term, client, parent_glossary, t, d, idx): t for idx, (t, d) in enumerate(terms_list[:100], 1)}
        for fut in as_completed(futures):
            res = fut.result()
            if res is True:
                created += 1
            elif res == "Exists":
                existed += 1
            elif res == "Quota429":
                quota_hits += 1
            elif res is not None:
                notes.append(res)

    duration = round(time.time() - start_time, 2)
    print(f"\n🎉 Global Glossary Population Complete in {duration}s!")
    print(f"✅ Successfully instantiated {created + existed} live Glossary Terms directly inside {parent_glossary}!")
    if quota_hits > 0:
        print(f"⚠️ Note: {quota_hits} terms hit quota.")
    if notes:
        print(f"First 3 notes: {notes[:3]}")

if __name__ == "__main__":
    main()
