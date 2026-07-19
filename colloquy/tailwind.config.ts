import type { Config } from "tailwindcss";

/**
 * Deliberate visual system: a dark "chamber / archive" aesthetic — deep
 * blue-black surfaces, high-contrast ink, cool neutrals, and per-agent
 * accent colors supplied by the persona registry (inline CSS vars).
 * Explicitly NOT the default cream-serif-terracotta look.
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        chamber: {
          bg: "#0E1116",
          surface: "#161B22",
          raised: "#1C2330",
          line: "#2B3442",
          ink: "#E6EDF3",
          muted: "#93A1B0",
          faint: "#5C6875",
          gold: "#D4A72C",
        },
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
      maxWidth: {
        chamber: "72rem",
      },
    },
  },
  plugins: [],
};

export default config;
