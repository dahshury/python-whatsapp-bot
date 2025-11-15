import { describe, expect, it } from "vitest";

import {
  coerceNameValue,
  coerceNameValueIfNeeded,
  isNameColumnDefinition,
} from "../nameCoercion";

describe("coerceNameValue", () => {
  it("removes digits, special characters, trims, and capitalizes english names", () => {
    expect(coerceNameValue("  jAnE123!! DOE  ")).toBe("Jane Doe");
  });

  it("preserves non-english names without capitalization", () => {
    expect(coerceNameValue(" 张 伟 ")).toBe("张 伟");
  });

  it("converts separators into spaces for english names", () => {
    expect(coerceNameValue("mary-jane o'connor")).toBe("Mary Jane O Connor");
  });

  it("returns empty string when the name only contains numbers or symbols", () => {
    expect(coerceNameValue(" 1234 !!! ")).toBe("");
  });
});

describe("isNameColumnDefinition", () => {
  it("detects column metadata that represents a name field", () => {
    expect(isNameColumnDefinition({ id: "Name" })).toBe(true);
    expect(isNameColumnDefinition({ name: "NAME" })).toBe(true);
    expect(isNameColumnDefinition({ title: " name " })).toBe(true);
  });

  it("returns false for non-name identifiers", () => {
    expect(isNameColumnDefinition({ id: "nickname" })).toBe(false);
    expect(isNameColumnDefinition(undefined)).toBe(false);
  });
});

describe("coerceNameValueIfNeeded", () => {
  it("coerces values when the column matches a name field", () => {
    expect(coerceNameValueIfNeeded("  john123 ", { id: "name" })).toBe("John");
  });

  it("returns the original value when the column does not match", () => {
    expect(coerceNameValueIfNeeded("Team 9", { id: "team" })).toBe("Team 9");
  });
});
