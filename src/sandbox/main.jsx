import React from 'react';
import { createRoot } from 'react-dom/client';
import { HDSandbox } from '@hyperdart/sandbox';
import config from '../../hyperdart.config.js';
import searchData from '../../searchData.json';
import resource from '../../resource.json';
createRoot(document.getElementById('root')).render(<HDSandbox config={config} searchData={searchData} resource={resource} />);
