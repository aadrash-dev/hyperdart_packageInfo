import { isPackageName, rankAlternatives } from './query.js';
import { rankRecommendations, terms } from './recommendations.js';
const cache = new Map();
const TTL = 5 * 60 * 1000;
export class RegistryError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}
export async function getJSON(url, signal) {
  signal?.throwIfAborted();
  const cached = cache.get(url);
  if (cached && Date.now() - cached.at < TTL) return cached.value;
  const timeout = AbortSignal.timeout(12000);
  try {
    const response = await fetch(url, { signal: signal ? AbortSignal.any([signal, timeout]) : timeout, headers: { Accept: 'application/json' } });
    if (!response.ok) throw new RegistryError(response.status === 404 ? 'Package not found on npm.' : response.status === 429 ? 'npm is rate limiting requests. Please try again shortly.' : `npm returned HTTP ${response.status}. Please retry.`, response.status);
    const value = await response.json();
    cache.set(url, { at: Date.now(), value });
    if (cache.size > 150) cache.delete(cache.keys().next().value);
    return value;
  } catch (error) {
    if (signal?.aborted) throw error;
    if (error instanceof RegistryError) throw error;
    throw new RegistryError(error.name === 'TimeoutError' ? 'npm took too long to respond. Please retry.' : 'Could not reach npm. Check your connection and retry.');
  }
}
export function clearCache() { cache.clear(); }
async function registryJSON(path, signal) {
  try { return { value: await getJSON(`https://registry.npmjs.org/${path}`, signal), mirrored: false }; }
  catch (error) {
    // A registry HTTP response remains authoritative. Retry only network/timeout failures.
    if (error.status || signal?.aborted) throw error;
    return { value: await getJSON(`https://registry.yarnpkg.com/${path}`, signal), mirrored: true };
  }
}
function safeLink(value) {
  try { const u = new URL(value); return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : null; } catch { return null; }
}
function hasExportCondition(exports, name, depth = 0) {
  if (!exports || typeof exports !== 'object' || depth > 12) return false;
  return Object.entries(exports).some(([key,value]) => key === name && (typeof value === 'string' || value && typeof value === 'object') || hasExportCondition(value,name,depth + 1));
}
export function packageFromRecord(record) {
  const version = record['dist-tags']?.latest;
  const latest = record.versions?.[version];
  if (!version || !latest) throw new RegistryError('npm has no latest version metadata for this package.');
  return {
    name: record.name, version, description: latest.description || record.description || 'No description supplied.',
    keywords: Array.isArray(latest.keywords || record.keywords) ? (latest.keywords || record.keywords) : [],
    license: typeof latest.license === 'string' ? latest.license : latest.license?.type || 'Not specified',
    released: record.time?.[version] || null, deprecated: latest.deprecated || null,
    node: latest.engines?.node || 'Not specified', types: !!(latest.types || latest.typings || hasExportCondition(latest.exports,'types')),
    esm: !!(latest.type === 'module' || latest.module || hasExportCondition(latest.exports,'import')),
    moduleType: latest.type === 'module' ? 'ESM declared' : latest.module || hasExportCondition(latest.exports,'import') ? 'ESM entry declared' : 'Not declared',
    size: latest.dist?.unpackedSize ?? null, dependencies: Object.keys(latest.dependencies || {}).length,
    homepage: safeLink(latest.homepage || record.homepage),
    npm: `https://www.npmjs.com/package/${encodeURIComponent(record.name)}`
  };
}
export async function loadPackage(name, signal, withTrend = false) {
  if (!isPackageName(name)) throw new RegistryError('Invalid npm package name.');
  const encoded = encodeURIComponent(name);
  const [recordResult, downloadsResult, trendResult] = await Promise.allSettled([
    registryJSON(encoded, signal),
    getJSON(`https://api.npmjs.org/downloads/point/last-week/${encoded}`, signal),
    withTrend ? getJSON(`https://api.npmjs.org/downloads/range/last-month/${encoded}`, signal) : Promise.resolve(null)
  ]);
  signal?.throwIfAborted();
  if (recordResult.status === 'rejected') throw recordResult.reason;
  const pkg = packageFromRecord(recordResult.value.value);
  const downloads = downloadsResult.status === 'fulfilled' ? downloadsResult.value : null;
  const trend = trendResult.status === 'fulfilled' ? trendResult.value : null;
  return { ...pkg, downloads: typeof downloads?.downloads === 'number' ? downloads.downloads : null,
    period: downloads?.start && downloads?.end ? `${downloads.start} to ${downloads.end}` : null,
    trend: Array.isArray(trend?.downloads) ? trend.downloads : [],
    warnings: [recordResult.value.mirrored && "npm registry unavailable; metadata supplied by Yarn's npm mirror.", !downloads && 'Weekly downloads unavailable.', withTrend && !trend && 'Download history unavailable.'].filter(Boolean) };
}
async function mapLimited(items, work, limit = 3) {
  const results = new Array(items.length); let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) { const index = cursor++; try { results[index] = { value: await work(items[index]) }; } catch (error) { results[index] = { error }; } }
  }));
  return results;
}
export async function loadAlternatives(source, signal) {
  const keywords = source.keywords.slice(0, 5).map(k => String(k).replace(/[^a-z0-9-]/gi,'')).filter(Boolean);
  const topic = source.keywords.length ? source.keywords.join(' ') : source.description;
  if (!terms(topic).length || topic === 'No description supplied.') return { packages: [], warning: 'This package has no useful keywords or description for a reliable similarity search.', total: 0, checked: 0 };
  const queries = [keywords.length && `keywords:${keywords.join(',')}`, terms(source.description).slice(0,8).join(' ') || terms(topic).slice(0,8).join(' ')].filter(Boolean);
  return retrieveRecommendations(queries, topic, signal, source);
}
export async function loadRecommendations(topic, signal) {
  return retrieveRecommendations([terms(topic).join(' ')], topic, signal);
}
async function retrieveRecommendations(queries, topic, signal, source) {
  const results = await Promise.allSettled([...new Set(queries)].slice(0,2).map(query =>
    registryJSON(`-/v1/search?text=${encodeURIComponent(query)}&size=25&quality=0.5&popularity=0.2&maintenance=0.3`, signal)));
  signal?.throwIfAborted();
  const successes = results.filter(r => r.status === 'fulfilled').map(r => r.value);
  if (!successes.length) throw results[0].reason;
  const pool = new Map();
  for (const result of successes) {
    for (const item of result.value.objects || []) {
      if (!isPackageName(item.package?.name)) continue;
      const candidate = { ...item.package, released: item.package.date || null, registryQuality: item.score?.detail?.quality ?? null,
        searchDownloads: typeof item.downloads?.weekly === 'number' && item.downloads.weekly >= 0 ? item.downloads.weekly : null };
      if (!pool.has(candidate.name)) pool.set(candidate.name,candidate);
    }
  }
  const candidates = (source ? rankAlternatives(source,[...pool.values()]) : rankRecommendations([...pool.values()],topic)).slice(0,12);
  const hydrated = await mapLimited(candidates, async candidate => ({ ...await loadPackage(candidate.name,signal), registryQuality: candidate.registryQuality, searchDownloads: candidate.searchDownloads }));
  signal?.throwIfAborted();
  const values = hydrated.filter(r => r.value).map(r => r.value);
  const packages = (source ? rankAlternatives(source,values) : rankRecommendations(values,topic)).slice(0,6);
  const failed = hydrated.filter(r => r.error).length;
  return { packages, total: pool.size, checked: candidates.length, warning: [
    successes.some(r => r.mirrored) && "Search results supplied by Yarn's npm mirror because npm was unreachable.",
    results.some(r => r.status === 'rejected') && 'One search could not be completed; results may be limited.',
    failed && `${failed} candidate(s) could not be loaded and were omitted.`
  ].filter(Boolean).join(' ') };
}
