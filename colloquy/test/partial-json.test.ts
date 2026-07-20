import { describe, expect, it } from "vitest";
import { extractPartialStringField } from "../lib/partial-json";

describe("extractPartialStringField", () => {
  it("returns empty until the field appears", () => {
    expect(extractPartialStringField('{"agentId": "huff", "posi', "position")).toBe("");
  });

  it("extracts a partial value mid-stream", () => {
    expect(
      extractPartialStringField('{"position": "Every lie is', "position"),
    ).toBe("Every lie is");
  });

  it("extracts a completed value", () => {
    expect(
      extractPartialStringField('{"position": "Every lie is sin.", "rea', "position"),
    ).toBe("Every lie is sin.");
  });

  it("decodes escapes, including a trailing incomplete escape", () => {
    expect(
      extractPartialStringField('{"reasoning": "line one\\nline \\"two\\', "reasoning"),
    ).toBe('line one\nline "two');
  });

  it("decodes unicode escapes and ignores incomplete ones at the edge", () => {
    expect(extractPartialStringField('{"a": "x\\u00e9y"', "a")).toBe("xéy");
    expect(extractPartialStringField('{"a": "x\\u00e', "a")).toBe("x");
  });
});
