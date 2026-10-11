// CI/local wrapper for the complete R5.6 Web runtime evidence package.
// Resolves the seeded primary dog + secondary cat by species from the real API,
// then invokes the strict final surface capture and runtime turntable capture.
// No pet display name is hard-coded and no vision model is used.
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..", "..");
const args = process.argv.slice(2);
const pick = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const baseUrl = pick("--base-url", "http://localhost:3100");
const apiUrl = pick("--api-url", baseUrl.replace(/:\d+$/, ":8800"));
const email = pick("--email", "owner@pli.demo");

async function resolvePets() {
  const login = await fetch(`${apiUrl}/api/v1/auth/dev/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!login.ok) throw new Error(`dev login failed: ${login.status}`);
  const auth = await login.json();
  if (!auth.user_id) throw new Error("dev login returned no user_id");

  const petsResponse = await fetch(`${apiUrl}/api/v1/pets`, {
    headers: { "X-Dev-User-Id": auth.user_id },
  });
  if (!petsResponse.ok) throw new Error(`pet list failed: ${petsResponse.status}`);
  const pets = await petsResponse.json();
  if (!Array.isArray(pets)) throw new Error("pet list is not an array");

  const dogs = pets.filter((pet) => String(pet.species ?? "").toLowerCase() === "dog");
  const cats = pets.filter((pet) => String(pet.species ?? "").toLowerCase() === "cat");
  if (dogs.length !== 1 || cats.length !== 1 || !dogs[0]?.id || !cats[0]?.id) {
    throw new Error(
      `final demo evidence requires exactly one seeded dog and one seeded cat; got dogs=${dogs.length}, cats=${cats.length}`,
    );
  }
  const dog = dogs[0];
  const cat = cats[0];
  if (dog.id === cat.id) throw new Error("primary and secondary pet ids must be distinct");
  return { dogId: dog.id, catId: cat.id };
}

function run(script, scriptArgs) {
  const result = spawnSync(process.execPath, [resolve(root, script), ...scriptArgs], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) {
    throw new Error(`${script} failed with exit code ${result.status}`);
  }
}

const { dogId, catId } = await resolvePets();
console.log(`R5.6 evidence identities resolved by species: primary=${dogId} secondary=${catId}`);

run("scripts/r5-6/capture-web-final.mjs", ["--base-url", baseUrl, "--pet-id", dogId]);
run("scripts/r5-6/capture-web-turntables-final.mjs", [
  "--base-url",
  baseUrl,
  "--primary-pet-id",
  dogId,
  "--secondary-pet-id",
  catId,
]);

console.log("R5.6 Web final surfaces + two-pet turntables complete.");
