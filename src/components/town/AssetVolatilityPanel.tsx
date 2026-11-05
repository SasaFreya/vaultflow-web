import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useMemo } from 'react';
import { useVaultData } from '@/hooks/useVaultData';
import { computeNetWorthVolatility } from '@/lib/town-hub-analytics';
import { formatCurrency } from '@/lib/storage';

interface AssetVolatilityPanelProps {
  open: boolean;
  onClose: () => void;
}

export default function AssetVolatilityPanel({ open, onClose }: AssetVolatilityPanelProps) {
  const { data, settings } = useVaultData();
  const base = settings.baseCurrency;

  const stats = useMemo(
    () => computeNetWorthVolatility(data.assetSnapshots),
    [data.assetSnapshots],
  );

  const TrendIcon =
    stats.trend === 'up' ? TrendingUp : stats.trend === 'down' ? TrendingDown : Minus;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="hub-egg-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="hub-egg-modal hub-egg-modal--cyber"
            initial={{ opacity: 0, y: 24, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.25 }}
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-labelledby="volatility-title"
          >
            <button type="button" className="hub-egg-modal-close" onClick={onClose} aria-label="关闭">
              <X className="w-4 h-4" />
            </button>
            <p className="hub-egg-modal-kicker hub-egg-modal-kicker--neon">▮▮ 数据流解码</p>
            <h2 id="volatility-title" className="hub-egg-modal-title">资产波动分析</h2>
            <p className="hub-egg-modal-sub">近 {stats.monthly.length} 个月净资产波动</p>

            <div className="hub-volatility-stats">
              <div className="hub-volatility-stat">
                <span className="hub-volatility-stat-label">平均波动幅度</span>
                <strong className="hub-volatility-stat-value">{stats.volatilityPct}%</strong>
              </div>
              <div className="hub-volatility-stat">
                <span className="hub-volatility-stat-label">最近趋势</span>
                <strong className="hub-volatility-stat-value hub-volatility-stat-value--row">
                  <TrendIcon className="w-4 h-4" />
                  {stats.latestChangePct !== null ? `${stats.latestChangePct > 0 ? '+' : ''}${stats.latestChangePct}%` : '--'}
                </strong>
              </div>
            </div>

            <ul className="hub-volatility-list">
              {stats.monthly.length === 0 ? (
                <li className="hub-volatility-empty">暂无足够历史快照，多记几笔账后会自动出现</li>
              ) : (
                stats.monthly.map(row => (
                  <li key={row.month} className="hub-volatility-row">
                    <span>{row.month}</span>
                    <span>{formatCurrency(row.netWorth, base)}</span>
                    <span className={row.changePct !== null && row.changePct >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                      {row.changePct !== null ? `${row.changePct >= 0 ? '+' : ''}${row.changePct.toFixed(1)}%` : '—'}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
