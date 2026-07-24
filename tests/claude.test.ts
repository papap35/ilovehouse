import { describe, expect, it } from "vitest";
import { extractJson, extractTextFromResponse } from "../lib/claude";

describe("extractTextFromResponse", () => {
  it("returns the text of a normal text-only response", () => {
    const data = { content: [{ type: "text", text: "hello world" }] };
    expect(extractTextFromResponse(data)).toBe("hello world");
  });

  it("skips leading thinking blocks and returns the text block", () => {
    const data = {
      content: [
        { type: "thinking", thinking: "reasoning..." },
        { type: "text", text: "the actual answer" },
      ],
    };
    expect(extractTextFromResponse(data)).toBe("the actual answer");
  });

  it("returns the first text block when there are multiple", () => {
    const data = {
      content: [
        { type: "text", text: "first" },
        { type: "text", text: "second" },
      ],
    };
    expect(extractTextFromResponse(data)).toBe("first");
  });

  it("throws a descriptive error when only a thinking block is present (e.g. truncated by max_tokens)", () => {
    const data = {
      content: [{ type: "thinking", thinking: "still reasoning" }],
      stop_reason: "max_tokens",
    };
    expect(() => extractTextFromResponse(data)).toThrow(/thinking/);
    expect(() => extractTextFromResponse(data)).toThrow(/max_tokens/);
  });

  it("throws and reports an empty array when content is empty", () => {
    expect(() => extractTextFromResponse({ content: [] })).toThrow(/空陣列/);
  });

  it("throws when content is missing entirely", () => {
    expect(() => extractTextFromResponse({})).toThrow(/回應格式不符預期/);
  });

  it("throws when content is not an array", () => {
    expect(() => extractTextFromResponse({ content: "not-an-array" })).toThrow(
      /回應格式不符預期/
    );
  });

  it("includes a snippet of the raw response in the error for debugging", () => {
    const data = { content: [{ type: "thinking", thinking: "x" }], stop_reason: "max_tokens" };
    expect(() => extractTextFromResponse(data)).toThrow(/"stop_reason":"max_tokens"/);
  });
});

describe("extractJson", () => {
  it("parses a plain JSON object", () => {
    expect(extractJson<{ a: number }>('{"a": 1}')).toEqual({ a: 1 });
  });

  it("parses JSON wrapped in a fenced code block", () => {
    const raw = '```json\n{"a": 1, "b": [1,2,3]}\n```';
    expect(extractJson<{ a: number; b: number[] }>(raw)).toEqual({ a: 1, b: [1, 2, 3] });
  });

  it("parses JSON with surrounding explanatory text", () => {
    const raw = 'Here is the result:\n{"a": 1}\nHope that helps!';
    expect(extractJson<{ a: number }>(raw)).toEqual({ a: 1 });
  });

  it("throws when no JSON object can be found", () => {
    expect(() => extractJson("no json here")).toThrow(/找不到 JSON/);
  });
});
