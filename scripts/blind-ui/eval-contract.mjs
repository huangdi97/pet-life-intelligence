// eval-contract.mjs — Node bridge: evaluate one screen contract against one
// machine snapshot and print the score JSON. Used by scripts/blind-ui/scorecard.py
// and pytest tests/blind_ui (known-bad calibration / known-good fixture).
//
// Usage: node eval-contract.mjs <contract.json> <snapshot.json> [platform]
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..", "..");
const { evaluateContract } = await import(
  pathToFileURL(resolve(root, "packages/visual-contract/dist/index.js")).href
);

const [contractPath, snapshotPath, platformArg] = process.argv.slice(2);
if (!contractPath || !snapshotPath) {
  console.error("usage: node eval-contract.mjs <contract.json> <snapshot.json> [web|android]");
  process.exit(2);
}
const contract = JSON.parse(readFileSync(contractPath, "utf8"));
const snap = JSON.parse(readFileSync(snapshotPath, "utf8"));
if (platformArg) snap.platform = platformArg;
const result = evaluateContract(contract, snap);
process.stdout.write(JSON.stringify(result, null, 2));
