import { AST_NODE_TYPES, ESLintUtils, TSESTree } from "@typescript-eslint/utils";

const createRule = ESLintUtils.RuleCreator(name => `https://github.com/github/gh-aw/tree/main/eslint-factory#${name}`);

const PARSE_INT_GLOBAL_OBJECTS = new Set(["Number", "globalThis", "window", "global"]);

/**
 * Returns true when the callee is the global `parseInt` identifier, or
 * `Number.parseInt` / `globalThis.parseInt` / etc.
 */
function isParseIntCall(node: TSESTree.CallExpression): boolean {
  const callee = node.callee;
  if (callee.type === AST_NODE_TYPES.Identifier && callee.name === "parseInt") return true;
  if (callee.type === AST_NODE_TYPES.MemberExpression && !callee.computed && callee.object.type === AST_NODE_TYPES.Identifier && PARSE_INT_GLOBAL_OBJECTS.has(callee.object.name) && callee.property.type === AST_NODE_TYPES.Identifier && callee.property.name === "parseInt") {
    return true;
  }
  return false;
}

/**
 * Returns true when `node` is a `process.env.SOME_VAR` (or `process.env["SOME_VAR"]`)
 * member expression.
 */
function isProcessEnvAccess(node: TSESTree.Node): boolean {
  if (node.type !== AST_NODE_TYPES.MemberExpression) return false;
  const object = node.object;
  return object.type === AST_NODE_TYPES.MemberExpression && !object.computed && object.object.type === AST_NODE_TYPES.Identifier && object.object.name === "process" && object.property.type === AST_NODE_TYPES.Identifier && object.property.name === "env";
}

/**
 * Returns true when the expression tree passed as the first argument to
 * parseInt() reads from `process.env` anywhere within it — directly, through
 * a `||` / `??` fallback, or a `.trim()` call on the env access.
 */
function containsProcessEnvAccess(node: TSESTree.Node): boolean {
  if (isProcessEnvAccess(node)) return true;

  if (node.type === AST_NODE_TYPES.ChainExpression) {
    return containsProcessEnvAccess(node.expression);
  }

  if (node.type === AST_NODE_TYPES.LogicalExpression && (node.operator === "||" || node.operator === "??")) {
    return containsProcessEnvAccess(node.left) || containsProcessEnvAccess(node.right);
  }

  if (node.type === AST_NODE_TYPES.CallExpression && node.callee.type === AST_NODE_TYPES.MemberExpression) {
    return containsProcessEnvAccess(node.callee.object);
  }

  return false;
}

export const requireParseIntEnvNanCheckRule = createRule({
  name: "require-parseint-env-nan-check",
  meta: {
    type: "problem",
    docs: {
      description:
        "Require a Number.isNaN()/Number.isInteger()/Number.isSafeInteger() validation for parseInt()/Number.parseInt() results derived from process.env values in actions/setup/js. " +
        "Env vars are attacker- or misconfiguration-controlled free text; a non-numeric value silently parses to NaN, which then poisons downstream numeric comparisons " +
        "(e.g., a disabled rate limit or size guard) instead of failing loudly.",
    },
    schema: [],
    messages: {
      requireNanCheck: "Validate '{{name}}' with Number.isNaN(...), Number.isInteger(...), or Number.isSafeInteger(...) after parsing process.env.{{envVar}} — an unvalidated NaN can silently bypass numeric guards (limits, thresholds, counts).",
    },
  },
  defaultOptions: [],
  create(context) {
    const sourceCode = context.sourceCode;

    /**
     * Returns true when the enclosing Program/function body contains a
     * Number.isNaN(name) / Number.isInteger(name) / Number.isSafeInteger(name)
     * (or global isNaN(name)) call anywhere in its source text.
     */
    function hasNanCheckInScope(name: string, node: TSESTree.Node): boolean {
      let current: TSESTree.Node | undefined = node;
      while (current) {
        if (current.type === AST_NODE_TYPES.BlockStatement || current.type === AST_NODE_TYPES.Program) {
          const text = sourceCode.getText(current);
          const pattern = new RegExp(`\\b(?:Number\\.isNaN|Number\\.isInteger|Number\\.isSafeInteger|isNaN)\\s*\\(\\s*${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*[,)]`);
          if (pattern.test(text)) return true;
        }
        current = current.parent;
      }
      return false;
    }

    return {
      CallExpression(node) {
        if (!isParseIntCall(node)) return;

        const firstArg = node.arguments[0];
        if (!firstArg || !containsProcessEnvAccess(firstArg)) return;

        // Find the env var name for the diagnostic message (best-effort; walks into || / ?? / .trim()).
        function findEnvVarName(n: TSESTree.Node): string | null {
          if (n.type === AST_NODE_TYPES.MemberExpression && isProcessEnvAccess(n)) {
            return n.property.type === AST_NODE_TYPES.Identifier ? n.property.name : n.property.type === AST_NODE_TYPES.Literal ? String(n.property.value) : null;
          }
          if (n.type === AST_NODE_TYPES.ChainExpression) return findEnvVarName(n.expression);
          if (n.type === AST_NODE_TYPES.LogicalExpression) return findEnvVarName(n.left) || findEnvVarName(n.right);
          if (n.type === AST_NODE_TYPES.CallExpression && n.callee.type === AST_NODE_TYPES.MemberExpression) return findEnvVarName(n.callee.object);
          return null;
        }
        const envVar = findEnvVarName(firstArg) ?? "?";

        // Only flag direct assignment forms: `const x = parseInt(...)`, `let x = parseInt(...)`,
        // or `x = parseInt(...)` — these are the shapes where a later validation is expected and
        // detectable. Calls used inline (e.g., passed directly as an argument) are out of scope.
        const parent = node.parent;
        let assignedName: string | null = null;
        if (parent.type === AST_NODE_TYPES.VariableDeclarator && parent.id.type === AST_NODE_TYPES.Identifier && parent.init === node) {
          assignedName = parent.id.name;
        } else if (parent.type === AST_NODE_TYPES.AssignmentExpression && parent.operator === "=" && parent.left.type === AST_NODE_TYPES.Identifier && parent.right === node) {
          assignedName = parent.left.name;
        }
        if (!assignedName) return;

        if (hasNanCheckInScope(assignedName, node)) return;

        context.report({
          node,
          messageId: "requireNanCheck",
          data: { name: assignedName, envVar },
        });
      },
    };
  },
});
