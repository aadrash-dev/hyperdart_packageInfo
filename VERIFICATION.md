# Verification - 26 October 2026

- PASS: 15 Node tests cover original queries, host entities, use-case extraction, relevance over popularity, usage snapshots and duplicate names, conditional exports, metadata filters, API failures and mirror fallback.
- PASS: six Chrome scenarios use the real official sandbox search bar with mocked company responses. They cover empty host data with no package requests, query changes/no matches, details/comparisons/alternatives, host theme/layout controls, service failures, sandbox alias and discovery filters without a new query. The component has no textbox or query-switching buttons.
- PASS: production HyperDart ES library build at dist/frontend/index.modern.js. Both local start pages use official HDSandbox; the independent demo was removed.
- PASS: npm pack --dry-run includes the client bundle, package.json, hyperdart.config.js, resource.json and README, with no credentials or node_modules.
- DATA-SOURCE CHECK: earlier live npm discovery returned relevant CSV packages with labelled Yarn fallback/search-count snapshots. This verifies npm retrieval, not company search service availability or authentication. The current company-search integration is tested with controlled service responses.
- EXPECTED BLOCK: publish validation rejects the two missing submission URLs. Set your actual public GitHub repository and YouTube demo links before publication. No external submission has been performed.

Browser screenshots use synthetic test fixtures, except tmp/screenshots/live-express.png. Fixture values are not current package facts. PDF pages and mainline/light, sidebar/dark and mobile screenshots were visually reviewed.

Local preview: http://127.0.0.1:5173

Reproduce with npm test, npm run build and npm run test:browser. Tests use installed Google Chrome on macOS; other platforms can install Playwright Chromium. The source APIs may respond differently on another network or date.
