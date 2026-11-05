import { motion, AnimatePresence } from 'framer-motion';

interface HubSnapshotToastProps {
  message: string | null;
}

export default function HubSnapshotToast({ message }: HubSnapshotToastProps) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          className="hub-snapshot-toast"
          initial={{ opacity: 0, y: 16, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={{ duration: 0.3 }}
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
