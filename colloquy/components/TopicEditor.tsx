"use client";

const MAX_TOPIC_LENGTH = 2000;

export interface TopicEditorProps {
  topic: string;
  maxRounds: number;
  running: boolean;
  onTopicChange: (topic: string) => void;
  onMaxRoundsChange: (rounds: number) => void;
  onConvene: () => void;
  onAdjourn: () => void;
}

export function TopicEditor({
  topic,
  maxRounds,
  running,
  onTopicChange,
  onMaxRoundsChange,
  onConvene,
  onAdjourn,
}: TopicEditorProps) {
  const trimmed = topic.trim();
  const tooLong = trimmed.length > MAX_TOPIC_LENGTH;
  const canConvene = !running && trimmed.length > 0 && !tooLong;

  return (
    <section
      aria-label="Question before the panel"
      className="rounded-lg border border-chamber-line bg-chamber-surface p-4"
    >
      <label
        htmlFor="topic"
        className="font-mono text-xs uppercase tracking-widest text-chamber-muted"
      >
        The question before the panel
      </label>
      <textarea
        id="topic"
        value={topic}
        onChange={(e) => onTopicChange(e.target.value)}
        disabled={running}
        rows={3}
        maxLength={MAX_TOPIC_LENGTH + 100}
        className="mt-2 w-full resize-y rounded-md border border-chamber-line bg-chamber-bg p-3 text-sm text-chamber-ink placeholder:text-chamber-faint disabled:opacity-60"
        placeholder="e.g. Was Rahab's lie to the king of Jericho righteous, sinful-but-pardoned, or something else?"
      />
      <div className="mt-1 flex items-center justify-between text-xs text-chamber-faint">
        <span aria-live="polite">
          {tooLong
            ? `Too long by ${trimmed.length - MAX_TOPIC_LENGTH} characters`
            : `${trimmed.length}/${MAX_TOPIC_LENGTH}`}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label htmlFor="rounds" className="text-sm text-chamber-muted">
          Max debate rounds
        </label>
        <select
          id="rounds"
          value={maxRounds}
          onChange={(e) => onMaxRoundsChange(Number(e.target.value))}
          disabled={running}
          className="rounded-md border border-chamber-line bg-chamber-bg px-2 py-1 text-sm disabled:opacity-60"
        >
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>

        {running ? (
          <button
            type="button"
            onClick={onAdjourn}
            className="ml-auto rounded-md border border-red-400/50 px-4 py-2 text-sm font-medium text-red-300 hover:bg-red-400/10"
          >
            Adjourn early
          </button>
        ) : (
          <button
            type="button"
            onClick={onConvene}
            disabled={!canConvene}
            className="ml-auto rounded-md bg-chamber-gold px-4 py-2 text-sm font-semibold text-chamber-bg hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Convene the colloquy
          </button>
        )}
      </div>
    </section>
  );
}
