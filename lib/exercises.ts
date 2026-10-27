import data from "@/data/exercises.json";
import { HOME_KIT } from "@/lib/workout";

export type Exercise = {
  id: string;
  name: string;
  bodyPart: string;
  target: string;
  secondary: string[];
  equipment: string;
  steps: string[];
  image: string;
  gif: string;
};

// Equipment you'd realistically have at home (the kit list lives with the plan builder);
// everything else counts as a gym workout.
const HOME_EQUIPMENT = new Set<string>(["body weight", ...HOME_KIT.flatMap((k) => k.equipment)]);
export type Place = "home" | "gym";
export const placeOf = (e: Exercise): Place => (HOME_EQUIPMENT.has(e.equipment) ? "home" : "gym");

export const exercises = data as Exercise[];
export const FEATURED_ID = "0662"; // push-up: the first module

export const getExercise = (id: string) => exercises.find((e) => e.id === id);
