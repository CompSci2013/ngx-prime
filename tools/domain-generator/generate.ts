#!/usr/bin/env ts-node
/**
 * Domain Config Generator
 *
 * Generates a complete ngx-prime domain configuration from:
 *   Mode 1: Elasticsearch index mapping (--index / --mapping)
 *   Mode 2: Live API responses + optional OpenAPI spec (--probe / --sample / --openapi)
 *
 * Usage:
 *   # Mode 1: From ES mapping
 *   ./run.sh --index autos-vins --es-url http://192.168.0.244:30398
 *
 *   # Mode 2: From API responses
 *   ./run.sh --probe http://api.example.com/vehicles?page=1&size=50 --domain automobile
 *
 *   # Mode 2: From saved JSON + OpenAPI spec
 *   ./run.sh --sample response.json --openapi swagger.json --domain automobile
 */

import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import { ESMappingResponse, GeneratorOptions, ResolvedField } from './types';
import { resolveMapping } from './schema-resolver';
import { resolveFromApi } from './api-resolver';
import * as templates from './templates';

// ============================================================================
// CLI Argument Parsing
// ============================================================================

function parseArgs(): GeneratorOptions {
  const args = process.argv.slice(2);
  const opts: Record<string, string> = {};
  const multiOpts: Record<string, string[]> = { probe: [], sample: [] };

  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : 'true';

      // Accumulate repeatable args
      if (key === 'probe' || key === 'sample') {
        if (value !== 'true') {
          multiOpts[key].push(value);
          i++;
        }
      } else {
        opts[key] = value;
        if (value !== 'true') i++;
      }
    }
  }

  // Derive domain name from index if not provided
  const index = opts['index'];
  const domain = opts['domain'] || (index ? index.replace(/[-_].*$/, '') : undefined);
  if (!domain) {
    console.error('Error: --domain is required (or provide --index to derive it)');
    printUsage();
    process.exit(1);
  }

  const label = opts['label'] || domain.charAt(0).toUpperCase() + domain.slice(1) + ' Discovery';
  const dataKey = opts['data-key'] || `${domain}_id`;
  const apiBase = opts['api-base'] || `/api/v1/${domain}`;
  const outdir = opts['outdir'] || `src/app/domain-config/${domain}`;
  const exclude = opts['exclude'] ? opts['exclude'].split(',') : [];
  const noFilter = opts['no-filter'] ? opts['no-filter'].split(',') : [];

  return {
    index,
    esUrl: opts['es-url'],
    mapping: opts['mapping'],
    domain,
    label,
    dataKey,
    apiBase,
    outdir,
    exclude,
    noFilter,
    probeUrls: multiOpts.probe,
    samples: multiOpts.sample,
    openapi: opts['openapi'],
  };
}

function printUsage(): void {
  console.log(`
Domain Config Generator — generates ngx-prime domain configuration files.

Usage:
  ./tools/domain-generator/run.sh [options]

Mode 1: From Elasticsearch mapping
  --index <name>       Elasticsearch index name (fetches mapping automatically)
  --es-url <url>       Elasticsearch URL (default: http://localhost:9200)
  --mapping <path>     Path to saved mapping JSON file (alternative to --index)

Mode 2: From API responses (can combine multiple sources)
  --probe <url>        Live API endpoint to fetch sample data from (repeatable)
  --sample <path>      Saved JSON response file (repeatable)
  --openapi <path|url> OpenAPI/Swagger spec (JSON) for parameter discovery

Common options:
  --domain <name>      Domain name, kebab-case (required unless derivable from --index)
  --label <text>       Display label (default: "<Domain> Discovery")
  --data-key <field>   Primary key field (default: <domain>_id, auto-detected in Mode 2)
  --api-base <path>    API base path (default: /api/v1/<domain>)
  --outdir <path>      Output directory (default: src/app/domain-config/<domain>)
  --exclude <fields>   Comma-separated fields to exclude
  --no-filter <fields> Comma-separated fields to mark as non-filterable

Examples:

  # Mode 1: From a live ES index
  ./run.sh --index autos-vins --es-url http://192.168.0.244:30398 \\
    --domain automobile --label "Vvroom Discovery" --data-key vehicle_id

  # Mode 2: Probe a live API
  ./run.sh --probe http://api.example.com/vehicles?page=1&size=50 \\
    --domain vehicle --label "Vehicle Discovery"

  # Mode 2: Multiple probe endpoints + OpenAPI spec
  ./run.sh \\
    --probe http://api.example.com/vehicles?page=1&size=100 \\
    --probe http://api.example.com/vehicles?category=plane&page=1&size=100 \\
    --openapi http://api.example.com/swagger.json \\
    --domain vehicle --data-key vehicle_id

  # Mode 2: From saved JSON files
  ./run.sh --sample responses/vehicles-page1.json \\
    --sample responses/vehicles-page2.json \\
    --openapi docs/openapi.json \\
    --domain vehicle

  # Mode 2: Mix live probe + saved sample + OpenAPI
  ./run.sh \\
    --probe http://localhost:3000/api/search?size=100 \\
    --sample extra-records.json \\
    --openapi http://localhost:3000/api-docs \\
    --domain mydata
`);
}

// ============================================================================
// ES Mapping Fetch
// ============================================================================

function fetchMapping(esUrl: string, index: string): Promise<ESMappingResponse> {
  const url = `${esUrl}/${index}/_mapping`;
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse mapping from ${url}: ${e}`));
        }
      });
      res.on('error', reject);
    }).on('error', reject);
  });
}

// ============================================================================
// File Writing
// ============================================================================

function kebab(s: string): string {
  return s.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/_/g, '-').toLowerCase();
}

function writeFile(filepath: string, content: string): void {
  const dir = path.dirname(filepath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filepath, content, 'utf-8');
  console.log(`  wrote ${filepath}`);
}

// ============================================================================
// Shared: Generate files from resolved fields
// ============================================================================

function generateFiles(opts: GeneratorOptions, fields: ResolvedField[]): void {
  const base = opts.outdir;
  const d = kebab(opts.domain);
  const chartableFields = fields.filter(f => f.aggregable && f.esType !== 'boolean');

  console.log(`\nGenerating domain config in ${base}/\n`);

  // Resource definition
  writeFile(path.join(base, `${d}.resource.ts`), templates.genResource(opts, fields));

  // Models
  writeFile(path.join(base, 'models', `${d}.filters.ts`), templates.genFilters(opts, fields));
  writeFile(path.join(base, 'models', `${d}.data.ts`), templates.genData(opts, fields));
  writeFile(path.join(base, 'models', `${d}.statistics.ts`), templates.genStatistics(opts, fields));
  writeFile(path.join(base, 'models', 'index.ts'), templates.genModelsIndex(opts));

  // Configs
  writeFile(path.join(base, 'configs', `${d}.query-control-filters.ts`), templates.genQueryControlFilters(opts, fields));
  writeFile(path.join(base, 'configs', `${d}.highlight-filters.ts`), templates.genHighlightFilters(opts, fields));
  writeFile(path.join(base, 'configs', `${d}.chart-configs.ts`), templates.genChartConfigs(opts, fields));
  writeFile(path.join(base, 'configs', 'index.ts'), templates.genConfigsIndex(opts));

  // Adapters
  writeFile(path.join(base, 'adapters', `${d}-cache-key-builder.ts`), templates.genCacheKeyBuilder(opts, fields));
  writeFile(path.join(base, 'adapters', 'index.ts'), templates.genAdaptersIndex(opts));

  // Chart sources (one per aggregable field)
  for (const field of chartableFields) {
    writeFile(
      path.join(base, 'chart-sources', `${kebab(field.tsName)}-chart-source.ts`),
      templates.genChartSource(opts, field)
    );
  }
  writeFile(path.join(base, 'chart-sources', 'index.ts'), templates.genChartSourcesIndex(opts, fields));

  // Domain config (factory + provider)
  writeFile(path.join(base, `${d}.domain-config.ts`), templates.genDomainConfig(opts, fields));

  // Root barrel
  writeFile(path.join(base, 'index.ts'), templates.genRootIndex(opts));

  const totalFiles = 10 + chartableFields.length + 2;
  console.log(`\nDone. Generated ${totalFiles} files.`);
  console.log(`\nNext steps:`);
  console.log(`  1. Review generated files (especially labels, endpoints, transformers)`);
  console.log(`  2. Add DOMAIN_PROVIDER to your feature module`);
  console.log(`  3. Wire up feature routing`);
}

function printFieldSummary(fields: ResolvedField[], source: string): void {
  console.log(`\nResolved ${fields.length} fields from ${source}:`);
  for (const f of fields) {
    const tags = [
      f.filterable ? 'filter' : '',
      f.sortable ? 'sort' : '',
      f.visible ? 'visible' : '',
      f.aggregable ? 'chart' : '',
      f.highlightable ? 'highlight' : '',
    ].filter(Boolean).join(', ');
    console.log(`  ${f.esPath.padEnd(35)} ${f.esType.padEnd(10)} [${tags}]`);
  }
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  const opts = parseArgs();
  let fields: ResolvedField[];

  const isApiMode = (opts.probeUrls && opts.probeUrls.length > 0) ||
                    (opts.samples && opts.samples.length > 0);
  const isEsMode = opts.index || opts.mapping;

  if (isApiMode) {
    // ========== MODE 2: API Probe ==========
    console.log('Mode: API Response Analysis\n');
    console.log('Sources:');

    const result = await resolveFromApi(
      opts.probeUrls || [],
      opts.samples || [],
      opts.openapi,
      opts.exclude || [],
      opts.noFilter || []
    );

    fields = result.fields;

    // Auto-detect data key if not explicitly provided
    if (opts.dataKey === `${opts.domain}_id` && result.inferredDataKey) {
      console.log(`\n  Auto-detected primary key: ${result.inferredDataKey}`);
      opts.dataKey = result.inferredDataKey;
    }

    // Report discovered endpoints and params
    if (result.endpoints.length > 0) {
      console.log('\nDiscovered API parameters:');
      for (const ep of result.endpoints) {
        if (ep.queryParams.length === 0) continue;
        console.log(`  ${ep.method} ${ep.path}`);
        for (const p of ep.queryParams) {
          const meta = [
            p.required ? 'required' : 'optional',
            p.type,
            p.enum ? `enum: [${p.enum.join(', ')}]` : '',
            p.default !== undefined ? `default: ${p.default}` : '',
            `(${p.source})`,
          ].filter(Boolean).join(', ');
          console.log(`    ${p.name.padEnd(20)} ${meta}`);
        }
      }
    }

    // Show sample record
    if (result.sampleRecords.length > 0) {
      console.log('\nSample record (first):');
      const sample = result.sampleRecords[0];
      const preview = JSON.stringify(sample, null, 2).split('\n').slice(0, 20).join('\n');
      console.log(preview + (JSON.stringify(sample, null, 2).split('\n').length > 20 ? '\n  ...' : ''));
    }

    printFieldSummary(fields, 'API responses');

  } else if (isEsMode) {
    // ========== MODE 1: ES Mapping ==========
    console.log('Mode: Elasticsearch Mapping\n');

    let mappingResponse: ESMappingResponse;

    if (opts.mapping) {
      const raw = fs.readFileSync(opts.mapping, 'utf-8');
      mappingResponse = JSON.parse(raw);
    } else if (opts.index && opts.esUrl) {
      console.log(`Fetching mapping from ${opts.esUrl}/${opts.index}/_mapping ...`);
      mappingResponse = await fetchMapping(opts.esUrl, opts.index);
    } else {
      console.error('Error: provide --es-url with --index');
      printUsage();
      process.exit(1);
    }

    const indexName = Object.keys(mappingResponse)[0];
    const properties = mappingResponse[indexName]?.mappings?.properties;
    if (!properties) {
      console.error(`Error: no mappings.properties found in index "${indexName}"`);
      process.exit(1);
    }

    fields = resolveMapping(properties, '', opts.exclude, opts.dataKey);

    // Apply --no-filter overrides
    if (opts.noFilter && opts.noFilter.length > 0) {
      fields = fields.map(f => {
        if (opts.noFilter!.includes(f.esPath) || opts.noFilter!.includes(f.tsName)) {
          return { ...f, filterable: false, filterType: null, highlightable: false };
        }
        return f;
      });
    }

    printFieldSummary(fields, `"${indexName}"`);

  } else {
    console.error('Error: provide either ES options (--index/--mapping) or API options (--probe/--sample)');
    printUsage();
    process.exit(1);
  }

  // Generate all files
  generateFiles(opts, fields);
}

main().catch(err => {
  console.error('Error:', err.message || err);
  process.exit(1);
});
