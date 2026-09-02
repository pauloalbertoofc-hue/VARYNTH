import assert from "node:assert/strict";
import { athenaProactiveMonitor } from "../insights/proactive-monitor";
import { athenaSuggestionCenter } from "../insights/suggestion-center";
import { notificationStore } from "../../notifications/notification-store";
import type { AthenaEngineContext } from "../engine";

const ctx: AthenaEngineContext = {
  projects: [{ id: "p1", title: "Projeto crítico", description: "", category: "software", status: "ativo", priority: "alta", deadline: "2026-08-20", tags: [], createdAt: "2026-01-01", updatedAt: "2026-01-01" }],
  tasks: [{ id: "t1", projectId: "p1", title: "Entrega vencida", status: "a_fazer", priority: "urgente", dueDate: "2026-08-25", createdAt: "2026-01-01" }],
  notes: [], vaultItems: [], chronosEvents: [], theses: [], evidences: [], opportunities: [],
  addTask: (() => { throw new Error("not used"); }) as AthenaEngineContext["addTask"], addNote: () => undefined,
};

let passed = 0;
function check(name: string, run: () => void) { run(); passed += 1; console.log(`✓ ${name}`); }
const midday = new Date(2026, 8, 1, 12);
athenaProactiveMonitor.clearForTests(); athenaSuggestionCenter.clearForTests(); notificationStore.clearAll();

check("modo equilibrado emite alertas críticos", () => {
  const count = athenaProactiveMonitor.scan(ctx, midday);
  assert.ok(count >= 2);
  assert.ok(notificationStore.getAll().some((item) => item.type === "ATHENA_PROACTIVE_ALERT" && item.severity === "CRITICAL"));
});

check("alertas carregam motivo, evidências e ações", () => {
  const item = notificationStore.getAll().find((entry) => entry.type === "ATHENA_PROACTIVE_ALERT");
  assert.ok(item?.reason);
  assert.ok(item?.evidence?.length);
  assert.ok(item?.actions?.some((action) => action.type === "SNOOZE"));
});

check("deduplicação impede repetição em nova varredura", () => {
  assert.equal(athenaProactiveMonitor.scan(ctx, new Date(2026, 8, 1, 12, 1)), 0);
});

check("modo silencioso não emite notificações", () => {
  athenaProactiveMonitor.clearForTests(); notificationStore.clearAll();
  const settings = athenaProactiveMonitor.getSettings();
  athenaProactiveMonitor.saveSettings({ ...settings, mode: "silencioso" });
  assert.equal(athenaProactiveMonitor.scan(ctx, midday), 0);
});

check("horário silencioso bloqueia acompanhamento", () => {
  athenaProactiveMonitor.clearForTests(); notificationStore.clearAll();
  const settings = athenaProactiveMonitor.getSettings();
  athenaProactiveMonitor.saveSettings({ ...settings, mode: "proativo", quietEnabled: true, quietStart: "22:00", quietEnd: "08:00" });
  assert.equal(athenaProactiveMonitor.scan(ctx, new Date(2026, 8, 1, 23)), 0);
});

check("modo crítico exclui oportunidades não críticas", () => {
  athenaProactiveMonitor.clearForTests(); notificationStore.clearAll();
  const settings = athenaProactiveMonitor.getSettings();
  athenaProactiveMonitor.saveSettings({ ...settings, mode: "critico", quietEnabled: false, dailyBriefing: false, weeklyReview: false });
  athenaProactiveMonitor.scan(ctx, midday);
  assert.ok(notificationStore.getAll().every((item) => item.severity === "CRITICAL"));
});

check("adiamento bloqueia e depois libera o alerta", () => {
  const alert = notificationStore.getAll().find((item) => item.fingerprint);
  assert.ok(alert?.fingerprint);
  athenaProactiveMonitor.snooze(alert.fingerprint, new Date(2026, 8, 2, 12));
  notificationStore.clearAll();
  assert.equal(athenaProactiveMonitor.scan(ctx, new Date(2026, 8, 1, 13)), 0);
  assert.ok(athenaProactiveMonitor.scan(ctx, new Date(2026, 8, 2, 13)) > 0);
});

console.log(`\n${passed}/7 testes do monitor proativo aprovados.`);
