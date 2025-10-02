import { App, Modal, Setting, Notice, ButtonComponent } from 'obsidian';
import type FlomoImporterPlugin from '../plugin';

import { createExpOpt } from './common';
import { AuthUI } from './auth_ui';
import { FlomoImporter } from '../flomo/importer';
import { FlomoExporter } from '../flomo/exporter';

import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs-extra';

import { AUTH_FILE, DOWNLOAD_FILE } from '../flomo/const';

export class MainUI extends Modal {
  plugin: FlomoImporterPlugin;
  rawPath: string;

  constructor(app: App, plugin: FlomoImporterPlugin) {
    super(app);
    this.plugin = plugin;
    this.rawPath = '';
  }

  async onSync(btn: ButtonComponent): Promise<void> {
    const isAuthFileExist = await fs.exists(AUTH_FILE);
    try {
      if (isAuthFileExist) {
        btn.setDisabled(true);
        btn.setButtonText('Exporting from Flomo ...');
        const exportResult = await new FlomoExporter().export();

        btn.setDisabled(false);
        if (exportResult[0] === true) {
          this.rawPath = DOWNLOAD_FILE;
          btn.setButtonText('Importing...');
          await this.onSubmit();
          btn.setButtonText('Auto Sync 🤗');
        } else {
          throw new Error(exportResult[1]);
        }
      } else {
        const authUI: Modal = new AuthUI(this.app, this.plugin);
        authUI.open();
      }
    } catch (err) {
      console.log(err);
      await fs.remove(AUTH_FILE);
      btn.setButtonText('Auto Sync 🤗');
      new Notice(`Flomo Sync Error. Details:\n${err}`);
    }
  }

  async onSubmit(): Promise<void> {
    const targetMemoLocation =
      this.plugin.settings.flomoTarget + '/' + this.plugin.settings.memoTarget;

    const res = await this.app.vault.adapter.exists(targetMemoLocation);
    if (!res) {
      console.debug(`DEBUG: creating memo root -> ${targetMemoLocation}`);
      await this.app.vault.adapter.mkdir(`${targetMemoLocation}`);
    }

    try {
      const config = this.plugin.settings;
      config.rawDir = this.rawPath;

      const flomo = await new FlomoImporter(this.app, config).import();

      new Notice(`🎉 Import Completed.\nTotal: ${flomo.memos.length} memos`);
      this.rawPath = '';
    } catch (err) {
      this.rawPath = '';
      console.log(err);
      new Notice(`Flomo Importer Error. Details:\n${err}`);
    }
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl('h3', { text: 'Flomo Importer' });

    // 这个 fileLocControl 是一个文件选择器，用于选择 flomo@<uid>-<date>.zip 文件
    const fileLocControl: HTMLInputElement = contentEl.createEl('input', {
      type: 'file',
      cls: 'uploadbox'
    });
    fileLocControl.setAttr('accept', '.zip');
    fileLocControl.onchange = (ev) => {
      // 这里就是获取文件选择器选中的文件路径
      const files = (ev.target as HTMLInputElement)?.files;
      if (files && files[0]) {
        this.rawPath = files[0].name;
      }
      console.log(this.rawPath);
    };

    contentEl.createEl('br');

    new Setting(contentEl)
      .setName('Flomo Home')
      .setDesc('set the flomo home location')
      .addText((text) =>
        text
          .setPlaceholder('flomo')
          .setValue(this.plugin.settings.flomoTarget)
          .onChange(async (value) => {
            this.plugin.settings.flomoTarget = value;
          })
      );

    new Setting(contentEl)
      .setName('Memo Home')
      .setDesc('your memos are at: FlomoHome / MemoHome')
      .addText((text) =>
        text
          .setPlaceholder('memos')
          .setValue(this.plugin.settings.memoTarget)
          .onChange(async (value) => {
            this.plugin.settings.memoTarget = value;
          })
      );

    new Setting(contentEl)
      .setName('Moments')
      .setDesc('set moments style: flow(default) | skip')
      .addDropdown((drp) => {
        drp
          .addOption('copy_with_link', 'Generate Moments')
          .addOption('skip', 'Skip Moments')
          .setValue(this.plugin.settings.optionsMoments)
          .onChange(async (value) => {
            this.plugin.settings.optionsMoments = value;
          });
      });

    new Setting(contentEl)
      .setName('Canvas')
      .setDesc('set canvas options: link | content(default) | skip')
      .addDropdown((drp) => {
        drp
          .addOption('copy_with_link', 'Generate Canvas')
          .addOption('copy_with_content', 'Generate Canvas (with content)')
          .addOption('skip', 'Skip Canvas')
          .setValue(this.plugin.settings.optionsCanvas)
          .onChange(async (value) => {
            this.plugin.settings.optionsCanvas = value;
          });
      });

    const canvasOptionBlock: HTMLDivElement = contentEl.createEl('div', {
      cls: 'canvasOptionBlock'
    });

    const canvasOptionLabelL: HTMLLabelElement = canvasOptionBlock.createEl('label');
    const canvasOptionLabelM: HTMLLabelElement = canvasOptionBlock.createEl('label');
    const canvasOptionLabelS: HTMLLabelElement = canvasOptionBlock.createEl('label');

    const canvasSizeL: HTMLInputElement = canvasOptionLabelL.createEl('input', {
      type: 'radio',
      cls: 'ckbox'
    });
    canvasOptionLabelL.createEl('small', { text: 'large' });
    const canvasSizeM: HTMLInputElement = canvasOptionLabelM.createEl('input', {
      type: 'radio',
      cls: 'ckbox'
    });
    canvasOptionLabelM.createEl('small', { text: 'medium' });
    const canvasSizeS: HTMLInputElement = canvasOptionLabelS.createEl('input', {
      type: 'radio',
      cls: 'ckbox'
    });
    canvasOptionLabelS.createEl('small', { text: 'small' });

    canvasSizeL.name = 'canvas_opt';
    canvasSizeM.name = 'canvas_opt';
    canvasSizeS.name = 'canvas_opt';

    switch (this.plugin.settings.canvasSize) {
      case 'L':
        canvasSizeL.checked = true;
        break;
      case 'M':
        canvasSizeM.checked = true;
        break;
      case 'S':
        canvasSizeS.checked = true;
        break;
    }

    canvasSizeL.onchange = (ev) => {
      this.plugin.settings.canvasSize = 'L';
    };

    canvasSizeM.onchange = (ev) => {
      this.plugin.settings.canvasSize = 'M';
    };

    canvasSizeS.onchange = (ev) => {
      this.plugin.settings.canvasSize = 'S';
    };

    new Setting(contentEl).setName('Experimental Options').setDesc('set experimental options');

    const allowBiLink = createExpOpt(contentEl, 'Convert bi-directional link. example: [[abc]]');

    allowBiLink.checked = this.plugin.settings.expOptionAllowBiLink;
    allowBiLink.onchange = (ev) => {
      this.plugin.settings.expOptionAllowBiLink = (ev.target as HTMLInputElement).checked;
    };

    const mergeByDate = createExpOpt(contentEl, 'Merge memos by date');

    mergeByDate.checked = this.plugin.settings.mergeByDate;
    mergeByDate.onchange = (ev) => {
      this.plugin.settings.mergeByDate = (ev.target as HTMLInputElement).checked;
    };

    new Setting(contentEl)
      .addButton((btn) => {
        btn
          .setButtonText('Cancel')
          .setCta()
          .onClick(async () => {
            await this.plugin.saveSettings();
            this.close();
          });
      })
      .addButton((btn) => {
        btn
          .setButtonText('Import')
          .setCta()
          .onClick(async () => {
            if (this.rawPath != '') {
              await this.plugin.saveSettings();
              await this.onSubmit();
              //const manualSyncUI: Modal = new ManualSyncUI(this.app, this.plugin);
              //manualSyncUI.open();
              this.close();
            } else {
              new Notice('No File Selected.');
            }
          });
      })
      .addButton((btn) => {
        btn
          .setButtonText('Auto Sync 🤗')
          .setCta()
          .onClick(async () => {
            await this.plugin.saveSettings();
            await this.onSync(btn);
            //this.close();
          });
      });
  }

  onClose() {
    this.rawPath = '';
    const { contentEl } = this;
    contentEl.empty();
  }
}
