import test from 'node:test';
import assert from 'node:assert/strict';
import { parseQuery, rankAlternatives, isPackageName } from '../src/lib/query.js';
import { packageFromRecord, getJSON, clearCache, loadPackage } from '../src/lib/api.js';
test('all supplied query examples resolve expected intent and names', () => {
  for (const [query, intent, names] of [
    ['npm express','details',['express']], ['latest version of react','details',['react']],
    ['compare packages express, fastify','compare',['express','fastify']],
    ['compare express, fastify, koa','compare',['express','fastify','koa']],
    ['npm alternatives to moment','alternatives',['moment']], ['npm request','details',['request']],
    ['packages similar to lodash','alternatives',['lodash']], ['npm @babel/core','details',['@babel/core']]
  ]) assert.deepEqual(parseQuery({query}), {query,intent,names,error:''});
});
test('array and object searchData resolve entities by sourceID', () => {
  const data = {query:'compare the two', entities:[{sourceID:'react', word:'React framework', collectionType:'HD_PACKAGES'},{sourceID:'vue',collectionName:'NPM_PACKAGES'}]};
  assert.deepEqual(parseQuery([data]),parseQuery(data));
  assert.deepEqual(parseQuery(data).names,['react','vue']);
});
test('reject invalid names, empty queries and overlong comparisons', () => {
  assert.ok(parseQuery({query:'compare react'}).error);
  assert.ok(parseQuery({query:'compare react, vue, svelte, preact'}).error);
  assert.ok(parseQuery(null).error);
  assert.equal(isPackageName('../secret'),false);
  assert.equal(isPackageName('@scope/package'),true);
});
test('rank alternatives by overlap, downloads, excluding source and deprecated', () => {
  const source = {name:'source',keywords:['date','time']};
  const ranked = rankAlternatives(source,[source,{name:'a',keywords:['date'],downloads:1000},{name:'b',keywords:['date','time'],downloads:1},{name:'c',keywords:['date'],downloads:null},{name:'old',keywords:['date','time'],deprecated:'old'},{name:'other',keywords:['math']}]);
  assert.deepEqual(ranked.map(x=>x.name),['b','a','c']);
  assert.deepEqual(ranked[0].shared,['date','time']);
});
test('metadata uses latest dist-tag, preserves deprecation and sanitizes links', () => {
  const pkg = packageFromRecord({name:'sample','dist-tags':{latest:'2.0.0'},time:{'2.0.0':'2026-01-01'},versions:{'2.0.0':{deprecated:'Use another package',types:'index.d.ts',homepage:'javascript:alert(1)',engines:{node:'>=18'},dist:{unpackedSize:1024}}}});
  assert.equal(pkg.version,'2.0.0');assert.equal(pkg.types,true);assert.equal(pkg.homepage,null);assert.equal(pkg.deprecated,'Use another package');
});
test('API errors identify unknown packages and rate limiting', async () => {
  const original = global.fetch;
  try {
    clearCache(); global.fetch = async()=>new Response('{}',{status:404});
    await assert.rejects(getJSON('https://test/404'), /not found/);
    global.fetch = async()=>new Response('{}',{status:429});
    await assert.rejects(getJSON('https://test/429'), /rate limiting/);
  } finally {global.fetch=original;}
});
test('download failure retains package details and marks counts unavailable', async () => {
  const original=global.fetch;
  try {
    clearCache(); global.fetch = async url => url.includes('registry.npmjs') ? new Response(JSON.stringify({name:'example','dist-tags':{latest:'1.0.0'},versions:{'1.0.0':{description:'Example'}}})) : new Response('{}',{status:503});
    const pkg = await loadPackage('example',undefined,true);
    assert.equal(pkg.version,'1.0.0');assert.equal(pkg.downloads,null);assert.equal(pkg.trend.length,0);assert.equal(pkg.warnings.length,2);
  } finally {global.fetch=original;clearCache();}
});
test('network failure falls back to labelled mirror metadata', async () => {
  const original=global.fetch;
  try {
    clearCache(); global.fetch=async url=>{
      if(url.includes('registry.npmjs.org')) throw new TypeError('network unavailable');
      if(url.includes('registry.yarnpkg.com')) return new Response(JSON.stringify({name:'sample','dist-tags':{latest:'1.0.0'},versions:{'1.0.0':{}}}));
      return new Response(JSON.stringify({downloads:12,start:'2026-01-01',end:'2026-01-07'}));
    };
    const pkg=await loadPackage('sample');assert.equal(pkg.version,'1.0.0');assert.match(pkg.warnings[0],/Yarn/);
  } finally {global.fetch=original;clearCache();}
});
