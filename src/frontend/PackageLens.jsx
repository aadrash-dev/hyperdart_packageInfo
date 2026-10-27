import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ThemeProvider, createTheme, Button, Alert, CircularProgress } from '@mui/material';
import { parseQuery } from '../lib/query.js';
import { clearCache, loadAlternatives, loadPackage, loadRecommendations } from '../lib/api.js';
import { filterRecommendations, queryPreferences, weeklyUsage } from '../lib/recommendations.js';
import './styles.css';

const integer = new Intl.NumberFormat('en-US');
const count = n => n == null ? 'Unavailable' : integer.format(n);
const size = n => n == null ? 'Not reported' : `${(n / 1024).toFixed(1)} kB`;
const date = value => value && !Number.isNaN(Date.parse(value)) ? new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : 'Not reported';
const colors = ['#2563eb', '#b45309', '#7c3aed'];
function Trend({ packages }) {
  const dates = [...new Set(packages.flatMap(p => p.trend.map(d => d.day)))].sort();
  if (!dates.length) return <p className="muted">Download history is unavailable.</p>;
  const max = Math.max(1, ...packages.flatMap(p => p.trend.map(d => d.downloads)));
  const x = day => 55 + dates.indexOf(day) * 555 / Math.max(1, dates.length - 1);
  const y = n => 145 - n / max * 115;
  return <section className="trend"><div className="section-title"><h3>Download history</h3><span>Daily · last month</span></div>
    <svg viewBox="0 0 640 185" role="img" aria-label="Daily npm downloads over the last month. All series share a zero baseline and scale.">
      {[0, 0.5, 1].map(n => <g key={n}><line x1="55" x2="610" y1={y(n * max)} y2={y(n * max)} className="gridline"/><text x="48" y={y(n * max) + 4} textAnchor="end">{new Intl.NumberFormat('en', { notation: 'compact' }).format(n * max)}</text></g>)}
      {packages.map((p, i) => <g key={p.name}>{p.trend.map((d, j) => {
        const previous = p.trend[j - 1];
        return <g key={d.day}>{previous && Date.parse(d.day) - Date.parse(previous.day) === 86400000 && <line x1={x(previous.day)} y1={y(previous.downloads)} x2={x(d.day)} y2={y(d.downloads)} stroke={colors[i % 3]} strokeWidth="2"/>}<circle cx={x(d.day)} cy={y(d.downloads)} r="2" fill={colors[i % 3]}><title>{p.name}: {count(d.downloads)} on {d.day}</title></circle></g>;
      })}</g>)}
      <text x="55" y="171">{dates[0]}</text><text x="610" y="171" textAnchor="end">{dates.at(-1)}</text>
    </svg>
    <div className="legend">{packages.map((p, i) => <span key={p.name}><i style={{ background: colors[i % 3] }}/>{p.name}</span>)}</div>
    <details><summary>View chart data</summary><div className="table-scroll"><table><caption>Daily download counts (UTC dates)</caption><thead><tr><th>Date</th>{packages.map(p => <th key={p.name}>{p.name}</th>)}</tr></thead><tbody>{dates.map(day => <tr key={day}><th>{day}</th>{packages.map(p => <td key={p.name}>{count(p.trend.find(d => d.day === day)?.downloads)}</td>)}</tr>)}</tbody></table></div></details>
  </section>;
}
function PackageCard({ pkg, index }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(`npm install ${pkg.name}`); setCopied(true); setCopyError(false); }
    catch { setCopyError(true); }
  }
  return <article className="package-card" style={{ '--series': colors[index % 3] }}>
    <div className="package-top"><span className="eyebrow">{pkg.matchScore == null ? 'Package details' : `Result ${index + 1}`}</span><div className="package-badges">{pkg.deprecated && <span className="deprecated-badge">Deprecated</span>}<span className="version">v{pkg.version}</span></div></div>
    <h2><a href={pkg.npm} target="_blank" rel="noreferrer">{pkg.name} <span aria-hidden="true">↗</span></a></h2>
    <p className="description">{pkg.description}</p>
    {pkg.reasons?.length > 0 && <div className="match-reasons"><span className="eyebrow">Why it matches</span><ul>{pkg.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul><details><summary>Ranking details · {pkg.matchScore}/100</summary><p>A relative retrieval score, not a quality rating. Relevance carries 75% of the weight, npm's quality signal 10%, release recency 5%, and logarithmic weekly usage 10%. Missing signals earn no evidence points. Scoped names that duplicate an unscoped candidate follow distinct candidates.</p></details></div>}
    {pkg.deprecated && <Alert severity="warning"><strong>npm deprecation notice</strong><br/>{pkg.deprecated}</Alert>}
    <div className="download-count">{count(pkg.downloads)}<span>downloads / last week</span></div>
    <div className="period">{pkg.period || 'Download period unavailable'}</div>
    {pkg.downloads == null && weeklyUsage(pkg) !== null && <p className="snapshot-count">Registry search snapshot: <strong>{count(pkg.searchDownloads)}</strong> weekly downloads. Exact reporting dates were not supplied; excluded from date-based comparisons.</p>}
    <dl className="facts"><div><dt>Latest release</dt><dd>{date(pkg.released)}</dd></div><div><dt>License</dt><dd>{pkg.license}</dd></div><div><dt>Node.js</dt><dd>{pkg.node}</dd></div><div><dt>Type declarations</dt><dd>{pkg.types ? 'Bundled' : 'Not declared'}</dd></div><div><dt>Module format</dt><dd>{pkg.moduleType}</dd></div><div><dt>Unpacked size</dt><dd>{size(pkg.size)}</dd></div><div><dt>Direct dependencies</dt><dd>{pkg.dependencies}</dd></div></dl>
    {Array.isArray(pkg.shared) && <div className="shared"><span>Shared keywords</span>{pkg.shared.length ? <div className="tags">{pkg.shared.slice(0, 8).map(k => <span key={k}>{k}</span>)}</div> : <p className="muted">None declared; matched by name or description.</p>}</div>}
    {pkg.warnings.map(w => <p className="warning" key={w}>{w}</p>)}
    <button type="button" className="install" onClick={copy} aria-label={`Copy install command for ${pkg.name}`}><code>npm install {pkg.name}</code><span>{copied ? 'Copied' : 'Copy'}</span></button>
    {copyError && <span role="status">Select and copy the install command above.</span>}
    {pkg.homepage && <div className="card-actions"><a href={pkg.homepage} target="_blank" rel="noreferrer">Homepage ↗</a></div>}
  </article>;
}
function Comparison({ packages }) {
  const rows = [['Latest', p => p.version], ['Weekly downloads', p => count(p.downloads)], ['License', p => p.license], ['Node.js', p => p.node], ['Types bundled', p => p.types ? 'Yes' : 'Not declared'], ['Unpacked size', p => size(p.size)], ['Dependencies', p => p.dependencies], ['Deprecated', p => p.deprecated ? 'Yes' : 'No flag reported']];
  const available = packages.filter(p => p.downloads != null);
  const high = [...available].sort((a,b) => b.downloads - a.downloads)[0];
  const tied = high && available.filter(p => p.downloads === high.downloads).length > 1;
  const samePeriod = available.every(p => p.period) && new Set(available.map(p => p.period)).size === 1;
  const sizes = packages.filter(p => p.size != null);
  const smallest = sizes.length === packages.length ? [...sizes].sort((a,b) => a.size - b.size)[0] : null;
  const typed = packages.filter(p => p.types).map(p => p.name);
  return <section className="comparison"><div className="section-title"><h3>Compare the facts</h3><span>{packages.length} packages</span></div>
    <div className="table-scroll" tabIndex="0" aria-label="Scrollable package comparison"><table><caption>Current npm package metadata</caption><thead><tr><th>Metric</th>{packages.map(p => <th key={p.name}>{p.name}</th>)}</tr></thead><tbody>{rows.map(([label, read]) => <tr key={label}><th>{label}</th>{packages.map(p => <td key={p.name}>{read(p)}</td>)}</tr>)}</tbody></table></div>
    <div className="takeaway"><h4>Key differences</h4><p>{available.length === packages.length && samePeriod && high ? tied ? 'These packages share the highest weekly download count in this comparison.' : `${high.name} has the most downloads in this comparison for ${high.period}.` : 'Some download counts or matching periods are unavailable; a full popularity comparison is not available.'} Downloads indicate usage, not quality or suitability.</p>{smallest && <p>{sizes.filter(p => p.size === smallest.size).length > 1 ? 'Multiple packages tie for the smallest unpacked archive.' : `${smallest.name} has the smallest unpacked archive (${size(smallest.size)}).`}</p>}{typed.length > 0 && <p>Bundled TypeScript declarations: {typed.join(', ')}.</p>}<p>Package size is the unpacked archive size, not browser bundle cost. Undeclared types or module fields do not prove lack of support.</p></div>
  </section>;
}
export default function PackageLens(props = {}) {
  const incomingKey = JSON.stringify(props.searchData || {});
  const parsed = useMemo(() => parseQuery(props.searchData), [incomingKey]);
  const [generation, setGeneration] = useState(0);
  const [filters, setFilters] = useState(() => queryPreferences(parsed.query));
  const [result, setState] = useState({ status: 'loading', packages: [], failures: [], warning: '' });
  // Never render data from the previous intent while the next request is starting.
  const state = result.query === parsed.query ? result : { status: 'loading', packages: [], failures: [], warning: '' };
  const notified = useRef(false);
  const dark = ['dark', 'lightsOut'].includes(props.UIOptions?.themeName);
  const sidebar = props.UIOptions?.format === 'sidebar';
  const theme = useMemo(() => createTheme({ palette: { mode: dark ? 'dark' : 'light', primary: { main: dark ? '#93b4ff' : '#2459bd' } }, typography: { fontFamily: 'inherit', button: { textTransform: 'none', fontWeight: 500 } }, shape: { borderRadius: 5 } }), [dark]);
  useEffect(() => { setFilters(queryPreferences(parsed.query)); }, [parsed.query]);
  useEffect(() => {
    const controller = new AbortController();
    if (!parsed.query) { setState({ query: '', status: 'waiting', packages: [], failures: [], warning: '' }); return () => controller.abort(); }
    if (parsed.error) { setState({ query: parsed.query, status: 'invalid', packages: [], failures: [], warning: parsed.error }); return () => controller.abort(); }
    setState({ query: parsed.query, status: 'loading', packages: [], failures: [], warning: '' });
    (async () => {
      if (parsed.intent === 'discover') {
        const recommendations = await loadRecommendations(parsed.topic, controller.signal);
        if (!controller.signal.aborted) setState({ query: parsed.query, status: 'ready', packages: recommendations.packages, recommendations, failures: [], warning: recommendations.warning, fetchedAt: new Date() });
        return;
      }
      const results = await Promise.allSettled(parsed.names.map(name => loadPackage(name, controller.signal, parsed.intent !== 'alternatives')));
      if (controller.signal.aborted) return;
      const packages = results.filter(r => r.status === 'fulfilled').map(r => r.value);
      const failures = results.flatMap((r, i) => r.status === 'rejected' ? [{ name: parsed.names[i], message: r.reason.message }] : []);
      let alternatives = null;
      if (parsed.intent === 'alternatives' && packages.length) alternatives = await loadAlternatives(packages[0], controller.signal).catch(error => ({ packages: [], warning: error.message }));
      if (!controller.signal.aborted) setState({ query: parsed.query, status: packages.length ? 'ready' : 'error', packages, failures, alternatives, warning: alternatives?.warning || '', fetchedAt: new Date() });
    })().catch(error => { if (!controller.signal.aborted) setState({ query: parsed.query, status: 'error', packages: [], failures: [{ name: 'Request', message: error.message }], warning: '' }); });
    return () => controller.abort();
  }, [parsed, generation]);
  useEffect(() => { if (state.status !== 'loading' && !notified.current && props.messageHandlers?.componentLoaded) { notified.current = true; props.messageHandlers.componentLoaded(); } }, [state.status, props.messageHandlers]);
  const discovery = ['alternatives','discover'].includes(parsed.intent);
  const resultSet = parsed.intent === 'alternatives' ? state.alternatives : state.recommendations;
  const candidates = parsed.intent === 'alternatives' ? state.alternatives?.packages || [] : state.packages;
  const shown = discovery ? filterRecommendations(candidates,filters) : candidates;
  return <ThemeProvider theme={theme}><main className={`package-lens ${dark ? 'dark' : ''} ${sidebar ? 'sidebar' : ''}`}>
    <header className="masthead"><div className="brand"><span className="registry-mark" aria-hidden="true">npm</span><div><h1>Package Lens</h1><p>Package details & comparisons</p></div></div><span className="source-label">npm registry</span></header>
    {parsed.query && <p className="host-query"><span className="eyebrow">Search</span><span>{parsed.query}</span></p>}
    {parsed.query && <div className="result-heading"><div><h2>{parsed.intent === 'discover' ? `Packages for ${parsed.topic}` : parsed.intent === 'alternatives' ? `Alternatives to ${parsed.names[0] || 'a package'}` : parsed.intent === 'compare' ? 'Package comparison' : parsed.names[0] || 'Package details'}</h2></div>{state.status !== 'loading' && <Button size="small" variant="outlined" onClick={() => { clearCache(); setGeneration(n => n + 1); }}>Refresh</Button>}</div>}
    <div aria-live="polite" aria-busy={state.status === 'loading'}>
      {state.status === 'loading' && <div className="loading"><CircularProgress size={23}/><div><h3>Loading package data…</h3><p>Fetching metadata and download counts from npm.</p></div></div>}
      {state.status === 'waiting' && <section className="getting-started"><h2>Look up an npm package</h2><p>Use the HyperDart search bar above. Search by package name, compare packages, or find an alternative.</p><div className="query-reference"><h3>Example searches</h3><dl><div><dt><code>npm express</code></dt><dd>Version, license, dependencies and weekly downloads</dd></div><div><dt><code>compare packages express, fastify</code></dt><dd>Comparison table, download chart and key differences</dd></div><div><dt><code>compare express, fastify, koa</code></dt><dd>The same comparison for three packages</dd></div><div><dt><code>npm alternatives to moment</code></dt><dd>Ranked alternatives with shared keywords and weekly downloads</dd></div><div><dt><code>npm request</code></dt><dd>Package details and npm’s deprecation notice</dd></div></dl></div></section>}
      {state.status === 'invalid' && <Alert severity="info">{state.warning}</Alert>}
      {state.failures.map(f => <Alert severity="warning" key={f.name}><strong>{f.name}</strong>: {f.message}</Alert>)}
      {state.status === 'error' && <Button variant="outlined" onClick={() => setGeneration(n => n + 1)}>Try again</Button>}
      {state.status === 'ready' && <>
        {discovery && <>
          <div className="method"><p><strong>{shown.length} results</strong> · {resultSet?.checked ?? 0} candidates checked from {resultSet?.total ?? 0} search results</p><details><summary>How results are ranked</summary><p>Relevance to {parsed.intent === 'discover' ? 'your use case' : 'the source package'} comes first, with smaller contributions from npm quality, release recency and downloads. Deprecated packages and standalone @types declarations are excluded. Ranking does not establish API compatibility or overall quality.</p></details></div>
          <div className="result-controls"><label><input type="checkbox" checked={filters.typesOnly} onChange={e => setFilters(f => ({...f,typesOnly:e.target.checked}))}/>Bundled TypeScript</label><label><input type="checkbox" checked={filters.esmOnly} onChange={e => setFilters(f => ({...f,esmOnly:e.target.checked}))}/>ESM declared</label><label className="sort-label">Sort by<select aria-label="Sort results" value={filters.sort} onChange={e => setFilters(f => ({...f,sort:e.target.value}))}><option value="relevance">Relevance</option><option value="downloads">Weekly downloads</option><option value="size">Unpacked size</option></select></label></div>
        </>}
        {state.warning && <Alert severity="info">{state.warning}</Alert>}
        {discovery && !shown.length && <div className="empty"><h3>{candidates.length ? 'No matches for these filters' : parsed.intent === 'alternatives' ? 'No suitable alternatives found' : 'No relevant packages found'}</h3><p>{candidates.length ? 'Try removing a filter. Missing metadata cannot confirm compatibility.' : 'No qualifying candidates could be verified. Try a more specific use case or another package.'}</p>{candidates.length > 0 && <Button onClick={() => setFilters({typesOnly:false,esmOnly:false,sort:'relevance'})}>Clear filters</Button>}</div>}
        {parsed.intent === 'compare' && state.packages.length >= 2 && <Comparison packages={state.packages}/>}
        {parsed.intent === 'compare' && state.packages.length < 2 && <Alert severity="info">Only one package loaded. A complete comparison needs at least two.</Alert>}
        {parsed.intent === 'compare' && <Trend packages={state.packages}/>}
        <div className={`cards ${parsed.intent === 'compare' ? 'compare-cards' : ''}`} style={{ '--package-count': shown.length }}>{shown.map((pkg, index) => <PackageCard key={pkg.name} pkg={pkg} index={index}/>)}</div>
        {parsed.intent === 'details' && <Trend packages={state.packages}/>}
      </>}
    </div>
    <footer><span>Data: <a href="https://registry.npmjs.org" target="_blank" rel="noreferrer">npm registry</a> · <a href="https://github.com/npm/registry/blob/main/docs/download-counts.md" target="_blank" rel="noreferrer">download API</a></span>{state.fetchedAt && <span>Updated {state.fetchedAt.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</span>}{parsed.query && <p>Latest follows npm’s latest tag. Cached for 5 minutes; Refresh fetches new data.</p>}</footer>
  </main></ThemeProvider>;
}
