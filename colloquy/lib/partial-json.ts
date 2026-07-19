/**
 * Best-effort extraction of a string field from a *partial* JSON document.
 * Used client-side to surface prose token-by-token while a statement's JSON
 * is still streaming. Never throws; returns "" until the field appears.
 */
export function extractPartialStringField(raw: string, field: string): string {
  const key = `"${field}"`;
  const keyIdx = raw.indexOf(key);
  if (keyIdx === -1) return "";

  let i = keyIdx + key.length;
  while (i < raw.length && (raw[i] === " " || raw[i] === "\n" || raw[i] === "\t")) i++;
  if (raw[i] !== ":") return "";
  i++;
  while (i < raw.length && (raw[i] === " " || raw[i] === "\n" || raw[i] === "\t")) i++;
  if (raw[i] !== '"') return "";
  i++;

  let out = "";
  while (i < raw.length) {
    const ch = raw[i];
    if (ch === "\\") {
      const next = raw[i + 1];
      if (next === undefined) break; // stream ended mid-escape
      switch (next) {
        case "n":
          out += "\n";
          break;
        case "t":
          out += "\t";
          break;
        case '"':
          out += '"';
          break;
        case "\\":
          out += "\\";
          break;
        case "/":
          out += "/";
          break;
        case "u": {
          const hex = raw.slice(i + 2, i + 6);
          if (hex.length < 4) return out; // incomplete unicode escape at stream edge
          const code = Number.parseInt(hex, 16);
          if (!Number.isNaN(code)) out += String.fromCharCode(code);
          i += 4;
          break;
        }
        default:
          out += next;
      }
      i += 2;
      continue;
    }
    if (ch === '"') break; // field complete
    out += ch;
    i++;
  }
  return out;
}
