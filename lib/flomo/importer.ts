import * as path from 'path';
import * as fs from 'fs-extra';

import { App, FileSystemAdapter } from 'obsidian';
import decompress from 'decompress';
import * as parse5 from 'parse5';

import { FlomoCore } from './core';
import { HIGHLIGHT_PLACEHOLDER, FILES_DIR_PLACEHOLDER } from './const';
import { generateMoments } from '../obIntegration/moments';
import { generateCanvas } from '../obIntegration/canvas';

import { FLOMO_CACHE_LOC } from './const';
import { MyPluginSettings } from '../plugin';
import { emit as progressEmit } from '../ui/progressBus';
//const FLOMO_CACHE_LOC = path.join(os.homedir(), "/.flomo/cache/");

export class FlomoImporter {
  private config: Record<string, any>;
  private app: App;

  constructor(app: App, config: MyPluginSettings) {
    this.config = config;
    this.app = app;
    // Use the official FileSystemAdapter API to get absolute vault path
    this.config.baseDir = (app.vault.adapter as FileSystemAdapter).getBasePath();
    console.log(
      `[FlomoImporter] 🛠️ init baseDir=${this.config.baseDir}, rawDir=${this.config.rawDir}, flomoTarget=${this.config.flomoTarget}, memoTarget=${this.config.memoTarget}`
    );
  }

  private async sanitize(path: string): Promise<string> {
    console.log(`[FlomoImporter] 🧼 sanitize: ${path}`);
    const flomoData = await fs.readFile(path, 'utf8');
    const document = parse5.parse(flomoData);
    return parse5.serialize(document);
  }

  private async importMemos(flomo: FlomoCore, report?: (message: string, percent?: number) => void): Promise<FlomoCore> {
    const allowBiLink: boolean = this.config.expOptionAllowBiLink;
    const mergeByDate: boolean = this.config.mergeByDate;
    console.log(
      `[FlomoImporter] 📝 importMemos: count=${flomo.memos.length}, allowBiLink=${allowBiLink}, mergeByDate=${mergeByDate}`
    );
    const total = Math.max(1, flomo.memos.length);
    const reportFn = report ?? ((m, p) => progressEmit(m, p));
    for (const [idx, memo] of flomo.memos.entries()) {
      const memoSubDir = `${this.config.flomoTarget}/${this.config.memoTarget}/${memo.date}`;
      const memoFilePath = mergeByDate
        ? `${memoSubDir}/memo@${memo.date}.md`
        : `${memoSubDir}/memo@${memo.title}_${flomo.memos.length - idx}.md`;

      await fs.mkdirp(`${this.config.baseDir}/${memoSubDir}`);
      console.log(`[FlomoImporter] 📂 ensure dir: ${this.config.baseDir}/${memoSubDir}`);
      reportFn(`写入备忘录：${memoFilePath}`, 70 + Math.floor((idx / total) * 20));
      const content = (() => {
        // @Mar-31, 2024 Fix: #20 - Support <mark>.*?<mark/>
        // Break it into 2 stages, to avoid "==" translating to "\=="
        //  1. Replace <mark> & </mark> with HIGHLIGHT_PLACEHOLDER (in lib/flomo/core.ts)
        //  2. Replace HIGHLIGHT_PLACEHOLDER with ==
        const res = memo.content.replaceAll(HIGHLIGHT_PLACEHOLDER, '==');
        const filesBase = this.config.flomoTarget ? `${this.config.flomoTarget}/files/` : 'files/';
        const withFilesDir = res.replaceAll(FILES_DIR_PLACEHOLDER, filesBase);

        if (allowBiLink) {
          return withFilesDir.replace(`\\[\\[`, '[[').replace(`\\]\\]`, ']]');
        }

        return withFilesDir;
      })();

      if (!(memoFilePath in flomo.files)) {
        flomo.files[memoFilePath] = [];
      }

      flomo.files[memoFilePath].push(content);
      console.log(`[FlomoImporter] ➕ append to: ${memoFilePath}`);
    }

    for (const filePath in flomo.files) {
      console.log(
        `[FlomoImporter] 💾 write: ${filePath} pieces=${flomo.files[filePath].length}`
      );
      await this.app.vault.adapter.write(filePath, flomo.files[filePath].join('\n\n---\n\n'));
    }

    return flomo;
  }

  async import(report?: (message: string, percent?: number) => void): Promise<FlomoCore> {
    console.log('[FlomoImporter] 🚀 import start');
    const reportFn = report ?? ((m, p) => progressEmit(m, p));
    reportFn('开始导入', 60);
    // 1. Create workspace
    const tmpDir = path.join(FLOMO_CACHE_LOC, 'data');
    await fs.mkdirp(tmpDir);
    console.log(`[FlomoImporter] 🏗️ workspace: ${tmpDir}`);
    reportFn('创建临时工作目录', 62);

    // 2. Unzip flomo_backup.zip to workspace
    const files = await decompress(this.config.rawDir, tmpDir);
    console.log(`[FlomoImporter] 📦 unzip done: files=${files}`);
    reportFn('解压导入包', 65);

    // 3. copy attachments to ObVault under `${flomoTarget}/files/` (or `files/` when root)
    const attachmentDir = this.config.flomoTarget ? `${this.config.flomoTarget}/files/` : 'files/';

    for (const f of files) {
      if (f.type === 'directory' && f.path.endsWith('/file/')) {
        const targetDir = `${this.config.baseDir}/${attachmentDir}`;
        await fs.mkdirp(targetDir);
        console.log(
          `[FlomoImporter] 📎 copy attachments: from ${tmpDir}/${f.path} to ${targetDir}`
        );
        await fs.copy(`${tmpDir}/${f.path}`, targetDir);
        reportFn('复制附件到目标目录', 70);
        break;
      }
    }

    // 4. Import Memos
    // @Mar-31, 2024 Fix: #21 - Update default page from index.html to <userid>.html
    const defaultPage = (await fs.readdir(`${tmpDir}/${files[0].path}`)).filter(
      (fn, _idx, fn_array) => fn.endsWith('.html')
    )[0];
    console.log(`[FlomoImporter] 📄 default page: ${defaultPage}`);
    const dataExport = await this.sanitize(`${tmpDir}/${files[0].path}/${defaultPage}`);
    const flomo = new FlomoCore(dataExport);
    console.log(`[FlomoImporter] 🔍 parsed memos: ${flomo.memos.length}`);
    reportFn('解析备忘录数据', 68);

    const memos = await this.importMemos(flomo, reportFn);
    console.log('[FlomoImporter] ✅ memos imported');
    reportFn('备忘录写入完成', 92);

    // 5. Ob Integrations
    // If Generate Moments
    if (this.config['optionsMoments'] !== 'skip') {
      console.log(`[FlomoImporter] ✨ generate Moments: ${this.config['optionsMoments']}`);
      reportFn('生成 Moments', 94);
      await generateMoments(this.app, memos, this.config);
    }

    // If Generate Canvas
    if (this.config['optionsCanvas'] !== 'skip') {
      console.log(`[FlomoImporter] 🎨 generate Canvas: ${this.config['optionsCanvas']}`);
      reportFn('生成 Canvas', 96);
      await generateCanvas(this.app, memos, this.config);
    }

    // 6. Cleanup Workspace
    await fs.remove(tmpDir);
    console.log(`[FlomoImporter] 🧹 cleanup workspace: ${tmpDir}`);
    reportFn('清理临时目录', 98);

    reportFn('导入完成', 100);
    return flomo;
  }
}
