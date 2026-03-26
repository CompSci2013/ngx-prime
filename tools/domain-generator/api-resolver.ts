/**
 * API Response Resolver
 *
 * Infers field types, filterability, and UI hints from:
 * 1. Live API responses (probed endpoints)
 * 2. Saved JSON response files
 * 3. OpenAPI/Swagger spec (for query parameter discovery)
 *
 * The key insight: API responses tell you what the data *actually* looks like,
 * which is more reliable than database schemas for UI generation. The gap is
 * knowing what parameters the API accepts — OpenAPI fills that.
 */

import * as http from 'http';
import * as https from 'https';
import * as fs from 'fs';
import { ResolvedField, ApiEndpointSpec, ApiParamSpec } from './types';
import { toCamelCase, toLabel } from './schema-resolver';

// ============================================================================
// Type Inference from Values
// ============================================================================

interface ValueProfile {
  types: Set<string>;
  sampleValues: any[];
  nullCount: number;
  totalCount: number;
  uniqueValues: Set<string>;
  minLength: number;
  maxLength: number;
  allIntegers: boolean;
  allNumbers: boolean;
  looksLikeDate: boolean;
  looksLikeId: boolean;
}

const DATE_PATTERNS = [
  /^\d{4}-\d{2}-\d{2}$/,                         // 2024-01-15
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/,              // 2024-01-15T10:30:00
  /^\d{4}\/\d{2}\/\d{2}$/,                        // 2024/01/15
  /^\d{2}\/\d{2}\/\d{4}$/,                        // 01/15/2024
  /^\w{3}\s\d{1,2},?\s\d{4}/,                     // Jan 15, 2024
];

const ID_PATTERNS = [
  /^[0-9a-f]{8}-[0-9a-f]{4}-/i,                   // UUID
  /^[A-Z0-9]{6,}$/,                               // Alphanumeric ID
  /_id$/,                                          // field name ends in _id
  /Id$/,                                           // field name ends in Id
];

function profileValues(values: any[]): ValueProfile {
  const profile: ValueProfile = {
    types: new Set(),
    sampleValues: values.slice(0, 10),
    nullCount: 0,
    totalCount: values.length,
    uniqueValues: new Set(),
    minLength: Infinity,
    maxLength: 0,
    allIntegers: true,
    allNumbers: true,
    looksLikeDate: true,
    looksLikeId: false,
  };

  for (const v of values) {
    if (v === null || v === undefined) {
      profile.nullCount++;
      continue;
    }

    const t = typeof v;
    profile.types.add(t);

    if (t === 'string') {
      profile.uniqueValues.add(v);
      profile.minLength = Math.min(profile.minLength, v.length);
      profile.maxLength = Math.max(profile.maxLength, v.length);
      profile.allIntegers = false;
      profile.allNumbers = false;

      if (profile.looksLikeDate && !DATE_PATTERNS.some(p => p.test(v))) {
        profile.looksLikeDate = false;
      }
    } else if (t === 'number') {
      profile.uniqueValues.add(String(v));
      if (!Number.isInteger(v)) profile.allIntegers = false;
    } else if (t === 'boolean') {
      profile.uniqueValues.add(String(v));
      profile.allIntegers = false;
      profile.allNumbers = false;
      profile.looksLikeDate = false;
    } else {
      // object/array — not a primitive leaf
      profile.allIntegers = false;
      profile.allNumbers = false;
      profile.looksLikeDate = false;
    }
  }

  if (profile.totalCount === profile.nullCount) {
    profile.looksLikeDate = false;
  }

  return profile;
}

function inferEsType(fieldName: string, profile: ValueProfile): ResolvedField['esType'] {
  if (profile.types.has('boolean')) return 'boolean';
  if (profile.types.has('number')) {
    return profile.allIntegers ? 'integer' : 'double';
  }
  if (profile.looksLikeDate) return 'date';
  if (profile.types.has('string')) {
    // High cardinality + long strings → text; low cardinality → keyword
    const ratio = profile.uniqueValues.size / Math.max(1, profile.totalCount - profile.nullCount);
    if (ratio > 0.8 && profile.maxLength > 50) return 'text';
    return 'keyword';
  }
  return 'text';
}

function looksLikeId(fieldName: string, profile: ValueProfile): boolean {
  if (ID_PATTERNS.some(p => p.test(fieldName))) return true;
  // High cardinality, fixed-length strings
  const ratio = profile.uniqueValues.size / Math.max(1, profile.totalCount - profile.nullCount);
  if (ratio > 0.95 && profile.minLength === profile.maxLength && profile.maxLength > 5) return true;
  return false;
}

// ============================================================================
// Flatten Nested Objects
// ============================================================================

function flattenRecords(records: any[], parentPath: string = ''): Map<string, any[]> {
  const columns = new Map<string, any[]>();

  for (const record of records) {
    if (!record || typeof record !== 'object') continue;
    flattenObject(record, parentPath, columns, records.length);
  }

  return columns;
}

function flattenObject(
  obj: any,
  parentPath: string,
  columns: Map<string, any[]>,
  totalRecords: number
): void {
  for (const [key, value] of Object.entries(obj)) {
    const path = parentPath ? `${parentPath}.${key}` : key;

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      // Nested object — recurse
      flattenObject(value, path, columns, totalRecords);
    } else if (Array.isArray(value)) {
      // Array — store as-is (treat as 'array' type)
      if (!columns.has(path)) columns.set(path, []);
      columns.get(path)!.push(value);
    } else {
      // Primitive leaf
      if (!columns.has(path)) columns.set(path, []);
      columns.get(path)!.push(value);
    }
  }
}

// ============================================================================
// OpenAPI Spec Parser
// ============================================================================

interface OpenApiSpec {
  paths?: Record<string, Record<string, OpenApiOperation>>;
  openapi?: string;
  swagger?: string;
}

interface OpenApiOperation {
  parameters?: OpenApiParameter[];
  responses?: Record<string, any>;
  summary?: string;
  description?: string;
}

interface OpenApiParameter {
  name: string;
  in: string;
  required?: boolean;
  schema?: { type?: string; format?: string; enum?: string[]; default?: any; items?: any };
  type?: string;  // Swagger 2.0
  format?: string;
  enum?: string[];
  description?: string;
  default?: any;
}

export function parseOpenApiSpec(specContent: string): ApiEndpointSpec[] {
  const spec: OpenApiSpec = JSON.parse(specContent);
  const endpoints: ApiEndpointSpec[] = [];

  if (!spec.paths) return endpoints;

  for (const [path, methods] of Object.entries(spec.paths)) {
    for (const [method, operation] of Object.entries(methods)) {
      if (method === 'get' || method === 'post') {
        const params: ApiParamSpec[] = [];

        for (const p of operation.parameters || []) {
          if (p.in === 'query' || p.in === 'path') {
            const schema = p.schema || {};
            params.push({
              name: p.name,
              in: p.in as 'query' | 'path',
              required: p.required || false,
              type: schema.type || p.type || 'string',
              description: p.description,
              enum: schema.enum || p.enum,
              format: schema.format || p.format,
              default: schema.default || p.default,
              source: 'openapi',
            });
          }
        }

        endpoints.push({
          path,
          method: method.toUpperCase() as 'GET' | 'POST',
          queryParams: params,
        });
      }
    }
  }

  return endpoints;
}

// ============================================================================
// HTTP Fetch
// ============================================================================

function fetchJson(url: string): Promise<{ body: any; headers: Record<string, string> }> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const headers: Record<string, string> = {};
        for (const [k, v] of Object.entries(res.headers)) {
          if (typeof v === 'string') headers[k] = v;
        }
        try {
          resolve({ body: JSON.parse(data), headers });
        } catch {
          reject(new Error(`Failed to parse JSON from ${url}: ${data.slice(0, 200)}`));
        }
      });
      res.on('error', reject);
    }).on('error', reject);
  });
}

// ============================================================================
// Parameter Discovery from Response Shape
// ============================================================================

/**
 * Infer likely query parameters from response structure.
 *
 * Common API conventions:
 * - Pagination: page/size, offset/limit, cursor
 * - Sorting: sort, sortBy, sortOrder, order_by
 * - If response has { total, data: [...] }, it's paginated
 * - If response has { results: [...], count }, it's paginated
 */
function inferPaginationParams(response: any): ApiParamSpec[] {
  const params: ApiParamSpec[] = [];
  const keys = Object.keys(response || {});

  const hasTotalField = keys.some(k =>
    ['total', 'totalResults', 'total_results', 'count', 'totalCount', 'total_count'].includes(k)
  );

  if (hasTotalField) {
    params.push(
      { name: 'page', in: 'query', required: false, type: 'integer', default: 1, source: 'inferred', description: 'Page number (inferred from paginated response)' },
      { name: 'size', in: 'query', required: false, type: 'integer', default: 20, source: 'inferred', description: 'Page size (inferred from paginated response)' },
    );
  }

  return params;
}

function inferSortParams(fields: ResolvedField[]): ApiParamSpec[] {
  const hasSortableFields = fields.some(f => f.sortable);
  if (!hasSortableFields) return [];

  return [
    { name: 'sortBy', in: 'query', required: false, type: 'string', source: 'inferred', description: 'Sort field (inferred from sortable fields)' },
    { name: 'sortOrder', in: 'query', required: false, type: 'string', enum: ['asc', 'desc'], default: 'asc', source: 'inferred', description: 'Sort direction' },
  ];
}

// ============================================================================
// Main: Resolve from API Responses
// ============================================================================

export interface ApiResolverResult {
  fields: ResolvedField[];
  endpoints: ApiEndpointSpec[];
  /** Discovered data key (best guess for primary key) */
  inferredDataKey: string | null;
  /** The array of records extracted from the response */
  sampleRecords: any[];
}

/**
 * Extract the data array from a typical API response.
 *
 * Handles common shapes:
 * - { data: [...] }
 * - { results: [...] }
 * - { items: [...] }
 * - { records: [...] }
 * - { hits: { hits: [...] } }  (Elasticsearch raw)
 * - [...] (bare array)
 */
function extractRecords(response: any): any[] {
  if (Array.isArray(response)) return response;

  const candidateKeys = ['data', 'results', 'items', 'records', 'rows', 'content', 'documents'];
  for (const key of candidateKeys) {
    if (response[key] && Array.isArray(response[key])) {
      return response[key];
    }
  }

  // Elasticsearch raw response
  if (response.hits?.hits && Array.isArray(response.hits.hits)) {
    return response.hits.hits.map((h: any) => h._source || h);
  }

  // If response itself has many keys that look like data fields, treat it as a single record
  const keys = Object.keys(response);
  if (keys.length > 3 && !keys.some(k => candidateKeys.includes(k))) {
    return [response];
  }

  return [];
}

/**
 * Resolve fields from API response data.
 */
export async function resolveFromApi(
  probeUrls: string[],
  sampleFiles: string[],
  openapiSource: string | undefined,
  excludeFields: string[],
  noFilterFields: string[]
): Promise<ApiResolverResult> {
  const allRecords: any[] = [];
  const endpoints: ApiEndpointSpec[] = [];

  // 1. Fetch from live URLs
  for (const url of probeUrls) {
    console.log(`  Probing ${url} ...`);
    try {
      const { body, headers } = await fetchJson(url);
      const records = extractRecords(body);
      console.log(`    → ${records.length} records extracted`);
      allRecords.push(...records);

      const paginationParams = inferPaginationParams(body);
      endpoints.push({
        path: new URL(url).pathname,
        method: 'GET',
        queryParams: paginationParams,
        sampleResponse: body,
      });
    } catch (err: any) {
      console.warn(`    → Failed: ${err.message}`);
    }
  }

  // 2. Load from saved sample files
  for (const file of sampleFiles) {
    console.log(`  Loading ${file} ...`);
    try {
      const raw = fs.readFileSync(file, 'utf-8');
      const body = JSON.parse(raw);
      const records = extractRecords(body);
      console.log(`    → ${records.length} records extracted`);
      allRecords.push(...records);
    } catch (err: any) {
      console.warn(`    → Failed: ${err.message}`);
    }
  }

  // 3. Parse OpenAPI spec
  if (openapiSource) {
    console.log(`  Parsing OpenAPI spec: ${openapiSource} ...`);
    try {
      let specContent: string;
      if (openapiSource.startsWith('http')) {
        const { body } = await fetchJson(openapiSource);
        specContent = JSON.stringify(body);
      } else {
        specContent = fs.readFileSync(openapiSource, 'utf-8');
      }
      const specEndpoints = parseOpenApiSpec(specContent);
      console.log(`    → ${specEndpoints.length} endpoints, ${specEndpoints.reduce((n, e) => n + e.queryParams.length, 0)} params discovered`);
      endpoints.push(...specEndpoints);
    } catch (err: any) {
      console.warn(`    → Failed: ${err.message}`);
    }
  }

  if (allRecords.length === 0) {
    throw new Error('No records found. Check your --probe URLs or --sample files.');
  }

  console.log(`\n  Total sample records: ${allRecords.length}`);

  // 4. Flatten records into columns
  const columns = flattenRecords(allRecords);

  // 5. Profile each column and infer types
  const fields: ResolvedField[] = [];
  let inferredDataKey: string | null = null;

  for (const [dotPath, values] of columns.entries()) {
    if (excludeFields.includes(dotPath)) continue;

    const tsName = toCamelCase(dotPath);
    if (excludeFields.includes(tsName)) continue;

    const profile = profileValues(values);
    const esType = inferEsType(dotPath, profile);
    const isId = looksLikeId(dotPath, profile);
    const isNumeric = esType === 'integer' || esType === 'double' || esType === 'long' || esType === 'float';
    const isKeyword = esType === 'keyword';
    const isDate = esType === 'date';
    const isBoolean = esType === 'boolean';
    const isText = esType === 'text';
    const isInternal = dotPath.startsWith('_') || dotPath.startsWith('metadata.');
    const shouldFilter = !isId && !isInternal && !noFilterFields.includes(dotPath) && !noFilterFields.includes(tsName);

    // Best guess for primary key: first field that looks like an ID
    if (isId && !inferredDataKey) {
      inferredDataKey = dotPath;
    }

    // Determine cardinality category
    const uniqueRatio = profile.uniqueValues.size / Math.max(1, profile.totalCount - profile.nullCount);
    const lowCardinality = profile.uniqueValues.size <= 50;
    const highCardinality = uniqueRatio > 0.8;

    // Filter type inference
    let filterType: ResolvedField['filterType'] = null;
    if (shouldFilter) {
      if (isBoolean) filterType = 'boolean';
      else if (isDate) filterType = 'daterange';
      else if (isNumeric) filterType = 'range';
      else if (isKeyword && lowCardinality) filterType = 'multiselect';
      else if (isKeyword && !lowCardinality) filterType = 'autocomplete';
      else if (isText && !highCardinality) filterType = 'autocomplete';
    }

    // Aggregable: keyword fields with reasonable cardinality, or numeric fields
    const aggregable = shouldFilter && !isDate && !isBoolean &&
      ((isKeyword && profile.uniqueValues.size >= 2 && profile.uniqueValues.size <= 500) || isNumeric);

    fields.push({
      esPath: dotPath,
      tsName,
      label: toLabel(dotPath),
      esType,
      hasKeywordSubfield: false,  // Can't know from response data
      filterable: shouldFilter,
      filterType,
      visible: !isInternal,
      sortable: !isInternal && (isKeyword || isNumeric || isDate),
      aggregable,
      highlightable: shouldFilter && isKeyword && lowCardinality,
      resourceFieldType: isNumeric ? 'number' : isBoolean ? 'boolean' : isDate ? 'date' : 'string',
    });
  }

  // 6. Merge OpenAPI params into field knowledge
  const openApiParams = endpoints.flatMap(e => e.queryParams);
  for (const param of openApiParams) {
    const existing = fields.find(f => f.tsName === toCamelCase(param.name) || f.esPath === param.name);
    if (existing) {
      // Enrich existing field with OpenAPI knowledge
      if (param.enum && param.enum.length > 0 && !existing.filterType) {
        existing.filterable = true;
        existing.filterType = 'multiselect';
      }
      continue;
    }

    // New param not in response data — likely a filter-only param
    if (param.in !== 'query') continue;
    if (['page', 'size', 'limit', 'offset', 'cursor', 'sort', 'sortBy', 'sortOrder', 'order', 'order_by'].includes(param.name)) continue;

    const tsName = toCamelCase(param.name);
    const isNumeric = param.type === 'integer' || param.type === 'number';
    const isBoolean = param.type === 'boolean';

    fields.push({
      esPath: param.name,
      tsName,
      label: toLabel(param.name),
      esType: isNumeric ? 'integer' : isBoolean ? 'boolean' : 'keyword',
      hasKeywordSubfield: false,
      filterable: true,
      filterType: param.enum ? 'multiselect' : isNumeric ? 'range' : isBoolean ? 'boolean' : 'autocomplete',
      visible: false,  // Not in response → probably filter-only
      sortable: false,
      aggregable: false,
      highlightable: false,
      resourceFieldType: isNumeric ? 'number' : isBoolean ? 'boolean' : 'string',
    });
  }

  // Add inferred sort params
  const sortParams = inferSortParams(fields);
  for (const ep of endpoints) {
    for (const sp of sortParams) {
      if (!ep.queryParams.find(p => p.name === sp.name)) {
        ep.queryParams.push(sp);
      }
    }
  }

  return {
    fields,
    endpoints,
    inferredDataKey,
    sampleRecords: allRecords.slice(0, 5),
  };
}
