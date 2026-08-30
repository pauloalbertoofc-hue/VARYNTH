import { TransactionRecord, TransactionState, TransactionType } from "./types";
import { FailureInjector } from "./failure-injector";
import { athenaEventBus } from "../athena/events/event-bus";

const TX_JOURNAL_STORAGE_KEY = "varynth_tx_journal_v4";

export class TransactionJournal {
  private static records: Map<string, TransactionRecord> = new Map();
  private static isInitialized = false;

  private static init(): void {
    if (this.isInitialized) return;
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        const stored = localStorage.getItem(TX_JOURNAL_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as TransactionRecord[];
          if (Array.isArray(parsed)) {
            parsed.forEach((tx) => this.records.set(tx.id, tx));
          }
        }
      } catch (err) {
        console.warn("[TransactionJournal] Erro ao carregar journal do localStorage:", err);
      }
    }
    this.isInitialized = true;
  }

  private static saveToStorage(): void {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        const list = Array.from(this.records.values());
        localStorage.setItem(TX_JOURNAL_STORAGE_KEY, JSON.stringify(list));
      } catch (err) {
        console.error("[TransactionJournal] Erro ao persistir transaction journal:", err);
      }
    }
  }

  public static beginTransaction(
    type: TransactionType,
    targetIds: string[],
    rollbackSnapshot?: Record<string, unknown>
  ): TransactionRecord {
    this.init();

    const id = `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const record: TransactionRecord = {
      id,
      type,
      targetIds: [...targetIds],
      state: "STARTED",
      startedAt: now,
      updatedAt: now,
      lastSafeStep: "INIT",
      rollbackSnapshot: rollbackSnapshot ? JSON.parse(JSON.stringify(rollbackSnapshot)) : undefined,
    };

    // 1. Persist STARTED before any side effect
    this.records.set(id, record);
    this.saveToStorage();

    FailureInjector.checkAndThrow("before-snapshot", "Falha injetada após STARTED antes do snapshot.");

    return JSON.parse(JSON.stringify(record));
  }

  public static prepareTransaction(
    txId: string,
    lastSafeStep: string,
    durableSnapshot?: Record<string, unknown>
  ): TransactionRecord {
    this.init();
    const tx = this.records.get(txId);
    if (!tx) throw new Error(`Transação '${txId}' não encontrada no journal.`);

    tx.state = "PREPARED";
    tx.lastSafeStep = lastSafeStep;
    tx.updatedAt = new Date().toISOString();
    if (durableSnapshot) {
      tx.rollbackSnapshot = JSON.parse(JSON.stringify(durableSnapshot));
    }

    // 2. Persist PREPARED before performing active mutation
    this.records.set(txId, tx);
    this.saveToStorage();

    FailureInjector.checkAndThrow("after-snapshot", "Falha injetada em PREPARED após snapshot.");

    return JSON.parse(JSON.stringify(tx));
  }

  public static markCommitting(txId: string, lastSafeStep = "MUTATION_COMPLETED"): TransactionRecord {
    this.init();
    const tx = this.records.get(txId);
    if (!tx) throw new Error(`Transação '${txId}' não encontrada no journal.`);

    tx.state = "COMMITTING";
    tx.lastSafeStep = lastSafeStep;
    tx.updatedAt = new Date().toISOString();

    this.records.set(txId, tx);
    this.saveToStorage();

    FailureInjector.checkAndThrow("before-commit", "Falha injetada antes do commit definitivo.");

    return JSON.parse(JSON.stringify(tx));
  }

  public static commitTransaction(txId: string): TransactionRecord {
    this.init();
    const tx = this.records.get(txId);
    if (!tx) throw new Error(`Transação '${txId}' não encontrada no journal.`);

    tx.state = "COMMITTED";
    tx.commitMarker = true;
    tx.lastSafeStep = "COMMITTED";
    tx.updatedAt = new Date().toISOString();

    this.records.set(txId, tx);
    this.saveToStorage();

    FailureInjector.checkAndThrow("after-commit-before-notification", "Falha injetada após commit antes de notificações.");

    return JSON.parse(JSON.stringify(tx));
  }

  public static rollbackTransaction(txId: string, reason: string): TransactionRecord {
    this.init();
    const tx = this.records.get(txId);
    if (!tx) throw new Error(`Transação '${txId}' não encontrada no journal.`);

    tx.state = "ROLLING_BACK";
    tx.error = reason;
    tx.updatedAt = new Date().toISOString();
    this.records.set(txId, tx);
    this.saveToStorage();

    // Finalize rollback state
    tx.state = "ROLLED_BACK";
    tx.lastSafeStep = "ROLLED_BACK";
    tx.updatedAt = new Date().toISOString();

    this.records.set(txId, tx);
    this.saveToStorage();

    return JSON.parse(JSON.stringify(tx));
  }

  public static getTransaction(txId: string): TransactionRecord | undefined {
    this.init();
    const tx = this.records.get(txId);
    return tx ? JSON.parse(JSON.stringify(tx)) : undefined;
  }

  public static getAllTransactions(): TransactionRecord[] {
    this.init();
    return JSON.parse(JSON.stringify(Array.from(this.records.values())));
  }

  /**
   * Idempotent Startup Recovery.
   * Scans for incomplete transactions on application initialization and applies deterministic recovery.
   */
  public static recoverPendingTransactions(
    onRollbackNeeded?: (tx: TransactionRecord) => void
  ): { recoveredCount: number; details: string[] } {
    this.init();

    let recoveredCount = 0;
    const details: string[] = [];

    this.records.forEach((tx, txId) => {
      // 1. STARTED / PREPARED: mutation was not committed -> mark ROLLED_BACK idempotently
      if (tx.state === "STARTED" || tx.state === "PREPARED") {
        tx.state = "ROLLED_BACK";
        tx.error = "Recuperado na inicialização: transação interrompida antes do commit definitivo.";
        tx.updatedAt = new Date().toISOString();
        this.records.set(txId, tx);
        recoveredCount++;
        details.push(`[${txId}] Interrompida em ${tx.lastSafeStep} -> Marcada como ROLLED_BACK.`);
      }
      // 2. COMMITTING: Check commit marker
      else if (tx.state === "COMMITTING") {
        if (tx.commitMarker) {
          tx.state = "COMMITTED";
          tx.updatedAt = new Date().toISOString();
          this.records.set(txId, tx);
          details.push(`[${txId}] Commit marker presente -> Finalizada como COMMITTED.`);
        } else {
          // Incomplete commit -> Trigger safe rollback
          if (onRollbackNeeded) {
            try {
              onRollbackNeeded(tx);
            } catch (err) {
              console.error(`[TransactionJournal] Erro ao executar rollback da transação ${txId}:`, err);
            }
          }
          tx.state = "ROLLED_BACK";
          tx.error = "Recuperado na inicialização: commit incompleto revertido para o último estado seguro.";
          tx.updatedAt = new Date().toISOString();
          this.records.set(txId, tx);
          recoveredCount++;
          details.push(`[${txId}] Commit marker ausente -> Revertida para ROLLED_BACK.`);
        }
      }
      // 3. ROLLING_BACK: Incomplete rollback -> Complete it safely
      else if (tx.state === "ROLLING_BACK") {
        if (onRollbackNeeded) {
          try {
            onRollbackNeeded(tx);
          } catch (err) {
            console.error(`[TransactionJournal] Erro ao retomar rollback da transação ${txId}:`, err);
          }
        }
        tx.state = "ROLLED_BACK";
        tx.updatedAt = new Date().toISOString();
        this.records.set(txId, tx);
        recoveredCount++;
        details.push(`[${txId}] Rollback retomado e finalizado como ROLLED_BACK.`);
      }
      // 4. COMMITTED / ROLLED_BACK / FAILED: Terminal safe states -> no-op (idempotency)
    });

    if (recoveredCount > 0) {
      this.saveToStorage();
    }

    return { recoveredCount, details };
  }

  public static clearJournal(): void {
    this.records.clear();
    this.saveToStorage();
  }
}

