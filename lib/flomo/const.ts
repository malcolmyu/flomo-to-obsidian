import * as path from 'path';
import * as os from 'os';

export const FLOMO_CACHE_LOC = path.join(os.homedir(), '/.flomo/cache/');
export const FLOMO_PLAYWRIGHT_CACHE_LOC = path.join(os.homedir(), '/.flomo/cache/playwright/');
export const AUTH_FILE = FLOMO_PLAYWRIGHT_CACHE_LOC + 'flomo_auth.json';
export const DOWNLOAD_FILE = FLOMO_PLAYWRIGHT_CACHE_LOC + 'flomo_export.zip';
// Placeholder used to temporarily replace <mark>...</mark> during HTML→Markdown conversion
export const HIGHLIGHT_PLACEHOLDER = 'FLOMO_IMPORTER_HIGHLIGHT_MARK_PLACEHOLDER';
// Placeholder used to mark attachment URLs coming from Flomo backup (e.g., img src="file/")
// Will be replaced to `${flomoTarget}/files/` (or `files/` when root) during import
export const FILES_DIR_PLACEHOLDER = 'FLOMO_IMPORTER_FILES_DIR_PLACEHOLDER/';
