import { useState, useRef, useEffect } from 'react';
import { Lock, Delete } from 'lucide-react';
import { validatePinFormat } from '@/lib/security';

interface LockScreenProps {
  onUnlock: (pin: string) => Promise<boolean>;
}

export default function LockScreen({ onUnlock }: LockScreenProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const appendDigit = async (digit: string) => {
    if (loading || pin.length >= 4) return;
    const next = pin + digit;
    setPin(next);
    setError('');

    if (next.length === 4) {
      setLoading(true);
      const ok = await onUnlock(next);
      setLoading(false);
      if (!ok) {
        setError('密码错误，请重试');
        setPin('');
        inputRef.current?.focus();
      }
    }
  };

  const handleDelete = () => {
    if (loading) return;
    setPin(p => p.slice(0, -1));
    setError('');
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ backgroundColor: 'var(--vault-bg)' }}
    >
      <div className="w-full max-w-sm px-6 text-center">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{ backgroundColor: 'color-mix(in srgb, var(--vault-primary) 20%, transparent)' }}
        >
          <Lock className="w-8 h-8" style={{ color: 'var(--vault-primary)' }} />
        </div>

        <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--vault-text)' }}>
          VaultFlow 已锁定
        </h1>
        <p className="text-sm mb-8" style={{ color: 'var(--vault-text-secondary)' }}>
          请输入 4 位数字密码解锁
        </p>

        <div className="flex justify-center gap-3 mb-6">
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              className="w-3 h-3 rounded-full transition-all"
              style={{
                backgroundColor: pin.length > i ? 'var(--vault-primary)' : 'var(--vault-border)',
                transform: pin.length > i ? 'scale(1.1)' : 'scale(1)',
              }}
            />
          ))}
        </div>

        {error && (
          <p className="text-xs mb-4" style={{ color: 'var(--vault-red)' }}>{error}</p>
        )}

        <input
          ref={inputRef}
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={pin}
          readOnly
          className="sr-only"
          aria-label="密码输入"
        />

        <div className="grid grid-cols-3 gap-3 max-w-[240px] mx-auto">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map(key => {
            if (key === '') return <div key="empty" />;
            if (key === 'del') {
              return (
                <button
                  key="del"
                  type="button"
                  onClick={handleDelete}
                  className="h-14 rounded-xl flex items-center justify-center transition-colors"
                  style={{ backgroundColor: 'var(--vault-surface)', color: 'var(--vault-text)' }}
                >
                  <Delete className="w-5 h-5" />
                </button>
              );
            }
            return (
              <button
                key={key}
                type="button"
                disabled={loading}
                onClick={() => appendDigit(key)}
                className="h-14 rounded-xl text-lg font-semibold transition-colors hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: 'var(--vault-surface)', color: 'var(--vault-text)' }}
              >
                {key}
              </button>
            );
          })}
        </div>

        {!validatePinFormat(pin) && pin.length > 0 && (
          <p className="text-[10px] mt-6" style={{ color: 'var(--vault-text-secondary)' }}>
            密码为 4 位数字
          </p>
        )}
      </div>
    </div>
  );
}
