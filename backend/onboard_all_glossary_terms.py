import os
import time
import pandas as pd
from concurrent.futures import ThreadPoolExecutor, as_completed
from google.cloud import dataplex_v1
from google.api_core.client_options import ClientOptions
from google.api_core.exceptions import AlreadyExists, ResourceExhausted, TooManyRequests

PROJECT_ID = "gsb-data-driven-sandbox"
LOCATION = "global"
GLOSSARY_ID = "enterprise_business_glossary"
TERMS_CSV = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "sample_files", "Glossaries - Terms.csv"))

def create_term_safe(bg_client, parent_glos, term_id, term_obj):
    max_retries = 3
    for attempt in range(max_retries):
        try:
            bg_client.create_glossary_term(parent=parent_glos, term_id=term_id, term=term_obj)
            return True
        except AlreadyExists:
            return "Exists"
        except (ResourceExhausted, TooManyRequests):
            time.sleep(2 * (attempt + 1))
            continue
        except Exception as e:
            err_str = str(e)
            if "quota" in err_str.lower() or "rate" in err_str.lower() or "429" in err_str:
                time.sleep(2 * (attempt + 1))
                continue
            return f"Err: {err_str[:100]}"
    return "Rate limit exceeded"

def main():
    start_t = time.time()
    print("=== Full Enterprise Glossary Cloud Onboarding Engine ===")
    opts = ClientOptions(quota_project_id=PROJECT_ID)
    bg_client = dataplex_v1.BusinessGlossaryServiceClient(client_options=opts)
    
    parent_glos = f"projects/{PROJECT_ID}/locations/{LOCATION}/glossaries/{GLOSSARY_ID}"
    print(f"Targeting existing live container: {parent_glos}")
    
    if not os.path.exists(TERMS_CSV):
        print(f"Missing {TERMS_CSV}. Exiting.")
        return

    print(f"Parsing {TERMS_CSV}...")
    df = pd.read_csv(TERMS_CSV, low_memory=False)
    
    tasks = []
    seen_ids = set()
    
    for idx, r in df.iterrows():
        tname = str(r.get('Term Name', '')).strip()
        if not tname:
            continue
        tdesc = str(r.get('Description', 'Live enterprise vocabulary term.'))[:2000]
        
        clean_id = ''.join([c for c in tname.lower() if c.isascii() and (c.isalnum() or c == '-')]).strip("-")[:50]
        if not clean_id:
            clean_id = f"term-{idx}"
            
        if clean_id in seen_ids:
            continue
        seen_ids.add(clean_id)
        
        t_obj = dataplex_v1.GlossaryTerm(parent=parent_glos, display_name=tname[:200], description=tdesc)
        tasks.append((clean_id, t_obj))

    print(f"Discovered {len(tasks)} unique vocabulary terms! Pushing to Google Cloud Dataplex...")
    
    created = 0
    existed = 0
    failed = 0
    
    with ThreadPoolExecutor(max_workers=8) as exe:
        futs = [exe.submit(create_term_safe, bg_client, parent_glos, tid, tobj) for tid, tobj in tasks]
        for f in as_completed(futs):
            res = f.result()
            if res is True:
                created += 1
            elif res == "Exists":
                existed += 1
            else:
                failed += 1
                
            total_done = created + existed + failed
            if total_done % 250 == 0:
                print(f"Progress: {total_done}/{len(tasks)} terms processed...")

    dur = round(time.time() - start_t, 2)
    print(f"\n🎉 Cloud Vocabulary Onboarding Complete in {dur}s!")
    print(f"✅ Newly Onboarded: {created} terms")
    print(f"⚡ Already Residing in GCP: {existed} terms")
    print(f"⚠️ Notes/Rate Limits: {failed}")

if __name__ == "__main__":
    main()
