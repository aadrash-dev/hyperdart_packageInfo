import { readFileSync } from 'node:fs';

// Excluding the SDK from prebundling lets Vite apply the adapter. Its imported
// dependencies still need prebundling, including their CommonJS dependencies.
export function sandboxDependencies() {
  const source = readFileSync(new URL('../node_modules/@hyperdart/sandbox/dist/index.modern.js', import.meta.url), 'utf8');
  return [...new Set([...source.matchAll(/(?:from|import)"([^"]+)"/g)].map(match => match[1]))];
}

// The pinned sandbox SDK has static social controls and no override props.
// Adapt those two components in development, without editing node_modules or
// changing the published HyperDart component. Fail if the SDK shape changes.
export default function sandboxSocialPlugin() {
  return {
    name: 'package-lens-sandbox-social',
    apply: 'serve',
    enforce: 'pre',
    transform(source, id) {
      if (!id.split('?')[0].endsWith('/@hyperdart/sandbox/dist/index.modern.js')) return;

      function replaceOnce(from, to) {
        if (!source.includes(from) || source.indexOf(from) !== source.lastIndexOf(from)) {
          throw new Error('Sandbox social adapter needs updating for this @hyperdart/sandbox version.');
        }
        source = source.replace(from, to);
      }
      function replaceComponent(start, end, replacement) {
        const first = source.indexOf(start);
        const last = source.indexOf(end, first);
        if (first < 0 || last < 0) throw new Error('Sandbox social component was not found.');
        replaceOnce(source.slice(first, last), replacement);
      }

      replaceComponent('function ce(', 'function me(', 'function ce(props){return sandboxCreateElement(SandboxSocialActions,props)}');
      replaceComponent('function fe(', 'function ge(', 'function fe(props){return sandboxCreateElement(SandboxSocialMenu,props)}');
      replaceOnce('resolveQuery(e){', 'resolveQuery(e){announceSandboxQuery(e,this.props);');
      replaceOnce('newUIOptions(e){', 'newUIOptions(e){announceSandboxTheme(e);');
      replaceOnce('isSearchInProgress:!1,query:"",unload:!1', 'isSearchInProgress:!1,query:readSharedQuery(),unload:!1');

      return {
        code: `import {createElement as sandboxCreateElement} from 'react';
import {SandboxSocialActions,SandboxSocialMenu} from '/src/sandbox/SocialActions.jsx';
import {announceSandboxQuery,announceSandboxTheme,readSharedQuery} from '/src/sandbox/navigation.js';
${source.replace(/\/\/# sourceMappingURL=.*$/, '')}`,
        map: null
      };
    }
  };
}
