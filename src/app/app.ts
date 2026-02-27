import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { doc, getDoc, setDoc } from 'firebase/firestore';

import { db } from './firebase';

type RapidType = 'task' | 'event' | 'note';

interface RapidLogItem {
  id: string;
  text: string;
  type: RapidType;
  done: boolean;
  createdAt: string;
  migratedFrom?: string;
}

interface DayEntry {
  rapidLog: RapidLogItem[];
  reflections: string;
  gratitude: string;
  focus: string;
  mood: number;
}

const entryTemplate = (): DayEntry => ({
  rapidLog: [],
  reflections: '',
  gratitude: '',
  focus: '',
  mood: 3,
});

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly today = new Date().toISOString().split('T')[0];
  protected selectedDate = this.today;
  protected journal: Record<string, DayEntry> = { [this.today]: entryTemplate() };
  protected rapidItem = '';
  protected rapidType: RapidType = 'task';
  protected focusIdea = this.currentEntry.focus;

  private readonly localStorageKey = 'bullet-journal-data-angular';
  private readonly journalDocRef = doc(db, 'bulletJournal', 'default');
  private isHydrating = true;

  constructor() {
    void this.hydrateJournal();
  }

  protected readonly taskIcons: Record<RapidType, string> = {
    task: '•',
    event: '○',
    note: '–',
  };

  protected get currentEntry(): DayEntry {
    if (!this.journal[this.selectedDate]) {
      this.journal[this.selectedDate] = entryTemplate();
    }
    return this.journal[this.selectedDate];
  }

  protected get upcomingSummary(): { date: string; open: number }[] {
    return Object.keys(this.journal)
      .sort()
      .slice(0, 7)
      .map((date) => ({
        date,
        open: (this.journal[date]?.rapidLog || []).filter((item) => !item.done).length,
      }));
  }

  protected selectDate(date: string): void {
    if (!date) return;
    this.selectedDate = date;
    this.focusIdea = this.currentEntry.focus || '';
  }

  protected addRapidLog(): void {
    const text = this.rapidItem.trim();
    if (!text) return;
    const id =
      globalThis.crypto?.randomUUID?.() ?? `id-${Math.random().toString(36).slice(2, 10)}`;

    const newItem: RapidLogItem = {
      id,
      text,
      type: this.rapidType,
      done: false,
      createdAt: new Date().toISOString(),
    };
    this.updateEntry({ rapidLog: [newItem, ...this.currentEntry.rapidLog] });
    this.rapidItem = '';
  }

  protected toggleTask(id: string): void {
    this.updateEntry({
      rapidLog: this.currentEntry.rapidLog.map((item) =>
        item.id === id ? { ...item, done: !item.done } : item
      ),
    });
  }

  protected removeTask(id: string): void {
    this.updateEntry({ rapidLog: this.currentEntry.rapidLog.filter((item) => item.id !== id) });
  }

  protected migrateTask(id: string, direction: 1 | -1): void {
    const item = this.currentEntry.rapidLog.find((entry) => entry.id === id);
    if (!item) return;

    const targetDate = new Date(this.selectedDate);
    targetDate.setDate(targetDate.getDate() + direction);
    const targetKey = targetDate.toISOString().split('T')[0];

    const sourceLog = this.currentEntry.rapidLog.filter((entry) => entry.id !== id);
    const targetEntry = this.journal[targetKey] || entryTemplate();

    this.journal[targetKey] = {
      ...targetEntry,
      rapidLog: [{ ...item, done: false, migratedFrom: this.selectedDate }, ...targetEntry.rapidLog],
    };

    this.updateEntry({ rapidLog: sourceLog });
    this.persistJournal();
  }

  protected handleFocusBlur(): void {
    this.updateEntry({ focus: this.focusIdea });
  }

  protected updateEntry(fields: Partial<DayEntry>): void {
    this.journal[this.selectedDate] = {
      ...entryTemplate(),
      ...this.journal[this.selectedDate],
      ...fields,
    };
    this.persistJournal();
  }

  protected onReflectionChange(value: string): void {
    this.updateEntry({ reflections: value });
  }

  protected onGratitudeChange(value: string): void {
    this.updateEntry({ gratitude: value });
  }

  protected onMoodChange(value: number): void {
    this.updateEntry({ mood: value });
  }

  protected trackByRapid = (_: number, item: RapidLogItem): string => item.id;

  private async hydrateJournal(): Promise<void> {
    const localData = this.readLocalBackup();

    try {
      const snap = await getDoc(this.journalDocRef);

      if (snap.exists()) {
        const remoteJournal = (snap.data()['journal'] as Record<string, DayEntry>) || {};
        this.journal = this.normalizeJournal(remoteJournal);
      } else if (localData && Object.keys(localData).length > 0) {
        this.journal = this.normalizeJournal(localData);
        await this.persistJournalToFirestore();
        this.clearLocalBackup();
      } else {
        this.journal = { [this.today]: entryTemplate() };
      }
    } catch (error) {
      console.warn('Failed to load Firestore journal, using local/in-memory fallback.', error);
      this.journal = localData && Object.keys(localData).length > 0
        ? this.normalizeJournal(localData)
        : { [this.today]: entryTemplate() };
    } finally {
      this.isHydrating = false;
      this.focusIdea = this.currentEntry.focus || '';
    }
  }

  private normalizeJournal(data: Record<string, DayEntry>): Record<string, DayEntry> {
    if (!data || Object.keys(data).length === 0) {
      return { [this.today]: entryTemplate() };
    }

    const normalized: Record<string, DayEntry> = {};
    for (const [date, entry] of Object.entries(data)) {
      normalized[date] = {
        ...entryTemplate(),
        ...entry,
        rapidLog: Array.isArray(entry?.rapidLog) ? entry.rapidLog : [],
      };
    }

    if (!normalized[this.today]) {
      normalized[this.today] = entryTemplate();
    }

    return normalized;
  }

  private readLocalBackup(): Record<string, DayEntry> | null {
    if (typeof window === 'undefined') {
      return null;
    }

    try {
      const stored = localStorage.getItem(this.localStorageKey);
      return stored ? (JSON.parse(stored) as Record<string, DayEntry>) : null;
    } catch (error) {
      console.warn('Failed to parse localStorage backup.', error);
      return null;
    }
  }

  private clearLocalBackup(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.localStorageKey);
    }
  }

  private persistJournal(): void {
    if (this.isHydrating) return;

    this.focusIdea = this.currentEntry.focus || '';
    void this.persistJournalToFirestore();
  }

  private async persistJournalToFirestore(): Promise<void> {
    try {
      await setDoc(
        this.journalDocRef,
        {
          journal: this.journal,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (error) {
      console.warn('Failed to save Firestore journal. Keeping data in memory.', error);
    }
  }
}
