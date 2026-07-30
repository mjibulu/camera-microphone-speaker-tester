#!/usr/bin/env node

import { access, readFile } from "node:fs/promises";
import path from "node:path";

const distRoot = path.resolve("dist");
const indexPath = path.join(distRoot, "index.html");
const html = await readFile(indexPath, "utf8");
const references = [
  ...html.matchAll(/(?:href|src)=["']([^"']+)["']/giu),
].map((match) => match[1]);

if (references.length === 0) {
  throw new Error("The production index does not reference any assets.");
}

for (const reference of references) {
  if (
    reference.startsWith("http:") ||
    reference.startsWith("https:") ||
    reference.startsWith("//") ||
    reference.startsWith("/")
  ) {
    throw new Error(
      `Production asset path is not subdirectory-safe: ${reference}`,
    );
  }

  if (
    reference.startsWith("#") ||
    reference.startsWith("data:") ||
    reference.startsWith("mailto:")
  ) {
    continue;
  }

  const cleanReference = reference.split(/[?#]/u)[0];
  const resolved = path.resolve(distRoot, cleanReference);
  const relative = path.relative(distRoot, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Production asset escapes dist/: ${reference}`);
  }
  await access(resolved);
}

console.log(
  `Verified ${references.length} production reference${references.length === 1 ? "" : "s"} for subdirectory hosting.`,
);
