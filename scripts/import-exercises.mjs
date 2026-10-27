// Copies the exercises dataset into the app: trimmed English JSON + media under public/exercises/.
// Usage: node scripts/import-exercises.mjs "<path to exercises-dataset-main>"
// Animations are converted GIF -> animated WebP (~65% smaller, same look) when `sharp` is available,
// which keeps the deploy under Vercel's static-file limit and loads faster on phones.
// Media is © Gym Visual (gymvisual.com): license it before publishing.
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { basename, join } from "node:path";

const src = process.argv[2];
if (!src) {
  console.error('Usage: node scripts/import-exercises.mjs "<dataset folder>"');
  process.exit(1);
}

let sharp = null;
try {
  sharp = createRequire(import.meta.url)("sharp"); // installed alongside Next.js
} catch {
  console.warn("sharp not found: copying GIFs unconverted");
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

const OUT = join("public", "exercises");
const animExt = sharp ? ".webp" : ".gif";
const animFile = (e) => basename(e.gif_url).replace(/\.gif$/i, animExt);

const exercises = unique.map((e) => ({
  id: e.id,
  name: e.name.replace(/в°/g, "°"), // a few source names have a mis-encoded degree sign
  bodyPart: e.body_part,
  target: e.target,
  secondary: e.secondary_muscles ?? [],
  equipment: e.equipment,
  steps: e.instruction_steps?.en ?? [e.instructions?.en].filter(Boolean),
  image: `/exercises/images/${basename(e.image)}`,
  gif: `/exercises/videos/${animFile(e)}`,
}));

// start clean so media for dropped exercises (or an old format) never ships
rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, "images"), { recursive: true });
mkdirSync(join(OUT, "videos"), { recursive: true });

for (const e of unique) copyFileSync(join(src, e.image), join(OUT, "images", basename(e.image)));

// convert animations a few at a time
const queue = [...unique];
await Promise.all(
  Array.from({ length: 8 }, async () => {
    for (let e; (e = queue.shift()); ) {
      const from = join(src, e.gif_url);
      const to = join(OUT, "videos", animFile(e));
      if (sharp) await sharp(from, { animated: true }).webp({ quality: 75, effort: 5 }).toFile(to);
      else copyFileSync(from, to);
    }
  }),
);

mkdirSync("data", { recursive: true });
writeFileSync("data/exercises.json", JSON.stringify(exercises));
console.log(`Imported ${exercises.length} exercises (${raw.length - exercises.length} duplicates dropped), animations as ${animExt}`);
