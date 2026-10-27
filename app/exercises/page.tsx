import Image from "next/image";
import Link from "next/link";
import ExerciseLibrary from "@/components/ExerciseLibrary";
import Icon from "@/components/Icons";
import Logo from "@/components/Logo";
import { FEATURED_ID, exercises, getExercise, placeOf } from "@/lib/exercises";

export default function ExercisesPage() {
  const featured = getExercise(FEATURED_ID)!;
  // only what the cards need goes to the client
  const cards = exercises.map((e) => ({
    id: e.id, name: e.name, bodyPart: e.bodyPart, target: e.target, equipment: e.equipment, image: e.image, place: placeOf(e),
  }));

  return (
    <main className="page">
      <nav className="topbar">
        <Link href="/" aria-label="Gym Kit start">
          <Logo />
        </Link>
        <Link href="/workout" className="view-all">
          <Icon name="play" size={16} /> Start workout
        </Link>
      </nav>
      <h1>Exercise library</h1>

      <Link href={`/exercises/${featured.id}`} className="featured">
        <Image src={featured.gif} alt={`${featured.name} demonstration`} width={140} height={140} unoptimized />
        <span>
          <span className="featured-kicker">Start with the basics</span>
          <span className="featured-name">{featured.name}</span>
          <span className="featured-text">Works your {featured.target}, plus {featured.secondary.join(", ")}.</span>
        </span>
      </Link>

      <ExerciseLibrary items={cards} />
    </main>
  );
}
