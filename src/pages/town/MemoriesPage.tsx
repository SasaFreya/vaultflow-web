import { useMemo, useRef, useState, useEffect } from 'react';
import { BookHeart, Camera, Loader2, Plus, Search, Sparkles, Trash2, Zap } from 'lucide-react';
import { Link, useSearchParams, Navigate, useLocation } from 'react-router-dom';
import { TownPageShell } from '@/components/town/TownNav';
import { useLifeMemories } from '@/hooks/useLifeMemories';
import { useVaultData } from '@/hooks/useVaultData';
import type { BuildingType, LifeCityId, MemoryMood } from '@/types/life-town';
import {
  BUILDING_META,
  BUILDING_TYPES,
  MOOD_OPTIONS,
} from '@/lib/life-memories-data';
import { isCityAccessible, countMemoriesForCity, sortCitiesForDisplay } from '@/lib/life-city-unlock';
import {
  computeFinanceBuildingLevels,
  mergeBuildingStats,
  memoryLevelFromBuilding,
} from '@/lib/life-town-finance';
import { generateMemoryDraft } from '@/lib/memory-ai';
import { formatCurrency } from '@/lib/storage';
import {
  collectAllTags,
  filterMemoriesByQuery,
  groupMemoriesByTime,
  MEMORY_GROUP_LABELS,
} from '@/lib/life-town-report';
import { findTransactionById, suggestLinkedTransactionId, getSameDayTransactions } from '@/lib/life-town-link';
import { LIFE_DOMAIN_META } from '@/lib/explore-ecosystem';
import { extractGeoFromDataUrl, getBrowserGeo } from '@/lib/photo-geo';
import { triggerLoftPose } from '@/lib/eco-data-events';
import { getCachedTownWeather } from '@/lib/town-weather';
import {
  applyWeatherExpBonus,
  getWeatherEcologyEffect,
} from '@/lib/town-weather-ecology';
import { notifyWeatherMemoryBonus } from '@/lib/eco-weather-reward-bridge';
import {
  filterMemoriesByPersonTags,
  parseCrossCityTagMode,
  parseCrossCityTags,
  type CrossCityTagMode,
} from '@/lib/cross-city-tag-filter';
import type { MemoryGeo } from '@/types/life-town';
import type { Transaction } from '@/types';

const GROUP_LABELS = MEMORY_GROUP_LABELS;

function MemoryCard({
  memory,
  linkedTx,
  onDelete,
  onTagClick,
}: {
  memory: {
    id: string;
    buildingType: BuildingType;
    date: string;
    content: string;
    mood?: MemoryMood;
    tags: string[];
    imageUrl?: string;
    source?: string;
  };
  linkedTx?: Transaction;
  onDelete: (id: string) => void;
  onTagClick?: (tag: string) => void;
}) {
  const meta = BUILDING_META[memory.buildingType];
  const domain = LIFE_DOMAIN_META[memory.buildingType];
  const mood = MOOD_OPTIONS.find(m => m.value === memory.mood);

  return (
    <article
      className="rounded-xl p-4 space-y-2 town-obi-card"
      style={{ background: 'var(--rpg-surface)', border: '1px solid var(--rpg-border)' }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--rpg-text-secondary)' }}>
          <span>{meta.icon} {domain.label}</span>
          <span>·</span>
          <span>{memory.date}</span>
          {mood && <span>{mood.emoji}</span>}
          {memory.source === 'ai_chat' && (
            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--rpg-bg)', color: 'var(--rpg-primary)' }}>
              AI
            </span>
          )}
          {linkedTx && (
            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--rpg-bg)', color: 'var(--rpg-text-secondary)' }}>
              🔗 {formatCurrency(linkedTx.amount)}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => onDelete(memory.id)}
          className="p-1 rounded hover:opacity-80"
          style={{ color: 'var(--rpg-text-secondary)' }}
          aria-label="删除回忆"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      {memory.imageUrl && (
        <img src={memory.imageUrl} alt="" className="w-full max-h-40 object-cover rounded-lg" />
      )}
      <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--rpg-text)' }}>
        {memory.content}
      </p>
      {memory.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {memory.tags.map(tag => (
            <button
              key={tag}
              type="button"
              onClick={() => onTagClick?.(tag)}
              className="text-[10px] px-2 py-0.5 rounded-full"
              style={{ background: 'var(--rpg-bg)', color: 'var(--rpg-primary)' }}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}
    </article>
  );
}

function BuildingLevelRow({
  buildingType,
  memoryVisits,
  memoryLevel,
  financeLevel,
  financeActivity,
  financeAmount,
  effectiveLevel,
}: {
  buildingType: BuildingType;
  memoryVisits: number;
  memoryLevel: number;
  financeLevel: number;
  financeActivity: number;
  financeAmount: number;
  effectiveLevel: number;
}) {
  const meta = BUILDING_META[buildingType];
  const hasFinance = financeActivity > 0;

  return (
    <div className="space-y-0.5">
      <div className="flex justify-between items-center" style={{ color: 'var(--rpg-text)' }}>
        <span>{meta.icon} {meta.label}</span>
        <span className="font-mono font-semibold">Lv.{effectiveLevel}</span>
      </div>
      <div className="flex flex-wrap gap-x-2 text-[10px]" style={{ color: 'var(--rpg-text-secondary)' }}>
        <span>记忆 {memoryVisits} 次 · Lv.{memoryLevel}</span>
        {hasFinance && (
          <span>
            流水 {financeActivity} 笔 · Lv.{financeLevel}
            {financeAmount > 0 && ` · ${formatCurrency(financeAmount)}`}
          </span>
        )}
      </div>
    </div>
  );
}

export function MemoriesTimelinePanel({ embedded = false }: { embedded?: boolean }) {
  const { settings, data: vaultData } = useVaultData();
  const {
    data,
    activeCity,
    activeCityId,
    setActiveCityId,
    memoriesForActiveCity,
    addMemory,
    deleteMemory,
    addCustomCity,
    isCityAccessible: canAccessCity,
  } = useLifeMemories();

  const photoInputRef = useRef<HTMLInputElement>(null);
  const [searchParams] = useSearchParams();
  const [showForm, setShowForm] = useState(false);
  const [captureMode, setCaptureMode] = useState(false);
  const [buildingFilter, setBuildingFilter] = useState<BuildingType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [crossCityTags, setCrossCityTags] = useState<string[]>([]);
  const [crossCityTagMode, setCrossCityTagMode] = useState<CrossCityTagMode>('or');
  const [content, setContent] = useState('');
  const [buildingType, setBuildingType] = useState<BuildingType>('home');
  const [mood, setMood] = useState<MemoryMood>('neutral');
  const [tagsInput, setTagsInput] = useState('');
  const [imagePreview, setImagePreview] = useState<string | undefined>();
  const [error, setError] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [draftSource, setDraftSource] = useState<'ai_chat' | 'manual' | 'photo' | null>(null);
  const [checkInToast, setCheckInToast] = useState('');
  const [newTownName, setNewTownName] = useState('');
  const [showNewTown, setShowNewTown] = useState(false);
  const [memoryDate, setMemoryDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [linkedTxId, setLinkedTxId] = useState<string | null>(null);
  const [memoryGeo, setMemoryGeo] = useState<MemoryGeo | null>(null);
  const scopeCrossCity = searchParams.get('scope') === 'crosscity';

  useEffect(() => {
    const buildingParam = searchParams.get('building');
    if (buildingParam && BUILDING_TYPES.includes(buildingParam as BuildingType)) {
      const bt = buildingParam as BuildingType;
      setBuildingFilter(bt);
      setBuildingType(bt);
    }
    if (searchParams.get('compose') === '1') {
      setShowForm(true);
    }
    const tagParam = searchParams.get('tag');
    if (tagParam) setTagFilter(tagParam);
    const tagsParam = parseCrossCityTags(searchParams.get('tags'));
    if (tagsParam.length > 0) setCrossCityTags(tagsParam);
    else if (tagParam && searchParams.get('scope') === 'crosscity') setCrossCityTags([tagParam]);
    setCrossCityTagMode(parseCrossCityTagMode(searchParams.get('tagMode')));
  }, [searchParams]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('memory_draft_prefill');
      if (!raw) return;
      sessionStorage.removeItem('memory_draft_prefill');
      const prefill = JSON.parse(raw) as {
        buildingType?: BuildingType;
        content?: string;
        mood?: MemoryMood;
        tags?: string[];
        date?: string;
        source?: 'ai_chat' | 'manual';
      };
      if (prefill.buildingType && BUILDING_TYPES.includes(prefill.buildingType)) {
        setBuildingType(prefill.buildingType);
        setBuildingFilter(prefill.buildingType);
      }
      if (prefill.content) setContent(prefill.content);
      if (prefill.mood) setMood(prefill.mood);
      if (prefill.tags?.length) setTagsInput(prefill.tags.join(', '));
      if (prefill.date) setMemoryDate(prefill.date);
      if (prefill.source) setDraftSource(prefill.source);
      setShowForm(true);
    } catch {
      /* ignore malformed prefill */
    }
  }, []);

  const sameDayTxOptions = useMemo(
    () => getSameDayTransactions(vaultData.transactions, memoryDate, buildingType),
    [vaultData.transactions, memoryDate, buildingType],
  );

  useEffect(() => {
    if (linkedTxId && !sameDayTxOptions.some(t => t.id === linkedTxId)) {
      setLinkedTxId(null);
    }
  }, [sameDayTxOptions, linkedTxId]);

  const financeLevels = useMemo(
    () => computeFinanceBuildingLevels(vaultData.transactions),
    [vaultData.transactions],
  );

  const mergedBuildings = useMemo(() => {
    const result = {} as Record<BuildingType, ReturnType<typeof mergeBuildingStats>>;
    BUILDING_TYPES.forEach(bt => {
      const mem = activeCity.buildings[bt];
      result[bt] = mergeBuildingStats(
        memoryLevelFromBuilding(mem.visitCount),
        mem.visitCount,
        financeLevels[bt],
      );
    });
    return result;
  }, [activeCity.buildings, financeLevels]);

  const sortedCities = useMemo(
    () => sortCitiesForDisplay(data.cities),
    [data.cities],
  );

  const handleCitySelect = (id: LifeCityId) => {
    if (!canAccessCity(id)) {
      setError('在此城市写下第一条回忆后即可解锁');
      return;
    }
    setActiveCityId(id);
    setError('');
  };

  const handleAddTown = () => {
    const trimmed = newTownName.trim();
    if (!trimmed) return;
    addCustomCity(trimmed);
    setNewTownName('');
    setShowNewTown(false);
    setError('');
  };

  const availableTags = useMemo(
    () => (scopeCrossCity ? collectAllTags(data.memories) : collectAllTags(memoriesForActiveCity)),
    [scopeCrossCity, data.memories, memoriesForActiveCity],
  );

  const activeCrossCityTags = crossCityTags.length > 0 ? crossCityTags : tagFilter ? [tagFilter] : [];

  const filteredGroups = useMemo(() => {
    let list = scopeCrossCity
      ? filterMemoriesByPersonTags(data.memories, activeCrossCityTags, crossCityTagMode)
      : memoriesForActiveCity;
    if (searchQuery.trim()) list = filterMemoriesByQuery(list, searchQuery);
    if (tagFilter && !scopeCrossCity) list = list.filter(m => m.tags.includes(tagFilter));
    if (buildingFilter !== 'all') list = list.filter(m => m.buildingType === buildingFilter);
    return groupMemoriesByTime(list);
  }, [
    scopeCrossCity,
    data.memories,
    memoriesForActiveCity,
    searchQuery,
    tagFilter,
    buildingFilter,
    activeCrossCityTags,
    crossCityTagMode,
  ]);

  const handleImageChange = (file: File | null) => {
    if (!file) {
      setImagePreview(undefined);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      setImagePreview(dataUrl);
      void extractGeoFromDataUrl(dataUrl).then(geo => {
        if (geo) setMemoryGeo({ ...geo, source: 'exif', label: '照片定位' });
      });
    };
    reader.readAsDataURL(file);
  };

  const attachBrowserGeo = async () => {
    const geo = await getBrowserGeo();
    if (geo) setMemoryGeo({ ...geo, source: 'browser', label: '当前位置' });
    else setError('无法获取定位，请检查浏览器权限');
  };

  const runAiGenerate = async () => {
    setError('');
    setAiLoading(true);
    try {
      const draft = await generateMemoryDraft(
        {
          cityId: activeCityId,
          buildingType,
          imageBase64: imagePreview,
          userHint: content.trim() || undefined,
        },
        settings.ai,
        settings.ocr,
      );
      setContent(draft.content);
      setMood(draft.mood);
      setTagsInput(draft.tags.join(', '));
      setDraftSource(draft.source);
      if (!showForm) setShowForm(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI 生成失败');
    } finally {
      setAiLoading(false);
    }
  };

  const handlePhotoCapture = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = String(reader.result);
      setImagePreview(base64);
      void extractGeoFromDataUrl(base64).then(geo => {
        if (geo) setMemoryGeo({ ...geo, source: 'exif', label: '照片定位' });
      });
      setCaptureMode(true);
      setShowForm(true);
      setAiLoading(true);
      setError('');
      void generateMemoryDraft(
        {
          cityId: activeCityId,
          buildingType,
          imageBase64: base64,
        },
        settings.ai,
        settings.ocr,
      )
        .then(draft => {
          setContent(draft.content);
          setMood(draft.mood);
          setTagsInput(draft.tags.join(', '));
          setDraftSource(draft.source);
        })
        .catch(e => setError(e instanceof Error ? e.message : 'AI 生成失败'))
        .finally(() => setAiLoading(false));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    setError('');
    try {
      const date = memoryDate;
      const autoLink = suggestLinkedTransactionId(vaultData.transactions, date, buildingType);
      const linkedTransactionId = linkedTxId ?? autoLink;
      addMemory({
        cityId: activeCityId,
        buildingType,
        content,
        date,
        mood,
        tags: tagsInput.split(/[,，]/).map(t => t.trim()).filter(Boolean),
        imageUrl: imagePreview,
        source: draftSource ?? (imagePreview ? 'photo' : 'manual'),
        linkedTransactionId,
        geo: memoryGeo ?? undefined,
      });
      const weather = getCachedTownWeather(activeCityId);
      const wx = getWeatherEcologyEffect(weather, buildingType);
      if (wx.expBonusPct > 0) {
        const baseExp = 10;
        const bonus = applyWeatherExpBonus(baseExp, wx.expBonusPct) - baseExp;
        notifyWeatherMemoryBonus(bonus, wx.hint ?? '天气回忆加成');
      }
      setContent('');
      setTagsInput('');
      setImagePreview(undefined);
      setDraftSource(null);
      setLinkedTxId(null);
      setMemoryGeo(null);
      setShowForm(false);
      setCaptureMode(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败');
    }
  };

  const handleQuickCheckIn = (bt: BuildingType) => {
    try {
      const date = new Date().toISOString().slice(0, 10);
      addMemory({
        cityId: activeCityId,
        buildingType: bt,
        content: `${date} · 在${activeCity.name}${LIFE_DOMAIN_META[bt].label}打卡`,
        mood: 'neutral',
        tags: [LIFE_DOMAIN_META[bt].label, '打卡'],
        source: 'manual',
        linkedTransactionId: suggestLinkedTransactionId(vaultData.transactions, date, bt),
      });
      setCheckInToast(`${BUILDING_META[bt].icon} ${LIFE_DOMAIN_META[bt].label} 打卡成功`);
      triggerLoftPose('wave');
      setTimeout(() => setCheckInToast(''), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : '打卡失败');
    }
  };

  const companyFinance = financeLevels.company;
  const cafeFinance = financeLevels.cafe;

  const inner = (
    <>
      {!embedded && (
        <div className="loft-hall-tabs mb-3">
          <Link to="/town/loft" className="loft-hall-tab">
            温馨小屋
          </Link>
          <span className="loft-hall-tab loft-hall-tab--active">
            回忆时间轴
          </span>
        </div>
      )}
      <div className="flex flex-col lg:flex-row gap-4">
        <aside className="lg:w-60 space-y-3 shrink-0">
          <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--rpg-text)' }}>
            <BookHeart className="w-4 h-4" /> 城市
          </h2>
          <div className="flex lg:flex-col gap-2 overflow-x-auto pb-1">
            {sortedCities.map(city => {
              const active = city.id === activeCityId;
              const memoryCount = countMemoriesForCity(data.memories, city.id);
              const locked = !isCityAccessible(city, memoryCount);
              return (
                <button
                  key={city.id}
                  type="button"
                  onClick={() => handleCitySelect(city.id)}
                  className="text-left px-3 py-2 rounded-xl min-w-[120px] transition-colors"
                  style={{
                    background: active ? 'var(--rpg-primary)' : 'var(--rpg-surface)',
                    color: active ? '#fff' : locked ? 'var(--rpg-text-secondary)' : 'var(--rpg-text)',
                    border: `1px solid ${active ? 'var(--rpg-primary)' : 'var(--rpg-border)'}`,
                    opacity: locked && !active ? 0.65 : 1,
                  }}
                >
                  <div className="font-medium text-sm">
                    {locked && !active ? '🔒 ' : city.isCustom ? '✨ ' : ''}{city.name}
                  </div>
                  <div className="text-[10px] mt-0.5 opacity-80">
                    {memoryCount} 条 · EXP {city.stats.totalExp}
                    {locked && !active ? ' · 写回忆解锁' : ''}
                  </div>
                </button>
              );
            })}
          </div>

          {showNewTown ? (
            <div className="flex gap-2">
              <input
                className="flex-1 px-2 py-1.5 rounded-lg text-sm"
                style={{ border: '1px solid var(--rpg-border)', background: 'var(--rpg-surface)' }}
                value={newTownName}
                onChange={e => setNewTownName(e.target.value)}
                placeholder="新小镇名称"
                maxLength={24}
                onKeyDown={e => e.key === 'Enter' && handleAddTown()}
              />
              <button type="button" className="town-hud-pill text-xs" onClick={handleAddTown}>确定</button>
            </div>
          ) : (
            <button
              type="button"
              className="w-full text-left px-3 py-2 rounded-xl text-sm flex items-center gap-1.5"
              style={{ border: '1px dashed var(--rpg-border)', color: 'var(--rpg-text-secondary)' }}
              onClick={() => setShowNewTown(true)}
            >
              <Plus className="w-3.5 h-3.5" /> 新建小镇
            </button>
          )}

          <div
            className="rounded-xl p-3 text-xs space-y-3"
            style={{ background: 'var(--rpg-bg)', border: '1px solid var(--rpg-border)' }}
          >
            <div>
              <p className="font-medium mb-1" style={{ color: 'var(--rpg-text)' }}>{activeCity.name} 生态域等级</p>
              <p className="text-[10px]" style={{ color: 'var(--rpg-text-secondary)' }}>
                记忆打卡 + 近 90 天流水镜像，取较高等级
              </p>
            </div>
            {BUILDING_TYPES.map(bt => {
              const m = mergedBuildings[bt];
              return (
                <BuildingLevelRow
                  key={bt}
                  buildingType={bt}
                  memoryVisits={m.memoryVisits}
                  memoryLevel={m.memoryLevel}
                  financeLevel={m.financeLevel}
                  financeActivity={m.financeActivity}
                  financeAmount={m.financeAmount}
                  effectiveLevel={m.effectiveLevel}
                />
              );
            })}
          </div>

          <div
            className="rounded-xl p-3 text-[10px] space-y-1"
            style={{ background: 'var(--rpg-surface)', border: '1px solid var(--rpg-border)', color: 'var(--rpg-text-secondary)' }}
          >
            <p className="font-medium text-xs" style={{ color: 'var(--rpg-text)' }}>财务镜像（全局）</p>
            <p>🏢 公司：近 90 天收入 {companyFinance.activityCount} 笔</p>
            <p>☕ 消费：近 90 天餐饮/购物等 {cafeFinance.activityCount} 笔</p>
          </div>
        </aside>

        <section className="flex-1 space-y-4 min-w-0 loft-memories-scroll">
          {scopeCrossCity && activeCrossCityTags.length > 0 && (
            <div className="rounded-xl px-3 py-2 text-xs space-y-2" style={{ background: 'rgba(244, 143, 177, 0.15)', border: '1px solid var(--rpg-border)' }}>
              <p>
                跨城人物筛选：
                {activeCrossCityTags.map(t => (
                  <strong key={t} className="mx-0.5">#{t}</strong>
                ))}
                · 模式 <strong>{crossCityTagMode === 'and' ? '全部匹配 (AND)' : '任一匹配 (OR)'}</strong>
              </p>
              <div className="flex flex-wrap gap-2 items-center">
                <button
                  type="button"
                  className={`text-[10px] px-2 py-0.5 rounded-full ${crossCityTagMode === 'or' ? 'font-semibold' : ''}`}
                  style={{
                    background: crossCityTagMode === 'or' ? 'var(--rpg-primary)' : 'var(--rpg-bg)',
                    color: crossCityTagMode === 'or' ? '#fff' : 'var(--rpg-text)',
                    border: '1px solid var(--rpg-border)',
                  }}
                  onClick={() => setCrossCityTagMode('or')}
                >
                  OR 任一
                </button>
                <button
                  type="button"
                  className={`text-[10px] px-2 py-0.5 rounded-full ${crossCityTagMode === 'and' ? 'font-semibold' : ''}`}
                  style={{
                    background: crossCityTagMode === 'and' ? 'var(--rpg-primary)' : 'var(--rpg-bg)',
                    color: crossCityTagMode === 'and' ? '#fff' : 'var(--rpg-text)',
                    border: '1px solid var(--rpg-border)',
                  }}
                  onClick={() => setCrossCityTagMode('and')}
                >
                  AND 全部
                </button>
                <button
                  type="button"
                  className="underline text-[10px]"
                  onClick={() => { setCrossCityTags([]); setTagFilter(null); }}
                >
                  清除
                </button>
              </div>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold" style={{ color: 'var(--rpg-text)' }}>
                {scopeCrossCity && activeCrossCityTags.length > 0
                  ? `跨城 · ${activeCrossCityTags.map(t => `#${t}`).join(crossCityTagMode === 'and' ? ' & ' : ' | ')}`
                  : `${activeCity.name} · 回忆记录`}
              </h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--rpg-text-secondary)' }}>
                拍下今天 · 一键打卡 · AI 生成文字
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                to="/town/memories/report"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium"
                style={{ background: 'var(--rpg-surface)', color: 'var(--rpg-text)', border: '1px solid var(--rpg-border)' }}
              >
                生活报告
              </Link>
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium"
                style={{ background: 'var(--rpg-surface)', color: 'var(--rpg-text)', border: '1px solid var(--rpg-border)' }}
              >
                <Camera className="w-3.5 h-3.5" />
                拍下今天
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(v => !v); setCaptureMode(false); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium"
                style={{ background: 'var(--rpg-primary)', color: '#fff' }}
              >
                <Plus className="w-3.5 h-3.5" />
                写回忆
              </button>
            </div>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={e => { handlePhotoCapture(e.target.files?.[0] ?? null); e.target.value = ''; }}
            />
          </div>

          <div
            className="rounded-xl p-3 space-y-2"
            style={{ background: 'var(--rpg-surface)', border: '1px solid var(--rpg-border)' }}
          >
            <p className="text-xs font-medium flex items-center gap-1.5" style={{ color: 'var(--rpg-text)' }}>
              <Zap className="w-3.5 h-3.5" /> 一键打卡
            </p>
            <div className="flex flex-wrap gap-1.5">
              {BUILDING_TYPES.map(bt => (
                <button
                  key={bt}
                  type="button"
                  onClick={() => handleQuickCheckIn(bt)}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-opacity hover:opacity-90"
                  style={{ background: 'var(--rpg-bg)', color: 'var(--rpg-text)', border: '1px solid var(--rpg-border)' }}
                >
                  {BUILDING_META[bt].icon} {LIFE_DOMAIN_META[bt].label}
                </button>
              ))}
            </div>
            {checkInToast && (
              <p className="text-[10px]" style={{ color: 'var(--rpg-primary)' }}>{checkInToast}</p>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setBuildingFilter('all')}
              className="px-2.5 py-1 rounded-lg text-[11px]"
              style={{
                background: buildingFilter === 'all' ? 'var(--rpg-primary)' : 'var(--rpg-surface)',
                color: buildingFilter === 'all' ? '#fff' : 'var(--rpg-text)',
                border: '1px solid var(--rpg-border)',
              }}
            >
              全部
            </button>
            {BUILDING_TYPES.map(bt => (
              <button
                key={bt}
                type="button"
                onClick={() => setBuildingFilter(bt)}
                className="px-2.5 py-1 rounded-lg text-[11px]"
                style={{
                  background: buildingFilter === bt ? 'var(--rpg-primary)' : 'var(--rpg-surface)',
                  color: buildingFilter === bt ? '#fff' : 'var(--rpg-text)',
                  border: '1px solid var(--rpg-border)',
                }}
              >
                {BUILDING_META[bt].icon} {BUILDING_META[bt].label}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <div
              className="flex items-center gap-2 rounded-lg px-3 py-2"
              style={{ background: 'var(--rpg-surface)', border: '1px solid var(--rpg-border)' }}
            >
              <Search className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--rpg-text-secondary)' }} />
              <input
                type="search"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="搜索回忆内容或标签…"
                className="flex-1 text-xs bg-transparent outline-none min-w-0"
                style={{ color: 'var(--rpg-text)' }}
              />
              {(searchQuery || tagFilter || crossCityTags.length > 0) && (
                <button
                  type="button"
                  onClick={() => { setSearchQuery(''); setTagFilter(null); setCrossCityTags([]); }}
                  className="text-[10px] shrink-0"
                  style={{ color: 'var(--rpg-text-secondary)' }}
                >
                  清除
                </button>
              )}
            </div>
            {availableTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {availableTags.slice(0, 12).map(tag => {
                  const active = scopeCrossCity
                    ? crossCityTags.includes(tag)
                    : tagFilter === tag;
                  return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      if (scopeCrossCity) {
                        setCrossCityTags(prev =>
                          prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag],
                        );
                        return;
                      }
                      setTagFilter(tagFilter === tag ? null : tag);
                    }}
                    className="text-[10px] px-2 py-0.5 rounded-full"
                    style={{
                      background: active ? 'var(--rpg-primary)' : 'var(--rpg-bg)',
                      color: active ? '#fff' : 'var(--rpg-primary)',
                      border: '1px solid var(--rpg-border)',
                    }}
                  >
                    #{tag}
                  </button>
                  );
                })}
              </div>
            )}
          </div>

          {showForm && (
            <div
              className="rounded-xl p-4 space-y-3"
              style={{ background: 'var(--rpg-surface)', border: '1px solid var(--rpg-border)' }}
            >
              {captureMode && (
                <p className="text-[10px]" style={{ color: 'var(--rpg-primary)' }}>
                  📷 拍照模式 — {aiLoading ? 'AI 正在生成…' : '可编辑后保存'}
                </p>
              )}
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="今天发生了什么？"
                rows={4}
                className="w-full rounded-lg px-3 py-2 text-sm resize-none"
                style={{
                  background: 'var(--rpg-bg)',
                  color: 'var(--rpg-text)',
                  border: '1px solid var(--rpg-border)',
                }}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="text-xs space-y-1 block" style={{ color: 'var(--rpg-text-secondary)' }}>
                  日期
                  <input
                    type="date"
                    value={memoryDate}
                    onChange={e => setMemoryDate(e.target.value)}
                    className="w-full rounded-lg px-2 py-1.5 text-sm"
                    style={{ background: 'var(--rpg-bg)', color: 'var(--rpg-text)', border: '1px solid var(--rpg-border)' }}
                  />
                </label>
                <label className="text-xs space-y-1 block" style={{ color: 'var(--rpg-text-secondary)' }}>
                  生活域
                  <select
                    value={buildingType}
                    onChange={e => setBuildingType(e.target.value as BuildingType)}
                    className="w-full rounded-lg px-2 py-1.5 text-sm"
                    style={{ background: 'var(--rpg-bg)', color: 'var(--rpg-text)', border: '1px solid var(--rpg-border)' }}
                  >
                    {BUILDING_TYPES.map(bt => (
                      <option key={bt} value={bt}>
                        {BUILDING_META[bt].icon} {LIFE_DOMAIN_META[bt].label} — {LIFE_DOMAIN_META[bt].tagline}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs space-y-1 block" style={{ color: 'var(--rpg-text-secondary)' }}>
                  心情
                  <select
                    value={mood}
                    onChange={e => setMood(e.target.value as MemoryMood)}
                    className="w-full rounded-lg px-2 py-1.5 text-sm"
                    style={{ background: 'var(--rpg-bg)', color: 'var(--rpg-text)', border: '1px solid var(--rpg-border)' }}
                  >
                    {MOOD_OPTIONS.map(m => (
                      <option key={m.value} value={m.value}>{m.emoji} {m.label}</option>
                    ))}
                  </select>
                </label>
              </div>
              {sameDayTxOptions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium" style={{ color: 'var(--rpg-text-secondary)' }}>
                    关联账单（可选，优先于自动匹配）
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="text-[10px] px-2 py-1 rounded-full"
                      style={{
                        background: linkedTxId === null ? 'var(--rpg-primary)' : 'var(--rpg-bg)',
                        color: linkedTxId === null ? '#fff' : 'var(--rpg-text)',
                        border: '1px solid var(--rpg-border)',
                      }}
                      onClick={() => setLinkedTxId(null)}
                    >
                      自动匹配
                    </button>
                    {sameDayTxOptions.map(tx => (
                      <button
                        key={tx.id}
                        type="button"
                        className="text-[10px] px-2 py-1 rounded-full"
                        style={{
                          background: linkedTxId === tx.id ? 'var(--rpg-primary)' : 'var(--rpg-bg)',
                          color: linkedTxId === tx.id ? '#fff' : 'var(--rpg-text)',
                          border: '1px solid var(--rpg-border)',
                        }}
                        onClick={() => setLinkedTxId(tx.id)}
                      >
                        {tx.category} {formatCurrency(tx.amount)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" className="text-xs px-2 py-1 rounded-lg town-hud-pill" onClick={() => void attachBrowserGeo()}>
                  📍 使用当前位置
                </button>
                {memoryGeo && (
                  <span className="text-[10px]" style={{ color: 'var(--rpg-text-secondary)' }}>
                    {memoryGeo.label ?? '已定位'} · {memoryGeo.lat.toFixed(4)}, {memoryGeo.lng.toFixed(4)}
                    <button type="button" className="ml-1 underline" onClick={() => setMemoryGeo(null)}>清除</button>
                  </span>
                )}
              </div>
              <label className="text-xs space-y-1 block" style={{ color: 'var(--rpg-text-secondary)' }}>
                标签（逗号分隔）
                <input
                  value={tagsInput}
                  onChange={e => setTagsInput(e.target.value)}
                  placeholder="学习, 阿语"
                  className="w-full rounded-lg px-2 py-1.5 text-sm"
                  style={{ background: 'var(--rpg-bg)', color: 'var(--rpg-text)', border: '1px solid var(--rpg-border)' }}
                />
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: 'var(--rpg-text-secondary)' }}>
                  <Camera className="w-3.5 h-3.5" />
                  换照片
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => handleImageChange(e.target.files?.[0] ?? null)}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => void runAiGenerate()}
                  disabled={aiLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
                  style={{ background: 'var(--rpg-bg)', color: 'var(--rpg-primary)', border: '1px solid var(--rpg-border)' }}
                >
                  {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  AI 生成
                </button>
                {!settings.ai?.dashscopeApiKey && (
                  <Link to="/settings" className="text-[10px] underline" style={{ color: 'var(--rpg-text-secondary)' }}>
                    配置百炼 Key
                  </Link>
                )}
              </div>
              {imagePreview && (
                <img src={imagePreview} alt="" className="max-h-32 rounded-lg object-cover" />
              )}
              {error && <p className="text-xs text-red-500">{error}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={aiLoading || !content.trim()}
                  className="px-4 py-2 rounded-lg text-xs font-medium disabled:opacity-50"
                  style={{ background: 'var(--rpg-primary)', color: '#fff' }}
                >
                  保存回忆
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setCaptureMode(false); }}
                  className="px-4 py-2 rounded-lg text-xs"
                  style={{ color: 'var(--rpg-text-secondary)', border: '1px solid var(--rpg-border)' }}
                >
                  取消
                </button>
              </div>
            </div>
          )}

          {(['thisMonth', 'thisYear', 'earlier'] as const).map(group => {
            const items = filteredGroups[group];
            if (items.length === 0) return null;
            return (
              <div key={group} className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--rpg-text-secondary)' }}>
                  {GROUP_LABELS[group]}
                </h3>
                <div className="space-y-3">
                  {items.map(m => (
                    <MemoryCard
                      key={m.id}
                      memory={m}
                      linkedTx={findTransactionById(vaultData.transactions, m.linkedTransactionId)}
                      onDelete={deleteMemory}
                      onTagClick={tag => { setTagFilter(tag); setSearchQuery(''); }}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {filteredGroups.thisMonth.length === 0 &&
            filteredGroups.thisYear.length === 0 &&
            filteredGroups.earlier.length === 0 && (
              <div
                className="rounded-xl p-8 text-center text-sm"
                style={{ background: 'var(--rpg-bg)', color: 'var(--rpg-text-secondary)' }}
              >
                {activeCity.name}
                {searchQuery || tagFilter ? ' 没有匹配的回忆' : ' 还没有回忆'}。
                <br />
                {searchQuery || tagFilter ? '试试换个关键词或清除筛选。' : '试试「拍下今天」或「一键打卡」吧。'}
              </div>
            )}
        </section>
      </div>
    </>
  );

  if (embedded) return inner;
  return <TownPageShell>{inner}</TownPageShell>;
}

export default function MemoriesPage() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  params.set('tab', 'memories');
  return <Navigate to={`/town/loft?${params.toString()}`} replace />;
}
