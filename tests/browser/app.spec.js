import { test, expect } from '@playwright/test';
import config from '../../hyperdart.config.js';
const names = ['express','fastify','koa','moment','dayjs','luxon','request','@babel/core','react'];
const metadata = Object.fromEntries(names.map((name,i) => [name, {name,description:`${name} test fixture`,keywords:i>=3&&i<=5?['date','time']:['server'],'dist-tags':{latest:'1.2.3'},time:{'1.2.3':'2026-10-01T00:00:00Z'},versions:{'1.2.3':{description:`${name} test fixture`,keywords:i>=3&&i<=5?['date','time']:['server'],license:'MIT',engines:{node:'>=18'},types:'index.d.ts',dist:{unpackedSize:20480},deprecated:name==='request'?'This fixture package is deprecated.':undefined}}}]));
for (const [name,types,type,bytes] of [['csv-parser',false,'commonjs',2048],['papaparse',true,'module',12000],['date-parser',true,'module',1000]]) {
  const keywords=name==='date-parser'?['date','parser']:['csv','parser'];
  metadata[name]={name,description:`${keywords[0]} parsing`,keywords,'dist-tags':{latest:'1.2.3'},time:{'1.2.3':'2026-10-01'},versions:{'1.2.3':{description:`${keywords[0]} parsing`,keywords,license:'MIT',type,...(types?{types:'index.d.ts'}:{}),dist:{unpackedSize:bytes}}}};
}
const hostQueries = {
  'compare express, fastify, koa':['express','fastify','koa'],
  'compare packages express, fastify':['express','fastify'],
  'latest version of react':['react'], 'npm nonexistent-package':['nonexistent-package'],
  'npm @babel/core':['@babel/core'], 'npm alternatives to moment':['moment'],
  'npm request':['request'], 'npm express':['express'],
  'compare express, fastify, koa, react':['express','fastify','koa','react'],
  'best npm package for CSV parsing':[], 'compare csv-parser, papaparse':['csv-parser','papaparse']
};
function component(page) {return page.frameLocator('iframe').first();}
async function waitForComponentHeight(page) {
  const height = await component(page).locator('.package-lens').evaluate(el => Math.ceil(el.getBoundingClientRect().height));
  await expect.poll(() => page.locator('iframe').first().evaluate(el => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(height);
}
async function captureComponent(page, path) {
  const content = component(page).locator('.package-lens');
  const viewport = page.viewportSize();
  const height = await content.evaluate(el => Math.ceil(el.getBoundingClientRect().height));
  // Wait for the host's debounced ResizeObserver message before capturing.
  await waitForComponentHeight(page);
  // Chrome clips iframe screenshots at the outer viewport boundary.
  await page.setViewportSize({width:viewport.width,height:Math.max(viewport.height,height + 500)});
  await content.screenshot({path});
  await page.setViewportSize(viewport);
  // The sandbox rebuilds its search input on resize; let that render finish.
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}
async function fixtures(page) {
  // Mock only the company's services here; the UI is the real HDSandbox search bar.
  await page.route('**/nodeapi/**',route=>{
    const url=new URL(route.request().url());
    if(url.pathname.includes('sandboxNLUEngine')) {
      const query=url.searchParams.get('text');
      const entities=(hostQueries[query]||[]).map(name=>({word:name,sourceID:name,collectionName:'NPM_PACKAGES',collectionType:'HD_PACKAGES'}));
      return route.fulfill({json:{searchData:Object.hasOwn(hostQueries,query)?[{component:config.name,query,entities,quickView:3}]:[]}});
    }
    return route.fulfill({json:{searchData:[]}});
  });
  await page.route('https://registry.npmjs.org/**',route=>{
    const url=new URL(route.request().url());
    if(url.pathname.includes('/-/v1/search')) {
      const csv=/csv/i.test(url.searchParams.get('text'));
      return route.fulfill({json:{objects:(csv?['csv-parser','papaparse','date-parser']:['dayjs','luxon','moment']).map(name=>({package:{name,description:metadata[name].description,keywords:metadata[name].keywords},score:{detail:{quality:0.8}}}))}});
    }
    const name=decodeURIComponent(url.pathname.slice(1));
    return route.fulfill(metadata[name]?{json:metadata[name]}:{status:404,json:{error:'Not found'}});
  });
  await page.route('https://api.npmjs.org/downloads/**',route=>route.fulfill({json:route.request().url().includes('/range/')?{downloads:[{day:'2026-09-01',downloads:100},{day:'2026-09-02',downloads:150},{day:'2026-09-03',downloads:120}]}:{downloads:123456,start:'2026-10-12',end:'2026-10-18'}}));
}
async function query(page,value) {
  const search=page.getByPlaceholder('Search…',{exact:true});
  await search.fill(value);await expect(search).toHaveValue(value);await search.press('Enter');
  await expect(component(page).locator('.host-query')).toContainText(value);
}
test('only company search drives results; empty input does not fetch packages',async({page})=>{
  const requests=[];page.on('request',request=>{if(/registry\.npmjs\.org|api\.npmjs\.org/.test(request.url()))requests.push(request.url());});
  await fixtures(page);await page.goto('/');
  await expect(component(page).getByRole('heading',{name:'Look up an npm package'})).toBeVisible();
  await expect(page.getByText(/Empty query|No searchdata|did not signal/i)).toHaveCount(0);
  await expect(component(page).locator('.query-reference')).toContainText('compare packages express, fastify');
  await page.screenshot({path:'tmp/screenshots/startup.png',fullPage:true});
  await captureComponent(page,'tmp/screenshots/startup-component.png');
  await expect(component(page).getByRole('textbox')).toHaveCount(0);
  await expect(component(page).locator('form,nav.examples')).toHaveCount(0);
  expect(requests).toHaveLength(0);
  await query(page,'npm express');await expect(component(page).locator('.package-card h2')).toHaveText('express ↗');
  const search=page.getByPlaceholder('Search…',{exact:true});
  await search.fill('not handled by this component');await search.press('Enter');
  await expect(component(page).getByRole('heading',{name:'Look up an npm package'})).toBeVisible();
  await expect(component(page).locator('.package-card')).toHaveCount(0);
});
test('company queries cover comparison, details, alternatives, deprecated and unknown states',async({page})=>{
  await fixtures(page);await page.goto('/');
  await query(page,'compare packages express, fastify');
  await expect(component(page).locator('.comparison thead th')).toHaveText(['Metric','express','fastify']);
  await expect(component(page).getByRole('heading',{name:'Download history'})).toBeVisible();
  await expect(component(page).locator('.takeaway')).toContainText('highest weekly download count');
  await expect(component(page).locator('.package-card')).toHaveCount(2);
  await captureComponent(page,'tmp/screenshots/comparison-two.png');
  await query(page,'compare express, fastify, koa');await expect(component(page).getByRole('heading',{name:'Compare the facts'})).toBeVisible();
  await expect(component(page).locator('.comparison thead th')).toHaveText(['Metric','express','fastify','koa']);
  await expect(component(page).locator('.legend')).toContainText('koa');
  await expect(component(page).locator('.package-card')).toHaveCount(3);
  await query(page,'latest version of react');await expect(component(page).locator('.package-card h2')).toHaveText('react ↗');
  await query(page,'npm nonexistent-package');await expect(component(page).getByText('Package not found on npm.',{exact:false})).toBeVisible();
  await query(page,'npm @babel/core');await expect(component(page).locator('.package-card h2')).toHaveText('@babel/core ↗');
  await query(page,'npm alternatives to moment');await expect(component(page).locator('.package-card')).toHaveCount(2);
  await expect(component(page).locator('.package-card .shared')).toHaveCount(2);
  await expect(component(page).locator('.package-card .shared').first()).toContainText('date');
  await expect(component(page).locator('.download-count').first()).toContainText('123,456');
  await captureComponent(page,'tmp/screenshots/alternatives.png');
  await expect(component(page).getByRole('button',{name:/alternatives|compare selected|package details/i})).toHaveCount(0);
  await query(page,'npm request');await expect(component(page).getByText('This fixture package is deprecated.')).toBeVisible();
  await expect(component(page).locator('.deprecated-badge')).toHaveText('Deprecated');
  await captureComponent(page,'tmp/screenshots/deprecated.png');
  await query(page,'compare express, fastify, koa, react');await expect(component(page).getByText('Compare at most three packages at a time.')).toBeVisible();
});
test('official host controls apply mainline/sidebar and light/dark layouts',async({page})=>{
  await fixtures(page);await page.goto('/');await query(page,'compare express, fastify, koa');
  await expect(component(page).locator('.package-card')).toHaveCount(3);
  await page.getByRole('button',{name:'mainline',exact:true}).click();
  await expect(component(page).locator('.package-lens')).not.toHaveClass(/sidebar/);
  await waitForComponentHeight(page);
  await page.screenshot({path:'tmp/screenshots/host-mainline-light.png',fullPage:true});
  await captureComponent(page,'tmp/screenshots/mainline-light.png');
  await page.getByRole('button',{name:'dark',exact:true}).click();
  await page.getByRole('button',{name:'sidebar',exact:true}).click();
  await expect(component(page).locator('.package-lens')).toHaveClass(/dark/);
  await expect(component(page).locator('.package-lens')).toHaveClass(/sidebar/);
  await page.setViewportSize({width:420,height:900});
  await waitForComponentHeight(page);
  await page.screenshot({path:'tmp/screenshots/sidebar-dark.png',fullPage:true});
  await captureComponent(page,'tmp/screenshots/sidebar-dark-component.png');
  await page.setViewportSize({width:360,height:800});
  expect(await page.frames()[1].evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.getByRole('button',{name:'light',exact:true}).click();await query(page,'npm express');
  await expect(component(page).locator('.package-card')).toHaveCount(1);
  await waitForComponentHeight(page);
  await page.screenshot({path:'tmp/screenshots/mobile-details.png',fullPage:true});
});
test('partial failures preserve details and no-match alternatives remain honest',async({page})=>{
  await fixtures(page);await page.route('https://api.npmjs.org/downloads/**',route=>route.fulfill({status:503,json:{error:'Unavailable'}}));
  await page.goto('/');await query(page,'compare express, fastify, koa');
  await expect(component(page).getByText('Weekly downloads unavailable.')).toHaveCount(3);
  await page.route('https://registry.npmjs.org/moment',route=>route.fulfill({json:{...metadata.moment,keywords:[],versions:{'1.2.3':{description:'no keywords',keywords:[]}}}}));
  await query(page,'npm alternatives to moment');await expect(component(page).getByRole('heading',{name:'No suitable alternatives found'})).toBeVisible();
});
test('sandbox alias uses the same company search and wrapped iframe',async({page})=>{
  await fixtures(page);await page.goto('/sandbox.html');
  await query(page,'compare packages express, fastify');
  await expect(component(page).getByRole('heading',{name:'Package Lens',exact:true})).toBeVisible();
  await expect(component(page).locator('.package-card')).toHaveCount(2);
});
test('download totals without reporting dates do not produce a popularity winner',async({page})=>{
  await fixtures(page);
  await page.route('https://api.npmjs.org/downloads/point/**',route=>route.fulfill({json:{downloads:123456}}));
  await page.goto('/');await query(page,'compare packages express, fastify');
  await expect(component(page).locator('.takeaway')).toContainText('matching periods are unavailable');
  await expect(component(page).locator('.takeaway')).not.toContainText('highest weekly download count');
});
test('company use-case query supports local result filters without starting another search',async({page})=>{
  await fixtures(page);await page.goto('/');await query(page,'best npm package for CSV parsing');
  await expect(component(page).locator('.package-card')).toHaveCount(2);
  await expect(component(page).locator('.package-card .match-reasons')).toHaveCount(2);
  const requests=[];page.on('request',request=>{if(request.url().includes('/nodeapi/'))requests.push(request.url());});
  await component(page).getByLabel('Bundled TypeScript',{exact:true}).check();
  await expect(component(page).locator('.package-card h2')).toHaveText('papaparse ↗');
  await component(page).getByLabel('ESM declared',{exact:true}).check();
  await expect(component(page).locator('.package-card')).toHaveCount(1);
  await component(page).getByLabel('Bundled TypeScript',{exact:true}).uncheck();
  await component(page).getByLabel('ESM declared',{exact:true}).uncheck();
  await component(page).getByLabel('Sort results').selectOption('size');
  await expect(component(page).locator('.package-card h2').first()).toHaveText('csv-parser ↗');
  expect(requests).toHaveLength(0);
  await page.screenshot({path:'tmp/screenshots/discovery.png',fullPage:true});
  await query(page,'compare csv-parser, papaparse');
  await expect(component(page).getByRole('heading',{name:'Compare the facts'})).toBeVisible();
});

test('sandbox likes and comments persist per search and menu actions use the same state',async({page})=>{
  await fixtures(page);await page.goto('/');
  const actions=page.locator('.sandbox-social-actions');
  await expect(actions.getByRole('button',{name:'Comments (0)',exact:true})).toBeVisible();
  await expect(actions.getByRole('button',{name:'Like this search',exact:true})).toHaveText('0');
  await query(page,'compare packages express, fastify');
  await expect(component(page).locator('.package-card')).toHaveCount(2);
  await actions.getByRole('button',{name:'Like this search',exact:true}).click();
  await expect(actions.getByRole('button',{name:'Unlike this search',exact:true})).toHaveAttribute('aria-pressed','true');
  await actions.getByRole('button',{name:'Unlike this search',exact:true}).click();
  await expect(actions.getByRole('button',{name:'Like this search',exact:true})).toHaveText('0');
  await actions.getByRole('button',{name:'Like this search',exact:true}).click();
  await actions.getByRole('button',{name:'Comments (0)',exact:true}).click();
  const dialog=page.getByRole('dialog');
  await expect(dialog.getByRole('button',{name:'Post comment',exact:true})).toBeDisabled();
  await dialog.getByLabel('Add a comment').fill('   ');
  await expect(dialog.getByRole('button',{name:'Post comment',exact:true})).toBeDisabled();
  const text='<img src=x onerror=alert(1)> Useful comparison.';
  await dialog.getByLabel('Add a comment').fill(`  ${text}  `);
  await dialog.getByRole('button',{name:'Post comment',exact:true}).click();
  await expect(dialog.getByText(text,{exact:true})).toBeVisible();
  await expect(dialog.locator('img')).toHaveCount(0);
  await dialog.screenshot({path:'tmp/screenshots/comments-dialog.png'});
  await dialog.getByRole('button',{name:'Close',exact:true}).click();
  await expect(actions.getByRole('button',{name:'Comments (1)',exact:true})).toBeVisible();
  await page.reload();
  await expect(component(page).locator('.comparison thead th')).toHaveText(['Metric','express','fastify']);
  await expect(page.getByPlaceholder('Search…',{exact:true})).toHaveValue('compare packages express, fastify');
  await expect(actions.getByRole('button',{name:'Unlike this search',exact:true})).toHaveText('1');
  await expect(actions.getByRole('button',{name:'Comments (1)',exact:true})).toBeVisible();
  await query(page,'npm request');
  await expect(actions.getByRole('button',{name:'Like this search',exact:true})).toHaveText('0');
  await expect(actions.getByRole('button',{name:'Comments (0)',exact:true})).toBeVisible();
  await query(page,'compare packages express, fastify');
  await expect(component(page).locator('.package-card')).toHaveCount(2);
  await page.getByRole('button',{name:'Component actions',exact:true}).click();
  await page.getByRole('menuitem',{name:'Comments (1)',exact:true}).click();
  await expect(dialog.getByText(text,{exact:true})).toBeVisible();
  await dialog.getByRole('button',{name:`Delete comment: ${text}`,exact:true}).click();
  await expect(dialog.getByText('No comments yet.',{exact:true})).toBeVisible();
  await dialog.getByRole('button',{name:'Close',exact:true}).click();
  await page.getByRole('button',{name:'Component actions',exact:true}).click();
  await page.getByRole('menuitem',{name:'Unlike this search',exact:true}).click();
  await expect(actions.getByRole('button',{name:'Like this search',exact:true})).toHaveText('0');
  await page.reload();
  await expect(actions.getByRole('button',{name:'Comments (0)',exact:true})).toBeVisible();
});

test('share copies a link that restores the same host query in a fresh browser context',async({page,context,browser})=>{
  await context.grantPermissions(['clipboard-read','clipboard-write']);
  await fixtures(page);await page.goto('/sandbox.html');
  await query(page,'compare express, fastify, koa');
  await expect(component(page).locator('.package-card')).toHaveCount(3);
  await page.locator('.sandbox-social-actions').getByRole('button',{name:'Share this search',exact:true}).click();
  const dialog=page.getByRole('dialog');
  const link=await dialog.getByLabel('Search link').inputValue();
  expect(new URL(link).pathname).toBe('/sandbox.html');
  expect(new URL(link).searchParams.get('q')).toBe('compare express, fastify, koa');
  await dialog.getByRole('button',{name:'Copy link',exact:true}).click();
  await expect(dialog.getByRole('status')).toHaveText('Link copied.');
  expect(await page.evaluate(()=>navigator.clipboard.readText())).toBe(link);
  await dialog.screenshot({path:'tmp/screenshots/share-dialog.png'});
  await dialog.getByRole('button',{name:'Close',exact:true}).click();
  await page.getByRole('button',{name:'Component actions',exact:true}).click();
  await page.getByRole('menuitem',{name:'Share this search',exact:true}).click();
  await expect(dialog.getByLabel('Search link')).toHaveValue(link);
  const fresh=await browser.newContext();
  try {
    const linked=await fresh.newPage();await fixtures(linked);await linked.goto(link);
    await expect(component(linked).locator('.comparison thead th')).toHaveText(['Metric','express','fastify','koa']);
    await expect(linked.getByPlaceholder('Search…',{exact:true})).toHaveValue('compare express, fastify, koa');
    await expect(linked.locator('.sandbox-social-actions').getByRole('button',{name:'Like this search',exact:true})).toHaveText('0');
  } finally { await fresh.close(); }
});

test('social actions remain usable when browser storage and clipboard are unavailable',async({page})=>{
  await page.addInitScript(()=>{
    Storage.prototype.setItem=function(){throw new DOMException('Storage disabled','SecurityError');};
    Object.defineProperty(navigator,'clipboard',{value:{writeText:async()=>{throw new DOMException('Denied','NotAllowedError');}}});
  });
  await fixtures(page);await page.goto('/');
  const actions=page.locator('.sandbox-social-actions');
  await actions.getByRole('button',{name:'Like this search',exact:true}).click();
  await expect(actions.getByRole('button',{name:'Unlike this search',exact:true})).toHaveText('1');
  await expect(actions.getByRole('status')).toContainText('Changes could not be saved');
  await actions.getByRole('button',{name:'Share this search',exact:true}).click();
  const dialog=page.getByRole('dialog');
  await dialog.getByRole('button',{name:'Copy link',exact:true}).click();
  await expect(dialog.getByRole('status')).toContainText('copy it manually');
  await expect(dialog.getByLabel('Search link')).toHaveAttribute('readonly','');
});
