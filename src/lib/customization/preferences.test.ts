import { DEFAULT_PREFERENCES, parsePreferences } from "./preferences";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`PREFERENCES: ${message}`);
}

const custom = parsePreferences({
  accentColor: "#13a2bc",
  backgroundImage: `data:image/jpeg;base64,${"a".repeat(100)}`,
  dashboard: { hero: false, metricTasks: false },
  vault: { metricTotal: false },
  hiddenNavigation: ["/modules/vault", "/admin", "javascript:alert(1)"],
});
assert(custom.accentColor === "#13a2bc", "preserves a valid custom color");
assert(custom.backgroundImage?.startsWith("data:image/jpeg;base64,") === true, "accepts bounded JPEG data URLs");
assert(custom.dashboard.hero === false && custom.dashboard.metricTasks === false, "persists independent dashboard visibility controls");
assert(custom.dashboard.metricProjects && custom.vault.metricTotal === false && custom.vault.items, "defaults unspecified visibility settings without overriding stored choices");
assert(custom.hiddenNavigation.length === 1 && custom.hiddenNavigation[0] === "/modules/vault", "only allows known hideable navigation links");
assert(parsePreferences({ accentColor: "url(javascript:alert(1))", backgroundImage: "data:text/html,hello" }).accentColor === DEFAULT_PREFERENCES.accentColor, "rejects invalid theme values");
assert(parsePreferences({ backgroundImage: `data:image/jpeg;base64,${"a".repeat(700_001)}` }).backgroundImage === null, "rejects oversized background images");
console.log("Customization preference validation passed.");
