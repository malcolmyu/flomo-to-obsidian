import { DOWNLOAD_FILE, AUTH_FILE } from './const';
import { getPlaywright } from './playwright';
import { emit as progressEmit } from '../ui/progressBus';

export class FlomoExporter {
  async export(report?: (message: string, percent?: number) => void): Promise<[boolean, string]> {
    try {
      console.log('[FlomoExporter] 🚀 export(): start');
      const reportFn = report ?? ((m, p) => progressEmit(m, p));
      reportFn('初始化导出', 5);
      // Setup
      const playwright = await getPlaywright();
      console.log('[FlomoExporter] 🧩 playwright loaded');
      reportFn('加载 Playwright', 10);
      const browser = await playwright.chromium.launch();
      console.log('[FlomoExporter] 🧭 browser launched');
      reportFn('启动浏览器', 15);

      const context = await browser.newContext({ storageState: AUTH_FILE });
      console.log(`[FlomoExporter] 🗂️ context created with storageState: ${AUTH_FILE}`);
      reportFn('创建浏览器上下文', 25);
      const page = await context.newPage();
      console.log('[FlomoExporter] 📖 new page created');
      reportFn('创建页面', 30);

      console.log('[FlomoExporter] 🧭 navigate to export page');
      reportFn('跳转到导出页面', 40);
      const downloadPromise = page.waitForEvent('download', { timeout: 10 * 60 * 1000 });
      await page.goto('https://v.flomoapp.com/mine?source=export');
      console.log('[FlomoExporter] 🖱️ click start export button');
      reportFn('点击开始导出', 50);
      await page.getByRole('button', { name: '开始导出' }).click();
      console.log('[FlomoExporter] ⏳ waiting for download...');
      reportFn('等待下载...', 65);
      const download = await downloadPromise;

      const suggested = download.suggestedFilename?.() ?? 'flomo_export.zip';
      console.log(`[FlomoExporter] 📥 download received: ${suggested}`);
      reportFn('接收下载', 80);
      await download.saveAs(DOWNLOAD_FILE);
      console.log(`[FlomoExporter] 💾 file saved to: ${DOWNLOAD_FILE}`);
      reportFn('保存下载文件', 90);

      // Teardown
      console.log('[FlomoExporter] 🧹 teardown');
      await context.close();
      await browser.close();
      console.log('[FlomoExporter] ✅ export(): done');
      reportFn('导出完成', 100);

      return [true, ''];
    } catch (error) {
      console.error('[FlomoExporter] ❌ export(): error', error);
      return [false, String(error)];
    }
  }
}
