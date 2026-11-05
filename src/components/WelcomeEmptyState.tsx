import { Link } from 'react-router-dom';
import { Wallet, Target, Plus, BarChart3, LineChart, PiggyBank } from 'lucide-react';

export default function WelcomeEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 animate-fade-in-up">
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
        style={{ backgroundColor: 'color-mix(in srgb, var(--vault-primary) 20%, transparent)' }}
      >
        <Wallet className="w-10 h-10" style={{ color: 'var(--vault-primary)' }} />
      </div>

      <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--vault-text)' }}>
        欢迎使用 VaultFlow 👋
      </h1>
      <p className="text-sm mb-1" style={{ color: 'var(--vault-text-secondary)' }}>
        你的个人资产可视化仪表盘
      </p>
      <p className="text-xs mb-8 max-w-md" style={{ color: 'var(--vault-text-secondary)' }}>
        添加第一个账户，开始追踪你的财富旅程。所有字段都是选填的，只填账户名称也能开始。
      </p>

      <Link
        to="/accounts"
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90 mb-10"
        style={{ backgroundColor: 'var(--vault-primary)' }}
      >
        <Plus className="w-4 h-4" />
        添加我的第一个账户
      </Link>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl w-full">
        {[
          { icon: BarChart3, title: '资产可视化', desc: '一眼看清资产结构' },
          { icon: LineChart, title: '趋势追踪', desc: '净资产变化曲线' },
          { icon: PiggyBank, title: '存钱目标', desc: '优先级队列管理' },
        ].map(item => (
          <div key={item.title} className="vault-card text-left !p-4">
            <item.icon className="w-5 h-5 mb-2" style={{ color: 'var(--vault-primary)' }} />
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--vault-text)' }}>{item.title}</p>
            <p className="text-xs" style={{ color: 'var(--vault-text-secondary)' }}>{item.desc}</p>
          </div>
        ))}
      </div>

      <p className="text-[10px] mt-8 flex items-center gap-1" style={{ color: 'var(--vault-text-secondary)' }}>
        <Target className="w-3 h-3" />
        数据仅保存在本地，不会上传到任何服务器
      </p>
    </div>
  );
}
