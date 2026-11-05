import { AnimatePresence, motion } from 'framer-motion';

interface ExploreCityFogTransitionProps {
  active: boolean;
  cityName: string;
}

export default function ExploreCityFogTransition({ active, cityName }: ExploreCityFogTransitionProps) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="explore-city-fog-transition"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          aria-hidden
        >
          <motion.div
            className="explore-city-fog-cloud explore-city-fog-cloud--a"
            initial={{ x: '-120%', opacity: 0.3 }}
            animate={{ x: '120%', opacity: 0.85 }}
            transition={{ duration: 1.1, ease: 'easeInOut' }}
          />
          <motion.div
            className="explore-city-fog-cloud explore-city-fog-cloud--b"
            initial={{ x: '120%', opacity: 0.25 }}
            animate={{ x: '-120%', opacity: 0.75 }}
            transition={{ duration: 1.2, ease: 'easeInOut', delay: 0.08 }}
          />
          <motion.p
            className="explore-city-fog-label"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.25, duration: 0.4 }}
          >
            正在前往 {cityName}…
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
