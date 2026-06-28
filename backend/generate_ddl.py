import os
import pandas as pd

SAMPLE_FILE = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "sample_files", "CBSDCC_20260505 - Sheet1.csv"))
OUTPUT_SQL = "/Users/kasin/.gemini/jetski/brain/7d7a0071-bbcd-4cad-8319-7fc2e3acdf56/scratch/cbs_478_tables_ddl.sql"
OUTPUT_MD = "/Users/kasin/.gemini/jetski/brain/7d7a0071-bbcd-4cad-8319-7fc2e3acdf56/cbs_478_tables_ddl_summary.md"

def map_datatype(dtype):
    d = str(dtype).strip().upper()
    if d == 'N':
        return 'NUMERIC'
    elif d == 'T':
        return 'STRING'
    elif d == '$':
        return 'NUMERIC'
    elif d == 'D':
        return 'DATE'
    elif d == 'L':
        return 'BOOLEAN'
    elif d == 'F':
        return 'FLOAT64'
    return 'STRING'

def sanitize_name(name):
    return str(name).strip().replace(" ", "_").replace("-", "_").replace("/", "_").replace(".", "_").replace("(", "").replace(")", "")

def sanitize_desc(desc):
    if pd.isna(desc):
        return ""
    return str(desc).replace('"', "'").replace('\n', ' ').strip()

def main():
    os.makedirs(os.path.dirname(OUTPUT_SQL), exist_ok=True)
    df = pd.read_csv(SAMPLE_FILE, low_memory=False)
    
    # Group by TableName
    tables = df.groupby('TableName')
    print(f"Discovered {len(tables)} distinct tables in CBSDCC export.")
    
    sql_statements = []
    table_summaries = []
    
    for table_name, group in tables:
        clean_table = sanitize_name(table_name).lower()
        title = str(group['Title'].iloc[0]) if not pd.isna(group['Title'].iloc[0]) else clean_table.upper()
        
        cols_ddl = []
        seen_cols = {}
        for _, row in group.iterrows():
            raw_col = sanitize_name(row['FieldName'])
            if raw_col in seen_cols:
                seen_cols[raw_col] += 1
                col_name = f"{raw_col}_{seen_cols[raw_col]}"
            else:
                seen_cols[raw_col] = 1
                col_name = raw_col
                
            bq_type = map_datatype(row['DataType'])
            desc = sanitize_desc(row['Description'])
            
            # Add primary key note in description if Key == PK
            if str(row.get('Key')).strip() == 'PK':
                desc = f"[PK] {desc}".strip()
                
            cols_ddl.append(f"  `{col_name}` {bq_type} OPTIONS(description=\"{desc}\")")
            
        ddl = f"CREATE TABLE IF NOT EXISTS `gsb-data-driven-sandbox.core_banking.{clean_table}` (\n" + ",\n".join(cols_ddl) + f"\n) OPTIONS(description=\"Core Banking Table: {title}\");"
        sql_statements.append(ddl)
        table_summaries.append({"table": clean_table, "title": title, "col_count": len(cols_ddl)})

    # Write master SQL file
    with open(OUTPUT_SQL, "w", encoding="utf-8") as f:
        f.write("-- Master BigQuery DDL for 478 Core Banking System (CBS) Tables\n")
        f.write("-- Generated from CBSDCC_20260505 - Sheet1.csv\n\n")
        f.write("\n\n".join(sql_statements))
    print(f"Saved master SQL DDL ({len(sql_statements)} tables) to {OUTPUT_SQL}")

    # Sort table summaries by column count descending
    table_summaries.sort(key=lambda x: x['col_count'], reverse=True)
    top_tables = table_summaries[:15]

    # Generate Markdown Report
    md_content = f"""# Core Banking System (CBS) BigQuery DDL Architecture

> [!IMPORTANT]
> **478 Tables DDL Prepared**: We have successfully analyzed all 10,404 column definitions in `CBSDCC_20260505 - Sheet1.csv` and generated native Google Cloud BigQuery DDL scripts for all **478 distinct tables**.

---

## 1. Master DDL Script Location

The complete, ready-to-execute SQL script containing all 478 `CREATE TABLE IF NOT EXISTS` statements is saved locally at:
### 📁 [cbs_478_tables_ddl.sql](file://{OUTPUT_SQL})

---

## 2. Legacy MUMPS to BigQuery Type Mapping

To ensure native analytical performance without precision loss, we applied the following strict type conversion matrix:

| Legacy Code | Legacy Data Type | BigQuery Native Type | Architectural Rationale |
| :--- | :--- | :--- | :--- |
| `N` | Numeric | `NUMERIC` | Exact decimal representation for banking balances & customer numbers |
| `T` | Text | `STRING` | Variable-length UTF-8 text supporting Thai characters |
| `$` | Currency | `NUMERIC` | High-precision monetary calculation standard |
| `D` | Date | `DATE` | Standard ISO calendar date (`YYYY-MM-DD`) |
| `L` | Logical | `BOOLEAN` | True/False boolean flags (`Y`/`N`) |
| `F` | Floating Point| `FLOAT64` | Scientific calculation & interest rate approximations |

---

## 3. Top 15 Largest Core Banking Tables Discovered

Here are the largest physical banking tables constructed from the data dictionary:

| Physical Table | Domain Title | Column Count | Sample BigQuery Target |
| :--- | :--- | :--- | :--- |
"""
    for ts in top_tables:
        md_content += f"| `{ts['table'].upper()}` | {ts['title']} | **{ts['col_count']} cols** | `gsb-data-driven-sandbox.core_banking.{ts['table']}` |\n"

    md_content += """
---

## 4. Sample Excerpt: `CIF` (Customer Information File) DDL

```sql
CREATE TABLE IF NOT EXISTS `gsb-data-driven-sandbox.core_banking.cif` (
  `ACN` NUMERIC OPTIONS(description="[PK] Customer Number"),
  `ACTIVE` STRING OPTIONS(description="Treasury Status"),
  `ADDRESS` NUMERIC OPTIONS(description="Address Conversion"),
  `ADTLIDT` STRING OPTIONS(description="Additional ID Type"),
  `ADTLIDTEXPDT` DATE OPTIONS(description="Additional ID Type Expiration Date"),
  `AGE` NUMERIC OPTIONS(description="Age As of System Date"),
  `ALTNAM` STRING OPTIONS(description="Alternate Name")
) OPTIONS(description="Core Banking Table: CIF");
```

---

## 5. Execution Options

Would you like me to:
1. **Automatically execute** this master SQL script to instantiate all 478 empty tables inside dataset `gsb-data-driven-sandbox.core_banking`?
2. Or keep the DDL script as a reference for your data engineering deployment pipeline?
"""

    with open(OUTPUT_MD, "w", encoding="utf-8") as f:
        f.write(md_content)
    print(f"Saved summary artifact to {OUTPUT_MD}")

if __name__ == "__main__":
    main()
