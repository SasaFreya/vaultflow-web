import { AnimatePresence, motion } from 'framer-motion';
import type { RewardEvent } from '@/types/rpg';

export default function FloatingRewards({ rewards }: { rewards: RewardEvent[] }) {
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      <AnimatePresence>
        {rewards.map((r, i) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 1, y: 0, x: `${40 + i * 10}%` }}
            animate={{ opacity: 0, y: -120 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2, ease: 'easeOut' }}
            className="absolute bottom-1/3 text-lg font-bold font-mono"
            style={{
              color: '#FFD700',
              textShadow: '0 0 12px rgba(255,215,0,0.6)',
            }}
          >
            +{r.exp} EXP · +{r.gold} 🪙
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
