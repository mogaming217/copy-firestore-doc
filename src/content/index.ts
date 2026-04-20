import { startUiObserver } from "./ui";

/** Firestore データビューページかどうかを判定 */
function isFirestoreDataPage(): boolean {
  return /\/firestore\/databases\/[^/]+\/data/.test(window.location.pathname);
}

/** 初期化 */
function init(): void {
  if (isFirestoreDataPage()) {
    startUiObserver();
  }

  // SPA のページ遷移を監視
  let lastUrl = window.location.href;

  const urlObserver = new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      if (isFirestoreDataPage()) {
        startUiObserver();
      }
    }
  });

  urlObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // popstate でも監視
  window.addEventListener("popstate", () => {
    if (isFirestoreDataPage()) {
      startUiObserver();
    }
  });
}

init();
