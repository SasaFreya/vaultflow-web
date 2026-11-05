import { useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import {
  loadEcoNotifySettings,
  saveEcoNotifySettings,
  type EcoNotifySettings,
} from '@/lib/eco-notify-settings';
import { getLagNotifyPermission, requestLagNotifyPermission } from '@/lib/eco-lag-notify';

export function EcoNotifySettingsPanel() {
  const [settings, setSettings] = useState<EcoNotifySettings>(() => loadEcoNotifySettings());
  const [perm, setPerm] = useState(() => getLagNotifyPermission());
  const [msg, setMsg] = useState('');

  useEffect(() => {
    setPerm(getLagNotifyPermission());
  }, []);

  const update = (patch: Partial<EcoNotifySettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveEcoNotifySettings(next);
  };

  const handleRequestPermission = async () => {
    const ok = await requestLagNotifyPermission();
    setPerm(getLagNotifyPermission());
    setMsg(ok ? '通知权限已开启' : '未获得通知权限，可在系统设置中手动开启');
    setTimeout(() => setMsg(''), 3000);
  };

  return (
    <div className="vault-card">
      <h2 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--vault-text)' }}>
        <Bell className="w-4 h-4" /> 人生生态通知
      </h2>
      <p className="text-xs vault-muted mb-4">
        默认不弹系统权限。开启下方开关后，可在需要时手动授权通知。
      </p>
      <div className="space-y-3">
        <label className="flex items-center justify-between gap-3 text-xs" style={{ color: 'var(--vault-text)' }}>
          <span>滞后提醒（生态地图 AI 回声）</span>
          <input
            type="checkbox"
            checked={settings.lagReminder}
            onChange={e => update({ lagReminder: e.target.checked })}
          />
        </label>
        <label className="flex items-center justify-between gap-3 text-xs" style={{ color: 'var(--vault-text)' }}>
          <span>季末分享（生态报告季末叙事）</span>
          <input
            type="checkbox"
            checked={settings.seasonShare}
            onChange={e => update({ seasonShare: e.target.checked })}
          />
        </label>
        <label className="flex items-center justify-between gap-3 text-xs" style={{ color: 'var(--vault-text)' }}>
          <span>雨天图书馆提醒（外出地图天气联动）</span>
          <input
            type="checkbox"
            checked={settings.weatherReminder}
            onChange={e => update({ weatherReminder: e.target.checked })}
          />
        </label>
        <label className="flex items-center justify-between gap-3 text-xs" style={{ color: 'var(--vault-text)' }}>
          <span>Streak 奖励通知（连续达标 EXP/金币）</span>
          <input
            type="checkbox"
            checked={settings.streakRewardNotify}
            onChange={e => update({ streakRewardNotify: e.target.checked })}
          />
        </label>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void handleRequestPermission()}
          className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5"
          style={{ background: 'var(--vault-border)', color: 'var(--vault-text)' }}
        >
          {perm === 'granted' ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
          {perm === 'granted' ? '通知已授权' : '请求通知权限'}
        </button>
        <span className="text-[10px] vault-muted">
          当前：{perm === 'granted' ? '已授权' : perm === 'denied' ? '已拒绝' : '未请求'}
        </span>
      </div>
      {msg && <p className="text-[10px] mt-2" style={{ color: 'var(--vault-primary)' }}>{msg}</p>}
    </div>
  );
}
