# Package Lens

A standalone HyperDart component for the **Package Info** problem statement. It answers package details, two- or three-package comparisons, use-case searches, and explained alternatives using live public npm data.

## Run locally

Use Node.js 22.12+ (Node 24 recommended) and npm. No API key or backend service is required.

```sh
npm ci
npm start
```

Open the local URL printed by Vite (normally http://127.0.0.1:5173). The start page is the official `HDSandbox`, also available at `/sandbox.html`. Enter every query in the **HyperDart company search bar at the top** and press Enter. The company services resolve the search and deliver `searchData` to the wrapped component. There is no component-owned query field, example-search navigation, automatic default search or in-component query-switching action. `searchData.json` starts empty; the sandbox entry registers a component record with an empty query so the host does not mistake the initial state for missing component data. No package API request runs until the host supplies a query. Search processing requires available HyperDart services and any authentication required by the platform.

The local sandbox's comment, like and share controls are functional, including their three-dot menu entries. Likes toggle between zero and one. Comments can be added and deleted. Both are saved per search in this browser, start without fabricated counts, and are not posted to HyperDart or shared with other users. If browser storage is disabled, changes remain in memory with a visible notice.

Share copies a URL containing the current query in `?q=...`; opening it initializes the host's `searchData` and search bar to that query. The link contains no likes or comments. Native sharing is available when supported, and clipboard failures leave a selectable link. Localhost links work on the same computer; sharing across devices requires a hosted preview. These are local-preview features: a development-only Vite adapter replaces the pinned sandbox SDK's static controls without editing `node_modules`. The published package still uses the platform's own social controls. Updating `@hyperdart/sandbox` may require updating the adapter, which fails explicitly if the expected SDK code changes.

```sh
npm test
npm run build
npm run test:browser
```

The browser tests use installed Google Chrome (`/Applications/Google Chrome.app` on macOS). On another platform install a Playwright Chromium browser with `npx playwright install chromium`; the configuration falls back to it automatically.

## Try these queries

- `npm express`: latest version, release date, description, license, Node requirement, type metadata, unpacked size, dependencies and weekly downloads.
- `latest version of react`: latest dist-tag and release date.
- `compare packages express, fastify`: comparison table, factual takeaways, package cards and a shared-scale daily downloads chart.
- `compare express, fastify, koa`: three-way comparison.
- `npm alternatives to moment`: ranked alternatives, shared keywords, and weekly downloads.
- `best npm package for CSV parsing`: discover packages without knowing their names.
- `recommend a library for date formatting with TypeScript`: discover packages and enable the bundled TypeScript filter.
- `best npm package for CSV parsing with ESM`: discover packages with declared ESM metadata.
- `npm request`: deprecation warning with npm's message.
- `npm @babel/core`: scoped-package support.
- `npm this-package-does-not-exist-872491`: clear not-found handling.

Enter these forms in the company search bar. Host payloads can be arrays or objects; package entities use `sourceID`, with `word` as fallback. Intent is inferred from the host-supplied query. The optional `queryObject` payload is described for routing in `resource.json`; it is not used as a substitute for the original query.

## Design and data decisions

Package Lens uses a compact developer-tool layout with system fonts, neutral panels, a comparison table, factual takeaways and download history before the metadata cards. The initial view lists supported queries without starting a search. Alternatives show their rank, shared keywords and weekly counts; deprecated packages have a badge and npm's message. Light, dark, `lightsOut`, mainline and sidebar modes derive from `UIOptions`. Narrow comparisons scroll horizontally, and all chart values are also available in an accessible data table.

The application uses React 18, MUI 6, Vite, and the official HyperDart frontend, backend frame helper and sandbox packages. `src/frontend/index.jsx` keeps the required `withHD` wrapper. Vite creates the ES library at `dist/frontend/index.modern.js` and injects its CSS through JavaScript. The dev frame is served at `/package-lens-hyperdart`. `componentLoaded()` is sent once after a ready, waiting or error view is rendered. Search terms come exclusively from the `searchData` prop; local state controls only result filters and refreshing the current host query.

Data sources:

- `https://registry.npmjs.org/{encoded-package}`: latest dist-tag, version metadata and release time.
- `https://api.npmjs.org/downloads/point/last-week/{encoded-package}`: weekly count and exact date range.
- `https://api.npmjs.org/downloads/range/last-month/{encoded-package}`: daily history.
- `https://registry.npmjs.org/-/v1/search?text=...&size=25`: alternatives search.

If the primary registry has a network or timeout failure, metadata and search fall back to `https://registry.yarnpkg.com`, Yarn's npm registry mirror. The component visibly labels fallback responses. HTTP errors such as 404 and 429 are preserved; they do not trigger fallback. Download counts have no mirror fallback and remain unavailable if npm's download API cannot be reached.

Full package records provide release dates and current version metadata in one request; large records may take longer. Registry responses are cached in memory for five minutes, capped at 150 entries. Requests time out after 12 seconds and are aborted when a query changes. Refresh clears the cache. Metadata still appears if download endpoints fail; unavailable values remain explicitly unavailable. The preview and official sandbox make real network calls; browser tests use synthetic fixtures for repeatability.

Discovery accepts a use case rather than a package name. Alternatives combine a keyword-OR search with a description search; useful descriptions can recover results even when a package has no keywords. Up to two searches produce at most 50 unique results. Up to 12 candidates have their current metadata verified using three workers; up to six are shown. Deprecated packages, the source package, standalone `@types/` declarations, and candidates without a relevant topic match are excluded. A CSV parsing query, for example, must match CSV rather than only the generic word parsing. Failed candidates are omitted with a visible count.

Ranking combines normalized name/keyword/description relevance (75%), npm's optional quality signal (10%), latest-release recency (5%), and capped logarithmic weekly usage (10%). Missing signals earn no evidence points; their displayed facts remain unavailable. If the download API fails, search-provided weekly counts can support ranking and appear as a separately labelled snapshot without invented reporting dates. Scoped names duplicating a relevant unscoped candidate follow distinct candidates. Recency is not proof of active maintenance, npm quality is not a security audit, and the displayed retrieval score is not a calibrated quality rating. Each result shows its matched terms and declared compatibility evidence. This is an explainable retrieval heuristic, not an LLM or exhaustive migration recommendation, and needs no AI API key.

Use the Bundled TypeScript and ESM declared controls to filter verified metadata, or sort by relevance, downloads or unpacked archive size. These controls only reorganize the current result and do not start another search. To change packages or intent, submit another query in the company search bar, for example `compare csv-parser, papaparse`. Conditional `exports.types` and `exports.import` entries are recognized alongside `types`, `typings`, `type` and `module` metadata. Missing metadata cannot confirm compatibility.

Charts use a shared zero baseline. Missing download history does not become zero, and missing dates are not connected. Download popularity does not establish quality. Unpacked archive size is not browser bundle size; `types`, `typings`, `type` and `module` fields are indicators only. External metadata is rendered as text, and external links are limited to HTTP(S). No package installation commands are executed by the app.

## Files

- `src/frontend/PackageLens.jsx`: UI, loading lifecycle and host props.
- `src/lib/query.js`: query parsing, entity normalization and alternative ranking.
- `src/lib/recommendations.js`: use-case extraction, relevance scoring, explanations and filters.
- `src/lib/api.js`: npm adapters, caching, timeouts and concurrency.
- `src/sandbox/main.jsx`: official HyperDart sandbox entry for both local start pages.
- `src/sandbox/SocialActions.jsx`, `src/sandbox/navigation.js`: browser-local social controls and shared-search URLs.
- `scripts/sandbox-social-plugin.js`: development adapter for the pinned sandbox's placeholder controls.
- `hyperdart.config.js`, `resource.json`, `searchData.json`: integration metadata and examples.
- `tests/`: logic and browser scenarios.
- `PROCEDURE.md`: setup, implementation and demonstration steps.
- `Package_Lens_Guide.pdf`: project and procedure guide.

## Submission readiness

The project is local. It has not been uploaded to GitHub, YouTube or the HyperDart registry. Create your package in the Partner Portal, set the approved package name in `package.json`, upload a public repository and a two- to three-minute demo, and enter the real URLs in `hyperdart.config.js`. Keep `demoVideo` (current documentation) and `demovideo` (problem statement spelling) equal. Set registry authentication using the Partner Portal's command, keeping credentials out of source control.

`npm run validate` deliberately fails until real submission URLs exist. Plain `npm publish` runs `prepublishOnly`, which builds and validates. Do not bypass it. Check the registry package name and inspect `npm pack --dry-run` before publishing. `node_modules`, `dist`, temporary files and `.venv` are ignored by Git.

## Build authorship

This implementation, documentation and tests were generated and edited with OpenAI Codex from the supplied problem statement and official documentation. No human-authored modifications are claimed. Review the implementation and add your own changes and authorship notes before submission.

## References

- [HyperDart introduction](https://hyperdart.com/docs/docs/intro/)
- [React + Vite template](https://hyperdart.com/docs/docs/template/react-vite/)
- [Component configuration](https://hyperdart.com/docs/docs/config-files/hyperdartconfig/)
- [Vite configuration](https://hyperdart.com/docs/docs/config-files/viteconfig/)
- [Resource file](https://hyperdart.com/docs/docs/config-files/resource-file/)
- [Search data](https://hyperdart.com/docs/docs/props-recieved/searchdata/search-data-overview/)
- [npm registry API](https://github.com/npm/registry/blob/main/docs/REGISTRY-API.md)
- [npm download counts](https://github.com/npm/registry/blob/main/docs/download-counts.md)

Documentation checked on 26 October 2026. The source problem statement is `/Users/apple/Downloads/Package_Info_Problem_Statement.pdf`.
# hyperdart_packageInfo
