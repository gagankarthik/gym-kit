// Copies the exercises dataset into the app: trimmed English JSON + images/GIFs under public/.
// Usage: node scripts/import-exercises.mjs "<path to exercises-dataset-main>"
// Media is © Gym Visual (gymvisual.com): fine for local development, license it before going public.
import { cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const src = process.argv[2];
if (!src) {
  console.error('Usage: node scripts/import-exercises.mjs "<dataset folder>"');
  process.exit(1);
}

// Same exercise filmed again: another camera angle, a "v. 2" take, or a male/female version.
// Variations that change the movement ("(with towel)", "(on stability ball)") are kept.
const sameMove = (name) =>
  name
    .toLowerCase()
    .replace(/\((?:back |side |front )?pov\)|\((?:male|female)\)|\bv\.?\s*\d+\b/g, "")
    .replace(/[^a-z0-9()]+/g, "");

const raw = JSON.parse(readFileSync(join(src, "data", "exercises.json"), "utf8"));
const seen = new Set();
const unique = raw.filter((e) => !seen.has(sameMove(e.name)) && seen.add(sameMove(e.name)));
const exercises = unique.map((e) => ({
  id: e.id,
  name: e.name.replace(/в°/g, "°"), // a few source names have a mis-encoded degree sign

  bodyPart: e.body_part,
  target: e.target,
  secondary: e.secondary_muscles ?? [],
  equipment: e.equipment,
  steps: e.instruction_steps?.en ?? [e.instructions?.en].filter(Boolean),
  image: "/exercises/" + e.image,
  gif: "/exercises/" + e.gif_url,
}));

mkdirSync("data", { recursive: true });
writeFileSync("data/exercises.json", JSON.stringify(exercises));
for (const dir of ["images", "videos"]) cpSync(join(src, dir), join("public", "exercises", dir), { recursive: true });
console.log(`Imported ${exercises.length} exercises (${raw.length - exercises.length} duplicates dropped)`);
