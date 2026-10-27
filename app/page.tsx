import Image from "next/image";
import Link from "next/link";
import Icon, { type IconName } from "@/components/Icons";
import Logo from "@/components/Logo";
import { FEATURED_ID, getExercise } from "@/lib/exercises";

const HOW: { icon: IconName; title: string; text: string }[] = [
  { icon: "bars2", title: "Answer a few questions", text: "Your level, where you train, your kit and what to work." },
  { icon: "grid", title: "Get your plan", text: "6 to 10 exercises picked for you. Shuffle any time." },
  { icon: "play", title: "Follow the timer", text: "Work, rest, repeat. Beeps tell you when to switch." },
];

export default function Start() {
  const hero = getExercise(FEATURED_ID)!;
  return (
    <main className="start">
      <section className="start-hero">
        <nav className="topbar">
          <Logo onPlate />
          <Link href="/exercises" className="view-all">
            <Icon name="grid" size={16} /> All exercises
          </Link>
        </nav>
        <h1 className="start-title">Press start. We&apos;ll keep time.</h1>
        <Image className="start-demo" src={hero.gif} alt="Animated push-up demonstration" width={280} height={280} unoptimized loading="eager" fetchPriority="high" />
      </section>

      <section className="start-body">
        <ol className="how">
          {HOW.map((h) => (
            <li key={h.title}>
              <span className="how-icon">
                <Icon name={h.icon} />
              </span>
              <span>
                <b>{h.title}</b>
                <small>{h.text}</small>
              </span>
            </li>
          ))}
        </ol>
        <div className="action-bar">
          <Link href="/workout" className="primary">
            <Icon name="play" size={20} /> Start workout
          </Link>
        </div>
      </section>
    </main>
  );
}
