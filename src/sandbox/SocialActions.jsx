import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, Menu, MenuItem, TextField, ThemeProvider, Typography, createTheme
} from '@mui/material';
import config from '../../hyperdart.config.js';
import { QUERY_EVENT, THEME_EVENT, readSharedQuery, searchLink } from './navigation.js';

const STORAGE_KEY = `${config.name}:sandbox-social:v1`;
const SocialContext = createContext(null);
const emptyEntry = { liked: false, comments: [] };

function parseStoredData(raw) {
  try {
    const parsed = JSON.parse(raw || '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter(([, entry]) => entry && typeof entry === 'object').map(([key, entry]) => [key, {
      liked: entry.liked === true,
      comments: (Array.isArray(entry.comments) ? entry.comments : []).filter(comment =>
        comment && typeof comment.id === 'string' && typeof comment.text === 'string' &&
        comment.text.trim() && comment.text.length <= 1000 && Number.isFinite(comment.at)
      ).map(({ id, text, at }) => ({ id, text, at }))
    }]));
  } catch { return {}; }
}

function loadStoredData() {
  try { return parseStoredData(localStorage.getItem(STORAGE_KEY)); }
  catch { return {}; }
}

function SocialIcon({ kind, filled = false, size = 18 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {kind === 'comment' && <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>}
    {kind === 'like' && <path fill={filled ? 'currentColor' : 'none'} d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z"/>}
    {kind === 'share' && <><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.5 6.8-4m-6.8 7 6.8 4"/></>}
    {kind === 'menu' && <><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></>}
  </svg>;
}

export function SandboxSocialProvider({ children }) {
  const [query, setQuery] = useState(readSharedQuery);
  const [data, setData] = useState(loadStoredData);
  const [dialog, setDialog] = useState(null);
  const [themeName, setThemeName] = useState('light');
  const [saveFailed, setSaveFailed] = useState(false);
  const key = query.trim().toLowerCase().replace(/\s+/g, ' ');
  const entry = Object.hasOwn(data, key) ? data[key] : emptyEntry;
  const theme = useMemo(() => createTheme({
    palette: { mode: themeName === 'light' ? 'light' : 'dark', primary: { main: '#d24a2f' } },
    typography: { button: { textTransform: 'none' } },
    shape: { borderRadius: 6 }
  }), [themeName]);

  useEffect(() => {
    function queryChanged(event) { setQuery(event.detail); setDialog(null); }
    function themeChanged(event) { setThemeName(event.detail); }
    function storageChanged(event) {
      if (event.key === STORAGE_KEY || event.key === null) setData(parseStoredData(event.newValue));
    }
    window.addEventListener(QUERY_EVENT, queryChanged);
    window.addEventListener(THEME_EVENT, themeChanged);
    window.addEventListener('storage', storageChanged);
    return () => {
      window.removeEventListener(QUERY_EVENT, queryChanged);
      window.removeEventListener(THEME_EVENT, themeChanged);
      window.removeEventListener('storage', storageChanged);
    };
  }, []);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); setSaveFailed(false); }
    catch { setSaveFailed(true); }
  }, [data]);

  function updateEntry(update) {
    setData(previous => ({ ...previous, [key]: update(Object.hasOwn(previous, key) ? previous[key] : emptyEntry) }));
  }

  const value = {
    query, entry, saveFailed,
    openComments: () => setDialog('comments'),
    openShare: () => setDialog('share'),
    toggleLike: () => updateEntry(current => ({ ...current, liked: !current.liked })),
    addComment: text => {
      const trimmed = text.trim();
      if (!trimmed || trimmed.length > 1000) return;
      const comment = { id: crypto.randomUUID(), text: trimmed, at: Date.now() };
      updateEntry(current => ({ ...current, comments: [...current.comments, comment] }));
    },
    deleteComment: id => updateEntry(current => ({ ...current, comments: current.comments.filter(comment => comment.id !== id) }))
  };

  return <SocialContext.Provider value={value}>
    {children}
    <ThemeProvider theme={theme}>
      {dialog === 'comments' && <CommentsDialog key={key} onClose={() => setDialog(null)}/>}
      {dialog === 'share' && <ShareDialog key={key} onClose={() => setDialog(null)}/>}
    </ThemeProvider>
  </SocialContext.Provider>;
}

export function SandboxSocialActions({ compact = false }) {
  const social = useContext(SocialContext);
  const buttonStyle = { gap: .6, borderRadius: 1, fontSize: 12, color: 'text.secondary' };
  return <Box className="sandbox-social-actions" sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: .5 }}>
    <IconButton size="small" sx={buttonStyle} aria-label={`Comments (${social.entry.comments.length})`} onClick={social.openComments}>
      <SocialIcon kind="comment" size={compact ? 16 : 18}/><span>{social.entry.comments.length}</span>
    </IconButton>
    <IconButton size="small" sx={{ ...buttonStyle, color: social.entry.liked ? 'error.main' : 'text.secondary' }} aria-label={social.entry.liked ? 'Unlike this search' : 'Like this search'} aria-pressed={social.entry.liked} onClick={social.toggleLike}>
      <SocialIcon kind="like" filled={social.entry.liked} size={compact ? 16 : 18}/><span>{social.entry.liked ? 1 : 0}</span>
    </IconButton>
    <IconButton size="small" sx={buttonStyle} aria-label="Share this search" onClick={social.openShare}><SocialIcon kind="share" size={compact ? 16 : 18}/></IconButton>
    <Typography variant="caption" color="text.secondary" sx={{ ml: .5, fontSize: 10 }}>On this browser</Typography>
    {social.saveFailed && <Typography role="status" variant="caption" color="error" sx={{ width: '100%' }}>Changes could not be saved. They will last until this page is refreshed.</Typography>}
  </Box>;
}

export function SandboxSocialMenu({ componentName }) {
  const social = useContext(SocialContext);
  const [anchor, setAnchor] = useState(null);
  function select(action) { setAnchor(null); action(); }
  return <>
    <IconButton size="small" aria-label="Component actions" onClick={event => setAnchor(event.currentTarget)}><SocialIcon kind="menu"/></IconButton>
    <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
      <Box sx={{ px: 2, py: 1, maxWidth: 280 }}><Typography variant="caption" sx={{ overflowWrap: 'anywhere' }}>{componentName || 'Package Lens'}</Typography></Box>
      <MenuItem onClick={() => select(social.openComments)}>Comments ({social.entry.comments.length})</MenuItem>
      <MenuItem onClick={() => select(social.toggleLike)}>{social.entry.liked ? 'Unlike this search' : 'Like this search'}</MenuItem>
      <MenuItem onClick={() => select(social.openShare)}>Share this search</MenuItem>
    </Menu>
  </>;
}

function CommentsDialog({ onClose }) {
  const social = useContext(SocialContext);
  const [draft, setDraft] = useState('');
  function submit(event) {
    event.preventDefault();
    if (!draft.trim()) return;
    social.addComment(draft);
    setDraft('');
  }
  return <Dialog open onClose={onClose} fullWidth maxWidth="sm" aria-labelledby="comments-title">
    <DialogTitle id="comments-title">Comments ({social.entry.comments.length})</DialogTitle>
    <DialogContent>
      <Typography variant="body2" sx={{ mb: 1, overflowWrap: 'anywhere' }}>{social.query || 'Package Lens'}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Saved on this browser. Comments are not posted publicly.</Typography>
      {social.saveFailed && <Alert severity="warning" sx={{ mb: 2 }}>Browser storage is unavailable. Changes will be lost on refresh.</Alert>}
      {social.entry.comments.length ? <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0 }}>
        {social.entry.comments.map(comment => <Box component="li" key={comment.id} sx={{ py: 1.5, borderTop: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" color="text.secondary">You · {new Date(comment.at).toLocaleString()}</Typography>
            <Button size="small" color="inherit" aria-label={`Delete comment: ${comment.text}`} onClick={() => social.deleteComment(comment.id)}>Delete</Button>
          </Box>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{comment.text}</Typography>
        </Box>)}
      </Box> : <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>No comments yet.</Typography>}
      <Box component="form" onSubmit={submit} sx={{ mt: 2 }}>
        <TextField label="Add a comment" multiline minRows={3} fullWidth value={draft} onChange={event => setDraft(event.target.value)} inputProps={{ maxLength: 1000 }} helperText={`${draft.length}/1000 characters`}/>
        <Button type="submit" variant="contained" disabled={!draft.trim()} sx={{ mt: 1 }}>Post comment</Button>
      </Box>
    </DialogContent>
    <DialogActions><Button onClick={onClose}>Close</Button></DialogActions>
  </Dialog>;
}

function ShareDialog({ onClose }) {
  const social = useContext(SocialContext);
  const url = searchLink(social.query);
  const [status, setStatus] = useState('');
  async function copy() {
    try { await navigator.clipboard.writeText(url); setStatus('Link copied.'); }
    catch { setStatus('Could not copy automatically. Select the link and copy it manually.'); }
  }
  async function share() {
    try { await navigator.share({ title: 'Package Lens', text: social.query || 'Package Lens', url }); }
    catch (error) { if (error.name !== 'AbortError') setStatus('Sharing is unavailable. Copy the link instead.'); }
  }
  return <Dialog open onClose={onClose} fullWidth maxWidth="sm" aria-labelledby="share-title">
    <DialogTitle id="share-title">Share this search</DialogTitle>
    <DialogContent>
      <Typography variant="body2" sx={{ mb: 1, overflowWrap: 'anywhere' }}>{social.query || 'Package Lens'}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>This link reopens the same search. A localhost link works on this computer; sharing across devices requires a hosted preview.</Typography>
      <TextField label="Search link" value={url} fullWidth InputProps={{ readOnly: true }} onFocus={event => event.target.select()}/>
      <Typography role="status" variant="body2" sx={{ mt: 1.5 }}>{status}</Typography>
    </DialogContent>
    <DialogActions><Button onClick={onClose}>Close</Button>{typeof navigator.share === 'function' && <Button onClick={share}>Share…</Button>}<Button variant="contained" onClick={copy}>Copy link</Button></DialogActions>
  </Dialog>;
}
