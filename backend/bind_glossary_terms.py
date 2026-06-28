import os
import time
import pandas as pd
from concurrent.futures import ThreadPoolExecutor, as_completed
from google.cloud import dataplex_v1
from google.api_core.client_options import ClientOptions
from google.api_core.exceptions import AlreadyExists

PROJECT_ID = "gsb-data-driven-sandbox"
LOCATION = "us"
GLOSSARY_ID = "enterprise_business_glossary"
DV_CSV = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "sample_files", "DV_MetadataAsset.csv"))

def get_dp_client():
    opts = ClientOptions(quota_project_id=PROJECT_ID)
    return dataplex_v1.CatalogServiceClient(client_options=opts)

def harvest_live_term_entries(dp_client):
    print("Harvesting live Business Glossary Catalog Entries from Google Cloud...")
    term_entry_map = {}
    search_req = dataplex_v1.SearchEntriesRequest(
        name=f"projects/{PROJECT_ID}/locations/global",
        query="glossary OR entry_group:enterprise_business_glossary",
        page_size=100
    )
    for page in dp_client.search_entries(request=search_req).pages:
        for item in page.results:
            entry = item.dataplex_entry
            display = entry.entry_source.display_name if entry.entry_source else entry.name.split("/")[-1]
            term_entry_map[display.lower().strip()] = entry.name
            clean_id = entry.name.split("/")[-1].lower().replace("-", " ")
            term_entry_map[clean_id] = entry.name
    print(f"Discovered {len(term_entry_map)} live Glossary Catalog Entries in GCP.")
    return term_entry_map

def bind_column_link(dp_client, table_entry_uri, col_name, term_entry_uri, link_id_clean):
    parent_group = f"projects/{PROJECT_ID}/locations/{LOCATION}/entryGroups/@bigquery"
    
    # Try fully qualified regional link type URIs
    link_types_to_try = [
        f"projects/{PROJECT_ID}/locations/{LOCATION}/entryLinkTypes/definition",
        f"projects/{PROJECT_ID}/locations/{LOCATION}/entryLinkTypes/glossary-term",
        f"projects/{PROJECT_ID}/locations/global/entryLinkTypes/definition",
        f"projects/{PROJECT_ID}/locations/global/entryLinkTypes/glossary-term"
    ]
    
    for ltype in link_types_to_try:
        link_obj = dataplex_v1.EntryLink(
            entry_link_type=ltype,
            entry_references=[
                dataplex_v1.EntryLink.EntryReference(name=table_entry_uri, path=f"schema.fields.{col_name}", type_="SOURCE"),
                dataplex_v1.EntryLink.EntryReference(name=term_entry_uri, type_="TARGET")
            ]
        )
        req = dataplex_v1.CreateEntryLinkRequest(
            parent=parent_group,
            entry_link_id=link_id_clean[:63],
            entry_link=link_obj
        )
        try:
            dp_client.create_entry_link(request=req)
            return True, ltype
        except AlreadyExists:
            return "Exists", ltype
        except Exception as e:
            err_str = str(e)
            if "not found" in err_str.lower() or "invalid" in err_str.lower():
                continue
            return f"Err ({col_name}): {err_str}", ltype
    return "Failed all link types", None

def main():
    start_t = time.time()
    print("=== Automated BigQuery Column to Business Glossary Binding Engine ===")
    dp_client = get_dp_client()
    
    term_entry_map = harvest_live_term_entries(dp_client)
    if not term_entry_map:
        print("No live term entries found. Exiting.")
        return

    print(f"Parsing {DV_CSV} for physical column to glossary matches...")
    df = pd.read_csv(DV_CSV, low_memory=False, skiprows=1) # skip header=1 row
    
    bindings_to_run = []
    seen_links = set()
    
    for _, row in df.iterrows():
        raw_id = str(row.get('id', '')).strip()
        term_name = str(row.get('Source Description', '')).strip()
        
        if not raw_id.startswith("DV://BLUDB/") or not term_name:
            continue
            
        term_key = term_name.lower().strip()
        if term_key not in term_entry_map:
            continue
            
        term_entry_uri = term_entry_map[term_key]
        parts = raw_id.split("/")
        if len(parts) < 6:
            continue
            
        dataset = parts[3].lower()
        t_name = parts[4].lower()
        col_name = parts[5].lower()
        
        table_entry_uri = f"projects/{PROJECT_ID}/locations/{LOCATION}/entryGroups/@bigquery/entries/bigquery.googleapis.com/projects/{PROJECT_ID}/datasets/{dataset}/tables/{t_name}"
        link_id = f"l-{dataset[:5]}-{t_name[:20]}-{col_name[:25]}".replace("_", "-")
        
        if link_id in seen_links:
            continue
        seen_links.add(link_id)
        bindings_to_run.append((table_entry_uri, col_name, term_entry_uri, link_id, term_name))

    print(f"Discovered {len(bindings_to_run)} exact physical column to glossary matches! Executing top 40 live bindings...")
    
    success = 0
    existed = 0
    notes = []
    winning_ltype = None
    
    with ThreadPoolExecutor(max_workers=10) as exe:
        futs = {exe.submit(bind_column_link, dp_client, t_uri, col, term, lid): (col, term_name) for t_uri, col, term, lid, term_name in bindings_to_run[:40]}
        for f in as_completed(futs):
            col, tname = futs[f]
            res, ltype = f.result()
            if res is True:
                success += 1
                winning_ltype = ltype
            elif res == "Exists":
                existed += 1
                winning_ltype = ltype
            else:
                notes.append(res)

    dur = round(time.time() - start_t, 2)
    print(f"\n🎉 Glossary Binding Complete in {dur}s!")
    print(f"✅ Successfully bound {success + existed} physical BigQuery columns to live Glossary Terms!")
    if winning_ltype:
        print(f"🏆 Winning EntryLink Type: {winning_ltype}")
    if notes:
        print(f"First 3 notes: {notes[:3]}")

if __name__ == "__main__":
    main()
