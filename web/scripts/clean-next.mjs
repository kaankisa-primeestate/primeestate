import { rm } from "node:fs/promises";

await rm(".next", { recursive: true, force: true });
console.log("PrimeEstate: cleaned .next before production build.");
