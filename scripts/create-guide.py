from pathlib import Path
from xml.sax.saxutils import escape
from reportlab.pdfgen import canvas
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Preformatted, Image, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.utils import ImageReader

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / 'Package_Lens_Guide.pdf'
styles = getSampleStyleSheet()
green = colors.HexColor('#193c35')
muted = colors.HexColor('#61776c')
styles.add(ParagraphStyle(name='Kicker',fontName='Helvetica-Bold',fontSize=9,textColor=muted,spaceAfter=15,leading=13))
styles.add(ParagraphStyle(name='TitleLens',fontName='Helvetica-Bold',fontSize=38,leading=43,textColor=green,spaceAfter=18))
styles.add(ParagraphStyle(name='SectionLens',fontName='Helvetica-Bold',fontSize=24,leading=30,textColor=green,spaceAfter=16))
styles.add(ParagraphStyle(name='SubLens',fontName='Helvetica-Bold',fontSize=12,leading=17,textColor=green,spaceBefore=13,spaceAfter=6))
styles.add(ParagraphStyle(name='BodyLens',fontName='Helvetica',fontSize=10,leading=15,textColor=green,spaceAfter=9))
styles.add(ParagraphStyle(name='SmallLens',fontName='Helvetica',fontSize=8,leading=12,textColor=muted,spaceAfter=7))
styles.add(ParagraphStyle(name='CodeLens',fontName='Courier',fontSize=9,leading=14,textColor=green,backColor=colors.HexColor('#edf2e9'),borderPadding=12,spaceBefore=10,spaceAfter=16))
story=[]
def p(text,style='BodyLens'): story.append(Paragraph(text,styles[style]))
def title(number,text):
    p(f'PACKAGE LENS / {number:02d}', 'Kicker');p(text,'SectionLens')
def sub(text):p(text,'SubLens')
def step(n,text):p(f'<b>{n:02d}.</b> {text}')
def code(text):story.append(Preformatted(text,styles['CodeLens']))
def page():story.append(PageBreak())
def link(label,url):p(f'<a href="{escape(url)}" color="#126e5b">{escape(label)}</a>', 'SmallLens')

p('HYPERDART COMPONENT / PROJECT &amp; PROCEDURE', 'Kicker')
story.append(Spacer(1,24))
p('Package<br/>Lens.', 'TitleLens')
p('Choose with clarity.', 'SectionLens')
p('Live npm package details, comparisons, use-case discovery, and explained alternatives in a standalone HyperDart component.')
story.append(Spacer(1,16))
sub('Selected problem: Package Info')
p('Chosen from the three supplied problem statements because the complete core experience can use public npm APIs without a private key.')
sub('What is delivered')
p('React source code, official HyperDart integration and company search sandbox, automated checks, a Markdown procedure, and this PDF guide in the current project folder.')
sub('Start here')
code('cd /Users/apple/Desktop/dart-project\nnpm ci\nnpm start')
p('Open <b>http://127.0.0.1:5173</b>. Enter your query in the <b>HyperDart company search bar at the top</b>. Package Lens has no separate search field and waits for host searchData.')
p('Prepared 26 October 2026 | Implementation and documentation generated with OpenAI Codex.', 'SmallLens')
p('Delivery scope: local project. GitHub upload, YouTube upload and HyperDart registry publication remain external submission steps.', 'SmallLens')
page()

title(1,'What the component answers')
sub('Package details')
p('<b>npm express</b> and <b>latest version of react</b> show the current latest dist-tag, release date, description, weekly downloads and period, license, Node requirement, type metadata, archive size and dependency count.')
sub('Comparison')
p('<b>compare packages express, fastify</b> or <b>compare express, fastify, koa</b> produces a side-by-side facts table, factual takeaways, individual cards and a shared-scale daily download chart. Downloads indicate usage and do not establish a winner.')
sub('Alternatives')
p('<b>npm alternatives to moment</b> combines keyword and description searches. Up to 50 unique results are considered, 12 candidates verified and six shown. Ranking favors relevance, with smaller contributions from npm quality, release recency and downloads. The source, deprecated packages and standalone type declarations are excluded.')
sub('Discover by use case')
p('Enter <b>best npm package for CSV parsing</b> in the company search bar. Each result explains its matched terms. Filter bundled TypeScript declarations or declared ESM and sort by size or downloads. Submit another company query to compare packages. No AI API key is needed.')
sub('Responsible details')
p('<b>npm request</b> displays npm\'s deprecation message. Unknown packages, empty matches, missing keywords and service failures produce clear states. An unavailable count is never converted to zero.')
sub('What the metadata does and does not establish')
p('Archive size is unpacked package size, not browser bundle cost. Bundled type declarations and module fields are metadata indicators. Search ranking does not establish migration compatibility or exhaustively list every alternative.')
sub('Requirement coverage')
for n,t in enumerate(['Details including latest version: package card and API adapter.', 'Comparison of two or three packages: query validation, table and chart.', 'Similar packages: bounded discovery and explained ranking.', 'Mainline/sidebar and light/dark: host UIOptions plus responsive layout.', 'Robustness: cancellation, timeout, cache, retry and partial failure views.'],1):step(n,t)
page()

title(2,'Run and explore')
step(1,'Install Node.js 22.12 or newer. Node 24 is recommended. Open a terminal in the project folder.')
step(2,'Run <b>npm ci</b> to install the dependency versions pinned in package-lock.json.')
step(3,'Run <b>npm start</b> and open <b>http://127.0.0.1:5173</b>. Internet access is required for live npm data.')
step(4,'Use the company search bar for every details, comparison, alternative or use-case query. There are no local query fields, example tabs or query-switching buttons. Refresh reloads only the current host query.')
step(5,'Use the official host controls for dark theme and sidebar. On a narrow screen, scroll the comparison table horizontally. Expand View chart data for exact daily values.')
step(6,'The start page and <b>/sandbox.html</b> both use official HDSandbox. Host search requires available HyperDart services and any platform authentication. Initial searchData is empty; no default package request runs.')
sub('Commands')
code('npm test\nnpm run build\nnpm run test:browser\nnpm pack --dry-run')
p('The build creates the HyperDart ES library in <b>dist/frontend</b>. Local development uses the official host sandbox. Browser tests use installed Google Chrome on macOS, or Playwright Chromium on another platform.', 'SmallLens')
sub('Troubleshooting')
p('If npm cannot be reached, check internet access and retry. A 404 indicates an unknown package. A 429 indicates rate limiting. Metadata can still appear when download counts fail. The app provides retry and refresh actions.')
p('For a fresh scaffold elsewhere, use npm create hyper-dart@latest my-package-lens and select React with JavaScript + Vite. The delivered folder is already implemented; avoid scaffolding over it.', 'SmallLens')
page()

title(3,'Implementation procedure')
step(1,'Keep <b>src/frontend/index.jsx</b> wrapped with the official <b>withHD</b> helper. This is the library entry used by the host.')
step(2,'Add the supplied keywords and HD_PACKAGES.NPM_PACKAGES patterns to <b>hyperdart.config.js</b>. Declare mainline and sidebar formats and the built client path.')
step(3,'Read searchData exclusively from host props. Normalize arrays or objects, infer intent from the host query and read entity sourceID values. Never create a local fallback query. Wait without fetching when the company has supplied no query.')
step(4,'Fetch the full npm package record once per package. Read dist-tags.latest, matching version metadata and its release time. Fetch weekly counts and, for details/comparisons, daily history.')
step(5,'Add 12-second timeouts, AbortController cancellation, five-minute bounded caching and parallel independent requests. Preserve metadata when count services fail.')
step(6,'Search by use case or source keywords plus description. Verify up to 12 candidates with three workers. Rank by relevance (75%), npm quality (10%), release recency (5%) and log weekly usage (10%). Unavailable signals earn no points. Label any search-count snapshots; place duplicate scoped names after distinct choices. Explain each match.')
step(7,'Create metadata cards, comparisons, a chart with a zero baseline, a chart data table, and honest loading/error/empty views. Derive theme and layout from UIOptions.')
step(8,'Send componentLoaded once after a result or error is rendered. Supply sample searchData and a resource file with domain-specific intents.')
step(9,'Configure Vite for the HyperDart frame and ES library with CSS injection. Use the official HDSandbox entry for both local start pages. Remove component-owned query fields and actions.')
step(10,'Run logic tests, production build, browser checks and artifact inspection. Fill real repository and demo URLs before registry publication.')
sub('Main files')
p('<b>src/lib/query.js</b>: query parsing.<br/><b>src/lib/recommendations.js</b>: relevance, explanations and filters.<br/><b>src/lib/api.js</b>: network adapters and caching.<br/><b>src/frontend/PackageLens.jsx</b>: UI and lifecycle.<br/><b>src/sandbox/main.jsx</b>: official host sandbox.<br/><b>PROCEDURE.md</b>: editable walkthrough.')
page()

title(4,'Data flow and verification')
code('HyperDart company search bar\n        |\ncompany search services -> searchData\n        |\nhost props -> intent / package entities\n        |\nnpm metadata + relevance + usage evidence\n        |\nresults / filters / comparison')
sub('Data sources')
p('Public npm registry records provide version metadata and release dates. The download-count API provides weekly totals and daily history. npm search provides alternative candidates. Browser calls need no API key. Registry network failures retry through Yarn\'s npm mirror with a visible label; download API failures remain explicitly unavailable.')
sub('Verification record')
report = ROOT / 'VERIFICATION.md'
if report.exists():
    for line in report.read_text().splitlines():
        if line.startswith('- '):p(escape(line[2:]))
else:p('Run npm test, npm run build and npm run test:browser. See VERIFICATION.md for the final execution record.')
sub('How to reproduce')
p('Logic tests cover query examples, host entities, ranking, input limits, metadata interpretation, API errors and missing downloads. Browser tests use synthetic npm responses for repeatable UI verification; these values are not live npm facts. A separate live smoke check verifies public API access.')
p('Publication needs Partner Portal registration, real repository/video URLs and registry authentication. Local searching uses company services; browser tests mock those responses and npm data for reproducibility.', 'SmallLens')
page()

screenshot = ROOT / 'tmp/screenshots/host-mainline-light.png'
if screenshot.exists():
    title(5,'Interface preview')
    p('Official HyperDart company search bar and the component below it. Controlled test fixtures make the screenshot reproducible; displayed package values are illustrative.', 'SmallLens')
    from PIL import Image as PILImage
    preview=PILImage.open(screenshot)
    preview=preview.crop((0,0,min(preview.width,1100),min(preview.height,1120)))
    cropped=ROOT/'tmp/pdfs/guide-preview.png'
    cropped.parent.mkdir(parents=True,exist_ok=True)
    preview.save(cropped)
    iw,ih=preview.size
    width=min(475, 610*iw/ih)
    story.append(Image(str(cropped),width=width,height=width*ih/iw))
    page()

title(6,'Demonstrate and submit')
sub('Suggested two- to three-minute demo')
p('<b>0:00-0:25</b> Explain the problem and Package Lens.<br/><b>0:25-0:55</b> Show details and source/date labels.<br/><b>0:55-1:25</b> Compare three packages and explain the chart scale.<br/><b>1:25-1:55</b> Find moment alternatives and explain ranking.<br/><b>1:55-2:15</b> Show request deprecation and unknown-package handling.<br/><b>2:15-2:45</b> Switch theme/layout and explain the core files.')
sub('External submission procedure')
step(1,'Review generated code and update README authorship notes with your actual contributions. Create a public GitHub repository and upload the source, respecting .gitignore.')
step(2,'Record and upload the demo to YouTube. Set github, demoVideo and demovideo in hyperdart.config.js to real URLs. Keep both video fields equal to cover documentation spelling differences.')
step(3,'Create the package in the HyperDart Partner Portal. Set the approved name in package.json and configure authentication using the portal command. Keep tokens out of source control.')
step(4,'Run npm run build, npm run validate and npm pack --dry-run. Validation intentionally fails until real submission URLs are supplied.')
step(5,'Use plain npm publish to run the prepublish build and validation hook. Do not bypass validation. Verify the published component in HyperDart.')
sub('References')
for label,url in [
 ('HyperDart introduction','https://hyperdart.com/docs/docs/intro/'),
 ('React + Vite template','https://hyperdart.com/docs/docs/template/react-vite/'),
 ('Component configuration','https://hyperdart.com/docs/docs/config-files/hyperdartconfig/'),
 ('Resource file','https://hyperdart.com/docs/docs/config-files/resource-file/'),
 ('npm registry API','https://github.com/npm/registry/blob/main/docs/REGISTRY-API.md'),
 ('npm download counts','https://github.com/npm/registry/blob/main/docs/download-counts.md')]:link(label,url)
p('Source requirement: user-supplied Package_Info_Problem_Statement.pdf in Downloads. Documentation reviewed 26 October 2026.', 'SmallLens')

def decorate(c,doc):
    c.saveState(); w,h=doc.pagesize
    c.setStrokeColor(colors.HexColor('#dce5dd'));c.line(50,42,w-50,42)
    c.setFont('Helvetica',8);c.setFillColor(muted)
    c.drawString(50,29,'PACKAGE LENS / HYPERDART')
    c.drawRightString(w-50,29,str(doc.page));c.restoreState()
doc=SimpleDocTemplate(str(OUTPUT),pagesize=(595.28,841.89),rightMargin=50,leftMargin=50,topMargin=46,bottomMargin=58,title='Package Lens - Project and Procedure',author='OpenAI Codex')
doc.build(story,onFirstPage=decorate,onLaterPages=decorate)
print(OUTPUT)
