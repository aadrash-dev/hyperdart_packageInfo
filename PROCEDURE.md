# Package Lens - Procedure

Selected challenge: **Package Info Component**. All project files are in `/Users/apple/Desktop/dart-project`. The application fetches current npm data; it has no API keys.

## 1. Start the finished project

1. Open a terminal in the current project folder.
2. Ensure Node.js 22.12+ is installed; Node 24 is recommended.
3. Run `npm ci` to install exactly the versions in `package-lock.json`.
4. Run `npm start`.
5. Open `http://127.0.0.1:5173` in a browser.
6. Type a query in the official HyperDart company search bar at the top and press Enter. Package Lens has no separate search bar and starts empty until the company delivers a query. Company search services and any required platform authentication must be available.
7. Use the official host's theme and mainline/sidebar controls to inspect the layouts. `/sandbox.html` opens the same company sandbox as the start page.
8. Try `best npm package for CSV parsing` or `recommend a library for date formatting with TypeScript` in the company search bar. Review Why this result and filter the current results by bundled types or declared ESM. Enter a new company query such as `compare csv-parser, papaparse` to compare packages.

## 2. Recreate the implementation approach

1. Read the Package Info problem statement. Extract its mandatory features and supplied trigger patterns.
2. Read the HyperDart React + Vite documentation. For a fresh project, use `npm create hyper-dart@latest my-package-lens`, select React, then JavaScript + Vite. The delivered project already contains the corresponding integration structure; do not scaffold over it.
3. Keep `src/frontend/index.jsx` as `withHD(PackageLens)` and set the package source and module paths.
4. Add the supplied keyword and entity regex patterns to `hyperdart.config.js`. Set both mainline and sidebar formats.
5. Keep `searchData.json` empty so the company bar is the only runtime query source. Company payloads contain entities using `collectionType: HD_PACKAGES`, `collectionName: NPM_PACKAGES`, and the npm name in `sourceID`.
6. Normalize array/object host payloads, detect details/compare/alternatives from `query`, and validate package names before requests. Accept two or three unique package names for comparisons.
7. Fetch the npm package record, derive the latest dist-tag metadata, and load weekly downloads. Fetch last-month history for details and comparisons. Use encoded names for scoped packages.
8. Preserve metadata when download APIs fail. Add cancellation, a 12-second timeout, five-minute caching and a Refresh action. For registry network failures only, retry through Yarn's npm mirror and visibly label fallback metadata.
9. Find alternatives using keyword-OR and description searches, or search directly for a use case. Merge up to 50 unique results, verify up to 12 candidates, and show up to six. Rank by relevance (75%), optional npm quality (10%), release recency (5%), and logarithmic weekly usage (10%); unavailable signals earn no evidence points. Clearly label search usage snapshots when exact-period counts fail. List scoped names duplicating an unscoped candidate after distinct candidates. Exclude deprecated/source packages and standalone type declarations. Explain matched terms and metadata instead of claiming an absolute best package.
10. Build cards, comparisons, zero-baseline charts, accessible chart data and clear loading/error/empty states. Derive theme and layout from `UIOptions`.
11. Notify `messageHandlers.componentLoaded()` once after the result or failure view is rendered.
12. Add `resource.json`, the official `HDSandbox` entry, a Vite frame plugin and an ES library build. Use the official sandbox as the local start page. Do not add a separate local query interface or fallback query state.

## 3. Verify behavior

Run `npm test`, `npm run build`, then `npm run test:browser`.

Enter the six supplied examples in the company search bar: `npm express`, `latest version of react`, `compare packages express, fastify`, `compare express, fastify, koa`, `npm alternatives to moment`, and `npm request`.

Also check a scoped package, a nonexistent package, offline/failed download services, a query with more than three packages, and both themes at 360px, 420px and 720px. Browser tests provide controlled responses for reproducible failures. A separate live smoke check verifies access to the public endpoints; recorded fixture values must never be presented as live npm facts.

Use `npm pack --dry-run` to inspect the registry artifact. Run `npm run validate` after filling real submission URLs. Missing URLs should fail validation.

## 4. Explain the project in a two- to three-minute demo

1. 0:00-0:25: Explain how Package Lens reduces repeated visits to npm pages.
2. 0:25-0:55: Search `npm express`; show metadata, download period and chart.
3. 0:55-1:25: Compare express, fastify and koa; explain factual takeaways and the shared chart scale.
4. 1:25-1:55: Search alternatives to moment; explain shared keyword ranking and its limits.
5. 1:55-2:15: Search `npm request`; show the exact deprecation message and an unknown-package failure.
6. 2:15-2:45: Switch dark theme/sidebar, show the `withHD` entry and describe data handling.

## 5. Finish the external submission when ready

1. Review the generated code and update README authorship notes with your actual changes.
2. Create a public GitHub repository and upload source; respect `.gitignore`.
3. Record and upload the demo to YouTube.
4. Set `github`, `demoVideo`, and `demovideo` to real links. Keep both video fields identical to cover the difference between the current docs and supplied statement.
5. Create your package in the HyperDart Partner Portal and match its approved name in `package.json`. The config reads that name automatically.
6. Set registry authentication with the command shown in the portal. Do not commit tokens.
7. Run `npm run build`, `npm run validate` and `npm pack --dry-run`.
8. Run plain `npm publish` to execute the build and validation hook. Do not use `--ignore-scripts` or remove validation.
9. Verify package search and supported layouts in the HyperDart platform.

GitHub upload, YouTube upload, package registration and registry publication have not been performed by this local build.

## 6. Rebuild the PDF

The PDF was generated with Python ReportLab and visually checked with PyMuPDF rendering. To recreate it, use the local `.venv` or install `reportlab`, `pypdf` and `pymupdf`, then run `.venv/bin/python scripts/create-guide.py`. Output: `Package_Lens_Guide.pdf` in the current folder.

## Sources

- User-supplied Package Info problem statement in Downloads.
- https://hyperdart.com/docs/docs/intro/
- https://hyperdart.com/docs/docs/template/react-vite/
- https://hyperdart.com/docs/docs/config-files/hyperdartconfig/
- https://hyperdart.com/docs/docs/config-files/resource-file/
- https://github.com/npm/registry/blob/main/docs/REGISTRY-API.md
- https://github.com/npm/registry/blob/main/docs/download-counts.md
