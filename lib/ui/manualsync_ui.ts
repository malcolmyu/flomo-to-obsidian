import { App, Modal, Setting } from 'obsidian';
import type FlomoImporterPlugin from '../plugin';

export class ManualSyncUI extends Modal {
  plugin: FlomoImporterPlugin;
  rawPath: string;

  constructor(app: App, plugin: FlomoImporterPlugin) {
    super(app);
    this.plugin = plugin;
    this.rawPath = '';
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl('h3', { text: 'AdHoc Import' });

    // const ctrlUploadBox = new Setting(contentEl)
    // ctrlUploadBox.setName("Select flomo@<uid>-<date>.zip");
    const fileLocControl: HTMLInputElement = contentEl.createEl('input', {
      type: 'file',
      cls: 'uploadbox'
    });
    fileLocControl.setAttr('accept', '.zip');
    fileLocControl.onchange = (ev) => {
      const files = (ev.target as HTMLInputElement)?.files;
      if (files && files[0]) {
        this.rawPath = files[0].name;
      }
      console.log(this.rawPath);
    };

    contentEl.createEl('br');

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
            await this.plugin.saveSettings();
            this.close();
          });
      });
  }
}
