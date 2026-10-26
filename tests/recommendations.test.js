import test from 'node:test';
import assert from 'node:assert/strict';
import { parseQuery } from '../src/lib/query.js';
import { terms, useCaseTopic, queryPreferences, rankRecommendations, filterRecommendations } from '../src/lib/recommendations.js';
import { loadRecommendations, loadAlternatives, clearCache, packageFromRecord } from '../src/lib/api.js';

test('use-case queries work without a package entity and extract compatibility preferences', () => {
  for (const query of ['best npm package for CSV parsing', 'library for parsing CSV', 'recommend a library for CSV parsing']) {
    const parsed = parseQuery({query});
    assert.equal(parsed.intent,'discover');assert.equal(parsed.error,'');assert.deepEqual(terms(parsed.topic).sort(),['csv','parse']);
  }
  const query='best npm package for date formatting with TypeScript and ESM';
  assert.deepEqual(queryPreferences(query),{typesOnly:true,esmOnly:true,sort:'relevance'});
  assert.ok(useCaseTopic(query).includes('date formatting'));
  assert.ok(parseQuery({query:'best npm package for'}).error);
});
test('relevance outranks unrelated popularity and explanations expose actual evidence', () => {
  const candidates=[
    {name:'csv-reader',description:'CSV parsing',keywords:['csv','parser'],downloads:100},
    {name:'popular-date',description:'Date formatting',keywords:['date'],downloads:100000000},
    {name:'parse-only',keywords:['parser'],downloads:100000000},
    {name:'old-csv',keywords:['csv','parser'],deprecated:'do not use'},
    {name:'@types/csv',keywords:['csv','parser']}
  ];
  const ranked=rankRecommendations(candidates,'csv parsing');
  assert.equal(ranked[0].name,'csv-reader');assert.equal(ranked.some(p=>p.name==='popular-date'),false);
  assert.equal(ranked.some(p=>p.deprecated||p.name.startsWith('@types/')),false);
  assert.deepEqual(ranked[0].matched,['csv','parse']);
  assert.match(ranked[0].reasons[0],/Matches csv, parse/);
});
test('filters do not infer compatibility from missing fields; unknown sizes sort last', () => {
  const a={name:'a',types:true,esm:true,size:200,matchScore:80,relevance:1};
  const b={name:'b',types:false,size:100,matchScore:90,relevance:1};
  const c={name:'c',matchScore:95,relevance:1};
  assert.deepEqual(filterRecommendations([a,b,c],{typesOnly:true,esmOnly:true}).map(p=>p.name),['a']);
  assert.deepEqual(filterRecommendations([a,b,c],{sort:'size'}).map(p=>p.name),['b','a','c']);
});
test('usage snapshots and distinct package names prevent recent scoped variants from dominating', () => {
  const ranked=rankRecommendations([
    {name:'csv-parse',keywords:['csv','parse'],released:'2025-01-01',searchDownloads:10000000},
    {name:'@someone/csv-parse',keywords:['csv','parse'],released:'2026-01-01',searchDownloads:2},
    {name:'csv-reader',keywords:['csv','parse'],searchDownloads:100000}
  ],'csv parsing',{now:Date.parse('2026-01-02')});
  assert.equal(ranked[0].name,'csv-parse');assert.equal(ranked.at(-1).variantOf,'csv-parse');
  assert.match(ranked[0].reasons.at(-1),/snapshot/);
  assert.equal(ranked[0].downloads,undefined);
});
test('exports conditions reveal bundled types and ESM entries', () => {
  const pkg=packageFromRecord({name:'modern','dist-tags':{latest:'1'},versions:{'1':{exports:{'.':{import:{types:'./index.d.ts',default:'./index.js'},require:'./index.cjs'}}}}});
  assert.equal(pkg.types,true);assert.equal(pkg.esm,true);assert.equal(pkg.moduleType,'ESM entry declared');
});
test('discovery verifies metadata and excludes a deprecated high-scoring search hit', async () => {
  const original=global.fetch;clearCache();
  try {
    global.fetch=async url=>{
      if(url.includes('/-/v1/search')) return new Response(JSON.stringify({objects:[{package:{name:'csv-reader',keywords:['csv','parser']},score:{detail:{quality:0.8}}},{package:{name:'old-csv',keywords:['csv','parser']},score:{detail:{quality:1}}}]}));
      if(url.includes('api.npmjs.org')) return new Response('{}',{status:503});
      const name=decodeURIComponent(new URL(url).pathname.slice(1));
      return new Response(JSON.stringify({name,'dist-tags':{latest:'1'},versions:{'1':{keywords:['csv','parser'],deprecated:name==='old-csv'?'deprecated':undefined}}}));
    };
    const result=await loadRecommendations('CSV parsing');
    assert.deepEqual(result.packages.map(p=>p.name),['csv-reader']);
    assert.equal(result.packages[0].downloads,null);assert.equal(result.checked,2);
  } finally {global.fetch=original;clearCache();}
});
test('alternatives without keywords can discover by a useful description', async () => {
  const original=global.fetch;clearCache();
  try {
    global.fetch=async url=>{
      if(url.includes('/-/v1/search'))return new Response(JSON.stringify({objects:[{package:{name:'csv-reader',description:'CSV parsing',keywords:['csv','parser']}}]}));
      if(url.includes('api.npmjs.org'))return new Response(JSON.stringify({downloads:10}));
      return new Response(JSON.stringify({name:'csv-reader','dist-tags':{latest:'1'},versions:{'1':{keywords:['csv','parser'],description:'CSV parsing'}}}));
    };
    const result=await loadAlternatives({name:'source',keywords:[],description:'CSV parsing'});
    assert.equal(result.packages[0].name,'csv-reader');
  } finally {global.fetch=original;clearCache();}
});
