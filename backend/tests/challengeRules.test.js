import { safeParseJson } from "../src/services/challengeRules.service.js";

describe("challengeRules.service unit tests", () => {
  test("safeParseJson returns parsed object for valid JSON", () => {
    const result = safeParseJson('{"goal":10,"type":"weekly"}');

    expect(result).toEqual({
      goal: 10,
      type: "weekly",
    });
  });

  test("safeParseJson returns fallback for invalid JSON", () => {
    const fallback = { defaultValue: true };

    const result = safeParseJson("{bad json}", fallback);

    expect(result).toEqual(fallback);
  });

  test("safeParseJson returns fallback when input is not a string", () => {
    const fallback = { defaultValue: true };

    const result = safeParseJson(null, fallback);

    expect(result).toEqual(fallback);
  });
});