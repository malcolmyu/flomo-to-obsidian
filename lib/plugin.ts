import { addIcon, Plugin, Modal } from 'obsidian';
import { MainUI } from './ui/main_ui';
import { LOGO_SVG } from './ui/logo';

export interface MyPluginSettings {
  flomoTarget: string;
  memoTarget: string;
  optionsMoments: string;
  optionsCanvas: string;
  expOptionAllowBiLink: boolean;
  canvasSize: string;
  mergeByDate: boolean;
  rawDir: string;
}

export const DEFAULT_SETTINGS: MyPluginSettings = {
  flomoTarget: 'flomo',
  memoTarget: 'memos',
  optionsMoments: 'copy_with_link',
  optionsCanvas: 'copy_with_content',
  expOptionAllowBiLink: true,
  canvasSize: 'M',
  mergeByDate: false,
  rawDir: ''
};

export default class FlomoImporterPlugin extends Plugin {
  settings!: MyPluginSettings;
  mainUI!: Modal;

  async onload() {
    await this.loadSettings();
    this.mainUI = new MainUI(this.app, this);

    addIcon('target', LOGO_SVG);
    const ribbonIconEl = this.addRibbonIcon('target', 'Flomo Importer', () => {
      this.mainUI.open();
    });

    ribbonIconEl.addClass('my-plugin-ribbon-class');

    // Flomo Importer Command
    this.addCommand({
      id: 'open-flomo-importer',
      name: 'Open Flomo Importer',
      callback: () => {
        this.mainUI.open();
      }
    });
  }

  onunload() {
    // keep the settings
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
