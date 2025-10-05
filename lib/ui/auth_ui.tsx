import { App, Modal, Setting, Notice } from 'obsidian';
import type FlomoImporterPlugin from '../plugin';
import { StrictMode } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { AppContext } from './react/AppContext';
import { ReactAuthView } from './react/ReactAuthView';

export class AuthUI extends Modal {
  plugin: FlomoImporterPlugin;
  uid: string;
  passwd: string;
  root: Root | null;

  constructor(app: App, plugin: FlomoImporterPlugin) {
    super(app);
    this.plugin = plugin;
    this.uid = '';
    this.passwd = '';
    this.root = null;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    this.root = createRoot(contentEl);
    this.root.render(
      <StrictMode>
        <AppContext.Provider value={{ app: this.app, plugin: this.plugin }}>
          <ReactAuthView />
        </AppContext.Provider>
      </StrictMode>
    );
  }

  onClose() {
    this.root?.unmount();
    this.root = null;
    const { contentEl } = this;
    contentEl.empty();
  }
}
