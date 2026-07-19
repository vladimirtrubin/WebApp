/**
 * Persistent, always-visible provenance notice. Required by design: these are
 * AI approximations of real people, one of whom (Wesley Huff) is living.
 */
export function Disclaimer() {
  return (
    <footer
      role="contentinfo"
      className="sticky bottom-0 border-t border-chamber-line bg-chamber-bg/95 py-3 text-xs leading-relaxed text-chamber-muted backdrop-blur"
    >
      <p>
        <span className="font-semibold text-chamber-ink">
          AI simulation notice:
        </span>{" "}
        every voice in this colloquy is an AI approximation reconstructed from
        each theologian&rsquo;s documented writings. It is not their words, and
        may misstate their views.{" "}
        <span className="text-chamber-ink">
          Wesley Huff is a living person; his simulated positions are inferred
          from public work and may misrepresent him.
        </span>{" "}
        Verify against the primary sources before quoting anyone.
      </p>
    </footer>
  );
}
