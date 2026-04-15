import { describe, it, expect } from "vitest";
import { parseGameString } from "@/utils/stringTokenizer";

describe("parseGameString", () => {
  it("returns a single text token for plain text", () => {
    expect(parseGameString("Hello world")).toEqual([
      { type: "text", value: "Hello world" },
    ]);
  });

  it("returns an empty array for an empty string", () => {
    expect(parseGameString("")).toEqual([]);
  });

  it("parses a variable token {count}", () => {
    expect(parseGameString("{count}")).toEqual([
      { type: "variable", name: "count" },
    ]);
  });

  it("parses multiple variable tokens", () => {
    expect(parseGameString("{a} and {b}")).toEqual([
      { type: "variable", name: "a" },
      { type: "text", value: " and " },
      { type: "variable", name: "b" },
    ]);
  });

  it("parses a self-closing tag with attributes", () => {
    expect(parseGameString('<skill skill="woodcutting"/>')).toEqual([
      { type: "skill", skill: "woodcutting" },
    ]);
  });

  it("parses a self-closing tag with multiple attributes", () => {
    expect(parseGameString('<item id="123" name="sword"/>')).toEqual([
      { type: "item", id: "123", name: "sword" },
    ]);
  });

  it("parses a paired tag", () => {
    expect(parseGameString("<hl>important</hl>")).toEqual([
      { type: "hl", value: "important" },
    ]);
  });

  it("parses text surrounding a paired tag", () => {
    expect(parseGameString("Click <hl>here</hl> now")).toEqual([
      { type: "text", value: "Click " },
      { type: "hl", value: "here" },
      { type: "text", value: " now" },
    ]);
  });

  it("parses text before and after a variable token", () => {
    expect(parseGameString("You have {count} items")).toEqual([
      { type: "text", value: "You have " },
      { type: "variable", name: "count" },
      { type: "text", value: " items" },
    ]);
  });

  it("parses mixed tokens in a complex string", () => {
    expect(
      parseGameString('Complete {count} times using <skill skill="mining"/> to earn <hl>rewards</hl>.')
    ).toEqual([
      { type: "text", value: "Complete " },
      { type: "variable", name: "count" },
      { type: "text", value: " times using " },
      { type: "skill", skill: "mining" },
      { type: "text", value: " to earn " },
      { type: "hl", value: "rewards" },
      { type: "text", value: "." },
    ]);
  });

  it("parses consecutive tokens with no surrounding text", () => {
    expect(parseGameString("{a}{b}")).toEqual([
      { type: "variable", name: "a" },
      { type: "variable", name: "b" },
    ]);
  });

  describe("stat token", () => {
    it("parses a self-closing stat tag", () => {
      expect(parseGameString('<stat s="workEfficiency"/>')).toEqual([
        { type: "stat", s: "workEfficiency" },
      ]);
    });

    it("parses a paired stat tag with inner text", () => {
      expect(parseGameString('<stat s="findGems">chance to find gems</stat>')).toEqual([
        { type: "stat", s: "findGems", text: "chance to find gems" },
      ]);
    });

    it("parses stat token mixed with surrounding text", () => {
      expect(
        parseGameString('Grants <stat s="findGems">chance to find gems</stat> bonus.')
      ).toEqual([
        { type: "text", value: "Grants " },
        { type: "stat", s: "findGems", text: "chance to find gems" },
        { type: "text", value: " bonus." },
      ]);
    });

    it("existing plain paired tags still use value", () => {
      expect(parseGameString("<hl>important</hl>")).toEqual([
        { type: "hl", value: "important" },
      ]);
    });
  });
});
