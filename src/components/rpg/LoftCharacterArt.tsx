import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { CharacterPreset } from '@/types/rpg';
import { LOFT_PALETTE } from '@/components/rpg/LoftFurnitureArt';
import type { LoftCharacterPose } from '@/lib/eco-data-events';
import { onLoftPose } from '@/lib/eco-data-events';

interface LoftCharacterArtProps {
  preset: CharacterPreset;
  size?: number;
  pose?: LoftCharacterPose;
}

function CharacterBody({
  preset,
  pose,
}: {
  preset: CharacterPreset;
  pose: LoftCharacterPose;
}) {
  const p = LOFT_PALETTE;
  const skin = preset.skinColor;
  const body = preset.bodyColor;
  const hair = preset.hairColor;
  const waveArm = pose === 'wave';
  const jumping = pose === 'jump';
  const walking = pose === 'walk';

  return (
    <g className={jumping ? 'loft-character-pose--jump' : waveArm ? 'loft-character-pose--wave' : ''}>
      <ellipse cx="28" cy="60" rx="16" ry="4" fill={p.shadow} />
      <path
        d={jumping || walking ? 'M30 44 L36 56 L28 58 L22 46 Z' : 'M30 46 L34 58 L28 60 L24 48 Z'}
        fill={body}
        stroke={p.outline}
        strokeWidth="1.2"
      />
      <path
        d={jumping || walking ? 'M20 44 L24 56 L18 58 L14 46 Z' : 'M22 46 L26 58 L20 60 L18 48 Z'}
        fill={body}
        stroke={p.outline}
        strokeWidth="1.2"
        opacity="0.9"
      />
      <path d="M32 30 L38 34 L36 48 L30 46 Z" fill={body} stroke={p.outline} strokeWidth="1" opacity="0.85" />
      <path d="M18 30 L32 30 L30 46 L20 46 Z" fill={body} stroke={p.outline} strokeWidth="1.3" />
      <path d="M20 30 L28 34 L32 30" fill="none" stroke={p.outlineLight} strokeWidth="1" />
      <path d="M16 32 L10 40 L14 42 L20 36 Z" fill={skin} stroke={p.outline} strokeWidth="1" />
      {waveArm ? (
        <path d="M34 28 L44 18 L40 16 L32 26 Z" fill={skin} stroke={p.outline} strokeWidth="1.2" className="loft-char-wave-arm" />
      ) : (
        <path d="M34 32 L40 38 L36 42 L30 36 Z" fill={skin} stroke={p.outline} strokeWidth="1" />
      )}
      <ellipse cx="34" cy="22" rx="7" ry="8" fill={skin} stroke={p.outline} strokeWidth="1" opacity="0.9" />
      <ellipse cx="26" cy="22" rx="9" ry="10" fill={skin} stroke={p.outline} strokeWidth="1.3" />
      <circle cx="23" cy="22" r="1.2" fill={p.outline} />
      <circle cx="29" cy="22" r="1.2" fill={p.outline} />
      <path d="M24 26 Q26 27.5 28 26" fill="none" stroke={p.outlineLight} strokeWidth="0.8" strokeLinecap="round" />
      <path
        d="M17 20 Q20 8 28 10 Q36 8 37 18 Q35 14 28 13 Q21 14 19 20 Z"
        fill={hair}
        stroke={p.outline}
        strokeWidth="1"
      />
      <path d="M17 20 Q16 26 18 28" fill="none" stroke={hair} strokeWidth="3" strokeLinecap="round" />
    </g>
  );
}

/** 等轴透视手绘小人 — 支持 idle / wave / jump */
export default function LoftCharacterArt({ preset, size = 64, pose: poseProp }: LoftCharacterArtProps) {
  const [pose, setPose] = useState<LoftCharacterPose>(poseProp ?? 'idle');
  const h = size * 1.15;

  useEffect(() => {
    if (poseProp) setPose(poseProp);
  }, [poseProp]);

  useEffect(() => {
    return onLoftPose(next => {
      setPose(next);
      window.setTimeout(() => setPose('idle'), next === 'jump' ? 900 : 1400);
    });
  }, []);

  const jumping = pose === 'jump';
  const walking = pose === 'walk';

  return (
    <motion.svg
      width={size}
      height={h}
      viewBox="0 0 56 64"
      className="loft-character-svg"
      aria-hidden
      animate={jumping ? { y: [0, -10, 0] } : walking ? { y: [0, -2, 0] } : { y: 0 }}
      transition={{ duration: walking ? 0.28 : 0.55, repeat: walking ? Infinity : 0, ease: [0.34, 1.56, 0.64, 1] }}
      style={{ filter: 'drop-shadow(0 6px 10px rgba(93, 64, 55, 0.2))' }}
    >
      <CharacterBody preset={preset} pose={pose} />
    </motion.svg>
  );
}
