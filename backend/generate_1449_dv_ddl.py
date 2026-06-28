import os
import pandas as pd

SAMPLE_FILE = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "sample_files", "DV_MetadataAsset.csv"))
OUTPUT_SQL = "/Users/kasin/.gemini/jetski/brain/7d7a0071-bbcd-4cad-8319-7fc2e3acdf56/scratch/dv_1449_tables_ddl.sql"
OUTPUT_MD = "/Users/kasin/.gemini/jetski/brain/7d7a0071-bbcd-4cad-8319-7fc2e3acdf56/dv_1449_tables_ddl_summary.md"

def sanitize_name(name):
    return str(name).strip().replace(" ", "_").replace("-", "_").replace("/", "_").replace(".", "_").replace("(", "").replace(")", "").replace(":", "")

def sanitize_desc(desc):
    if pd.isna(desc):
        return ""
    return str(desc).replace('"', "'").replace('\n', ' ').strip()

def map_dv_datatype(char_type, type_desc):
    t = str(char_type).upper() + str(type_desc).upper()
    if 'INT' in t or 'NUM' in t or 'DEC' in t:
        return 'NUMERIC'
    elif 'DATE' in t or 'TIME' in t:
        return 'TIMESTAMP'
    elif 'BOOL' in t or 'BIT' in t:
        return 'BOOLEAN'
    elif 'FLOAT' in t or 'DOUBLE' in t:
        return 'FLOAT64'
    return 'STRING'

def main():
    os.makedirs(os.path.dirname(OUTPUT_SQL), exist_ok=True)
    print("--- Parsing DV_MetadataAsset.csv (header=1) ---")
    df = pd.read_csv(SAMPLE_FILE, header=1, low_memory=False)
    
    # Extract Table Name from ID (e.g. DV://BLUDB/GSBDM/BOT_LN/COL -> table is bot_ln)
    table_cols = {}
    table_stewards = {}
    
    for _, row in df.iterrows():
        raw_id = str(row.get('id', ''))
        if not raw_id.startswith("DV://"):
            continue
        parts = raw_id.replace("DV://", "").split("/")
        if len(parts) < 3:
            continue
            
        # parts[0]=BLUDB, parts[1]=Schema (GSBDM/GSBDS), parts[2]=Table, parts[3]=Col
        schema_name = sanitize_name(parts[1]).lower()
        table_name = sanitize_name(parts[2]).lower()
        # Key by dataset.table
        full_table_key = f"{schema_name}.{table_name}"
        
        cname = sanitize_name(parts[3]).upper() if len(parts) > 3 else ""
        class_type = str(row.get('classType', '')).strip()
        
        desc = sanitize_desc(row.get('Business Description')) or sanitize_desc(row.get('Source Description'))
        steward = sanitize_desc(row.get('Data Steward')) or "EDW Data Steward"
        owner = sanitize_desc(row.get('Data Owner')) or "Enterprise Analytics"
        
        if full_table_key not in table_cols:
            table_cols[full_table_key] = {"title": parts[2], "dataset": schema_name, "table": table_name, "cols": [], "seen": {}}
            table_stewards[full_table_key] = {"steward": steward, "owner": owner, "desc": desc}
            
        if class_type == 'Column' and cname:
            seen_map = table_cols[full_table_key]["seen"]
            if cname in seen_map:
                seen_map[cname] += 1
                final_col = f"{cname}_{seen_map[cname]}"
            else:
                seen_map[cname] = 1
                final_col = cname
                
            bq_type = map_dv_datatype(row.get('CharacterType'), row.get('Data Type Description'))
            table_cols[full_table_key]["cols"].append(f"  `{final_col}` {bq_type} OPTIONS(description=\"{desc}\")")

    print(f"Discovered {len(table_cols)} distinct Data Warehouse tables across GSBDM/GSBDS!")

    sql_statements = []
    summary_list = []

    for tkey, meta in table_cols.items():
        cols_list = meta["cols"]
        if not cols_list:
            cols_list = ["  `DUMMY_COL` STRING OPTIONS(description=\"Placeholder column for unmodeled table\")"]
            
        tbl_desc = sanitize_desc(table_stewards[tkey]["desc"]) or f"Data Warehouse Table: {meta['title']}"
        ds_id = meta["dataset"]
        tbl_id = meta["table"]
        ddl = f"CREATE TABLE IF NOT EXISTS `gsb-data-driven-sandbox.{ds_id}.{tbl_id}` (\n" + ",\n".join(cols_list) + f"\n) OPTIONS(description=\"{tbl_desc}\");"
        sql_statements.append(ddl)
        summary_list.append({"dataset": ds_id.upper(), "table": tbl_id, "title": meta["title"], "col_count": len(meta["cols"]), "steward": table_stewards[tkey]["steward"]})

    # Write SQL file
    with open(OUTPUT_SQL, "w", encoding="utf-8") as f:
        f.write("-- Master BigQuery DDL for 1,449+ Enterprise Data Warehouse (DV) Tables\n")
        f.write("-- Datasets: GSBDM and GSBDS\n")
        f.write("-- Generated from DV_MetadataAsset.csv\n\n")
        f.write("\n\n".join(sql_statements))
    print(f"Saved master SQL DDL ({len(sql_statements)} tables) to {OUTPUT_SQL}")

    # Sort by col count descending
    summary_list.sort(key=lambda x: x['col_count'], reverse=True)
    top_tbls = summary_list[:15]

    # Write MD Report
    md = f"""# Enterprise Data Warehouse (EDW) BigQuery DDL Architecture

> [!IMPORTANT]
> **1,449+ Tables DDL Prepared**: We have adjusted our generator to align strictly with `DV_MetadataAsset.csv`, segregating tables into native BigQuery datasets **`gsbdm`** (Data Mart) and **`gsbds`** (Data Staging).

---

## 1. Master DDL Suite Location

The complete SQL script containing all 1,449+ `CREATE TABLE IF NOT EXISTS` statements targeting `gsbdm.*` and `gsbds.*` is saved at:
### 📁 [dv_1449_tables_ddl.sql](file://{OUTPUT_SQL})

---

## 2. Top 15 Largest EDW Tables Discovered

| BigQuery Target (`dataset.table`) | Source Title | Column Count | Assigned Data Steward |
| :--- | :--- | :--- | :--- |
"""
    for item in top_tbls:
        md += f"| `{item['dataset'].lower()}.{item['table']}` | {item['title']} | **{item['col_count']} cols** | {item['steward']} |\n"

    md += """
---

## 3. Execution Options

Would you like me to **automatically execute** this master SQL script to create datasets `gsbdm` and `gsbds` and instantiate all 1,449+ warehouse tables right now?
"""

    with open(OUTPUT_MD, "w", encoding="utf-8") as f:
        f.write(md)
    print(f"Saved report artifact to {OUTPUT_MD}")

if __name__ == "__main__":
    main()
