import { SELECTORS } from "./selectors";
import { parseDocumentFields, expandAllFields } from "./parser";
import { getDocumentPathFromBreadcrumbs } from "./path";
import { formatDocument, type OutputFormat } from "./formatter";

const CONTAINER_ID = "fsc-button-container";
const FORMAT_SELECT_ID = "fsc-format-select";
const FORMAT_STORAGE_KEY = "fsc:format";

const VALID_FORMATS: OutputFormat[] = ["json", "markdown", "ai-text"];

let currentFormat: OutputFormat = "json";

function isValidFormat(v: unknown): v is OutputFormat {
  return typeof v === "string" && VALID_FORMATS.includes(v as OutputFormat);
}

async function loadStoredFormat(): Promise<void> {
  try {
    const result = await chrome.storage.local.get(FORMAT_STORAGE_KEY);
    const stored = result[FORMAT_STORAGE_KEY];
    if (isValidFormat(stored)) {
      currentFormat = stored;
    }
  } catch {
    // chrome.storage が利用できない場合は既定値を使用
  }
}

function persistFormat(format: OutputFormat): void {
  chrome.storage.local.set({ [FORMAT_STORAGE_KEY]: format }).catch(() => {
    // 保存失敗は無視
  });
}

/** トースト通知を表示 */
function showToast(message: string, isError = false): void {
  const existing = document.getElementById("fsc-toast");
  existing?.remove();

  const toast = document.createElement("div");
  toast.id = "fsc-toast";
  toast.className = `fsc-toast ${isError ? "fsc-toast--error" : "fsc-toast--success"}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add("fsc-toast--visible");
  });

  setTimeout(() => {
    toast.classList.remove("fsc-toast--visible");
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

/** 全フィールドを展開してからコピー */
async function copyData(): Promise<void> {
  // ボタンが挿入されているパネル（最も深い階層）を対象にする。
  // これを指定しないと、親階層（例: groups）のパネルが拾われてしまう。
  const targetPanel = getTargetFieldsPanel();
  if (!targetPanel) {
    showToast("No fields found", true);
    return;
  }

  await expandAllFields(targetPanel);
  await new Promise((resolve) => setTimeout(resolve, 200));

  const parsed = parseDocumentFields(targetPanel);
  if (!parsed) {
    showToast("No fields found", true);
    return;
  }

  const docPath = getDocumentPathFromBreadcrumbs();
  const text = formatDocument(parsed.data, parsed.raw, currentFormat, docPath);

  try {
    await navigator.clipboard.writeText(text);
    const label = docPath ?? "document";
    showToast(`Copied ${label}`);
  } catch {
    showToast("Failed to copy to clipboard", true);
  }
}

/** ボタン挿入対象: 最も右（最も深い階層）のフィールドサブパネル */
function getTargetFieldsPanel(): Element | null {
  const panels = document.querySelectorAll(SELECTORS.fieldsSubpanelPanel);
  return panels.length > 0 ? panels[panels.length - 1]! : null;
}

/** ボタンコンテナを UI に注入 */
function injectButtons(): void {
  const fieldsPanel = getTargetFieldsPanel();
  if (!fieldsPanel) return;

  const existing = document.getElementById(CONTAINER_ID);
  if (existing) {
    if (fieldsPanel.contains(existing)) return;
    existing.remove();
  }

  const container = document.createElement("div");
  container.id = CONTAINER_ID;
  container.className = "fsc-button-container";

  // 拡張ロゴ
  const logo = document.createElement("img");
  logo.className = "fsc-logo";
  logo.src = chrome.runtime.getURL("icons/icon-48.png");
  logo.alt = "Copy Firestore Doc";
  logo.width = 20;
  logo.height = 20;

  // フォーマット選択
  const select = document.createElement("select");
  select.id = FORMAT_SELECT_ID;
  select.className = "fsc-format-select";
  const options: { value: OutputFormat; label: string }[] = [
    { value: "json", label: "JSON" },
    { value: "markdown", label: "Markdown" },
    { value: "ai-text", label: "AI Text" },
  ];
  for (const opt of options) {
    const el = document.createElement("option");
    el.value = opt.value;
    el.textContent = opt.label;
    if (opt.value === currentFormat) el.selected = true;
    select.appendChild(el);
  }
  select.addEventListener("change", () => {
    currentFormat = select.value as OutputFormat;
    persistFormat(currentFormat);
  });

  // コピーボタン（全フィールドを展開してからコピー）
  const copyBtn = document.createElement("button");
  copyBtn.className = "fsc-action-button";
  copyBtn.title = "Expand all fields and copy";
  copyBtn.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
    <span>Copy</span>
  `;
  copyBtn.addEventListener("click", async () => {
    copyBtn.disabled = true;
    const labelEl = copyBtn.querySelector("span")!;
    labelEl.textContent = "Expanding...";
    try {
      await copyData();
    } finally {
      copyBtn.disabled = false;
      labelEl.textContent = "Copy";
    }
  });

  container.appendChild(logo);
  container.appendChild(select);
  container.appendChild(copyBtn);

  const addButton = fieldsPanel.querySelector("f7e-panel-add-data-button");
  if (addButton) {
    addButton.after(container);
  } else {
    fieldsPanel.prepend(container);
  }
}

/** ボタンを削除 */
function removeButtons(): void {
  document.getElementById(CONTAINER_ID)?.remove();
}

/** フィールドサブパネルの存在を監視してボタンを注入/削除 */
export function startUiObserver(): void {
  void loadStoredFormat().then(() => {
    const existingSelect = document.getElementById(
      FORMAT_SELECT_ID
    ) as HTMLSelectElement | null;
    if (existingSelect) existingSelect.value = currentFormat;
  });

  const observer = new MutationObserver(() => {
    const fieldsPanel = getTargetFieldsPanel();
    if (!fieldsPanel) {
      removeButtons();
      return;
    }
    const existing = document.getElementById(CONTAINER_ID);
    if (!existing || !fieldsPanel.contains(existing)) {
      injectButtons();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // 初回チェック
  injectButtons();
}
