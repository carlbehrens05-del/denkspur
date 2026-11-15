import { correctEntryUndo, entryNotMineUndo } from './entries';
import { importRunUndo } from './imports';
import type { UndoHandler, UndoRegistry } from './operations';
import { settingsUndo } from './settings';
import { threadNotMineUndo } from './threads';

/** Alle Operationstypen, die sich rückgängig machen lassen. */
export const undoRegistry: UndoRegistry = new Map<string, UndoHandler>([
  ['entry.correct', correctEntryUndo],
  ['entry.not_mine', entryNotMineUndo],
  ['thread.not_mine', threadNotMineUndo],
  ['settings.update', settingsUndo],
  ['import.run', importRunUndo],
]);
