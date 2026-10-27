// Builds a guided workout (exercise, rest, exercise, ...) from the user's answers.
// Kept free of app imports so it can be unit-tested with `node --test`.
import type { Place } from "./exercises";

export type Level = "starter" | "intermediate" | "expert";
export type Focus = "full" | "upper" | "lower" | "core";
export type KitId = (typeof HOME_KIT)[number]["id"];
// kit: what the user owns at home. Missing (prefs saved before this question existed) = everything.
export type Answers = { level: Level; place: Place; focus: Focus; kit?: KitId[] };
export type PoolExercise = { id: string; name: string; bodyPart: string; target: string; equipment: string; gif: string; place: Place };
export type Step = { kind: "work" | "rest"; seconds: number; exercise: PoolExercise };

export const LEVELS: Record<Level, { label: string; blurb: string; count: number; work: number; rest: number }> = {
  starter: { label: "Starter", blurb: "New to training or coming back", count: 6, work: 30, rest: 30 },
  intermediate: { label: "Intermediate", blurb: "You train a few times a week", count: 8, work: 40, rest: 20 },
  expert: { label: "Expert", blurb: "Bring it on", count: 10, work: 45, rest: 15 },
};

export const FOCUS: Record<Focus, { label: string; parts: string[] }> = {
  full: { label: "Full body", parts: ["chest", "upper legs", "back", "waist", "shoulders", "lower legs", "upper arms"] },
  upper: { label: "Upper body", parts: ["chest", "back", "shoulders", "upper arms", "lower arms"] },
  // listed twice: two thigh/glute moves per calf move (the dataset is crowded with calf raises)
  lower: { label: "Lower body", parts: ["upper legs", "upper legs", "lower legs"] },
  core: { label: "Core", parts: ["waist"] },
};

export const PLACES: Record<Place, { label: string; blurb: string }> = {
  home: { label: "Home", blurb: "Body weight, plus whatever kit you have" },
  gym: { label: "Gym", blurb: "Machines, barbells, cables and more" },
};

// Home equipment the user can tick, mapped to the dataset's equipment names.
// Body weight is always available, so it isn't a choice.
export const HOME_KIT = [
  { id: "dumbbells", label: "Dumbbells", equipment: ["dumbbell"] },
  { id: "kettlebell", label: "Kettlebell", equipment: ["kettlebell"] },
  { id: "bands", label: "Resistance bands", equipment: ["band", "resistance band"] },
  { id: "ball", label: "Exercise ball", equipment: ["stability ball", "bosu ball"] },
  { id: "medball", label: "Medicine ball", equipment: ["medicine ball"] },
  { id: "roller", label: "Ab wheel / roller", equipment: ["wheel roller", "roller"] },
  { id: "rope", label: "Jump rope", equipment: ["rope"] },
] as const;

const homeEquipment = (kit: readonly string[] | undefined) =>
  new Set<string>(["body weight", ...HOME_KIT.filter((k) => !kit || kit.includes(k.id)).flatMap((k) => k.equipment)]);

// The dataset labels these "body weight", but they need a bar, rings or a suspension trainer.
const NEEDS_FIXTURE = /pull[- ]?up|chin[- ]?up|\bchin\b|suspended|hanging|\bdips?\b|muscle[- ]?up|inverted row|\bbar\b|bench|incline|decline|hyperextension|preacher/i;
// Skill moves only for experts; explosive moves not for starters.
const EXPERT_ONLY = /planche|handstand|muscle[- ]?up|front lever|back lever|human flag|dragon flag|one arm push|single arm push|archer|clap/i;
const NOT_FOR_STARTERS = /jump|plyo|explosive|pistol|(one|single) leg squat|burpee|weighted|clean|snatch|jerk/i;
// Well-known training movements. The dataset has no difficulty rating, so lower levels prefer
// these over obscure entries ("ankle circles", "balance board", "elevator").
const KNOWN_MOVE =
  /squat|lunge|push[- ]?up|plank|crunch|sit[- ]?up|bridge|glute|hip thrust|calf raise|\brow\b|curl|press|raise|\bfly\b|deadlift|step[- ]?up|dead bug|bird dog|mountain climber|superman|jumping jack|high knee|kickback|extension|pulldown|shrug|twist|swing|v-up|leg lift/i;
// Within those, shorter names are the plain versions; long names are niche variations.
const SIMPLEST: Record<Level, number> = { starter: 12, intermediate: 20, expert: Infinity };
const NOT_EXERCISES = /stretch|circles|balance board|massage|roll(er|ing)? ?(release|out)/i;

const suits = (e: PoolExercise, a: Answers, owned: Set<string>) =>
  !NOT_EXERCISES.test(e.name) &&
  (a.place === "gym" || (owned.has(e.equipment) && !NEEDS_FIXTURE.test(e.name))) &&
  (a.level === "expert" || !EXPERT_ONLY.test(e.name)) &&
  (a.level !== "starter" || !NOT_FOR_STARTERS.test(e.name));

/** Picks exercises round-robin across the focus's body parts, then interleaves rests. */
export function buildPlan(pool: PoolExercise[], a: Answers, random: () => number = Math.random): Step[] {
  const { count, work, rest } = LEVELS[a.level];
  const owned = homeEquipment(a.kit);
  const usable = pool.filter((e) => suits(e, a, owned));
  const byPart = FOCUS[a.focus].parts.map((part) => {
    const inPart = usable.filter((e) => e.bodyPart === part);
    // experts also get the skill moves only they unlock (planche, levers...)
    const known = inPart.filter((e) => KNOWN_MOVE.test(e.name) || (a.level === "expert" && EXPERT_ONLY.test(e.name)));
    // a body part with no well-known moves falls back to everything, rather than going missing
    const candidates = (known.length ? known : inPart).sort((x, y) => x.name.length - y.name.length);
    return shuffle(candidates.slice(0, SIMPLEST[a.level]), random);
  });

  const picked: PoolExercise[] = [];
  const moves = new Set<string>();
  for (let round = 0; picked.length < count && byPart.some((list) => list.length > round); round++) {
    for (const list of byPart) {
      const e = list[round];
      if (e && !moves.has(moveKey(e.name)) && picked.length < count) {
        picked.push(e);
        moves.add(moveKey(e.name));
      }
    }
  }

  return picked.flatMap((exercise, i) => {
    const step: Step = { kind: "work", seconds: work, exercise };
    // rest shows the upcoming exercise; no rest after the last one
    return i < picked.length - 1 ? [step, { kind: "rest", seconds: rest, exercise: picked[i + 1] }] : [step];
  });
}

export const totalSeconds = (plan: Step[]) => plan.reduce((s, st) => s + st.seconds, 0);

/** The movement behind a name: "Push Up", "push-up (on knees)" and "push-up v. 2" are one move,
 *  so a workout never contains two forms of it. */
export const moveKey = (name: string) =>
  name.toLowerCase().replace(/\(.*?\)/g, "").replace(/\bv\.?\s*\d+\b/g, "").replace(/[^a-z0-9]+/g, "");

function shuffle<T>(list: T[], random: () => number): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
