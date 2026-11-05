import type { SceneHotspot, LocationMicroScene } from '@/types/town';

export interface LocationScenePack {
  micro: LocationMicroScene;
  points: SceneHotspot[];
}

export const LOCATION_SCENE_PACKS: Record<string, LocationScenePack> = {
  home: {
    micro: {
      story: '玄关的拖鞋摆得整整齐齐，小窝在等你回来。',
      ambient: '窗外风声 · 暖黄台灯 · 冰箱低鸣',
      props: [
        { id: 'slippers', emoji: '🥿', label: '拖鞋', x: 12, y: 62 },
        { id: 'plant', emoji: '🪴', label: '绿植', x: 8, y: 38 },
        { id: 'lamp', emoji: '💡', label: '台灯', x: 22, y: 32 },
        { id: 'book', emoji: '📖', label: '枕边书', x: 28, y: 55 },
        { id: 'tea', emoji: '🍵', label: '热茶', x: 84, y: 48 },
        { id: 'cat', emoji: '🐱', label: '猫窝', x: 88, y: 62 },
      ],
    },
    points: [
      {
        id: 'rest',
        name: '沙发',
        icon: '🛋️',
        action: 'relax',
        label: '在家休息',
        story: '陷进沙发里，今天的疲惫可以暂时放下。',
        layout: { x: 48, y: 44 },
      },
      {
        id: 'journal',
        name: '书桌',
        icon: '✍️',
        action: 'journal',
        label: '写回忆',
        story: '台灯亮起来，适合记下今天的小事。',
        layout: { x: 68, y: 52 },
      },
    ],
  },
  gym: {
    micro: {
      story: '阳光从落地窗洒进来，瑜伽垫已经铺好了。',
      ambient: '轻音乐 · 跑步机低鸣 · 毛巾架上的薰衣草味',
      props: [
        { id: 'mat', emoji: '🧘', label: '瑜伽垫', x: 14, y: 58, rotate: -8 },
        { id: 'bottle', emoji: '🥤', label: '水杯', x: 26, y: 42 },
        { id: 'towel', emoji: '🧴', label: '毛巾', x: 8, y: 38 },
        { id: 'headphones', emoji: '🎧', label: '耳机', x: 32, y: 52 },
        { id: 'plant', emoji: '🪴', label: '绿植', x: 82, y: 28 },
        { id: 'clock', emoji: '⏱️', label: '计时器', x: 88, y: 62 },
      ],
    },
    points: [
      {
        id: 'treadmill',
        name: '跑步机',
        icon: '🏃',
        action: 'workout',
        label: '开始健身',
        story: '跑带缓缓启动，今天也对自己好一点。',
        layout: { x: 58, y: 38 },
      },
      {
        id: 'weights',
        name: '哑铃区',
        icon: '🏋️',
        action: 'strength',
        label: '力量训练',
        story: '哑铃区镜子前，每一组都是和昨天的自己击掌。',
        layout: { x: 72, y: 55 },
      },
    ],
  },
  library: {
    micro: {
      story: '窗边的座位留着一盏暖光灯，等你翻开下一章。',
      ambient: '翻页声 · 空调微风 · 远处咖啡香',
      props: [
        { id: 'stack', emoji: '📚', label: '书堆', x: 10, y: 48 },
        { id: 'lamp', emoji: '💡', label: '台灯', x: 22, y: 32 },
        { id: 'plant', emoji: '🪴', label: '绿植', x: 6, y: 68 },
        { id: 'tea', emoji: '🍵', label: '热茶', x: 30, y: 62 },
        { id: 'glasses', emoji: '👓', label: '眼镜', x: 18, y: 55 },
        { id: 'bookmark', emoji: '🔖', label: '书签', x: 85, y: 35 },
      ],
    },
    points: [
      {
        id: 'reading',
        name: '阅读区',
        icon: '📖',
        action: 'reading',
        label: '开始阅读',
        story: '沙发陷进去刚刚好，适合把世界关在门外。',
        layout: { x: 48, y: 42 },
      },
      {
        id: 'study',
        name: '自习室',
        icon: '✍️',
        action: 'deepStudy',
        label: '深度学习',
        story: '长桌尽头是静区，适合一段不被打断的思考。',
        layout: { x: 68, y: 52 },
      },
    ],
  },
  company: {
    micro: {
      story: '显示器旁的多肉长得正好，适合一段深度工作。',
      ambient: '键盘敲击 · 会议室远语 · 咖啡机嗡鸣',
      props: [
        { id: 'monitor', emoji: '🖥️', label: '显示器', x: 12, y: 45 },
        { id: 'notes', emoji: '📝', label: '便签', x: 24, y: 58 },
        { id: 'mug', emoji: '☕', label: '马克杯', x: 8, y: 62 },
        { id: 'succulent', emoji: '🌿', label: '多肉', x: 28, y: 38 },
        { id: 'calendar', emoji: '📅', label: '日历', x: 86, y: 30 },
        { id: 'badge', emoji: '🪪', label: '工牌', x: 90, y: 58 },
      ],
    },
    points: [
      {
        id: 'desk',
        name: '工位',
        icon: '💻',
        action: 'focus',
        label: '开始专注',
        story: '番茄钟亮起来，这一小时只属于你。',
        layout: { x: 52, y: 40 },
      },
      {
        id: 'meeting',
        name: '会议室',
        icon: '📊',
        action: 'team',
        label: '团队副本',
        story: '白板笔还没盖上，今天的协作刚刚开始。',
        layout: { x: 70, y: 48 },
      },
      {
        id: 'coffee',
        name: '茶水间',
        icon: '☕',
        action: 'social',
        label: '社交任务',
        story: '同事递来一块饼干，休息也是工作的一部分。',
        layout: { x: 38, y: 58 },
      },
    ],
  },
  cafe: {
    micro: {
      story: '角落的沙发陷进去刚刚好，适合放空一会儿。',
      ambient: '磨豆机 · 轻爵士 · 窗外街景',
      props: [
        { id: 'latte', emoji: '☕', label: '拉花咖啡', x: 12, y: 42 },
        { id: 'cake', emoji: '🍰', label: '蛋糕', x: 22, y: 58 },
        { id: 'flowers', emoji: '🌸', label: '花瓶', x: 6, y: 32 },
        { id: 'magazine', emoji: '📖', label: '杂志', x: 28, y: 48 },
        { id: 'sugar', emoji: '🍯', label: '糖罐', x: 84, y: 55 },
        { id: 'cat', emoji: '🐱', label: '店猫', x: 88, y: 34 },
      ],
    },
    points: [
      {
        id: 'counter',
        name: '吧台',
        icon: '☕',
        action: 'buyCoffee',
        label: '买杯咖啡',
        story: '吧台后传来蒸汽声，今天想试什么豆子？',
        layout: { x: 55, y: 36 },
      },
      {
        id: 'corner',
        name: '角落座位',
        icon: '🛋️',
        action: 'relax',
        label: '放松休息',
        story: '靠窗的位置空着，阳光在杯沿上画了一圈金边。',
        layout: { x: 68, y: 52 },
      },
    ],
  },
};

export function enrichLocationScene<
  T extends { id: string; scene: { interactivePoints: SceneHotspot[] } },
>(
  location: T,
): T & {
  scene: T['scene'] & { micro?: LocationMicroScene; interactivePoints: SceneHotspot[] };
} {
  const pack = LOCATION_SCENE_PACKS[location.id];
  if (!pack) return location as never;

  const pointMap = new Map(pack.points.map(p => [p.id, p]));
  const mergedPoints = location.scene.interactivePoints.map(p => ({
    ...p,
    ...pointMap.get(p.id),
  }));

  return {
    ...location,
    scene: {
      ...location.scene,
      micro: pack.micro,
      interactivePoints: mergedPoints,
    },
  };
}
