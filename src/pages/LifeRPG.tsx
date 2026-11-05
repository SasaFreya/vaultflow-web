import { Navigate } from 'react-router-dom';

/** 原顶层人生 RPG 已并入小镇广场，保留旧链接重定向 */
export default function LifeRPG() {
  return <Navigate to="/town/loft" replace />;
}
