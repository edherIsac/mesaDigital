#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import axios from 'axios';

// Usage:
//   node scripts/fetch-openapi.js [url] [outPath]
// Environment variables: OPENAPI_URL, OPENAPI_OUT

const url = process.env.OPENAPI_URL || process.argv[2] || 'http://localhost:3100/docs-json';
const outPathArg = process.env.OPENAPI_OUT || process.argv[3] || path.join('src', 'api', 'openapi.json');
const out = path.isAbsolute(outPathArg) ? outPathArg : path.join(process.cwd(), outPathArg);

const run = async () => {
  try {
    const res = await axios.get(url, { responseType: 'text' });
    if (res.status < 200 || res.status >= 300) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const body = res.data;
    await fs.promises.mkdir(path.dirname(out), { recursive: true });
    await fs.promises.writeFile(out, body, 'utf8');
    console.log(`Saved OpenAPI JSON from ${url} -> ${out}`);
  } catch (err) {
    console.error('Failed to fetch OpenAPI JSON:', err?.message || err);
    process.exit(1);
  }
};

run();
