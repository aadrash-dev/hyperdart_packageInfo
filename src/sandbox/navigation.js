export const QUERY_EVENT = 'package-lens:sandbox-query';
export const THEME_EVENT = 'package-lens:sandbox-theme';

export function readSharedQuery() {
  return new URLSearchParams(window.location.search).get('q')?.trim() || '';
}

export function searchLink(query) {
  const url = new URL(window.location.pathname, window.location.origin);
  if (query) url.searchParams.set('q', query);
  return url.href;
}

export function announceSandboxQuery(query, { location, navigate }) {
  window.dispatchEvent(new CustomEvent(QUERY_EVENT, { detail: query }));
  const params = new URLSearchParams(location.search);
  if (query) params.set('q', query);
  else params.delete('q');
  navigate({ pathname: location.pathname, search: params.size ? `?${params}` : '' }, { replace: true });
}

export function announceSandboxTheme(options) {
  if (options.themeName) window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: options.themeName }));
}
