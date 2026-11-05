import { motion, AnimatePresence } from 'framer-motion';
import type { BossDefeatEvent } from '@/types/rpg';

interface BossDefeatCelebrationProps {
  event: BossDefeatEvent | null;
  onDismiss: () => void;
}

export default function BossDefeatCelebration({ event, onDismiss }: BossDefeatCelebrationProps) {
  return (
    <AnimatePresence>
      {event !== null && (
        <motion.div
          className="fixed inset-0 z-[110] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onDismiss}
        >
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
          />

          {/* Confetti particles */}
          {Array.from({ length: 12 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                backgroundColor: ['#FFD700', '#FF6B9D', '#4A90E2', '#4ECDC4'][i % 4],
                left: `${20 + (i * 7) % 60}%`,
                top: '40%',
              }}
              initial={{ opacity: 1, y: 0, scale: 1 }}
              animate={{ opacity: 0, y: -200 - i * 20, x: (i % 2 === 0 ? 1 : -1) * (30 + i * 10), scale: 0 }}
              transition={{ duration: 1.5, delay: i * 0.05 }}
            />
          ))}

          <motion.div
            initial={{ opacity: 0, scale: 0.3, rotate: -10 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 1.2, y: -80 }}
            transition={{ type: 'spring', damping: 10, stiffness: 200 }}
            className="relative text-center px-10 py-12 rounded-2xl max-w-sm mx-4"
            style={{
              background: 'linear-gradient(160deg, #1a0a2e 0%, #0B0E14 50%, #1a1030 100%)',
              border: '2px solid #FF6B9D',
              boxShadow: '0 0 80px rgba(255, 107, 157, 0.4), 0 0 40px rgba(255, 215, 0, 0.2)',
            }}
          >
            <motion.div
              animate={{ scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="text-7xl mb-3"
            >
              👹
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xs uppercase tracking-[0.2em] mb-2"
              style={{ color: '#FF6B9D' }}
            >
              BOSS DEFEATED
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="text-xl font-bold mb-4 px-2"
              style={{ color: '#fff' }}
            >
              {event.name}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, type: 'spring' }}
              className="flex justify-center gap-6 py-3 px-4 rounded-xl mb-4"
              style={{ backgroundColor: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.3)' }}
            >
              <div>
                <p className="text-2xl font-black font-mono" style={{ color: '#FFD700' }}>+{event.exp}</p>
                <p className="text-[10px]" style={{ color: 'var(--vault-text-secondary)' }}>EXP</p>
              </div>
              <div className="w-px" style={{ backgroundColor: 'rgba(255,215,0,0.3)' }} />
              <div>
                <p className="text-2xl font-black font-mono" style={{ color: '#FFD700' }}>+{event.gold}</p>
                <p className="text-[10px]" style={{ color: 'var(--vault-text-secondary)' }}>🪙 金币</p>
              </div>
            </motion.div>

            <p className="text-xs" style={{ color: 'var(--vault-text-secondary)' }}>
              财富目标达成！点击任意处继续
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
