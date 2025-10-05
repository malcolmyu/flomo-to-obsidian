import { createContext, useContext } from 'react';
import type { App } from 'obsidian';
import type FlomoImporterPlugin from '../../plugin';

export interface PluginCtx {
  app: App;
  plugin: FlomoImporterPlugin;
}

export const AppContext = createContext<PluginCtx | undefined>(undefined);

export function usePluginCtx(): PluginCtx {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('Plugin context not found');
  }
  return ctx;
}