import type { ReactNode } from 'react';

interface BottomInputBarProps {
  children: ReactNode;
  className?: string;
}

export function BottomInputBar({ children, className = '' }: BottomInputBarProps) {
  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-40 md:left-60 border-t px-4 py-3 ${className}`}
      style={{
        backgroundColor: 'var(--vault-header-bg)',
        backdropFilter: 'blur(12px)',
        borderColor: 'var(--vault-border)',
      }}
    >
      <div className="max-w-[1440px] mx-auto">{children}</div>
    </div>
  );
}
