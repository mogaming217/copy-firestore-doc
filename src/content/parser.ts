import { SELECTORS } from "./selectors";
import type {
  FirestoreFieldType,
  FirestoreValue,
  FirestoreMap,
  FirestoreArray,
  RawFieldInfo,
} from "./types";

/** 型文字列 "(string)" → "string" のように括弧を除去してパース */
function parseFieldType(raw: string): FirestoreFieldType {
  const match = raw.match(/^\((.+)\)$/);
  const typeName = match?.[1] ?? raw;
  const validTypes: readonly FirestoreFieldType[] = [
    "string",
    "int64",
    "double",
    "boolean",
    "map",
    "array",
    "null",
    "timestamp",
    "geopoint",
    "reference",
  ];
  return validTypes.includes(typeName as FirestoreFieldType)
    ? (typeName as FirestoreFieldType)
    : "string";
}

/** 単一の f7e-data-tree 要素からフィールド情報を抽出 */
function extractFieldFromTree(treeEl: Element): RawFieldInfo | null {
  const node = treeEl.querySelector(SELECTORS.databaseNode);
  if (!node) return null;

  const key =
    node.querySelector(SELECTORS.fieldKey)?.textContent?.trim() ?? "";
  const rawValue =
    node.querySelector(SELECTORS.fieldValue)?.textContent?.trim() ?? "";
  const rawType =
    node.querySelector(SELECTORS.fieldType)?.textContent?.trim() ?? "(string)";

  const type = parseFieldType(rawType);
  const isExpanded = node.classList.contains("state-expanded");

  const children: RawFieldInfo[] = [];
  const childrenContainer = node.querySelector(SELECTORS.childrenContainer);
  if (childrenContainer) {
    const childTrees = childrenContainer.querySelectorAll(
      SELECTORS.childDataTree
    );
    for (const childTree of childTrees) {
      const childField = extractFieldFromTree(childTree);
      if (childField) {
        children.push(childField);
      }
    }
  }

  return { key, rawValue, type, children, isExpanded };
}

/** 文字列値からダブルクォートを除去 */
function stripQuotes(value: string): string {
  if (value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1);
  }
  return value;
}

/** RawFieldInfo を実際の FirestoreValue に変換 */
function convertValue(field: RawFieldInfo): FirestoreValue {
  switch (field.type) {
    case "string":
      return stripQuotes(field.rawValue);

    case "int64": {
      const n = parseInt(field.rawValue, 10);
      return isNaN(n) ? 0 : n;
    }

    case "double": {
      const n = parseFloat(field.rawValue);
      return isNaN(n) ? 0 : n;
    }

    case "boolean":
      return field.rawValue === "true";

    case "null":
      return null;

    case "map": {
      if (field.isExpanded && field.children.length > 0) {
        return buildMap(field.children);
      }
      // 折りたたみ時はプレビュー文字列をそのまま返す
      return field.rawValue;
    }

    case "array": {
      if (field.isExpanded && field.children.length > 0) {
        return buildArray(field.children);
      }
      return field.rawValue;
    }

    case "timestamp":
    case "geopoint":
    case "reference":
      return field.rawValue;

    default:
      return field.rawValue;
  }
}

/** 子フィールドリストから map オブジェクトを構築 */
function buildMap(children: RawFieldInfo[]): FirestoreMap {
  const result: FirestoreMap = {};
  for (const child of children) {
    result[child.key] = convertValue(child);
  }
  return result;
}

/** 子フィールドリストから配列を構築 */
function buildArray(children: RawFieldInfo[]): FirestoreArray {
  return children.map((child) => convertValue(child));
}

/** ドキュメントのフィールドデータ全体を取得（JSON 値 + 型情報付き中間表現）
 *  scope にフィールドサブパネル（f7e-panel）を渡すと、そのパネル内のみを対象にする。 */
export function parseDocumentFields(scope?: Element): {
  data: FirestoreMap;
  raw: RawFieldInfo[];
} | null {
  const scrollContainer = scope
    ? scope.querySelector(".scroll-container")
    : document.querySelector(SELECTORS.scrollContainer);
  if (!scrollContainer) return null;

  const topLevelTrees = scrollContainer.querySelectorAll(
    SELECTORS.topLevelDataTree
  );
  if (topLevelTrees.length === 0) return null;

  const data: FirestoreMap = {};
  const raw: RawFieldInfo[] = [];

  for (const tree of topLevelTrees) {
    const field = extractFieldFromTree(tree);
    if (field) {
      data[field.key] = convertValue(field);
      raw.push(field);
    }
  }

  return { data, raw };
}

/** 折りたたまれたフィールドがあるかチェック */
export function hasCollapsedFields(): boolean {
  const scrollContainer = document.querySelector(SELECTORS.scrollContainer);
  if (!scrollContainer) return false;

  const expandableNodes = scrollContainer.querySelectorAll(
    ".database-node.expandable-type:not(.state-expanded)"
  );
  return expandableNodes.length > 0;
}

/** 全ての折りたたまれたフィールドを展開する
 *  scope を渡すと、そのパネル内の折りたたみフィールドだけを対象にする。 */
export async function expandAllFields(scope?: Element): Promise<void> {
  const MAX_ITERATIONS = 50;
  let iteration = 0;
  const root: ParentNode = scope ?? document;

  while (iteration < MAX_ITERATIONS) {
    const collapsedButtons = root.querySelectorAll(
      `.database-node.expandable-type:not(.state-expanded) ${SELECTORS.expandCollapseButton}`
    );

    if (collapsedButtons.length === 0) break;

    for (const button of collapsedButtons) {
      (button as HTMLElement).click();
    }

    // Angular の変更検知を待つ
    await new Promise((resolve) => setTimeout(resolve, 100));
    iteration++;
  }
}
