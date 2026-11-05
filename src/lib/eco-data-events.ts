/** 生态数据变更事件 — 设置页与小镇页双向同步 */

export const PERSON_TAG_CONFIG_EVENT = 'vaultflow-person-tag-updated';

export function emitPersonTagConfigUpdated(): void {
  window.dispatchEvent(new CustomEvent(PERSON_TAG_CONFIG_EVENT));
}

export function onPersonTagConfigUpdated(handler: () => void): () => void {
  window.addEventListener(PERSON_TAG_CONFIG_EVENT, handler);
  return () => window.removeEventListener(PERSON_TAG_CONFIG_EVENT, handler);
}

export type LoftCharacterPose = 'idle' | 'wave' | 'jump' | 'walk';

export const LOFT_POSE_EVENT = 'vaultflow-loft-pose';

export function triggerLoftPose(pose: LoftCharacterPose): void {
  window.dispatchEvent(new CustomEvent(LOFT_POSE_EVENT, { detail: pose }));
}

export function onLoftPose(handler: (pose: LoftCharacterPose) => void): () => void {
  const fn = (e: Event) => handler((e as CustomEvent<LoftCharacterPose>).detail);
  window.addEventListener(LOFT_POSE_EVENT, fn);
  return () => window.removeEventListener(LOFT_POSE_EVENT, fn);
}
