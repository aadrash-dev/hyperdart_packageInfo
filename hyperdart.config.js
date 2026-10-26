import pkg from './package.json' with { type: 'json' };

export default {
  name: pkg.name,
  triggers: { keywords: ['npm', 'package info', 'packages like', 'compare packages', 'best npm package', 'recommend npm package', 'library for'] },
  query_format: {
    regex: [
      '(npm( packages?)?|package info) HD_PACKAGES.NPM_PACKAGES',
      '(latest|current) version of HD_PACKAGES.NPM_PACKAGES',
      'compare( npm)?( packages?)? HD_PACKAGES.NPM_PACKAGES(,| vs| versus| and)? HD_PACKAGES.NPM_PACKAGES((,| vs| versus| and)? HD_PACKAGES.NPM_PACKAGES)?',
      '(npm )?(alternatives?( to| for)|packages? (like|similar to)) HD_PACKAGES.NPM_PACKAGES( npm)?',
      '(best|top|recommend|suggest|find)( npm)? (package|packages|library|libraries)( for| to)? .+'
    ],
    fallBackRegex: [
      '(npm|package info) (?<PACKAGE_NAME>[@a-z0-9/._-]+)',
      '(npm )?alternatives? (to|for) (?<PACKAGE_NAME>[@a-z0-9/._-]+)'
    ]
  },
  client: { location: pkg.module, moduleName: pkg.umdName, baseURL: '/package-lens-hyperdart' },
  format: { mainline: true, sidebar: true },
  permissions: {},
  info: { title: 'Package Lens', description: pkg.description },
  // Fill with your real submission URLs. Validation deliberately blocks publishing until then.
  github: '',
  demoVideo: '',
  demovideo: ''
};
