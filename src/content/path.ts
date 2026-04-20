import { SELECTORS } from "./selectors";
import type { DocumentPath } from "./types";

/** URL からドキュメントパス情報を抽出 */
export function getDocumentPathFromUrl(): DocumentPath | null {
  const url = new URL(window.location.href);
  const pathname = url.pathname;

  // /project/{projectId}/firestore/databases/{databaseId}/data/~2F{path}
  const match = pathname.match(
    /\/project\/([^/]+)\/firestore\/databases\/([^/]+)\/data\/(.+)/
  );
  if (!match) return null;

  const [, projectId, databaseId, encodedPath] = match;
  if (!projectId || !databaseId || !encodedPath) return null;

  const fullPath = decodeURIComponent(encodedPath).replace(/~2F/gi, "/");

  return { projectId, databaseId, fullPath };
}

/** パンくずリストからドキュメントパスを取得 */
export function getDocumentPathFromBreadcrumbs(): string | null {
  const crumbs = document.querySelectorAll(SELECTORS.breadcrumbLinks);
  if (crumbs.length < 2) return null;

  // crumbs[0] = home, crumbs[1..] = path segments
  const segments: string[] = [];
  for (let i = 1; i < crumbs.length; i++) {
    const text = crumbs[i]?.textContent?.trim();
    if (text) segments.push(text);
  }

  return segments.length > 0 ? "/" + segments.join("/") : null;
}
