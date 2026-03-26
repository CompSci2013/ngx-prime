# Domain Config Generator

Generates a complete ngx-prime domain configuration from either an Elasticsearch index mapping or live API responses.

## Two Modes

### Mode 1: Elasticsearch Mapping

Best when you have direct access to the ES index. Types are exact.

```bash
./tools/domain-generator/run.sh \
  --index autos-vins \
  --es-url http://192.168.0.244:30398 \
  --domain automobile \
  --label "Vvroom Discovery" \
  --data-key vehicle_id
```

### Mode 2: API Response Probing

Best when you don't have ES access but can hit the API. Types are inferred from actual data values. Combine with an OpenAPI/Swagger spec for query parameter discovery.

```bash
# Probe a live endpoint
./tools/domain-generator/run.sh \
  --probe http://api.example.com/vehicles?page=1&size=100 \
  --domain vehicle \
  --label "Vehicle Discovery"

# Multiple probes (different filters → wider field coverage)
./tools/domain-generator/run.sh \
  --probe http://api.example.com/vehicles?category=plane&size=100 \
  --probe http://api.example.com/vehicles?category=automobile&size=100 \
  --openapi http://api.example.com/swagger.json \
  --domain vehicle

# From saved JSON files (e.g., curl output)
./tools/domain-generator/run.sh \
  --sample responses/page1.json \
  --sample responses/page2.json \
  --openapi docs/openapi.json \
  --domain vehicle

# Mix everything: live probe + saved samples + OpenAPI
./tools/domain-generator/run.sh \
  --probe http://localhost:3000/api/search?size=100 \
  --sample extra-records.json \
  --openapi http://localhost:3000/api-docs \
  --domain mydata
```

## Options

```
Mode 1 (ES):
  --index <name>       Elasticsearch index name (fetches mapping automatically)
  --es-url <url>       Elasticsearch URL
  --mapping <path>     Path to saved ES mapping JSON (alternative to --index)

Mode 2 (API):
  --probe <url>        Live API endpoint to fetch (repeatable for wider coverage)
  --sample <path>      Saved JSON response file (repeatable)
  --openapi <path|url> OpenAPI/Swagger spec for parameter discovery

Common:
  --domain <name>      Domain name, kebab-case (required)
  --label <text>       Display label (default: "<Domain> Discovery")
  --data-key <field>   Primary key field (auto-detected in Mode 2)
  --api-base <path>    API base path (default: /api/v1/<domain>)
  --outdir <path>      Output directory (default: src/app/domain-config/<domain>)
  --exclude <fields>   Comma-separated fields to exclude
  --no-filter <fields> Comma-separated fields to mark as non-filterable
```

## What it generates

```
src/app/domain-config/<domain>/
├── <domain>.resource.ts              # ResourceDefinition (single source of truth)
├── <domain>.domain-config.ts         # DomainConfig factory + DI provider
├── models/
│   ├── <domain>.filters.ts           # Filter model class
│   ├── <domain>.data.ts              # Data result class
│   ├── <domain>.statistics.ts        # Statistics model class
│   └── index.ts
├── configs/
│   ├── <domain>.query-control-filters.ts
│   ├── <domain>.highlight-filters.ts
│   ├── <domain>.chart-configs.ts
│   └── index.ts
├── adapters/
│   ├── <domain>-cache-key-builder.ts
│   └── index.ts
├── chart-sources/
│   ├── <field>-chart-source.ts       # One per aggregable field
│   └── index.ts
└── index.ts
```

## How each mode infers field properties

### Mode 1 (ES Mapping)

| ES Type | Filterable | Filter UI | Chart | Table |
|---------|-----------|-----------|-------|-------|
| `keyword` | multiselect | Multiselect dialog | Bar chart (top N) | Visible, sortable |
| `text` | autocomplete | Autocomplete | No | Visible |
| `text` + `.keyword` | multiselect | Multiselect dialog | Bar chart | Visible, sortable |
| `integer`/`long` | range | Range dialog | Histogram | Visible, sortable |
| `date` | date range | Date range dialog | No | Visible, sortable |
| `boolean` | select | Yes/No dropdown | No | Visible |
| `geo_point` | — | — | — | Excluded |
| `object` | Flattened | Per-subfield | Per-subfield | Per-subfield |

### Mode 2 (API Response)

Types are inferred from actual values across all sample records:

| Inference | Rule |
|-----------|------|
| `keyword` | String field with <80% unique values (categorical) |
| `text` | String field with >80% unique values AND >50 char max length |
| `integer` | Number field where all values are integers |
| `double` | Number field with at least one non-integer |
| `date` | String matching date patterns (YYYY-MM-DD, ISO 8601, etc.) |
| `boolean` | Field with only true/false values |
| `ID field` | High cardinality + fixed length, or field name ends in `_id`/`Id` |

Cardinality drives filter type:
- **≤50 unique values** → multiselect + highlightable
- **>50 unique values** → autocomplete (not highlightable)
- **ID fields** → not filterable (primary key, registration numbers, etc.)

### OpenAPI parameter enrichment

When an OpenAPI spec is provided, the generator:
1. Extracts query parameters from all GET/POST endpoints
2. Merges `enum` values into field filter types (enum → multiselect)
3. Discovers filter-only parameters not present in response data (e.g., `search`, `dateFrom`)
4. Infers pagination params (`page`/`size`) from response shape (presence of `total`/`count` field)

## After generation

1. **Review generated files** — the generator makes reasonable defaults but you'll want to:
   - Adjust field labels (derived from snake_case field names)
   - Remove charts/filters for irrelevant fields (ID fields, serial numbers, etc.)
   - Tune chart colors and Plotly layouts
   - Customize `optionsTransformer` functions if your API response format differs
   - Add picker configs if your domain needs a multi-select table picker
2. **Add `DOMAIN_PROVIDER`** to your feature module's `providers` array
3. **Wire up feature routing** to your discover component
