import { App, Modal } from 'obsidian';
import type FlomoImporterPlugin from '../plugin';
import { StrictMode } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { AppContext } from './react/AppContext';
import { ReactMainView } from './react/ReactMainView';

export class MainUI extends Modal {
  plugin: FlomoImporterPlugin;
  rawPath: string;
  root: Root | null;

  constructor(app: App, plugin: FlomoImporterPlugin) {
    super(app);
    this.plugin = plugin;
    this.rawPath = '';
    this.root = null;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('flomo-react-modal');
    this.root = createRoot(contentEl);
    this.root.render(
      <StrictMode>
        <AppContext.Provider value={{ app: this.app, plugin: this.plugin }}>
          <ReactMainView />
        </AppContext.Provider>
      </StrictMode>
    );
  }

  onClose() {
    this.rawPath = '';
    this.root?.unmount();
    this.root = null;
    const { contentEl } = this;
    contentEl.empty();
    contentEl.removeClass('flomo-react-modal');
  }
}
