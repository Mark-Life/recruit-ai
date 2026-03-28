import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

/**
 * Loads .env and .env.local from monorepo root into process.env.
 * Does not override existing env vars (existing values take precedence).
 */
const findMonorepoRoot = () => {
  // import.meta.dirname may be undefined in bundled runtimes (e.g. Turbopack)
  const startDir =
    import.meta.dirname ??
    (import.meta.url
      ? resolve(fileURLToPath(import.meta.url), "..")
      : process.cwd());

  let dir = startDir;
  for (let i = 0; i < 10; i++) {
    if (existsSync(resolve(dir, "turbo.json"))) {
      return dir;
    }
    dir = resolve(dir, "..");
  }
  return undefined;
};

const root = findMonorepoRoot();

if (root) {
  config({ path: resolve(root, ".env"), override: false });
  config({ path: resolve(root, ".env.local"), override: false });
}
