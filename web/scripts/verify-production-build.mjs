import { readFile } from "node:fs/promises";
import { access } from "node:fs/promises";

const requiredRoutes = [
  "/api/health/route",
  "/api/auth-context/route",
  "/api/auth/[...all]/route",
];

const manifestCandidates = [
  ".next/server/app-paths-manifest.json",
];

let manifestPath = null;
let manifest = null;

for (const candidate of manifestCandidates) {
  try {
    manifest = JSON.parse(await readFile(candidate, "utf8"));
    manifestPath = candidate;
    break;
  } catch {}
}

if (!manifest) {
  throw new Error(
    "Production build verification failed: .next/server/app-paths-manifest.json was not generated.",
  );
}

const manifestText = JSON.stringify(manifest);
const routeKeys = Object.keys(manifest);
const missingRoutes = requiredRoutes.filter(
  (route) => !manifestText.includes(route),
);

if (missingRoutes.length > 0) {
  console.error("Registered App Router routes:");
  console.error(routeKeys.join("\n"));
  console.error(
    "Manifest JSON:",
    manifestText,
  );
  throw new Error(
    `Production build verification failed. Missing routes: ${missingRoutes.join(", ")}`,
  );
}

await access(".next/BUILD_ID");

let routesManifestSummary = "unavailable";
try {
  const routesManifest = JSON.parse(
    await readFile(".next/routes-manifest.json", "utf8"),
  );
  routesManifestSummary = `version=${routesManifest.version ?? "unknown"}, dataRoutes=${Array.isArray(routesManifest.dataRoutes) ? routesManifest.dataRoutes.length : "n/a"}`;
} catch {}

console.log("PrimeEstate production build verification passed.");
console.log(`App route manifest: ${manifestPath}`);
console.log(`Verified routes: ${requiredRoutes.join(", ")}`);
console.log(`Routes manifest: ${routesManifestSummary}`);
