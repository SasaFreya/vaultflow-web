import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useState } from 'react';
import { useVaultData } from '@/hooks/useVaultData';
import { getToday } from '@/lib/storage';

interface QuickWishModalProps {
  open: boolean;
  onClose: () => void;
}

const WISH_COLORS = ['#FFB7C5', '#B5EAD7', '#FFC857', '#81D4FA', '#FF8A80'];

export default function QuickWishModal({ open, onClose }: QuickWishModalProps) {
  const { addGoal } = useVaultData();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('5000');
  const [saved, setSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    const targetAmount = Math.max(0, Number(amount) || 0);
    addGoal({
      name: trimmed,
      targetAmount: targetAmount || 1000,
      currentAmount: 0,
      priority: 1,
      color: WISH_COLORS[Math.floor(Math.random() * WISH_COLORS.length)],
      icon: '🌱',
      completed: false,
    });

    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      setName('');
      setAmount('5000');
      onClose();
    }, 900);
  };

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
            className="hub-egg-modal hub-egg-modal--wish"
            initial={{ opacity: 0, y: 24, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.25 }}
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-labelledby="quick-wish-title"
          >
            <button type="button" className="hub-egg-modal-close" onClick={onClose} aria-label="关闭">
              <X className="w-4 h-4" />
            </button>
            <p className="hub-egg-modal-kicker">✨ 精灵捎来的愿望</p>
            <h2 id="quick-wish-title" className="hub-egg-modal-title">快速许愿</h2>
            <p className="hub-egg-modal-sub">写下一个小目标，它会挂到心愿树上</p>

            {saved ? (
              <motion.p
                className="hub-egg-modal-success"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
              >
                🌳 愿望已挂上心愿树！
              </motion.p>
            ) : (
              <form className="hub-egg-modal-form" onSubmit={handleSubmit}>
                <label className="hub-egg-modal-label">
                  心愿名称
                  <input
                    className="hub-egg-modal-input"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="例如：买一副耳机"
                    autoFocus
                  />
                </label>
                <label className="hub-egg-modal-label">
                  目标金额（元）
                  <input
                    className="hub-egg-modal-input"
                    type="number"
                    min={0}
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                  />
                </label>
                <button type="submit" className="hub-egg-modal-submit">
                  挂上心愿树
                </button>
              </form>
            )}

            <p className="hub-egg-modal-foot">创建日期 · {getToday()}</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
