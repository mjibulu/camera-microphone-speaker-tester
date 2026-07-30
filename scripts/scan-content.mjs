#!/usr/bin/env node

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const roots = ["src", "public", "index.html"];
const ignoredDirectories = new Set([
  "node_modules",
  "dist",
  "coverage",
  "playwright-report",
  "test-results",
]);
const binaryExtensions = new Set([
  ".gif",
  ".ico",
  ".jpeg",
  ".jpg",
  ".png",
  ".webp",
  ".woff",
  ".woff2",
]);
const rules = [
  ["protected runtime endpoint", /runtime-session\.php|[/]runtime\.php/iu],
  ["eBURP analytics", /@[/]lib[/]analytics|trackEvent\s*\(/u],
  ["private hosting path", /server[/\\]private|domains[/\\]eburp\.com[/\\]private/iu],
  ["internal standalone positioning", /\bstandalone\b/iu],
  [
    "private-project dependency wording",
    /\b(?:does not require eBURP|private runtime|private eBURP project)\b/iu,
  ],
  [
    "provisional public copy",
    /\b(?:coming soon|not implemented|work in progress|placeholder implementation|sample tool|repository phase|staging repository|demo only)\b/iu,
  ],
  ["unresolved template token", /__[A-Z][A-Z0-9_]*__/u],
  ["PHP source", /<\?php/iu],
  ["runtime fetch", /\bfetch\s*\(/u],
  ["XMLHttpRequest", /\bXMLHttpRequest\b/u],
  ["WebSocket", /\bWebSocket\s*\(/u],
  ["beacon", /\bsendBeacon\s*\(/u],
  [
    "remote executable asset",
    /<(?:link|script)\b[^>]*(?:href|src)=["']https?:[/][/]/iu,
  ],
  ["remote CSS asset", /url\(\s*["']?https?:[/][/]/iu],
];

async function filesUnder(candidate) {
  const absolute = path.resolve(candidate);
  try {
    const entries = await readdir(absolute, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
      if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
      const child = path.join(absolute, entry.name);
      if (entry.isDirectory()) files.push(...(await filesUnder(child)));
      else if (entry.isFile()) files.push(child);
    }
    return files;
  } catch (error) {
    if (error?.code === "ENOTDIR") return [absolute];
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

const files = (await Promise.all(roots.map(filesUnder))).flat().sort();
const findings = [];

for (const file of files) {
  if (binaryExtensions.has(path.extname(file).toLowerCase())) continue;
  const source = await readFile(file, "utf8");
  if (source.includes("\u0000")) continue;

  for (const [label, pattern] of rules) {
    const match = pattern.exec(source);
    if (!match) continue;
    const line = source.slice(0, match.index).split(/\r?\n/u).length;
    findings.push(`${path.relative(process.cwd(), file)}:${line} - ${label}`);
  }
}

if (findings.length > 0) {
  console.error(findings.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Scanned ${files.length} application files.`);
}
