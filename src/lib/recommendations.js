// Explainable retrieval: registry data determines facts; this module only ranks them.
const stop = new Set('a an the and or for to of in on with by from using is are be it as at npm package packages library libraries javascript js node best recommend recommended recommendation recommendations find suggest suitable good popular alternative alternatives source'.split(' '));
const synonyms = {
  dates: 'date', datetime: 'date', formatting: 'format', formatter: 'format', formats: 'format',
  parsing: 'parse', parser: 'parse', parses: 'parse', validation: 'validate', validator: 'validate',
  requests: 'http', request: 'http', servers: 'server', frameworks: 'framework',
  managing: 'manage', management: 'manage', utilities: 'utility',
  schemas: 'schema', testing: 'test', tests: 'test', routing: 'route', router: 'route'
};
export function terms(value) {
  return [...new Set(String(value || '').toLowerCase().normalize('NFKC').split(/[^a-z0-9]+/)
    .filter(word => word.length > 1 && !stop.has(word)).map(word => synonyms[word] || word))];
}
export function useCaseTopic(query) {
  return query.toLowerCase().trim()
    .replace(/^(?:what(?:'s| is)|which)\s+(?:is\s+)?(?:the\s+)?/, '')
    .replace(/^(?:recommend|suggest|find|show me|looking for)\s+(?:me\s+)?(?:the\s+)?/, '')
    .replace(/^(?:best|top|good)\s+(?:npm\s+)?(?:packages?|libraries|library|tools?)\s*(?:(?:for|to)\s*)?/, '')
    .replace(/^(?:an?\s+)?(?:npm\s+)?(?:packages?|libraries|library|tools?)\s+(?:for|to)\s+/, '')
    .replace(/\b(?:with\s+)?(?:bundled\s+)?typescript(?:\s+(?:support|types))?\b/g, ' ')
    .replace(/\b(?:with\s+)?(?:native\s+)?esm(?:\s+support)?\b/g, ' ')
    .replace(/\b(?:lightweight|small)\b/g, ' ')
    .replace(/[?!.]+$/, '').replace(/\s+/g, ' ').trim().replace(/\b(?:with|in|for|and)$/, '').trim();
}
export function queryPreferences(query) {
  return {
    typesOnly: /\btypescript\b/i.test(query),
    esmOnly: /\besm\b/i.test(query),
    sort: /\blightweight\b|\bsmall\b/i.test(query) ? 'size' : 'relevance'
  };
}
export function relevanceFor(pkg, target) {
  const wanted = terms(target);
  if (!wanted.length) return { relevance: 0, matched: [] };
  const name = new Set(terms(pkg.name));
  const keywords = new Set(terms((pkg.keywords || []).join(' ')));
  const description = new Set(terms(pkg.description));
  const matched = wanted.filter(word => name.has(word) || keywords.has(word) || description.has(word));
  const actions = new Set(['parse','format','validate','manage','test','route','build','render','read','write']);
  const anchors = wanted.filter(word => !actions.has(word));
  if (anchors.length && !anchors.some(word => matched.includes(word))) return {relevance:0,matched:[]};
  const weight = wanted.reduce((sum, word) => sum + (name.has(word) ? 1 : keywords.has(word) ? 0.9 : description.has(word) ? 0.65 : 0), 0);
  return { relevance: weight / wanted.length, matched };
}
const clamp = n => typeof n === 'number' && Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : null;
export function weeklyUsage(pkg) {
  for (const value of [pkg.downloads,pkg.searchDownloads]) if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return value;
  return null;
}
export function rankRecommendations(candidates, target, { source, now = Date.now() } = {}) {
  const sourceKeywords = new Set((source?.keywords || []).map(k => String(k).toLowerCase()));
  const ranked = candidates.filter(p => p.name !== source?.name && !p.deprecated && !p.name.startsWith('@types/'))
    .map(pkg => {
      const { relevance, matched } = relevanceFor(pkg, target);
      const shared = [...new Set((pkg.keywords || []).map(k => String(k).toLowerCase()))].filter(k => sourceKeywords.has(k)).sort();
      const released = Date.parse(pkg.released);
      const releaseAge = Number.isFinite(released) && released <= now ? Math.floor((now - released) / 86400000) : null;
      const recency = releaseAge === null ? null : 1 / (1 + releaseAge / 365);
      const quality = clamp(pkg.registryQuality);
      const usage = weeklyUsage(pkg);
      const popularity = usage === null ? null : Math.min(1, Math.log10(usage + 1) / 8);
      // Missing signals earn no evidence points; their displayed facts remain unavailable.
      const signals = [[0.75, relevance], [0.10, quality], [0.05, recency], [0.10, popularity]].filter(([,value]) => value !== null);
      const score = Math.round(100 * signals.reduce((sum,[weight,value]) => sum + weight * value,0));
      const reasons = [matched.length && `Matches ${matched.slice(0,4).join(', ')}`, shared.length && `${shared.length} shared keyword${shared.length === 1 ? '' : 's'}`, pkg.types && 'Bundled TypeScript declarations', pkg.esm && 'ESM metadata declared', pkg.downloads == null && usage !== null && 'Usage signal from registry search snapshot; exact reporting dates unavailable'];
      return { ...pkg, shared, matched, relevance, matchScore: score, releaseAge, reasons: reasons.filter(Boolean) };
    })
    // A weak match cannot win through download volume or generic metadata.
    .filter(p => p.relevance >= 0.25 && p.matched.length);
  const unscoped = new Set(ranked.filter(p => !p.name.startsWith('@')).map(p => p.name));
  return ranked.map(p => {
    const base = p.name.startsWith('@') ? p.name.split('/')[1] : null;
    return base && unscoped.has(base) ? {...p,variantOf:base,reasons:[...p.reasons,`Same base name as ${base}; listed after distinct candidates`]} : p;
  }).sort((a,b) => Number(!!a.variantOf) - Number(!!b.variantOf) || b.matchScore - a.matchScore || b.relevance - a.relevance || a.name.localeCompare(b.name));
}
export function filterRecommendations(packages, { typesOnly = false, esmOnly = false, sort = 'relevance' } = {}) {
  const filtered = packages.filter(p => (!typesOnly || p.types) && (!esmOnly || p.esm));
  return [...filtered].sort((a,b) => sort === 'downloads' ? (weeklyUsage(b) ?? -1) - (weeklyUsage(a) ?? -1) || b.matchScore - a.matchScore
    : sort === 'size' ? (a.size ?? Infinity) - (b.size ?? Infinity) || b.matchScore - a.matchScore
    : Number(!!a.variantOf) - Number(!!b.variantOf) || b.matchScore - a.matchScore || b.relevance - a.relevance || a.name.localeCompare(b.name));
}
