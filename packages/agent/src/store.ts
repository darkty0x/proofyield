import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import type { AuditEntry, ProofRecord, VaultSnapshot } from "./types.js";

export class AuditLog {
  private entries: AuditEntry[] = [];

  constructor(private readonly path?: string) {
    if (path && existsSync(path)) {
      try {
        this.entries = JSON.parse(readFileSync(path, "utf8")) as AuditEntry[];
      } catch {
        this.entries = [];
      }
    }
  }

  push(kind: string, message: string, data?: Record<string, unknown>): AuditEntry {
    const entry: AuditEntry = {
      id: randomUUID(),
      at: new Date().toISOString(),
      kind,
      message,
      data,
    };
    this.entries.unshift(entry);
    this.entries = this.entries.slice(0, 500);
    this.persist();
    return entry;
  }

  list(limit = 50): AuditEntry[] {
    return this.entries.slice(0, limit);
  }

  private persist() {
    if (!this.path) return;
    mkdirSync(dirname(this.path), { recursive: true });
    writeFileSync(this.path, JSON.stringify(this.entries, null, 2));
  }
}

export class StateStore {
  proofs: ProofRecord[] = [];
  vault: VaultSnapshot;

  constructor(
    private readonly proofsPath: string,
    private readonly vaultPath: string,
    seed: VaultSnapshot,
  ) {
    this.vault = seed;
    if (existsSync(proofsPath)) {
      try {
        this.proofs = JSON.parse(readFileSync(proofsPath, "utf8")) as ProofRecord[];
      } catch {
        this.proofs = [];
      }
    }
    if (existsSync(vaultPath)) {
      try {
        this.vault = { ...seed, ...JSON.parse(readFileSync(vaultPath, "utf8")) };
      } catch {
        /* keep seed */
      }
    }
  }

  save() {
    mkdirSync(dirname(this.proofsPath), { recursive: true });
    writeFileSync(this.proofsPath, JSON.stringify(this.proofs, null, 2));
    writeFileSync(this.vaultPath, JSON.stringify(this.vault, null, 2));
  }

  upsertProof(record: ProofRecord) {
    const i = this.proofs.findIndex((p) => p.id === record.id);
    if (i >= 0) this.proofs[i] = record;
    else this.proofs.unshift(record);
    this.proofs = this.proofs.slice(0, 200);
    this.save();
  }
}
