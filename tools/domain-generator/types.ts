/**
 * Types for the domain config generator.
 */

/** Elasticsearch field mapping */
export interface ESFieldMapping {
  type?: string;
  properties?: Record<string, ESFieldMapping>;
  fields?: Record<string, ESFieldMapping>;
  analyzer?: string;
  format?: string;
  ignore_above?: number;
}

/** Elasticsearch index mapping response */
export interface ESMappingResponse {
  [indexName: string]: {
    mappings: {
      properties: Record<string, ESFieldMapping>;
    };
  };
}

/** Resolved field after flattening nested objects */
export interface ResolvedField {
  /** Dot-path name in ES (e.g., "location.city") */
  esPath: string;
  /** camelCase name for TypeScript (e.g., "locationCity") */
  tsName: string;
  /** Human-readable label (e.g., "Location City") */
  label: string;
  /** Resolved ES type */
  esType: 'keyword' | 'text' | 'integer' | 'long' | 'float' | 'double' | 'date' | 'boolean' | 'geo_point' | 'object';
  /** Has .keyword sub-field (text fields with keyword mapping) */
  hasKeywordSubfield: boolean;
  /** Whether this field is filterable */
  filterable: boolean;
  /** Filter UI type */
  filterType: 'multiselect' | 'autocomplete' | 'range' | 'daterange' | 'boolean' | 'text' | null;
  /** Whether this field should appear in table */
  visible: boolean;
  /** Whether this field is sortable */
  sortable: boolean;
  /** Whether this field can be aggregated (for charts) */
  aggregable: boolean;
  /** Whether this field supports highlighting (h_* params) */
  highlightable: boolean;
  /** Angular ResourceField type */
  resourceFieldType: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'select';
}

/** CLI options */
export interface GeneratorOptions {
  /** ES index name */
  index?: string;
  /** ES URL */
  esUrl?: string;
  /** Path to saved mapping JSON */
  mapping?: string;
  /** Domain name (snake-case, e.g., "automobile") */
  domain: string;
  /** Display label (e.g., "Automobile Discovery") */
  label: string;
  /** Primary key field in ES */
  dataKey: string;
  /** API base path */
  apiBase: string;
  /** Output directory */
  outdir: string;
  /** Fields to exclude from generation */
  exclude?: string[];
  /** Fields to force as non-filterable */
  noFilter?: string[];
  /** API probe mode: URL(s) to fetch sample data from */
  probeUrls?: string[];
  /** OpenAPI/Swagger spec URL or file path */
  openapi?: string;
  /** Saved API response JSON file(s) */
  samples?: string[];
}

// ============================================================================
// API Probe Types
// ============================================================================

/** Single API endpoint descriptor (from OpenAPI or manual) */
export interface ApiEndpointSpec {
  /** Full URL or path */
  path: string;
  /** HTTP method */
  method: 'GET' | 'POST';
  /** Discovered query parameters */
  queryParams: ApiParamSpec[];
  /** Sample response (first successful fetch) */
  sampleResponse?: any;
}

/** Query parameter discovered from OpenAPI or URL probing */
export interface ApiParamSpec {
  name: string;
  in: 'query' | 'path' | 'header';
  required: boolean;
  type: string;  // 'string' | 'integer' | 'number' | 'boolean' | 'array'
  description?: string;
  enum?: string[];
  format?: string;  // 'date', 'date-time', etc.
  default?: any;
  /** Where this param was discovered */
  source: 'openapi' | 'response-header' | 'link-header' | 'inferred';
}
