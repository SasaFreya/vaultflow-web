import { createPortal } from 'react-dom';

/** 地图浮层 Portal — 避免被 canvas 层叠上下文遮挡 */
export default function MapOverlayPortal({ children }: { children: React.ReactNode }) {
  if (typeof document === 'undefined') return null;
  return createPortal(children, document.body);
}
