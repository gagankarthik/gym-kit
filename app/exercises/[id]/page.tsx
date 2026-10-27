import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import Icon from "@/components/Icons";
import { bodyPartLabel } from "@/lib/bodyParts";
import { exercises, getExercise } from "@/lib/exercises";

// every exercise page is prerendered at build time
export const generateStaticParams = () => exercises.map(({ id }) => ({ id }));

// Not async: the shell renders instantly on navigation; only the exercise waits for the URL.
export default function ExercisePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main className="page">
      <nav className="topbar">
        <Link href="/exercises" className="back with-icon">
          <Icon name="back" size={18} /> All exercises
        </Link>
      </nav>
      <Suspense fallback={<div className="skeleton" aria-label="Loading exercise" />}>
        <ExerciseDetail params={params} />
      </Suspense>
      <div className="action-bar">
        <Link href="/workout" className="primary">
          <Icon name="play" size={20} /> Start a workout
        </Link>
      </div>
    </main>
  );
}

async function ExerciseDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const e = getExercise(id);
  if (!e) notFound();

  return (
    <>
      <header>
        <p className="kicker">{bodyPartLabel(e.bodyPart)}</p>
        <h1 className="title-case">{e.name}</h1>
      </header>

      <div className="detail">
        <figure className="demo">
          <Image src={e.gif} alt={`${e.name} demonstration`} width={360} height={360} unoptimized loading="eager" fetchPriority="high" />
        </figure>
        <dl className="facts">
          <dt>Target</dt>
          <dd>{e.target}</dd>
          {e.secondary.length > 0 && (
            <>
              <dt>Also works</dt>
              <dd>{e.secondary.join(", ")}</dd>
            </>
          )}
          <dt>Equipment</dt>
          <dd>{e.equipment}</dd>
        </dl>
      </div>

      <section>
        <h2>How to do it</h2>
        <ol className="steps">
          {e.steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </section>
    </>
  );
}
