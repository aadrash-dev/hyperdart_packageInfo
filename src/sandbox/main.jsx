import React from 'react';
import { createRoot } from 'react-dom/client';
import { HDSandbox } from '@hyperdart/sandbox';
import config from '../../hyperdart.config.js';
import searchData from '../../searchData.json';
import resource from '../../resource.json';
import { SandboxSocialProvider } from './SocialActions.jsx';
import { readSharedQuery } from './navigation.js';

// HDSandbox treats [] as a missing component payload and shows a warning.
// Register the component without inventing a query or making a package request.
const sharedQuery = readSharedQuery();
const initialSearchData = sharedQuery ? [{ component: config.name, query: sharedQuery, entities: [] }] : searchData.length ? searchData : [{
  component: config.name,
  query: '',
  entities: []
}];

createRoot(document.getElementById('root')).render(<SandboxSocialProvider>
  <HDSandbox config={config} searchData={initialSearchData} resource={resource} />
</SandboxSocialProvider>);
