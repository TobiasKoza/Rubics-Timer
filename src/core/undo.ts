/** Jednoduchý zásobník vratných akcí (každá akce nese svou inverzi). */
export interface UndoEntry {
  /** Popis pro UI, např. „Smazán solve 12.34“. */
  label: string;
  undo: () => void | Promise<void>;
}

export class UndoStack {
  private entries: UndoEntry[] = [];
  constructor(private readonly limit = 50) {}

  push(entry: UndoEntry): void {
    this.entries.push(entry);
    if (this.entries.length > this.limit) this.entries.shift();
  }

  peek(): UndoEntry | undefined {
    return this.entries[this.entries.length - 1];
  }

  async undo(): Promise<UndoEntry | undefined> {
    const entry = this.entries.pop();
    if (entry) await entry.undo();
    return entry;
  }

  clear(): void {
    this.entries = [];
  }

  get size(): number {
    return this.entries.length;
  }
}
