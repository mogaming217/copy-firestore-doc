import type {
  FirestoreFieldType,
  FirestoreMap,
  FirestoreValue,
  RawFieldInfo,
} from "./types";

export type OutputFormat = "json" | "markdown" | "ai-text";

/** JSON 形式 */
function toJson(data: FirestoreMap): string {
  return JSON.stringify(data, null, 2);
}

/** Markdown テーブル / ネスト構造 */
function toMarkdown(data: FirestoreMap, docPath: string | null): string {
  const lines: string[] = [];

  if (docPath) {
    lines.push(`## ${docPath}`, "");
  }

  function renderValue(value: FirestoreValue, indent: number): string {
    const prefix = "  ".repeat(indent);
    if (value === null) return "null";
    if (typeof value === "string") return `"${value}"`;
    if (typeof value === "number" || typeof value === "boolean")
      return String(value);
    if (Array.isArray(value)) {
      if (value.length === 0) return "[]";
      const items = value
        .map((v, i) => `${prefix}  - [${i}]: ${renderValue(v, indent + 2)}`)
        .join("\n");
      return `\n${items}`;
    }
    if (typeof value === "object") {
      const entries = Object.entries(value)
        .map(([k, v]) => `${prefix}  - **${k}**: ${renderValue(v, indent + 2)}`)
        .join("\n");
      return `\n${entries}`;
    }
    return String(value);
  }

  for (const [key, value] of Object.entries(data)) {
    lines.push(`- **${key}**: ${renderValue(value, 0)}`);
  }

  return lines.join("\n");
}

/** 型注釈を付けるべき Firestore 固有型かどうか */
function typeAnnotation(type: FirestoreFieldType): string {
  switch (type) {
    case "timestamp":
    case "geopoint":
    case "reference":
    case "int64":
    case "double":
      return ` (${type})`;
    default:
      return "";
  }
}

/** AI に渡しやすいプレーンテキスト形式（Firestore 固有型を明示） */
function toAiText(raw: RawFieldInfo[], docPath: string | null): string {
  const lines: string[] = [];

  if (docPath) {
    lines.push(`Firestore Document: ${docPath}`, "---");
  }

  function renderField(
    key: string,
    field: RawFieldInfo,
    indent: number
  ): void {
    const prefix = "  ".repeat(indent);
    const annotation = typeAnnotation(field.type);

    if (field.type === "array") {
      if (field.isExpanded) {
        lines.push(`${prefix}${key}: (array, ${field.children.length} items)`);
        field.children.forEach((child, i) => {
          renderField(`[${i}]`, child, indent + 1);
        });
      } else {
        lines.push(`${prefix}${key}: (array) ${field.rawValue}`);
      }
      return;
    }

    if (field.type === "map") {
      if (field.isExpanded) {
        lines.push(`${prefix}${key}: (map, ${field.children.length} fields)`);
        for (const child of field.children) {
          renderField(child.key, child, indent + 1);
        }
      } else {
        lines.push(`${prefix}${key}: (map) ${field.rawValue}`);
      }
      return;
    }

    if (field.type === "null") {
      lines.push(`${prefix}${key}: null`);
      return;
    }

    if (field.type === "string") {
      lines.push(`${prefix}${key}: "${stripStringQuotes(field.rawValue)}"`);
      return;
    }

    lines.push(`${prefix}${key}${annotation}: ${field.rawValue}`);
  }

  for (const field of raw) {
    renderField(field.key, field, 0);
  }

  return lines.join("\n");
}

function stripStringQuotes(value: string): string {
  if (value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1);
  }
  return value;
}

/** 指定されたフォーマットでデータを文字列化 */
export function formatDocument(
  data: FirestoreMap,
  raw: RawFieldInfo[],
  format: OutputFormat,
  docPath: string | null
): string {
  switch (format) {
    case "json":
      return toJson(data);
    case "markdown":
      return toMarkdown(data, docPath);
    case "ai-text":
      return toAiText(raw, docPath);
  }
}
