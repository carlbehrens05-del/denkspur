import { DenkspurError } from '../api/errors';
import type { Actor, Id, Operation, OpResult } from '../model/types';
import { parseJson, type Ctx } from './context';

/**
 * Operationen und Rückgängig.
 * Jede Schreibaktion ruft recordOp in derselben Transaktion auf.
 * Rückgängig führt die Inverse über einen registrierten Handler aus und
 * erzeugt selbst eine Operation (type "undo", undo_of = ursprüngliche Operation).
 */

export interface OpInput {
  type: string;
  actor?: Actor;
  payload: Record<string, unknown>;
  inverse: Record<string, unknown>;
  undoOf?: Id | null;
}

export function recordOp(ctx: Ctx, op: OpInput): Id {
  const opId = ctx.id();
  ctx.db.run(
    `INSERT INTO operations (op_id, type, actor, payload, inverse, created_at, undone_at, undo_of)
     VALUES (?, ?, ?, ?, ?, ?, NULL, ?)`,
    [
      opId,
      op.type,
      op.actor ?? 'user',
      JSON.stringify(op.payload),
      JSON.stringify(op.inverse),
      ctx.now(),
      op.undoOf ?? null,
    ],
  );
  return opId;
}

export interface UndoHandler {
  /** Kurzer deutscher Name, z. B. "Korrektur". */
  label: string;
  apply(ctx: Ctx, inverse: Record<string, unknown>, payload: Record<string, unknown>): void;
}

export type UndoRegistry = ReadonlyMap<string, UndoHandler>;

interface OperationRow {
  op_id: string;
  type: string;
  actor: Actor;
  payload: string;
  inverse: string;
  created_at: string;
  undone_at: string | null;
  undo_of: string | null;
}

function mapOperation(r: OperationRow): Operation {
  return {
    opId: r.op_id,
    type: r.type,
    actor: r.actor,
    payload: parseJson<Record<string, unknown>>(r.payload, {}),
    inverse: parseJson<Record<string, unknown>>(r.inverse, {}),
    createdAt: r.created_at,
    undoneAt: r.undone_at,
    undoOf: r.undo_of,
  };
}

export function listOperations(ctx: Ctx, limit = 50): Operation[] {
  return ctx.db
    .all<OperationRow>('SELECT * FROM operations ORDER BY op_id DESC LIMIT ?', [limit])
    .map(mapOperation);
}

export function getOperation(ctx: Ctx, opId: Id): Operation | undefined {
  const row = ctx.db.get<OperationRow>('SELECT * FROM operations WHERE op_id = ?', [opId]);
  return row ? mapOperation(row) : undefined;
}

export function undo(ctx: Ctx, registry: UndoRegistry, opId?: Id): OpResult {
  return ctx.db.tx(() => {
    let op: Operation | undefined;
    if (opId) {
      op = getOperation(ctx, opId);
      if (!op) throw new DenkspurError('Diese Aktion gibt es nicht.');
    } else {
      const types = [...registry.keys()];
      const placeholders = types.map(() => '?').join(', ');
      const row = ctx.db.get<OperationRow>(
        `SELECT * FROM operations
         WHERE undone_at IS NULL AND undo_of IS NULL AND type IN (${placeholders})
         ORDER BY op_id DESC LIMIT 1`,
        types,
      );
      op = row ? mapOperation(row) : undefined;
      if (!op) throw new DenkspurError('Es gibt nichts rückgängig zu machen.');
    }
    if (op.undoneAt) throw new DenkspurError('Diese Aktion wurde bereits rückgängig gemacht.');
    if (op.undoOf) throw new DenkspurError('Ein Rückgängig lässt sich nicht erneut rückgängig machen.');
    const handler = registry.get(op.type);
    if (!handler) throw new DenkspurError('Diese Aktion lässt sich nicht rückgängig machen.');

    handler.apply(ctx, op.inverse, op.payload);
    const undoOpId = recordOp(ctx, {
      type: 'undo',
      actor: 'user',
      payload: { opId: op.opId, type: op.type },
      inverse: {},
      undoOf: op.opId,
    });
    ctx.db.run('UPDATE operations SET undone_at = ? WHERE op_id = ?', [ctx.now(), op.opId]);
    return { opId: undoOpId, undoable: false, message: `${handler.label} rückgängig gemacht` };
  });
}
