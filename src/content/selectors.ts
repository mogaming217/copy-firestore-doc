/** Firebase Console Firestore データビューの DOM セレクタ定数 */
export const SELECTORS = {
  /** フィールドサブパネル全体 */
  fieldsSubpanel: "f7e-fields-subpanel",

  /** スクロールコンテナ */
  scrollContainer: "f7e-fields-subpanel f7e-panel .scroll-container",

  /** トップレベルのデータツリー（スクロールコンテナ直下） */
  topLevelDataTree:
    ":scope > fs-animate-change-classes > f7e-data-tree",

  /** データノードのルート div */
  databaseNode: ":scope > div.database-node",

  /** クリックターゲット内のフィールドキー */
  fieldKey: ".database-node-click-target .database-key",

  /** クリックターゲット内のフィールド値 */
  fieldValue: ".database-node-click-target .database-leaf-value",

  /** クリックターゲット内の型表示 */
  fieldType: ".database-node-click-target .database-type",

  /** 子フィールドコンテナ */
  childrenContainer: ":scope > div.database-children",

  /** 子フィールドのデータツリー */
  childDataTree: ":scope > f7e-data-tree",

  /** パンくずリンク */
  breadcrumbLinks: "fire-breadcrumbs a.crumb-link",

  /** ドキュメント詳細パネルのヘッダー */
  documentPanelHeader:
    ".panel-container:last-child f7e-panel-header",

  /** フィールドサブパネルのヘッダー付近（ボタン挿入位置） */
  fieldsSubpanelPanel: "f7e-fields-subpanel f7e-panel",

  /** 展開/折りたたみボタン */
  expandCollapseButton: ".database-expand-collapse-button",
} as const;
