import { useState } from 'react';
import { Notice } from 'obsidian';
import { usePluginCtx } from './AppContext';
import { FlomoAuth } from '../../flomo/auth';
import { MessageUI } from '../message_ui';

export const ReactAuthView = () => {
  const { app, plugin } = usePluginCtx();
  const [uid, setUid] = useState('');
  const [passwd, setPasswd] = useState('');
  const [busy, setBusy] = useState(false);

  async function onAuthenticate() {
    if (!uid || !passwd) {
      new Notice('请输入你的 Flomo 账号和密码。');
      return;
    }
    await plugin.saveSettings();
    setBusy(true);
    const authResult = await new FlomoAuth().auth(uid, passwd);
    setBusy(false);
    if (authResult[0] === true) {
      new MessageUI(app, '🤗 登录成功。').open();
      (plugin as any).authUI?.close?.();
    } else {
      new MessageUI(app, '🥺 登录失败。').open();
      new Notice(`Flomo 登录失败。详情：\n${authResult[1]}`);
    }
  }

  return (
    <div className="react-auth">
      <h3 className="section-title">Flomo 认证</h3>
      <div className="auth-card">
        <div className="auth-row">
          <label>Flomo 登录</label>
          <input
            className="auth-input"
            placeholder="你的账号"
            value={uid}
            onChange={(e) => setUid(e.target.value)}
          />
        </div>
        <div className="auth-row">
          <input
            className="auth-input"
            type="password"
            placeholder="你的密码"
            value={passwd}
            onChange={(e) => setPasswd(e.target.value)}
          />
        </div>
        <div className="caption">前置条件：👉 npx playwright@1.43.1 install 👈</div>
        <div className="actions-row">
          <button
            className="btn btn-secondary"
            onClick={async () => {
              await plugin.saveSettings();
              (plugin as any).authUI?.close?.();
            }}
          >
            取消
          </button>
          <button className="btn btn-primary" disabled={busy} onClick={onAuthenticate}>
            {busy ? '正在认证...' : '开始认证'}
          </button>
        </div>
      </div>
    </div>
  );
};