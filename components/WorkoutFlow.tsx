"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useReducer, useRef } from "react";
import Icon, { type IconName } from "@/components/Icons";
import type { Place } from "@/lib/exercises";
import {
  FOCUS, HOME_KIT, LEVELS, PLACES, buildPlan, totalSeconds,
  type Answers, type KitId, type PoolExercise, type Step,
} from "@/lib/workout";

const COUNTDOWN = 3;
const RING = 2 * Math.PI * 54; // circumference of the timer ring (r = 54)
const CONFIRM_MS = 3000; // End needs a second tap within this window
const PREFS_KEY = "gymkit:prefs";

const OPTION_ICON: Record<string, IconName> = {
  starter: "bars1", intermediate: "bars2", expert: "bars3",
  home: "home", gym: "gym",
  full: "full", upper: "upper", lower: "lower", core: "core",
};

const KIT_ICON: Record<KitId, IconName> = {
  dumbbells: "gym", kettlebell: "kettlebell", bands: "band", ball: "ball", medball: "medball", roller: "wheel", rope: "rope",
};

// Single-choice questions. The home-kit question (multi-choice) is inserted after "place" for home.
const CHOICES = {
  level: { title: "What's your level?", options: Object.entries(LEVELS).map(([v, o]) => ({ value: v, label: o.label, blurb: o.blurb })) },
  place: { title: "Where are you training?", options: Object.entries(PLACES).map(([v, o]) => ({ value: v, label: o.label, blurb: o.blurb })) },
  focus: { title: "What do you want to work?", options: Object.entries(FOCUS).map(([v, o]) => ({ value: v, label: o.label, blurb: "" })) },
};
type QuestionKey = keyof typeof CHOICES | "kit";
const questionsFor = (a: Partial<Answers>): QuestionKey[] => ["level", "place", ...(a.place === "home" ? ["kit" as const] : []), "focus"];

const kitText = (kit: readonly KitId[] | undefined) =>
  !kit ? "home" : kit.length ? `home with ${kit.map((id) => HOME_KIT.find((k) => k.id === id)!.label.toLowerCase()).join(", ")}` : "home, body weight only";
const describe = (a: Answers) =>
  `${LEVELS[a.level].label}, ${a.place === "home" ? kitText(a.kit) : "gym"}, ${FOCUS[a.focus].label.toLowerCase()}`;
const clock = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

type State = {
  screen: "questions" | "summary" | "countdown" | "session" | "done";
  question: number;
  answers: Partial<Answers>;
  plan: Step[];
  index: number; // current step in the plan
  endsAt: number; // ms timestamp the current countdown/step ends
  pausedLeft: number | null; // ms left when paused
  now: number;
  startedAt: number;
  doneAt: number;
  endedEarly: boolean;
  confirmEndUntil: number;
  muted: boolean;
  last: Answers | null; // answers from the previous workout, for one-tap repeat
  loaded: boolean; // saved prefs have been read; only then is it safe to write them
};

type Action =
  | { type: "answer"; key: keyof typeof CHOICES; value: string }
  | { type: "kit"; id: KitId }
  | { type: "next" }
  | { type: "back" }
  | { type: "plan"; plan: Step[] }
  | { type: "quick"; answers: Answers; plan: Step[] }
  | { type: "prefs"; muted: boolean; last: Answers | null }
  | { type: "mute" }
  | { type: "start" | "tick" | "pause" | "resume" | "toggle" | "skip" | "end"; now: number }
  | { type: "restart" };

const initial: State = {
  screen: "questions", question: 0, answers: {}, plan: [], index: 0, endsAt: 0, pausedLeft: null, now: 0,
  startedAt: 0, doneAt: 0, endedEarly: false, confirmEndUntil: 0, muted: false, last: null, loaded: false,
};

function advance(s: State, now: number): State {
  const index = s.index + 1;
  if (index >= s.plan.length) return { ...s, screen: "done", endedEarly: false, doneAt: now, now };
  return { ...s, index, endsAt: now + s.plan[index].seconds * 1000, now };
}

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "answer": {
      const answers: Partial<Answers> = { ...s.answers, [a.key]: a.value };
      // home: start the kit from what was used last time (or body weight only); gym needs no kit
      if (a.key === "place") answers.kit = a.value === "home" ? (s.answers.kit ?? s.last?.kit ?? []) : undefined;
      const last = s.question === questionsFor(answers).length - 1;
      return { ...s, answers, question: last ? s.question : s.question + 1, screen: last ? "summary" : "questions" };
    }
    case "kit": {
      const kit = s.answers.kit ?? [];
      return { ...s, answers: { ...s.answers, kit: kit.includes(a.id) ? kit.filter((k) => k !== a.id) : [...kit, a.id] } };
    }
    case "next":
      return { ...s, question: s.question + 1 };
    case "back":
      return s.screen === "summary" ? { ...s, screen: "questions" } : { ...s, question: Math.max(0, s.question - 1) };
    case "plan":
      return { ...s, plan: a.plan };
    case "quick":
      return { ...s, answers: a.answers, plan: a.plan, question: questionsFor(a.answers).length - 1, screen: "summary" };
    case "prefs":
      return { ...s, muted: a.muted, last: a.last, loaded: true };
    case "mute":
      return { ...s, muted: !s.muted };
    case "start":
      return {
        ...s, screen: "countdown", index: 0, pausedLeft: null, confirmEndUntil: 0, endsAt: a.now + COUNTDOWN * 1000, now: a.now,
        last: s.answers as Answers, // remembered for the "Same as last time" shortcut
      };
    case "tick":
      if (s.pausedLeft !== null || a.now < s.endsAt) return { ...s, now: a.now };
      if (s.screen === "countdown") {
        return { ...s, screen: "session", index: 0, startedAt: a.now, endsAt: a.now + s.plan[0].seconds * 1000, now: a.now };
      }
      return advance(s, a.now);
    case "pause":
      return { ...s, pausedLeft: Math.max(0, s.endsAt - a.now), now: a.now };
    case "resume":
      return { ...s, endsAt: a.now + (s.pausedLeft ?? 0), pausedLeft: null, now: a.now };
    case "toggle":
      return reducer(s, { type: s.pausedLeft === null ? "pause" : "resume", now: a.now });
    case "skip":
      return advance({ ...s, pausedLeft: null }, a.now);
    case "end":
      if (a.now < s.confirmEndUntil) return { ...s, screen: "done", endedEarly: true, doneAt: a.now, now: a.now };
      return { ...s, confirmEndUntil: a.now + CONFIRM_MS, now: a.now };
    case "restart":
      return { ...initial, muted: s.muted, last: s.last, loaded: s.loaded };
  }
}

// Short beeps via Web Audio: no sound files to load. The context is created on the Start tap
// because browsers only allow audio after a user gesture.
function tone(ctx: AudioContext | null, freq: number, seconds: number) {
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + seconds);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + seconds);
  } catch {
    // audio is a nice-to-have; never break the workout over it
  }
}

export default function WorkoutFlow({ pool }: { pool: PoolExercise[] }) {
  const [s, dispatch] = useReducer(reducer, initial);
  const audio = useRef<AudioContext | null>(null);
  const running = s.screen === "countdown" || s.screen === "session";
  const paused = s.pausedLeft !== null;
  const secondsLeft = Math.ceil((s.pausedLeft ?? Math.max(0, s.endsAt - s.now)) / 1000);

  const start = () => {
    try {
      audio.current ??= new AudioContext();
      void audio.current.resume();
    } catch {
      audio.current = null;
    }
    dispatch({ type: "start", now: Date.now() });
  };

  // saved preferences: mute setting and the last workout's answers
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}");
      dispatch({ type: "prefs", muted: Boolean(saved.muted), last: saved.last ?? null });
    } catch {
      dispatch({ type: "prefs", muted: false, last: null }); // storage blocked or corrupt: start fresh
    }
  }, []);

  useEffect(() => {
    if (!s.loaded) return; // don't overwrite saved prefs before they've been read
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify({ muted: s.muted, last: s.last }));
    } catch {
      // storage blocked: preferences just won't persist
    }
  }, [s.loaded, s.muted, s.last]);

  // clock: deadline-based so the timer stays accurate even if ticks arrive late
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => dispatch({ type: "tick", now: Date.now() }), 200);
    return () => clearInterval(id);
  }, [running]);

  // keep the phone screen on during the workout (where supported)
  useEffect(() => {
    if (!running) return;
    let lock: WakeLockSentinel | undefined;
    navigator.wakeLock?.request("screen").then((l) => (lock = l)).catch(() => {});
    return () => void lock?.release().catch(() => {});
  }, [running]);

  // 3-2-1 beeps before every switch, so you don't have to watch the screen
  useEffect(() => {
    if (running && !s.muted && !paused && secondsLeft >= 1 && secondsLeft <= 3) tone(audio.current, 660, 0.09);
  }, [secondsLeft, running, s.muted, paused]);

  // a longer tone + buzz when work or rest starts
  useEffect(() => {
    if (s.screen !== "session") return;
    if (!s.muted) tone(audio.current, s.index % 2 ? 520 : 990, 0.35);
    navigator.vibrate?.(s.index % 2 ? [60, 60, 60] : 150);
  }, [s.screen, s.index, s.muted]);

  useEffect(() => {
    if (s.screen === "done" && !s.endedEarly && !s.muted) [0, 0.18, 0.36].forEach((d, i) => setTimeout(() => tone(audio.current, 660 + i * 220, 0.25), d * 1000));
  }, [s.screen, s.endedEarly, s.muted]);

  // desktop: Space pauses, → skips (buttons keep their own Space behaviour)
  useEffect(() => {
    if (s.screen !== "session") return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("button, a, input")) return;
      if (e.key === " ") {
        e.preventDefault();
        dispatch({ type: "toggle", now: Date.now() });
      } else if (e.key === "ArrowRight") {
        dispatch({ type: "skip", now: Date.now() });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [s.screen]);

  if (s.screen === "questions") {
    const keys = questionsFor(s.answers);
    const key = keys[s.question];
    return (
      <section className="flow" key={`q${s.question}`}>
        <div className="flow-head">
          {s.question > 0 ? (
            <button className="icon-btn" aria-label="Back" onClick={() => dispatch({ type: "back" })}>
              <Icon name="back" />
            </button>
          ) : (
            <Link href="/" className="icon-btn" aria-label="Back to start">
              <Icon name="back" />
            </Link>
          )}
          <div className="step-bars" aria-hidden="true">
            {keys.map((k, i) => (
              <span key={k} className={i <= s.question ? "on" : ""} />
            ))}
          </div>
          <span className="step-count">
            {s.question + 1} of {keys.length}
          </span>
        </div>

        {s.question === 0 && s.last && (
          <button className="repeat-card" onClick={() => dispatch({ type: "quick", answers: s.last!, plan: buildPlan(pool, s.last!) })}>
            <span className="repeat-icon">
              <Icon name="redo" />
            </span>
            <span className="option-text">
              <span className="option-label">Same as last time</span>
              <span className="option-blurb">{describe(s.last)}</span>
            </span>
            <Icon name="arrow" size={18} />
          </button>
        )}

        {key === "kit" ? (
          <KitQuestion kit={s.answers.kit ?? []} onToggle={(id) => dispatch({ type: "kit", id })} onNext={() => dispatch({ type: "next" })} />
        ) : (
          <>
            <h1>{CHOICES[key].title}</h1>
            <div className="options">
              {CHOICES[key].options.map((o) => (
                <button
                  key={o.value}
                  className="option"
                  aria-pressed={s.answers[key] === o.value}
                  onClick={() => {
                    // last answer: pick the exercises now (once), so the summary shows a stable plan
                    if (s.question === keys.length - 1) {
                      dispatch({ type: "plan", plan: buildPlan(pool, { ...s.answers, [key]: o.value } as Answers) });
                    }
                    dispatch({ type: "answer", key, value: o.value });
                  }}
                >
                  <span className="option-icon">
                    <Icon name={OPTION_ICON[o.value]} size={26} />
                  </span>
                  <span className="option-text">
                    <span className="option-label">{o.label}</span>
                    {o.blurb && <span className="option-blurb">{o.blurb}</span>}
                  </span>
                  <Icon name="arrow" size={18} />
                </button>
              ))}
            </div>
          </>
        )}
      </section>
    );
  }

  if (s.screen === "summary") {
    const a = s.answers as Answers;
    const level = LEVELS[a.level];
    const moves = s.plan.filter((st) => st.kind === "work");
    return (
      <section className="flow has-action-bar">
        <div className="flow-head">
          <button className="icon-btn" aria-label="Change answers" onClick={() => dispatch({ type: "back" })}>
            <Icon name="back" />
          </button>
          <span className="step-count">Your workout</span>
        </div>
        <h1>
          {FOCUS[a.focus].label}, {level.label.toLowerCase()}
        </h1>
        <ul className="meta">
          <li>About {Math.round(totalSeconds(s.plan) / 60)} min</li>
          <li>{moves.length} exercises</li>
          <li>
            {level.work}s work, {level.rest}s rest
          </li>
          <li>{a.place === "home" ? (a.kit?.length ? `Home + ${a.kit.length} kit` : "Home, body weight") : PLACES[a.place as Place].label}</li>
        </ul>
        <ol className="plan">
          {moves.map((st) => (
            <li key={st.exercise.id}>
              <Image src={st.exercise.gif} alt="" width={64} height={64} unoptimized />
              <span>
                <b>{st.exercise.name}</b>
                <small>{st.exercise.target}</small>
              </span>
            </li>
          ))}
        </ol>
        <div className="action-bar">
          <button className="icon-btn" aria-label="Shuffle exercises" title="Shuffle exercises" onClick={() => dispatch({ type: "plan", plan: buildPlan(pool, a) })}>
            <Icon name="shuffle" />
          </button>
          <button className="primary" disabled={!moves.length} onClick={start}>
            <Icon name="play" size={20} /> Start workout
          </button>
        </div>
      </section>
    );
  }

  if (s.screen === "countdown") {
    return (
      <section className="stage is-count" aria-live="assertive">
        <p className="stage-note">Get ready</p>
        {/* key remounts each number so the pop animation replays */}
        <span className="count-number" key={secondsLeft}>
          {secondsLeft || "Go"}
        </span>
        <p className="stage-note">First up: {s.plan[0].exercise.name}</p>
      </section>
    );
  }

  if (s.screen === "session") {
    const step = s.plan[s.index];
    const work = step.kind === "work";
    const moves = Math.ceil(s.plan.length / 2);
    const moveNo = Math.floor(s.index / 2) + 1; // during rest: the move just finished
    const left = (s.pausedLeft ?? Math.max(0, s.endsAt - s.now)) / (step.seconds * 1000);
    const confirming = s.now < s.confirmEndUntil;
    const label = work
      ? moveNo === moves ? "Last one. Give it everything" : `Exercise ${moveNo} of ${moves}`
      : moves - moveNo === 1 ? "Rest. One more to go" : `Rest. ${moves - moveNo} to go`;

    return (
      <section className={`stage ${work ? "is-work" : "is-rest"}${paused ? " is-paused" : ""}`}>
        <header className="session-top">
          {/* one pill per exercise: done = full, current = fills with its timer, upcoming = empty */}
          <div className="pills" role="progressbar" aria-label="Workout progress" aria-valuemin={0} aria-valuemax={moves} aria-valuenow={work ? moveNo - 1 : moveNo}>
            {Array.from({ length: moves }, (_, k) => {
              const fill = s.index > 2 * k ? 1 : s.index === 2 * k ? 1 - left : 0;
              return (
                <span key={k} className="pill">
                  <span style={{ width: `${fill * 100}%` }} />
                </span>
              );
            })}
          </div>
          <div className="session-meta">
            <span>{label}</span>
            <button className="icon-btn" aria-label={s.muted ? "Turn sound on" : "Turn sound off"} onClick={() => dispatch({ type: "mute" })}>
              <Icon name={s.muted ? "mute" : "sound"} />
            </button>
          </div>
        </header>

        <div className="session-main">
          <div className="ring-timer" aria-live="polite" aria-label={`${secondsLeft} seconds left`}>
            <svg viewBox="0 0 120 120" aria-hidden="true">
              <circle className="ring-track" cx="60" cy="60" r="54" />
              {/* key: a new step starts with a full ring instead of animating back up */}
              <circle key={s.index} className="ring-bar" cx="60" cy="60" r="54" strokeDasharray={RING} strokeDashoffset={RING * (1 - left)} />
            </svg>
            <span className="timer">{secondsLeft}</span>
            <span className="ring-label">{paused ? "Paused" : work ? "Work" : "Rest"}</span>
          </div>
          <Image
            key={`${s.index}-demo`}
            className="session-demo"
            src={step.exercise.gif}
            alt={`${step.exercise.name} demonstration`}
            width={320}
            height={320}
            unoptimized
          />
          <p className="session-sub">{work ? step.exercise.target : "Up next"}</p>
          <h2 className="session-name">{step.exercise.name}</h2>
        </div>

        <div className="controls">
          <button className={`round${confirming ? " is-confirm" : ""}`} onClick={() => dispatch({ type: "end", now: Date.now() })}>
            <Icon name="stop" size={20} />
            <span>{confirming ? "Tap again" : "End"}</span>
          </button>
          <button className="round big" aria-label={paused ? "Resume" : "Pause"} onClick={() => dispatch({ type: "toggle", now: Date.now() })}>
            <Icon name={paused ? "play" : "pause"} size={34} />
          </button>
          <button className="round" onClick={() => dispatch({ type: "skip", now: Date.now() })}>
            <Icon name="skip" size={20} />
            <span>Skip</span>
          </button>
        </div>
      </section>
    );
  }

  const total = Math.ceil(s.plan.length / 2);
  const finished = s.endedEarly ? Math.ceil(s.index / 2) : total;
  const a = s.answers as Answers;
  return (
    <section className="flow done">
      <span className={`done-badge${s.endedEarly ? " is-partial" : ""}`}>
        <svg viewBox="0 0 24 24" width="44" height="44" aria-hidden="true">
          <path className="done-check" d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </span>
      <h1>{s.endedEarly ? "Workout ended" : "Workout complete"}</h1>
      <p className="lead">
        {s.endedEarly
          ? `You finished ${finished} of ${total}. Run it again to finish the last ${total - finished}.`
          : `All ${total} exercises done. Nice work.`}
      </p>
      <dl className="stats">
        <div>
          <dt>Time</dt>
          <dd>{clock(s.doneAt - s.startedAt)}</dd>
        </div>
        <div>
          <dt>Exercises</dt>
          <dd>
            {finished}/{total}
          </dd>
        </div>
        <div>
          <dt>Level</dt>
          <dd>{LEVELS[a.level].label}</dd>
        </div>
      </dl>
      <button className="primary" onClick={start}>
        <Icon name="redo" size={20} /> Do it again
      </button>
      <button className="secondary" onClick={() => dispatch({ type: "restart" })}>
        <Icon name="shuffle" size={18} /> New workout
      </button>
      <Link href="/" className="link">
        Back to start
      </Link>
    </section>
  );
}

/** Multi-choice: everything the user can use at home. Body weight is always in. */
function KitQuestion({ kit, onToggle, onNext }: { kit: KitId[]; onToggle: (id: KitId) => void; onNext: () => void }) {
  return (
    <>
      <h1>What do you have at home?</h1>
      <p className="lead">Body-weight moves are always included. Pick everything you can use.</p>
      <div className="kit-grid" role="group" aria-label="Home equipment">
        {HOME_KIT.map((k) => {
          const on = kit.includes(k.id);
          return (
            <button key={k.id} className="kit-tile" aria-pressed={on} onClick={() => onToggle(k.id)}>
              <span className="kit-check" aria-hidden="true">
                {on && <Icon name="check" size={14} />}
              </span>
              <Icon name={KIT_ICON[k.id]} size={30} />
              <span>{k.label}</span>
            </button>
          );
        })}
      </div>
      <div className="action-bar">
        <button className="primary" onClick={onNext}>
          {kit.length ? `Continue with ${kit.length} item${kit.length > 1 ? "s" : ""}` : "Continue with body weight only"}
        </button>
      </div>
    </>
  );
}
