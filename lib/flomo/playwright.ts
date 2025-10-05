let cached: typeof import('playwright') | null = null;

export async function getPlaywright(): Promise<typeof import('playwright')> {
  if (cached) {
    console.log('[Playwright] using cached module');
    return cached;
  }
  try {
    console.log('[Playwright] importing playwright module');
    const mod = await import('playwright');
    console.log('[Playwright] playwright module imported successfully');
    cached = mod;
    return mod;
  } catch (_e) {
    console.error('[Playwright] import failed', _e);
    throw new Error(
      'Playwright 未找到。请在终端执行：\n  npx playwright@1.43.1 install\n并确保将 flomo-sync/node_modules 一并复制到插件目录。'
    );
  }
}
