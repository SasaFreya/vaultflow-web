import { formatCurrency } from '@/lib/storage';
import type { CurrencyCode } from '@/types';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';

interface MaskedCurrencyProps {
  value: number;
  currency?: CurrencyCode;
  className?: string;
  style?: React.CSSProperties;
  /** 点击切换显示；false 时始终显示数字 */
  interactive?: boolean;
  mask?: string;
}

export function MaskedCurrency({
  value,
  currency = 'CNY',
  className = '',
  style,
  interactive = true,
  mask = '******',
}: MaskedCurrencyProps) {
  const { revealed, toggleReveal } = usePrivacyMode();
  const showValue = !interactive || revealed;

  if (interactive) {
    return (
      <button
        type="button"
        onClick={toggleReveal}
        className={`text-left ${className}`}
        style={style}
        title={showValue ? '点击隐藏金额' : '点击显示金额'}
      >
        {showValue ? formatCurrency(value, currency) : mask}
      </button>
    );
  }

  return (
    <span className={className} style={style}>
      {formatCurrency(value, currency)}
    </span>
  );
}
