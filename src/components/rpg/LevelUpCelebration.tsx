import { motion, AnimatePresence } from 'framer-motion';

interface LevelUpCelebrationProps {
  level: number | null;
  onDismiss: () => void;
}

export default function LevelUpCelebration({ level, onDismiss }: LevelUpCelebrationProps) {
  return (
    <AnimatePresence>
      {level !== null && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onDismiss}
        >
          <motion.div
            className="absolute inset-0"
            style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.3, y: -60 }}
            transition={{ type: 'spring', damping: 12 }}
            className="relative text-center px-8 py-10 rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, #1a1f35 0%, #0B0E14 100%)',
              border: '2px solid #FFD700',
              boxShadow: '0 0 60px rgba(255, 215, 0, 0.3)',
            }}
          >
            <motion.div
              animate={{ rotate: [0, -5, 5, 0], scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="text-6xl mb-4"
            >
              🎉
            </motion.div>
            <p
              className="text-4xl font-bold tracking-wide"
              style={{ color: '#FFD700', textShadow: '0 0 30px rgba(255,215,0,0.5)' }}
            >
              LEVEL UP!
            </p>
            <p className="text-6xl font-black mt-2 font-mono" style={{ color: '#fff' }}>
              {level}
            </p>
            <p className="text-sm mt-4" style={{ color: 'var(--vault-text-secondary)' }}>
              获得 2 属性点 · 点击任意处继续
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
