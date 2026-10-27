import WorkoutFlow from "@/components/WorkoutFlow";
import { exercises, placeOf } from "@/lib/exercises";

export default function WorkoutPage() {
  // only what the player needs goes to the client
  const pool = exercises.map((e) => ({
    id: e.id, name: e.name, bodyPart: e.bodyPart, target: e.target, equipment: e.equipment, gif: e.gif, place: placeOf(e),
  }));
  return (
    <main>
      <WorkoutFlow pool={pool} />
    </main>
  );
}
