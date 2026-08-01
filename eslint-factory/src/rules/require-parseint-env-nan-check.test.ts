import { RuleTester } from "eslint";
import { describe, expect, it } from "vitest";
import { requireParseIntEnvNanCheckRule } from "./require-parseint-env-nan-check";

const cjsRuleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: "commonjs",
  },
});

describe("require-parseint-env-nan-check", () => {
  it("uses the correct docs URL", () => {
    expect(requireParseIntEnvNanCheckRule.meta.docs.url).toBe("https://github.com/github/gh-aw/tree/main/eslint-factory#require-parseint-env-nan-check");
  });

  it("valid: validated with Number.isNaN / isInteger / isSafeInteger", () => {
    cjsRuleTester.run("require-parseint-env-nan-check", requireParseIntEnvNanCheckRule, {
      valid: [
        `const count = parseInt(process.env.GH_AW_MAX || "5", 10);
         if (Number.isNaN(count)) { throw new Error("bad"); }`,
        `const count = Number.parseInt(process.env.GH_AW_MAX || "5", 10);
         if (!Number.isInteger(count)) { throw new Error("bad"); }`,
        `let count = parseInt(process.env.GH_AW_MAX, 10);
         if (Number.isSafeInteger(count) === false) { throw new Error("bad"); }`,
        `let count;
         count = parseInt(process.env.GH_AW_MAX || "5", 10);
         if (isNaN(count)) { throw new Error("bad"); }`,
        // Not derived from process.env — out of scope for this rule.
        `const count = parseInt(rawValue, 10);`,
        // Inline usage (not assigned to a variable) — out of scope for this rule.
        `doSomething(parseInt(process.env.GH_AW_MAX || "5", 10));`,
      ],
      invalid: [],
    });
  });

  it("invalid: no NaN validation after parsing process.env value", () => {
    cjsRuleTester.run("require-parseint-env-nan-check", requireParseIntEnvNanCheckRule, {
      valid: [],
      invalid: [
        {
          code: `const maxRuns = parseInt(process.env.GH_AW_RATE_LIMIT_MAX || "5", 10);`,
          errors: [{ messageId: "requireNanCheck", data: { name: "maxRuns", envVar: "GH_AW_RATE_LIMIT_MAX" } }],
        },
        {
          code: `const port = Number.parseInt(process.env.GH_AW_SAFE_OUTPUTS_PORT || "3001", 10);`,
          errors: [{ messageId: "requireNanCheck", data: { name: "port", envVar: "GH_AW_SAFE_OUTPUTS_PORT" } }],
        },
        {
          code: `let windowMinutes;
                 windowMinutes = parseInt(process.env.GH_AW_RATE_LIMIT_WINDOW?.trim() || "60", 10);`,
          errors: [{ messageId: "requireNanCheck", data: { name: "windowMinutes", envVar: "GH_AW_RATE_LIMIT_WINDOW" } }],
        },
      ],
    });
  });
});
