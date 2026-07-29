const FRONTEND_BUNDLE_PATTERN = /\/assets\/index-[^"'?]+\.js/;

export function frontendBundlePathFromHtml(html) {
  return String(html || '').match(FRONTEND_BUNDLE_PATTERN)?.[0] || '';
}

export function frontendBundlePathFromScripts(scriptSources) {
  for (const source of scriptSources || []) {
    try {
      const path = new URL(source, 'https://mvst-events.invalid').pathname;
      if (FRONTEND_BUNDLE_PATTERN.test(path)) return path;
    } catch {
      // Ignore malformed or non-URL script sources.
    }
  }
  return '';
}

export function frontendBundleChanged(currentPath, latestPath) {
  return Boolean(currentPath && latestPath && currentPath !== latestPath);
}
