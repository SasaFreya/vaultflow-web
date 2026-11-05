import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Pencil, Check, X, Volume2, VolumeX } from 'lucide-react';
import type { RoomPanel } from '@/types/rpg';
import { getCharacterPreset } from '@/lib/rpg-characters';
import { useLifeRPG } from '@/hooks/useLifeRPG';
import { TownPageShell } from '@/components/town/TownNav';
import RoomScene from '@/components/rpg/RoomScene';
import StatsPanel from '@/components/rpg/StatsPanel';
import QuestList from '@/components/rpg/QuestList';
import HabitList from '@/components/rpg/HabitList';
import CharacterSelector from '@/components/rpg/CharacterSelector';
import RPGThemeSwitcher from '@/components/rpg/RPGThemeSwitcher';
import LevelUpCelebration from '@/components/rpg/LevelUpCelebration';
import FloatingRewards from '@/components/rpg/FloatingRewards';
import LoftCharacterArt from '@/components/rpg/LoftCharacterArt';
import { MemoriesTimelinePanel } from '@/pages/town/MemoriesPage';

const PANEL_LABEL: Partial<Record<RoomPanel, string>> = {
  quests: '📚 副本书架',
  stats: '🪞 属性镜',
  habits: '🌸 习惯花园',
};

/** 人生馆 — 回忆 + 温馨小屋二合一 */
export default function LoftPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const hallTab = searchParams.get('tab') === 'memories' ? 'memories' : 'loft';
  const {
    data,
    levelInfo,
    levelUpLevel,
    dismissLevelUp,
    recentRewards,
    setCharacterName,
    setSoundEnabled,
  } = useLifeRPG();

  const [layer, setLayer] = useState<'room' | 'panel'>('room');
  const [activePanel, setActivePanel] = useState<RoomPanel | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(data.characterName);

  const [walkTarget, setWalkTarget] = useState<RoomPanel | null>(null);

  const characterPreset = getCharacterPreset(data.selectedCharacterId);

  const saveName = () => {
    setCharacterName(nameDraft);
    setEditingName(false);
  };

  const openPanel = (panel: RoomPanel) => {
    setWalkTarget(panel);
    window.setTimeout(() => {
      setActivePanel(panel);
      setLayer('panel');
      setWalkTarget(null);
    }, 520);
  };

  const setHallTab = (tab: 'loft' | 'memories') => {
    const next = new URLSearchParams(searchParams);
    if (tab === 'memories') next.set('tab', 'memories');
    else next.delete('tab');
    setSearchParams(next, { replace: true });
    if (tab === 'memories') setLayer('room');
  };

  useEffect(() => {
    setNameDraft(data.characterName);
  }, [data.characterName]);

  return (
    <TownPageShell>
      <div className="rpg-root loft-page space-y-4" data-rpg-theme={data.theme}>
        <FloatingRewards rewards={recentRewards} />
        <LevelUpCelebration level={levelUpLevel} onDismiss={dismissLevelUp} />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link to="/town" className="loft-back-link">
              <ArrowLeft className="w-3.5 h-3.5" />
              返回小镇
            </Link>
            <h1 className="text-lg font-bold mt-1" style={{ color: 'var(--rpg-text)' }}>
              人生馆
            </h1>
            <p className="text-xs" style={{ color: 'var(--rpg-text-secondary)' }}>
              回忆与成长，都在这一栋房子里
            </p>
          </div>
          <div className="loft-hall-tabs">
            <button
              type="button"
              className={`loft-hall-tab ${hallTab === 'loft' ? 'loft-hall-tab--active' : ''}`}
              onClick={() => setHallTab('loft')}
            >
              温馨小屋
            </button>
            <button
              type="button"
              className={`loft-hall-tab ${hallTab === 'memories' ? 'loft-hall-tab--active' : ''}`}
              onClick={() => setHallTab('memories')}
            >
              回忆时间轴
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <RPGThemeSwitcher />
            <button
              type="button"
              onClick={() => setSoundEnabled(!data.soundEnabled)}
              className="town-hud-pill town-hud-pill--ghost"
            >
              {data.soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        <div className={hallTab === 'memories' ? 'loft-hall-panel' : 'loft-hall-panel hidden'} aria-hidden={hallTab !== 'memories'}>
          <MemoriesTimelinePanel embedded />
        </div>
        <div className={hallTab === 'loft' ? 'loft-hall-panel' : 'loft-hall-panel hidden'} aria-hidden={hallTab !== 'loft'}>
          {layer === 'room' ? (
            <>
              <RoomScene
                level={levelInfo.level}
                characterPreset={characterPreset}
                activePanel={activePanel}
                walkTarget={walkTarget}
                onNavigate={openPanel}
              />
              <button
                type="button"
                className="loft-character-chip"
                onClick={() => setLayer('panel')}
              >
                <LoftCharacterArt preset={characterPreset} size={40} />
                <span className="loft-character-info">
                  <strong>{data.characterName}</strong>
                  <small>Lv.{levelInfo.level} · 点击展开角色面板</small>
                </span>
              </button>
            </>
          ) : (
            <div className="loft-panel space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button type="button" className="loft-back-link" onClick={() => setLayer('room')}>
                  <ArrowLeft className="w-3.5 h-3.5" />
                  返回小屋
                </button>
                {activePanel && PANEL_LABEL[activePanel] && (
                  <span className="text-xs font-semibold" style={{ color: 'var(--rpg-primary)' }}>
                    {PANEL_LABEL[activePanel]}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {editingName ? (
                  <>
                    <input
                      value={nameDraft}
                      onChange={e => setNameDraft(e.target.value)}
                      className="flex-1 max-w-xs px-3 py-1.5 rounded-lg text-sm font-semibold outline-none"
                      style={{
                        backgroundColor: 'var(--rpg-bg)',
                        border: '1px solid var(--rpg-primary)',
                        color: 'var(--rpg-text)',
                      }}
                      maxLength={12}
                      onKeyDown={e => e.key === 'Enter' && saveName()}
                    />
                    <button type="button" className="town-hud-pill" onClick={saveName}>
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" className="town-hud-pill town-hud-pill--ghost" onClick={() => setEditingName(false)}>
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <>
                    <LoftCharacterArt preset={characterPreset} size={36} />
                    <span className="font-semibold text-sm" style={{ color: 'var(--rpg-text)' }}>
                      {data.characterName}
                    </span>
                    <button type="button" className="town-hud-pill town-hud-pill--ghost" onClick={() => setEditingName(true)}>
                      <Pencil className="w-3 h-3" />
                    </button>
                  </>
                )}
              </div>

              <CharacterSelector />
              {!activePanel && (
                <p className="text-xs text-center py-6" style={{ color: 'var(--rpg-text-secondary)' }}>
                  点击小屋里的家具打开对应面板
                </p>
              )}
              {activePanel === 'quests' && <QuestList />}
              {activePanel === 'stats' && <StatsPanel />}
              {activePanel === 'habits' && <HabitList />}
            </div>
          )}
        </div>
      </div>
    </TownPageShell>
  );
}
