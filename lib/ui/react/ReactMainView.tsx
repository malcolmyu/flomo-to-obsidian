import { useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Notice } from 'obsidian';
import { FolderTreeSelector } from './components/FolderTreeSelector';
import * as fs from 'fs-extra';
import { AUTH_FILE, DOWNLOAD_FILE } from '../../flomo/const';
import { FlomoExporter } from '../../flomo/exporter';
import { FlomoImporter } from '../../flomo/importer';
import { usePluginCtx } from './AppContext';
import { ReactObsidianSetting } from './components/ReactObsidianSetting';
import { ProgressBar } from './components/ProgressBar';
import { emit as progressEmit } from '../progressBus';
import { AuthUI } from '../auth_ui';

export const ReactMainView = () => {
  const { app, plugin } = usePluginCtx();
  const rawPathRef = useRef('');
  const [busy, setBusy] = useState<'idle' | 'export' | 'import'>('idle');
  // 注意：不再在视图打开时自动创建目录，避免在根目录下
  // 立即生成 `flomo/`。目录创建改为在导入流程中进行。

  // 确保导出/导入使用与当前视图同一个总线实例（避免打包层面出现多副本）
  const reportGlobal = (message: string, percent?: number) => progressEmit(message, percent);

  async function onAutoSync() {
    const isAuthFileExist = await fs.exists(AUTH_FILE);
    try {
      if (isAuthFileExist) {
        setBusy('export');
        progressEmit('开始导出...', 5);
        const exportResult = await new FlomoExporter().export(reportGlobal);
        if (exportResult[0] === true) {
          rawPathRef.current = DOWNLOAD_FILE;
          setBusy('import');
          progressEmit('开始导入...', 60);
          await onImport();
        } else {
          throw new Error(exportResult[1]);
        }
      } else {
        new Notice('需要先进行 Flomo 登录（Auth）。已打开认证对话框。');
        new AuthUI(app, plugin).open();
      }
    } catch (err) {
      console.log(err);
      await fs.remove(AUTH_FILE);
      setBusy('idle');
      new Notice(`Flomo Sync Error. Details:\n${err}`);
    }
  }

  async function onImport() {
    try {
      const config = plugin.settings;
      config.rawDir = rawPathRef.current;
      console.log(`DEBUG: import config -> ${JSON.stringify(config)}`);
      const flomo = await new FlomoImporter(app, config).import(reportGlobal);
      new Notice(`🎉 Import Completed.\nTotal: ${flomo.memos.length} memos`);
      rawPathRef.current = '';
      progressEmit('完成', 100);
      setBusy('idle');
    } catch (err: any) {
      rawPathRef.current = '';
      console.log(err.stack);
      progressEmit('空闲', 0);
      setBusy('idle');
      new Notice(`Flomo Importer Error. Details:\n${err}`);
    }
  }

  return (
    <div className="react-flomo">
      <h3 className="section-title">Flomo 自动同步</h3>
      <div className="setting-block">
        <ReactObsidianSetting
          name="Flomo 导入包 (zip)"
          desc="选择 flomo@<uid>-<date>.zip"
          renderControl={(controlEl) => {
            const el = controlEl as any;
            const wrapper: HTMLDivElement = el.createEl('div', { cls: 'file-dropzone' });
            const btn: HTMLButtonElement = wrapper.createEl('button', {
              cls: 'file-btn',
              text: '选择文件'
            });
            const label: HTMLSpanElement = wrapper.createEl('span', {
              cls: 'file-name',
              text: '未选择任何文件'
            });
            const input: HTMLInputElement = el.createEl('input', { type: 'file' });
            input.accept = '.zip';
            (input.style as any).display = 'none';
            const triggerPick = () => input.click();
            btn.onclick = triggerPick;
            wrapper.onclick = (ev: MouseEvent) => {
              if (ev.target !== btn) {
                triggerPick();
              }
            };
            input.onchange = (ev: any) => {
              const files = (ev.target as HTMLInputElement)?.files;
              if (files && files[0]) {
                rawPathRef.current = files[0].name;
                label.setText(files[0].name);
              } else {
                rawPathRef.current = '';
                label.setText('未选择任何文件');
              }
            };
          }}
        />
      </div>

      <div className="setting-block">
        <ReactObsidianSetting
          name="Flomo 根目录"
          desc="选择目标文件夹（支持搜索）"
          renderControl={(controlEl) => {
            const mountPoint = (controlEl as HTMLElement).createEl('div');
            const root = createRoot(mountPoint);
            root.render(
              <FolderTreeSelector
                value={plugin.settings.flomoTarget || ''}
                app={app}
                onSelect={async (path) => {
                  plugin.settings.flomoTarget = path;
                  await plugin.saveSettings();
                }}
              />
            );
          }}
        />
      </div>

      <div className="setting-block">
        <ReactObsidianSetting
          name="Memo 子目录"
          desc="备忘录路径：Flomo 根目录 / Memo 子目录"
          text={{
            placeholder: 'memos',
            value: plugin.settings.memoTarget,
            onChange: async (value) => {
              plugin.settings.memoTarget = value;
              await plugin.saveSettings();
            }
          }}
        />
      </div>

      <div className="setting-block">
        <ReactObsidianSetting
          name="瞬间（Moments）"
          desc="设置 Moments 风格：生成（默认） | 跳过"
          dropdown={{
            options: {
              copy_with_link: '生成 Moments',
              skip: '跳过'
            },
            value: plugin.settings.optionsMoments,
            onChange: async (value) => {
              plugin.settings.optionsMoments = value;
              await plugin.saveSettings();
            }
          }}
        />
      </div>

      <div className="setting-block">
        <ReactObsidianSetting
          name="Canvas 画布"
          desc="设置 Canvas：仅链接 | 内容（默认） | 跳过"
          dropdown={{
            options: {
              copy_with_link: '生成 Canvas',
              copy_with_content: '生成 Canvas（包含内容）',
              skip: '跳过'
            },
            value: plugin.settings.optionsCanvas,
            onChange: async (value) => {
              plugin.settings.optionsCanvas = value;
              await plugin.saveSettings();
            }
          }}
        />
        <ReactObsidianSetting
          name="画布大小"
          renderControl={(controlEl) => {
            const el = controlEl as any;
            const block: HTMLDivElement = el.createEl('div', { cls: 'canvasOptionBlock' });
            const mkRadio = (label: string, val: 'L' | 'M' | 'S', checked: boolean) => {
              const lab: HTMLLabelElement = block.createEl('label');
              const input: HTMLInputElement = lab.createEl('input', { type: 'radio', cls: 'ckbox' });
              input.name = 'canvas_opt';
              input.checked = checked;
              input.onchange = async () => {
                plugin.settings.canvasSize = val;
                await plugin.saveSettings();
              };
              lab.createEl('small', { text: label });
            };
            mkRadio('大', 'L', plugin.settings.canvasSize === 'L');
            mkRadio('中', 'M', plugin.settings.canvasSize === 'M');
            mkRadio('小', 'S', plugin.settings.canvasSize === 'S');
          }}
        />
      </div>

      <div className="setting-block">
        <ReactObsidianSetting name="实验选项" desc="设置实验功能" />
        <ReactObsidianSetting
          className="setting-small"
          name="转换双向链接（示例：[[abc]]）"
          toggle={{
            value: plugin.settings.expOptionAllowBiLink,
            onChange: async (v) => {
              plugin.settings.expOptionAllowBiLink = v;
              await plugin.saveSettings();
            }
          }}
        />
        <ReactObsidianSetting
          className="setting-small"
          name="按日期合并备忘录"
          toggle={{
            value: plugin.settings.mergeByDate,
            onChange: async (v) => {
              plugin.settings.mergeByDate = v;
              await plugin.saveSettings();
            }
          }}
        />
      </div>
      <ProgressBar />

      <div className="actions-row">
        <button
          className="btn btn-accent"
          onClick={async () => {
            await plugin.saveSettings();
            (plugin as any).mainUI?.close?.();
          }}
        >
          取消
        </button>
        <button
          className="btn btn-accent"
          onClick={async () => {
            if (rawPathRef.current) {
              await plugin.saveSettings();
              setBusy('import');
              progressEmit('开始导入...', 10);
              await onImport();
              (plugin as any).mainUI?.close?.();
            } else {
              new Notice('未选择文件。');
            }
          }}
        >
          导入
        </button>
        <button className="btn btn-accent" disabled={busy !== 'idle'} onClick={onAutoSync}>
          {busy === 'idle' ? '自动同步 🤗' : busy === 'export' ? '正在导出...' : '正在导入...'}
        </button>
      </div>
    </div>
  );
};
