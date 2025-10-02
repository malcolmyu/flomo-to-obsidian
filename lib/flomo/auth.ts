import * as fs from 'fs-extra';
import { getPlaywright } from './playwright';

import { AUTH_FILE, FLOMO_PLAYWRIGHT_CACHE_LOC } from './const';

export class FlomoAuth {
  constructor() {
    fs.mkdirpSync(FLOMO_PLAYWRIGHT_CACHE_LOC);
  }

  async auth(uid: string, passwd: string): Promise<[boolean, string]> {
    try {
      // Setup
      const playwright = await getPlaywright();
      const browser = await playwright.chromium.launch();
      const context = await browser.newContext(playwright.devices['Desktop Chrome']);
      const page = await context.newPage();

      await page.goto('https://v.flomoapp.com/login');

      await page.getByPlaceholder('手机号 / 邮箱').fill(uid);
      await page.getByPlaceholder('密码').fill(passwd);
      await page.getByRole('button', { name: '登录' }).click();

      await page.waitForURL('https://v.flomoapp.com/mine');
      await page.context().storageState({ path: AUTH_FILE });

      // Teardown
      await context.close();
      await browser.close();

      return [true, ''];
    } catch (e) {
      console.log(e);
      return [false, String(e)];
    }
  }
}
