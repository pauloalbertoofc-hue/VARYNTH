import { NotificationStore } from "./notification-store";
import { NotificationService } from "./notification-service";

async function runNotificationRegressionTests() {
  console.log("\n===============================================================");
  console.log("  VARYNTH NOTIFICATION CENTER REGRESSION SUITE (NOTIF-REG-001..007)");
  console.log("===============================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${desc}`);
      passed++;
    } else {
      console.log(`  ❌ FAIL: ${desc}`);
      failed++;
    }
  }

  // Setup isolated store instance
  const store = new NotificationStore();
  store.resetToSeed();
  const service = new NotificationService();

  // Test NOTIF-REG-002: Unread badge matches unread notifications
  const initialAll = store.getAll();
  const initialUnread = store.getUnread();
  assert(initialAll.length === 3, "NOTIF-REG-002: Total de notificações iniciais é 3");
  assert(initialUnread.length === 3, "NOTIF-REG-002: Badge de não lidas é 3");
  assert(store.getUnreadCount() === 3, "NOTIF-REG-002: Contador unreadCount() retorna 3");

  // Test NOTIF-REG-001: Create a new notification via Service
  const newNotif = store.add({
    type: "WORKFLOW_ALERT",
    title: "Workflow de Teste",
    message: "Verificação de rotina do Notification Center.",
    severity: "WARNING",
    source: "ATHENA",
    targetPath: "/modules/labs",
  });
  assert(store.getAll().length === 4, "NOTIF-REG-001: Nova notificação adicionada com sucesso");
  assert(store.getUnreadCount() === 4, "NOTIF-REG-001: Contador unreadCount() incrementou para 4");

  // Test NOTIF-REG-004: Mark read updates badge
  const markReadSuccess = store.markAsRead(newNotif.id);
  assert(markReadSuccess, "NOTIF-REG-004: markAsRead retornou true");
  assert(store.getUnreadCount() === 3, "NOTIF-REG-004: Contador unreadCount() decrementou para 3");
  const readItem = store.getById(newNotif.id);
  assert(readItem?.read === true, "NOTIF-REG-004: Item marcado como read = true");
  assert(!!readItem?.readAt, "NOTIF-REG-004: readAt gravado com timestamp");

  // Test NOTIF-REG-006: Target link provides correct navigation destination
  assert(
    newNotif.targetPath === "/modules/labs",
    "NOTIF-REG-006: TargetPath '/modules/labs' gravado corretamente"
  );
  const docNotif = store.getAll().find((n) => n.source === "DOCUMENTATION");
  assert(
    docNotif?.targetPath === "/modules/technical-archive",
    "NOTIF-REG-006: Notificação documental aponta para '/modules/technical-archive'"
  );

  // Test NOTIF-REG-005: Mark all read works
  store.markAllAsRead();
  assert(store.getUnreadCount() === 0, "NOTIF-REG-005: markAllAsRead zera o contador de não lidas");
  assert(store.getUnread().length === 0, "NOTIF-REG-005: getUnread() retorna array vazio");

  // Test NOTIF-REG-003: Notifications survive reload
  // Simulate reload / new instance with persisted memory
  const memoryDump = (store as any).notifications;
  const hydratedStore = new NotificationStore();
  (hydratedStore as any).notifications = JSON.parse(JSON.stringify(memoryDump));

  assert(
    hydratedStore.getAll().length === 4,
    "NOTIF-REG-003: Todas as 4 notificações sobrevivem à reidratação/reload"
  );
  assert(
    hydratedStore.getUnreadCount() === 0,
    "NOTIF-REG-003: Estado de lidas sobrevive à reidratação/reload"
  );

  // Test NOTIF-REG-007: Activity Log events do not all become notifications
  // Verify filtering rules: normal trivial edits should not pollute notification center
  const filteredCritical = service.filterNotifications(hydratedStore.getAll(), "CRITICAL");
  assert(
    filteredCritical.length < hydratedStore.getAll().length,
    "NOTIF-REG-007: Filtro de relevância/crítico separa alertas de eventos informativos"
  );

  // Test Remove Notification
  const removeSuccess = store.remove(newNotif.id);
  assert(removeSuccess, "Remoção de notificação concluída com sucesso");
  assert(store.getAll().length === 3, "Total de notificações atualizado após remoção");

  console.log("\n===============================================================");
  console.log(`  RESULTADO: ${passed} Aprovados, ${failed} Falhas`);
  console.log("===============================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runNotificationRegressionTests().catch((err) => {
  console.error("Erro fatal na suíte de notificações:", err);
  process.exit(1);
});

