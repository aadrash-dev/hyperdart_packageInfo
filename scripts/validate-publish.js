import { existsSync } from 'node:fs';
import config from '../hyperdart.config.js';
const errors = [];
if (!config.triggers?.keywords?.length || config.triggers.keywords.some(s => !s.trim())) errors.push('Add nonempty trigger keywords.');
if (!config.query_format?.regex?.length || config.query_format.regex.some(s => !s.trim())) errors.push('Add nonempty query regex patterns.');
if (!existsSync(config.client?.location || '')) errors.push('Client bundle missing. Run npm run build.');
if (!existsSync('resource.json')) errors.push('resource.json is missing.');
if (!/^https:\/\/github\.com\/[^/\s<>]+\/[^/\s<>]+\/?$/.test(config.github || '')) errors.push('Set github to your public repository root URL in hyperdart.config.js.');
const video = config.demoVideo || config.demovideo;
if (!/^https:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=[\w-]{11}(?:&[^\s]*)?|youtu\.be\/[\w-]{11})$/.test(video || '')) errors.push('Set demoVideo and demovideo to your real YouTube demo URL.');
if (config.demoVideo !== config.demovideo) errors.push('Keep demoVideo (current docs) and demovideo (problem statement) identical.');
if (errors.length) { console.error('Publish validation failed:\n' + errors.map(e => `- ${e}`).join('\n')); process.exitCode = 1; }
else console.log('Publish validation passed.');
