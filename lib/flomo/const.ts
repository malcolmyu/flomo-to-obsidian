import * as path from 'path';
import * as os from 'os';

export const FLOMO_CACHE_LOC = path.join(os.homedir(), '/.flomo/cache/');
export const FLOMO_PLAYWRIGHT_CACHE_LOC = path.join(os.homedir(), '/.flomo/cache/playwright/');
export const AUTH_FILE = FLOMO_PLAYWRIGHT_CACHE_LOC + 'flomo_auth.json';
export const DOWNLOAD_FILE = FLOMO_PLAYWRIGHT_CACHE_LOC + 'flomo_export.zip';
// Placeholder used to temporarily replace <mark>...</mark> during HTML→Markdown conversion
export const HIGHLIGHT_PLACEHOLDER = 'FLOMO_IMPORTER_HIGHLIGHT_MARK_PLACEHOLDER';
