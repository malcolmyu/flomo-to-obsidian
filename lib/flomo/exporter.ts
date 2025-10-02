import { DOWNLOAD_FILE, AUTH_FILE } from './const';
import { getPlaywright } from './playwright';

export class FlomoExporter {
  async export(): Promise<[boolean, string]> {
    try {
      // Setup
      const playwright = await getPlaywright();
      const browser = await playwright.chromium.launch();

      const context = await browser.newContext({ storageState: AUTH_FILE });
      const page = await context.newPage();

      const downloadPromise = page.waitForEvent('download', { timeout: 10 * 60 * 1000 });
      await page.goto('https://v.flomoapp.com/mine?source=export');
      await page.getByRole('button', { name: '开始导出' }).click();
      const download = await downloadPromise;

      await download.saveAs(DOWNLOAD_FILE);

      // Teardown
      await context.close();
      await browser.close();

      return [true, ''];
    } catch (error) {
      console.log(error);
      return [false, String(error)];
    }
  }
}
