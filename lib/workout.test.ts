import { test } from "node:test";
import assert from "node:assert/strict";
import { LEVELS, buildPlan, moveKey, totalSeconds, type PoolExercise } from "./workout.ts";

const ex = (id: string, bodyPart: string, place: "home" | "gym", name = `move ${id}`): PoolExercise => ({
  id, name, bodyPart, target: "x", equipment: place === "home" ? "body weight" : "barbell", gif: "", place,
});
const pool = [
  ...Array.from({ length: 6 }, (_, i) => ex(`c${i}`, "chest", "home")),
  ...Array.from({ length: 6 }, (_, i) => ex(`l${i}`, "upper legs", "home")),
  ...Array.from({ length: 6 }, (_, i) => ex(`g${i}`, "chest", "gym")),
  ex("s1", "chest", "home", "chest stretch"),
  ex("p1", "back", "home", "pull-up"),
  ex("h1", "shoulders", "home", "handstand push-up"),
  ex("j1", "upper legs", "home", "jump squat"),
];

test("level sets exercise count and alternates work with rest", () => {
  const plan = buildPlan(pool, { level: "intermediate", place: "gym", focus: "full" });
  const work = plan.filter((s) => s.kind === "work");
  assert.equal(work.length, LEVELS.intermediate.count);
  assert.equal(plan.length, work.length * 2 - 1); // no rest after the last exercise
  plan.forEach((s, i) => assert.equal(s.kind, i % 2 ? "rest" : "work"));
  assert.equal(plan[1].exercise, plan[2].exercise); // rest previews the next move
  assert.equal(totalSeconds(plan), 8 * 40 + 7 * 20);
});

test("home workouts never use gym equipment, and stretches are skipped", () => {
  for (let i = 0; i < 20; i++) {
    const plan = buildPlan(pool, { level: "expert", place: "home", focus: "full" });
    assert.ok(plan.every((s) => s.exercise.place === "home" && !s.exercise.name.includes("stretch")));
  }
});

test("full body rotates body parts and never repeats a move", () => {
  const plan = buildPlan(pool, { level: "starter", place: "home", focus: "full" }, () => 0.5);
  const work = plan.filter((s) => s.kind === "work").map((s) => s.exercise);
  assert.equal(new Set(work.map((e) => e.name)).size, work.length);
  assert.notEqual(work[0].bodyPart, work[1].bodyPart);
});

test("a small pool gives a shorter workout instead of failing", () => {
  const plan = buildPlan(pool.slice(0, 2), { level: "expert", place: "home", focus: "upper" });
  assert.equal(plan.filter((s) => s.kind === "work").length, 2);
});

test("home skips moves needing a bar; hard moves match the level", () => {
  const names = (level: "starter" | "intermediate" | "expert", place: "home" | "gym") =>
    new Set(
      Array.from({ length: 30 }, () => buildPlan(pool, { level, place, focus: "full" }))
        .flat()
        .map((s) => s.exercise.name),
    );
  assert.ok(!names("expert", "home").has("pull-up"));
  assert.ok(names("expert", "gym").has("pull-up"));
  assert.ok(!names("intermediate", "gym").has("handstand push-up"));
  assert.ok(names("expert", "gym").has("handstand push-up"));
  assert.ok(!names("starter", "home").has("jump squat"));
});

test("a workout never has two forms of the same move", () => {
  const variants = [
    ex("v1", "chest", "home", "push-up"),
    ex("v2", "chest", "home", "Push Up"),
    ex("v3", "chest", "home", "push-up (on knees)"),
    ex("v4", "chest", "home", "push-up v. 2"),
    ex("v5", "chest", "home", "wide push-up"),
  ];
  assert.equal(moveKey("push-up (on knees)"), moveKey("Push Up"));
  for (let i = 0; i < 20; i++) {
    const keys = buildPlan(variants, { level: "expert", place: "home", focus: "upper" })
      .filter((s) => s.kind === "work")
      .map((s) => moveKey(s.exercise.name));
    assert.equal(new Set(keys).size, keys.length);
    assert.equal(keys.length, 2); // "push-up" (one of its forms) + "wide push-up"
  }
});

test("home workouts only use the kit the user ticked (body weight always)", () => {
  const kitPool = [
    { ...ex("b1", "chest", "home", "push-up"), equipment: "body weight" },
    { ...ex("d1", "chest", "home", "dumbbell press"), equipment: "dumbbell" },
    { ...ex("k1", "chest", "home", "kettlebell press"), equipment: "kettlebell" },
  ];
  const used = (kit?: ("dumbbells" | "kettlebell")[]) =>
    new Set(
      Array.from({ length: 20 }, () => buildPlan(kitPool, { level: "expert", place: "home", focus: "upper", kit }))
        .flat()
        .map((s) => s.exercise.equipment),
    );
  assert.deepEqual([...used([])], ["body weight"]);
  assert.deepEqual([...used(["dumbbells"])].sort(), ["body weight", "dumbbell"]);
  assert.equal(used(undefined).size, 3); // older saved answers without a kit keep the full home kit
});
