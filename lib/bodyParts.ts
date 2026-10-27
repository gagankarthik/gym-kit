// Everyday names for the dataset's body-part labels. Kept apart from lib/exercises.ts so client
// components can use it without pulling the whole exercise JSON into the browser bundle.
const LABELS: Record<string, string> = {
  "upper legs": "Legs",
  "lower legs": "Calves",
  "upper arms": "Arms",
  "lower arms": "Forearms",
  waist: "Core",
};

export const bodyPartLabel = (part: string) => LABELS[part] ?? part[0].toUpperCase() + part.slice(1);
