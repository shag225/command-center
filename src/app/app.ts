import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

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
  protected journal: Record<string, DayEntry> = this.loadJournal();
  protected rapidItem = '';
  protected rapidType: RapidType = 'task';
  protected focusIdea = this.currentEntry.focus;

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
      rapidLog: [
        { ...item, done: false, migratedFrom: this.selectedDate },
        ...targetEntry.rapidLog,
      ],
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

  private loadJournal(): Record<string, DayEntry> {
    if (typeof window === 'undefined') {
      return { [this.today]: entryTemplate() };
    }
    try {
      const stored = localStorage.getItem('bullet-journal-data-angular');
      if (stored) {
        const parsed = JSON.parse(stored) as Record<string, DayEntry>;
        return Object.keys(parsed).length > 0 ? parsed : { [this.today]: entryTemplate() };
      }
    } catch (error) {
      console.warn('Failed to read journal data, resetting.', error);
    }
    return { [this.today]: entryTemplate() };
  }

  private persistJournal(): void {
    localStorage.setItem('bullet-journal-data-angular', JSON.stringify(this.journal));
    this.focusIdea = this.currentEntry.focus || '';
  }
}
