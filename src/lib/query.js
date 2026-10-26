import { rankRecommendations, useCaseTopic } from './recommendations.js';

export function normalizeSearchData(value) {
  return Array.isArray(value) ? (value[0] || {}) : (value || {});
}
export function isPackageName(value) {
  return typeof value === 'string' && value.length <= 214 && /^(?:@[a-z0-9._-]+\/)?[a-z0-9][a-z0-9._-]*$/.test(value);
}
export function parseQuery(value) {
  const data = normalizeSearchData(value);
  const query = String(data.query || data.queryTerm || '').trim();
  const discover = /^(?:(?:what(?:'s| is)|which)\s+(?:is\s+)?(?:the\s+)?)?(?:(?:best|top|good)\s+(?:npm\s+)?(?:packages?|libraries|library|tools?)\b|(?:recommend|suggest|find|show me|looking for)\s|(?:npm\s+)?(?:packages?|libraries|library|tools?)\s+(?:for|to)\b)/i.test(query);
  if (discover && !/\bcompare\b|\balternatives?\b/i.test(query)) {
    const topic = useCaseTopic(query);
    return { query, intent: 'discover', names: [], topic, error: !topic || topic.length > 160 ? 'Describe a use case in up to 160 characters, for example best npm package for CSV parsing.' : '' };
  }
  const intent = /alternatives?|similar to|packages? like/i.test(query) ? 'alternatives'
    : /\bcompare\b|\bvs\b|\bversus\b/i.test(query) ? 'compare' : 'details';
  const entities = (Array.isArray(data.entities) ? data.entities : []).filter(e =>
    e.collectionName === 'NPM_PACKAGES' || e.collectionType === 'HD_PACKAGES');
  let names = entities.map(e => e.sourceID || e.word).filter(isPackageName);
  if (!names.length) {
    const cleaned = query.toLowerCase()
      .replace(/^(?:show me\s+)?(?:the\s+)?(?:latest|current) version of\s+/, '')
      .replace(/^(?:npm\s+)?(?:alternatives?\s+(?:to|for)|packages?\s+(?:like|similar to))\s+/, '')
      .replace(/^(?:compare\s+(?:npm\s+)?(?:packages?\s+)?|package info\s+|npm\s+(?:packages?\s+)?)/, '')
      .replace(/\s+npm$/, '').replace(/[?!.]+$/, '');
    names = cleaned.split(/\s*(?:,|\bvs\b|\bversus\b|\band\b)\s*/).filter(isPackageName);
  }
  names = [...new Set(names)];
  let error = '';
  if (!names.length) error = 'Enter a package name, for example npm express.';
  else if (intent === 'compare' && names.length < 2) error = 'Add two or three package names to compare.';
  else if (names.length > (intent === 'compare' ? 3 : 1)) error = intent === 'compare'
    ? 'Compare at most three packages at a time.' : 'Use compare for multiple packages.';
  return { query, intent, names, error };
}

export function sharedKeywords(a = [], b = []) {
  const source = new Set(a.map(x => String(x).toLowerCase()));
  return [...new Set(b.map(x => String(x).toLowerCase()))].filter(x => source.has(x)).sort();
}
export function rankAlternatives(source, candidates) {
  // Package names and generic descriptions do not drown out specific domain keywords.
  const topic = source.keywords?.length ? source.keywords.join(' ') : source.description || '';
  return rankRecommendations(candidates, topic, { source });
}

