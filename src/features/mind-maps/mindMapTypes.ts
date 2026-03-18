export interface MindMap {
  id: string;
  userId: string;
  title: string;
  rootNode: MindMapNode;
  /** Column widths in px per depth level. */
  colWidths: Record<number, number>;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface MindMapNode {
  /** Unique within a mind map (use nanoid()). */
  id: string;
  label: string;
  /** Rich text (TipTap JSON or HTML depending on editor implementation). */
  note: string;
  /** UI state persisted in the document. */
  collapsed: boolean;
  children: MindMapNode[];
}

export const DEFAULT_COL_W = 150;
export const MIN_COL_W = 80;
export const MAX_COL_W = 300;
