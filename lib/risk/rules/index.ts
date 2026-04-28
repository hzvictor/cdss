/**
 * Single source of truth for the *currently active* rule library version.
 * Bump this re-export when shipping a new version; old versions stay queryable
 * via the RuleSource table for audit on historical assessments.
 */
export { RULES_V2 as CURRENT_RULES, RULE_VERSION } from "./v2";
export type { RuleDef } from "./v1";
