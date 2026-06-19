export interface HistoryEntry {
  url: string;
  title: string;
  timestamp: Date;
  readingTime?: number;
}

export class ReadingHistory {
  private readonly STORAGE_KEY = 'porsuk_history';

  saveArticle(entry: Omit<HistoryEntry, 'timestamp'>): void {
    const history = this.getHistory();
    history.unshift({
      ...entry,
      timestamp: new Date()
    });
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(history.slice(0, 100)));
  }

  getHistory(): HistoryEntry[] {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  clearHistory(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }
}
