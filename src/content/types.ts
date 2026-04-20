/** Firestore のフィールド型 */
export type FirestoreFieldType =
  | "string"
  | "int64"
  | "double"
  | "boolean"
  | "map"
  | "array"
  | "null"
  | "timestamp"
  | "geopoint"
  | "reference";

/** パースされたフィールド値 */
export type FirestoreValue =
  | string
  | number
  | boolean
  | null
  | FirestoreMap
  | FirestoreArray;

export type FirestoreMap = { [key: string]: FirestoreValue };
export type FirestoreArray = FirestoreValue[];

/** DOM から抽出した生のフィールド情報 */
export interface RawFieldInfo {
  key: string;
  rawValue: string;
  type: FirestoreFieldType;
  children: RawFieldInfo[];
  isExpanded: boolean;
}

/** ドキュメントのパス情報 */
export interface DocumentPath {
  projectId: string;
  databaseId: string;
  fullPath: string;
}
