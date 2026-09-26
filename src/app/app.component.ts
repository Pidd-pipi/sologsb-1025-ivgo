import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  NbAlertModule,
  NbBadgeModule,
  NbButtonModule,
  NbCardModule,
  NbCheckboxModule,
  NbIconModule,
  NbInputModule,
  NbLayoutModule,
  NbOptionModule,
  NbSelectModule,
  NbTabsetModule,
  NbToastrModule,
  NbToastrService
} from '@nebular/theme';

type WorkspaceView = 'compose' | 'checks' | 'review' | 'versions';
type ReviewStatus = 'pending' | 'approved' | 'changes';
type NoticeStatus = 'draft' | 'in-review' | 'locked';
type CheckLevel = 'error' | 'warning' | 'info';

interface LanguageVersion {
  id: string;
  locale: string;
  name: string;
  title: string;
  body: string;
  translator: string;
  reviewed: boolean;
}

interface Discussion {
  id: string;
  languageId: string;
  sentenceIndex: number;
  author: string;
  role: string;
  text: string;
  createdAt: string;
  resolved: boolean;
}

interface RoleReview {
  role: '编辑' | '法务' | '翻译' | '发布人';
  owner: string;
  status: ReviewStatus;
  note: string;
}

interface VersionSnapshot {
  id: string;
  label: string;
  createdAt: string;
  version: string;
  title: string;
  severity: string;
  scope: string;
  eventAt: string;
  effectiveAt: string;
  expiresAt: string;
  channels: string[];
  languages: LanguageVersion[];
  note: string;
  emergency: boolean;
  releases: ChannelRelease[];
}

interface NoticeDraft {
  id: string;
  title: string;
  eventType: string;
  severity: string;
  scope: string;
  channels: string[];
  eventAt: string;
  effectiveAt: string;
  expiresAt: string;
  requiredLocales: string[];
  languages: LanguageVersion[];
  discussions: Discussion[];
  reviews: RoleReview[];
  versions: VersionSnapshot[];
  sendRecords: SendRecord[];
  status: NoticeStatus;
  version: string;
  lockedAt?: string;
  emergencyRevision: boolean;
  updatedAt: string;
}

interface CheckResult {
  id: string;
  category: string;
  level: CheckLevel;
  title: string;
  detail: string;
}

type ReleaseStatus = 'ready' | 'held';
type SendStatus = 'success' | 'failed';
type ChannelSendState = 'pending' | 'success' | 'failed' | 'held';

interface ChannelPackageCheck {
  id: string;
  level: CheckLevel;
  title: string;
  detail: string;
}

interface ChannelPackage {
  channel: string;
  ready: boolean;
  errorCount: number;
  warningCount: number;
  checks: ChannelPackageCheck[];
}

interface ChannelRelease {
  channel: string;
  status: ReleaseStatus;
  holdReasons: string[];
}

interface SendRecord {
  id: string;
  versionId: string;
  version: string;
  channel: string;
  status: SendStatus;
  attempt: number;
  operator: string;
  createdAt: string;
  detail: string;
}

interface DiffRow {
  left: string;
  right: string;
  kind: 'same' | 'changed' | 'added' | 'removed';
}

interface NoticeTemplate {
  id: string;
  name: string;
  description: string;
  eventType: string;
  severity: string;
  scope: string;
  channels: string[];
  title: Record<string, string>;
  body: Record<string, string>;
}

const STORAGE_KEY = 'sologsb-1025-emergency-notice-v1';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function initialDraft(): NoticeDraft {
  const first: VersionSnapshot = {
    id: 'version-1-0-0',
    label: '首次发布稿',
    createdAt: '2026-09-23T08:10:00+08:00',
    version: '1.0.0',
    title: '台风“海燕”橙色预警通知',
    scope: '滨海新区沿海街道',
    severity: '橙色',
    eventAt: '2026-09-23T07:30:00+08:00',
    effectiveAt: '2026-09-23T09:00:00+08:00',
    expiresAt: '2026-09-24T08:00:00+08:00',
    channels: ['短信', '广播', '社区大屏'],
    note: '发布范围覆盖滨海新区。',
    emergency: false,
    releases: [
      { channel: '短信', status: 'ready', holdReasons: [] },
      { channel: '广播', status: 'ready', holdReasons: [] },
      { channel: '社区大屏', status: 'ready', holdReasons: [] }
    ],
    languages: [
      {
        id: 'zh-CN', locale: 'zh-CN', name: '简体中文', title: '台风“海燕”橙色预警通知',
        body: '请滨海新区居民立即停止户外活动。预计今天下午出现强风和暴雨。请远离临时建筑，并关注后续通知。',
        translator: '林晓', reviewed: true
      },
      {
        id: 'en', locale: 'en', name: 'English', title: 'Orange alert for Typhoon Haiyan',
        body: 'Residents in Binhai New Area should stop outdoor activities immediately. Strong winds and heavy rain are expected this afternoon. Stay away from temporary structures and monitor further notices.',
        translator: '周晴', reviewed: true
      }
    ]
  };

  const second: VersionSnapshot = {
    ...clone(first),
    id: 'version-1-1-0',
    label: '扩大影响范围',
    createdAt: '2026-09-24T10:35:00+08:00',
    version: '1.1.0',
    title: '台风“海燕”橙色预警及人员转移通知',
    scope: '滨海新区全区，重点为沿海街道',
    note: '增加沿海街道转移要求。',
    languages: [
      {
        ...clone(first.languages[0]),
        id: 'zh-CN',
        title: '台风“海燕”橙色预警及人员转移通知',
        body: '请滨海新区居民立即停止户外活动。沿海街道居民请于今日17时前转移至就近安置点。预计今天下午出现强风和暴雨。请远离临时建筑，并关注后续通知。'
      } as LanguageVersion,
      {
        ...clone(first.languages[1]),
        id: 'en',
        title: 'Orange alert and evacuation notice for Typhoon Haiyan',
        body: 'Residents in Binhai New Area should stop outdoor activities immediately. Residents of coastal subdistricts must move to the nearest shelter before 17:00 today. Strong winds and heavy rain are expected this afternoon. Stay away from temporary structures and monitor further notices.'
      } as LanguageVersion
    ]
  };

  return {
    id: 'notice-haiyan-2026',
    title: '台风“海燕”橙色预警及人员转移通知',
    eventType: '台风',
    severity: '橙色',
    scope: '滨海新区全区，重点为沿海街道',
    channels: ['短信', '广播', '社区大屏', '政务新媒体'],
    eventAt: '2026-09-25T07:30',
    effectiveAt: '2026-09-25T09:00',
    expiresAt: '2026-09-26T08:00',
    requiredLocales: ['zh-CN', 'en', 'ja'],
    languages: [
      {
        id: 'zh-CN', locale: 'zh-CN', name: '简体中文', title: '台风“海燕”橙色预警及人员转移通知',
        body: '请滨海新区居民立即停止户外活动。沿海街道居民请于今日17时前转移至就近安置点。预计今天下午出现强风和暴雨。不要停留在临时建筑附近，并持续关注后续通知。',
        translator: '林晓', reviewed: true
      },
      {
        id: 'en', locale: 'en', name: 'English', title: 'Orange alert and evacuation notice for Typhoon Haiyan',
        body: 'Residents in Binhai New Area should stop outdoor activities immediately. Residents of coastal subdistricts must move to the nearest shelter before 17:00 today. Strong winds and heavy rain are expected this afternoon. Keep away from temporary buildings and continue to monitor further notices.',
        translator: '周晴', reviewed: true
      },
      {
        id: 'ja', locale: 'ja', name: '日本語', title: '台風「ハイエン」オレンジ警報',
        body: '浜海新区の住民は直ちに屋外活動を中止してください。本日午後、強風と大雨が見込まれます。仮設建物に近づかず、今後の通知を確認してください。',
        translator: '佐藤 明', reviewed: false
      }
    ],
    discussions: [
      {
        id: 'comment-1', languageId: 'zh-CN', sentenceIndex: 1, author: '陈冉', role: '法务审阅',
        text: '建议明确安置点地址由属地另行发送，避免通知被理解为完整点位清单。', createdAt: '2026-09-25T08:16:00+08:00', resolved: false
      }
    ],
    reviews: [
      { role: '编辑', owner: '林晓', status: 'approved', note: '事件要素完整。' },
      { role: '法务', owner: '陈冉', status: 'changes', note: '转移表述需补充依据。' },
      { role: '翻译', owner: '周晴', status: 'pending', note: '等待日文版复核。' },
      { role: '发布人', owner: '值班中心', status: 'pending', note: '' }
    ],
    versions: [first, second],
    sendRecords: [
      { id: 'send-100', versionId: 'version-1-0-0', version: '1.0.0', channel: '短信', status: 'success', attempt: 1, operator: '值班中心', createdAt: '2026-09-23T09:05:00+08:00', detail: '已按 v1.0.0 锁定快照投递，渠道网关回执正常。' },
      { id: 'send-101', versionId: 'version-1-0-0', version: '1.0.0', channel: '广播', status: 'success', attempt: 1, operator: '值班中心', createdAt: '2026-09-23T09:06:00+08:00', detail: '已按 v1.0.0 锁定快照投递，渠道网关回执正常。' },
      { id: 'send-102', versionId: 'version-1-0-0', version: '1.0.0', channel: '社区大屏', status: 'success', attempt: 1, operator: '值班中心', createdAt: '2026-09-23T09:07:00+08:00', detail: '已按 v1.0.0 锁定快照投递，渠道网关回执正常。' },
      { id: 'send-103', versionId: 'version-1-1-0', version: '1.1.0', channel: '短信', status: 'success', attempt: 1, operator: '值班中心', createdAt: '2026-09-24T10:42:00+08:00', detail: '已按 v1.1.0 锁定快照投递，渠道网关回执正常。' },
      { id: 'send-104', versionId: 'version-1-1-0', version: '1.1.0', channel: '广播', status: 'failed', attempt: 1, operator: '值班中心', createdAt: '2026-09-24T10:43:00+08:00', detail: '渠道网关超时，未送达；重试仍使用 v1.1.0 锁定快照。' },
      { id: 'send-106', versionId: 'version-1-1-0', version: '1.1.0', channel: '社区大屏', status: 'success', attempt: 1, operator: '值班中心', createdAt: '2026-09-24T10:44:00+08:00', detail: '已按 v1.1.0 锁定快照投递，渠道网关回执正常。' },
      { id: 'send-105', versionId: 'version-1-1-0', version: '1.1.0', channel: '广播', status: 'success', attempt: 2, operator: '值班中心', createdAt: '2026-09-24T10:51:00+08:00', detail: '重试成功，已按 v1.1.0 锁定快照投递，渠道网关回执正常。' }
    ],
    status: 'in-review',
    version: '1.2.0-draft',
    emergencyRevision: false,
    updatedAt: new Date().toISOString()
  };
}

const TEMPLATES: NoticeTemplate[] = [
  {
    id: 'typhoon', name: '台风人员转移', description: '适用于沿海区域人员转移和停业停课提醒。',
    eventType: '台风', severity: '橙色', scope: '沿海街道', channels: ['短信', '广播', '社区大屏'],
    title: { 'zh-CN': '台风预警及人员转移通知', en: 'Typhoon alert and evacuation notice', ja: '台風警報・避難のお知らせ' },
    body: {
      'zh-CN': '请相关区域居民立即停止户外活动。危险区域人员请按属地安排转移至安全场所。预计将出现强风和暴雨，请远离临时建筑并关注后续通知。',
      en: 'Residents in the affected area should stop outdoor activities immediately. People in high-risk areas must follow local evacuation arrangements. Strong winds and heavy rain are expected. Stay away from temporary structures and monitor further notices.',
      ja: '対象地域の住民は直ちに屋外活動を中止してください。危険地域の方は自治体の避難指示に従ってください。強風と大雨が見込まれます。仮設建物に近づかず、今後の通知を確認してください。'
    }
  },
  {
    id: 'water', name: '供水异常', description: '适用于计划停水和恢复供水通知。',
    eventType: '公共设施', severity: '黄色', scope: '城市供水片区', channels: ['短信', '政务新媒体'],
    title: { 'zh-CN': '计划停水通知', en: 'Planned water service interruption', ja: '断水のお知らせ' },
    body: {
      'zh-CN': '因管网维护，相关区域将于指定时间暂停供水。请提前储水并关闭用水设备。恢复供水后可能出现短时浑浊，请排放后再使用。',
      en: 'Water service will be temporarily suspended for network maintenance. Please store water in advance and close water fixtures. Water may appear cloudy when service resumes; run the tap before use.',
      ja: '管路保守作業のため、対象地域では一時的に断水します。事前に水を確保し、水道設備を閉めてください。復旧後は濁りが生じる場合があるため、しばらく通水してから使用してください。'
    }
  },
  {
    id: 'public-safety', name: '公共安全提醒', description: '适用于大型活动周边临时管控。',
    eventType: '公共安全', severity: '黄色', scope: '活动周边道路', channels: ['广播', '社区大屏', '政务新媒体'],
    title: { 'zh-CN': '大型活动期间临时交通提醒', en: 'Temporary traffic notice during major event', ja: '大規模イベント期間中の交通規制' },
    body: {
      'zh-CN': '活动期间部分道路将采取临时管控措施。请服从现场指引，合理规划出行路线，非必要不前往管控区域。',
      en: 'Temporary traffic controls will be in place during the event. Follow on-site directions, plan your route, and avoid restricted areas unless necessary.',
      ja: 'イベント期間中、一部道路で交通規制を行います。現場の案内に従い、移動経路を事前に確認してください。不要な場合は規制区域への立入りを控えてください。'
    }
  }
];

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NbLayoutModule,
    NbCardModule,
    NbButtonModule,
    NbInputModule,
    NbSelectModule,
    NbOptionModule,
    NbCheckboxModule,
    NbTabsetModule,
    NbIconModule,
    NbBadgeModule,
    NbAlertModule,
    NbToastrModule
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  readonly templates = TEMPLATES;
  readonly eventTypes = ['台风', '暴雨', '地震', '公共卫生', '公共设施', '公共安全'];
  readonly severities = ['蓝色', '黄色', '橙色', '红色'];
  readonly channelOptions = ['短信', '广播', '社区大屏', '政务新媒体', '应急喇叭', '网站'];
  readonly locales = [
    { id: 'zh-CN', name: '简体中文' },
    { id: 'en', name: 'English' },
    { id: 'ja', name: '日本語' },
    { id: 'ko', name: '한국어' },
    { id: 'es', name: 'Español' }
  ];
  readonly bannedTerms = ['大概', '可能吧', '无需恐慌', '绝对不会', '保证安全'];
  readonly glossary = [
    { canonical: '立即', variants: ['马上', '赶紧'] },
    { canonical: '安置点', variants: ['避难所', '庇护所'] },
    { canonical: '持续关注', variants: ['随时留意', '保持观看'] }
  ];
  readonly roles: RoleReview['role'][] = ['编辑', '法务', '翻译', '发布人'];

  draft: NoticeDraft = initialDraft();
  activeView: WorkspaceView = 'compose';
  selectedLanguageId = 'zh-CN';
  selectedSentenceIndex = 0;
  selectedTemplateId = 'typhoon';
  discussionText = '';
  currentRole: RoleReview['role'] = '编辑';
  compareBaseId = '';
  compareTargetId = '';
  lastSavedAt = '';
  history: NoticeDraft[] = [];
  future: NoticeDraft[] = [];

  constructor(private readonly toastr: NbToastrService) {}

  ngOnInit(): void {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        this.draft = this.migrate(JSON.parse(saved) as NoticeDraft);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
        this.draft = initialDraft();
      }
    }
    this.compareBaseId = this.draft.versions.at(-2)?.id ?? '';
    this.compareTargetId = this.draft.versions.at(-1)?.id ?? '';
    this.lastSavedAt = this.formatDateTime(this.draft.updatedAt);
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboard(event: KeyboardEvent): void {
    const modifier = event.metaKey || event.ctrlKey;
    if (!modifier) return;
    if (event.key.toLowerCase() === 'z') {
      event.preventDefault();
      event.shiftKey ? this.redo() : this.undo();
    } else if (event.key.toLowerCase() === 'y') {
      event.preventDefault();
      this.redo();
    } else if (event.key.toLowerCase() === 's') {
      event.preventDefault();
      this.saveNow();
      this.toastr.success('草稿已保存在当前浏览器。', '保存成功');
    }
  }

  get selectedLanguage(): LanguageVersion {
    return this.draft.languages.find((language) => language.id === this.selectedLanguageId) ?? this.draft.languages[0];
  }

  get selectedTemplateDescription(): string {
    return this.templates.find((template) => template.id === this.selectedTemplateId)?.description ?? '请选择一个模板';
  }

  get unresolvedDiscussionCount(): number {
    return this.draft.discussions.filter((discussion) => !discussion.resolved).length;
  }

  get currentSentences(): string[] {
    return this.splitSentences(this.selectedLanguage?.body ?? '');
  }

  get activeDiscussions(): Discussion[] {
    return this.draft.discussions.filter((discussion) => discussion.languageId === this.selectedLanguageId);
  }

  get checks(): CheckResult[] {
    const checks: CheckResult[] = [];
    const requiredMeta: Array<[string, string]> = [
      ['标题', this.draft.title], ['事件类型', this.draft.eventType], ['严重程度', this.draft.severity],
      ['影响范围', this.draft.scope], ['事件时间', this.draft.eventAt], ['生效时间', this.draft.effectiveAt],
      ['失效时间', this.draft.expiresAt]
    ];
    requiredMeta.filter(([, value]) => !value).forEach(([label]) => checks.push({
      id: `meta-${label}`, category: '必填信息', level: 'error', title: `缺少${label}`,
      detail: `请补全通知的${label}后再提交发布。`
    }));
    if (!this.draft.channels.length) checks.push({
      id: 'channels', category: '发布渠道', level: 'error', title: '未选择目标渠道', detail: '至少选择一个目标发布渠道。'
    });

    this.draft.requiredLocales.forEach((locale) => {
      if (!this.draft.languages.some((language) => language.id === locale)) {
        const name = this.locales.find((item) => item.id === locale)?.name ?? locale;
        checks.push({
          id: `missing-${locale}`, category: '语言完整性', level: 'error', title: `${name}版本缺失`,
          detail: '该语言属于本次发布的必需语言，请添加并完成翻译。'
        });
      }
    });

    this.draft.languages.forEach((language) => {
      if (!language.title.trim() || !language.body.trim()) checks.push({
        id: `required-${language.id}`, category: '必填信息', level: 'error', title: `${language.name}内容不完整`,
        detail: '语言版本必须包含标题和正文。'
      });
      if (!language.reviewed) checks.push({
        id: `review-${language.id}`, category: '版本审阅', level: language.id === 'ja' ? 'warning' : 'info',
        title: `${language.name}尚未完成语言复核`, detail: '发布前应确认措辞、术语和本地化表达。'
      });
      const banned = this.bannedTerms.filter((term) => language.body.includes(term));
      if (banned.length) checks.push({
        id: `banned-${language.id}`, category: '禁用词', level: 'error', title: `${language.name}包含禁用词`,
        detail: `请替换：${banned.join('、')}。`
      });
      const inconsistent = this.glossary.filter((entry) => {
        const variantCount = entry.variants.filter((variant) => language.body.includes(variant)).length;
        return variantCount > 0 && (!language.body.includes(entry.canonical) || variantCount > 1);
      });
      if (inconsistent.length) checks.push({
        id: `term-${language.id}`, category: '术语一致性', level: 'warning', title: `${language.name}术语不统一`,
        detail: inconsistent.map((item) => `统一使用“${item.canonical}”，避免“${item.variants.join('、')}”`).join('；')
      });
    });

    const eventAt = this.toTime(this.draft.eventAt);
    const effectiveAt = this.toTime(this.draft.effectiveAt);
    const expiresAt = this.toTime(this.draft.expiresAt);
    if (eventAt && effectiveAt && effectiveAt < eventAt) checks.push({
      id: 'time-effective', category: '时间冲突', level: 'warning', title: '生效时间早于事件时间',
      detail: '请确认这是预防性通知；否则调整事件时间或生效时间。'
    });
    if (effectiveAt && expiresAt && expiresAt <= effectiveAt) checks.push({
      id: 'time-expires', category: '时间冲突', level: 'error', title: '失效时间早于生效时间',
      detail: '通知有效期必须晚于生效时间。'
    });
    const unresolved = this.draft.discussions.filter((discussion) => !discussion.resolved).length;
    if (unresolved) checks.push({
      id: 'discussions', category: '逐句讨论', level: 'warning', title: `${unresolved} 条讨论尚未解决`,
      detail: '发布前请处理或明确忽略未解决讨论。'
    });
    return checks;
  }

  get blockingChecks(): CheckResult[] {
    return this.checks.filter((check) => check.level === 'error');
  }

  get warningCount(): number {
    return this.checks.filter((check) => check.level === 'warning').length;
  }

  get isLocked(): boolean {
    return this.draft.status === 'locked';
  }

  get allReviewsApproved(): boolean {
    return this.draft.reviews.every((review) => review.status === 'approved');
  }

  get hasIncompleteReviews(): boolean {
    return this.draft.reviews.some((review) => review.status !== 'approved');
  }

  get channelPackages(): ChannelPackage[] {
    return this.draft.channels.map((channel) => this.buildChannelPackage(channel));
  }

  get readyChannelCount(): number {
    return this.channelPackages.filter((pkg) => pkg.ready).length;
  }

  get heldChannelCount(): number {
    return this.channelPackages.length - this.readyChannelCount;
  }

  get heldChannelNames(): string {
    return this.channelPackages.filter((pkg) => !pkg.ready).map((pkg) => pkg.channel).join('、');
  }

  get releaseSnapshots(): VersionSnapshot[] {
    return this.draft.versions.filter((version) => version.releases.length).slice().reverse();
  }

  get sendLog(): SendRecord[] {
    return this.draft.sendRecords.slice().reverse();
  }

  get currentLockedId(): string {
    return (this.isLocked && this.draft.versions.at(-1)?.id) || '';
  }

  isSentenceDiscussed(index: number): boolean {
    return this.activeDiscussions.some((discussion) => discussion.sentenceIndex === index && !discussion.resolved);
  }

  get nextVersion(): string {
    const base = this.draft.version.split('-')[0];
    const numbers = base.match(/\d+/g)?.map(Number) ?? [1, 2, 0];
    if (this.draft.version.includes('-emergency')) return `${numbers[0] || 1}.${numbers[1] || 0}.0`;
    return `${numbers[0] || 1}.${(numbers[1] || 0) + 1}.0`;
  }

  get versionDiff(): DiffRow[] {
    const base = this.draft.versions.find((version) => version.id === this.compareBaseId);
    const target = this.draft.versions.find((version) => version.id === this.compareTargetId);
    if (!base || !target) return [];
    const baseLanguage = base.languages.find((language) => language.id === this.selectedLanguageId);
    const targetLanguage = target.languages.find((language) => language.id === this.selectedLanguageId);
    return this.diffSentences(this.splitSentences(baseLanguage?.body ?? ''), this.splitSentences(targetLanguage?.body ?? ''));
  }

  updateMeta(field: 'title' | 'eventType' | 'severity' | 'scope' | 'eventAt' | 'effectiveAt' | 'expiresAt', value: string): void {
    this.commit((draft) => {
      (draft as unknown as Record<string, unknown>)[field] = value;
      draft.status = draft.status === 'locked' ? 'draft' : draft.status;
    });
  }

  toggleChannel(channel: string, checked: boolean): void {
    this.commit((draft) => {
      draft.channels = checked ? [...new Set([...draft.channels, channel])] : draft.channels.filter((item) => item !== channel);
    });
  }

  toggleRequiredLocale(locale: string, checked: boolean): void {
    this.commit((draft) => {
      draft.requiredLocales = checked
        ? [...new Set([...draft.requiredLocales, locale])]
        : draft.requiredLocales.filter((item) => item !== locale);
    });
  }

  updateLanguage(field: 'title' | 'body' | 'translator', value: string): void {
    this.commit((draft) => {
      const language = draft.languages.find((item) => item.id === this.selectedLanguageId);
      if (language) language[field] = value;
    });
  }

  setLanguageReviewed(checked: boolean): void {
    this.commit((draft) => {
      const language = draft.languages.find((item) => item.id === this.selectedLanguageId);
      if (language) language.reviewed = checked;
    });
  }

  selectSentence(index: number): void {
    this.selectedSentenceIndex = index;
  }

  addDiscussion(): void {
    const text = this.discussionText.trim();
    if (!text || this.isLocked) return;
    this.commit((draft) => {
      draft.discussions.push({
        id: uid('discussion'), languageId: this.selectedLanguageId, sentenceIndex: this.selectedSentenceIndex,
        author: this.currentRole === '法务' ? '陈冉' : this.currentRole === '翻译' ? '周晴' : '林晓',
        role: `${this.currentRole}审阅`, text, createdAt: new Date().toISOString(), resolved: false
      });
    });
    this.discussionText = '';
    this.toastr.success('讨论已绑定到当前句。', '已添加');
  }

  toggleDiscussion(discussionId: string): void {
    this.commit((draft) => {
      const item = draft.discussions.find((discussion) => discussion.id === discussionId);
      if (item) item.resolved = !item.resolved;
    });
  }

  setReviewStatus(role: RoleReview['role'], status: ReviewStatus): void {
    this.commit((draft) => {
      const review = draft.reviews.find((item) => item.role === role);
      if (review) review.status = status;
    });
  }

  setReviewNote(role: RoleReview['role'], note: string): void {
    this.commit((draft) => {
      const review = draft.reviews.find((item) => item.role === role);
      if (review) review.note = note;
    });
  }

  applyTemplate(): void {
    const template = this.templates.find((item) => item.id === this.selectedTemplateId);
    if (!template || this.isLocked) return;
    this.commit((draft) => {
      draft.eventType = template.eventType;
      draft.severity = template.severity;
      draft.scope = template.scope;
      draft.channels = [...template.channels];
      draft.languages.forEach((language) => {
        language.title = template.title[language.id] ?? language.title;
        language.body = template.body[language.id] ?? language.body;
        language.reviewed = false;
      });
    });
    this.toastr.success(`已应用“${template.name}”模板，请根据事件信息调整。`, '模板复用');
  }

  lockVersion(): void {
    if (this.isLocked) return;
    if (this.blockingChecks.length) {
      this.toastr.warning(`仍有 ${this.blockingChecks.length} 项阻断问题，不能锁定。`, '发布检查未通过');
      this.activeView = 'checks';
      return;
    }
    const packages = this.channelPackages;
    const ready = packages.filter((pkg) => pkg.ready);
    if (!ready.length) {
      this.toastr.warning('所有渠道发布包均未通过检查，至少需要一个渠道就绪才能锁定。', '没有可准备的渠道');
      this.activeView = 'checks';
      return;
    }
    const releases: ChannelRelease[] = packages.map((pkg) => ({
      channel: pkg.channel,
      status: pkg.ready ? 'ready' : 'held',
      holdReasons: pkg.checks.filter((check) => check.level === 'error').map((check) => check.title)
    }));
    const wasEmergency = this.draft.emergencyRevision;
    const snapshot: VersionSnapshot = {
      id: uid('version'),
      label: wasEmergency ? '紧急修订锁定版' : '最终锁定版本',
      createdAt: new Date().toISOString(), version: this.nextVersion,
      title: this.draft.title, severity: this.draft.severity, scope: this.draft.scope, eventAt: this.draft.eventAt,
      effectiveAt: this.draft.effectiveAt, expiresAt: this.draft.expiresAt, channels: [...this.draft.channels],
      languages: clone(this.draft.languages),
      note: wasEmergency ? '紧急修订通过检查并锁定。' : '发布前检查通过并锁定。',
      emergency: wasEmergency,
      releases
    };
    this.commit((draft) => {
      draft.versions.push(snapshot);
      draft.version = snapshot.version;
      draft.status = 'locked';
      draft.lockedAt = snapshot.createdAt;
      draft.emergencyRevision = false;
    });
    this.compareBaseId = this.draft.versions.at(-2)?.id ?? '';
    this.compareTargetId = this.draft.versions.at(-1)?.id ?? '';
    const held = releases.filter((release) => release.status === 'held');
    if (held.length) {
      this.toastr.warning(
        `已仅挡下 ${held.map((item) => item.channel).join('、')}，其余 ${ready.length} 个渠道照常准备。`,
        `版本 ${snapshot.version} 已锁定`
      );
    } else {
      this.toastr.success(`${ready.length} 个渠道进入待发送。`, `版本 ${snapshot.version} 已锁定`);
    }
    this.activeView = 'versions';
  }

  startEmergencyRevision(): void {
    const baseVersion = this.draft.version.split('-')[0];
    const [major = 1, minor = 0] = baseVersion.split('.').map(Number);
    this.commit((draft) => {
      draft.status = 'draft';
      draft.emergencyRevision = true;
      draft.version = `${major}.${minor + 1}.0-emergency`;
      draft.lockedAt = undefined;
    });
    this.activeView = 'compose';
    this.toastr.warning('已创建紧急修订稿；锁定版本与发送记录完整保留，已发送记录不会被覆盖。', '进入紧急修订');
  }

  showCheck(check: CheckResult): void {
    if (check.id.startsWith('missing-') || check.id.startsWith('required-') || check.id.startsWith('banned-') || check.id.startsWith('term-')) {
      const locale = check.id.split('-').at(-1);
      if (locale && this.draft.languages.some((language) => language.id === locale)) this.selectedLanguageId = locale;
      this.activeView = 'compose';
    } else if (check.id === 'discussions') {
      this.activeView = 'review';
    }
  }

  channelState(snapshot: VersionSnapshot, channel: string): ChannelSendState {
    const release = snapshot.releases.find((item) => item.channel === channel);
    if (!release) return 'pending';
    if (release.status === 'held') return 'held';
    return this.latestRecord(snapshot.id, channel)?.status ?? 'pending';
  }

  stateLabel(state: ChannelSendState): string {
    const labels: Record<ChannelSendState, string> = { pending: '待发送', success: '已发送', failed: '发送失败', held: '已挡下' };
    return labels[state];
  }

  latestRecord(versionId: string, channel: string): SendRecord | undefined {
    return this.draft.sendRecords.filter((record) => record.versionId === versionId && record.channel === channel).at(-1);
  }

  canAttempt(snapshot: VersionSnapshot, channel: string): boolean {
    const release = snapshot.releases.find((item) => item.channel === channel);
    if (!release || release.status !== 'ready') return false;
    const last = this.latestRecord(snapshot.id, channel);
    return !last || last.status === 'failed';
  }

  sendRowSummary(snapshot: VersionSnapshot, release: ChannelRelease): string {
    if (release.status === 'held') {
      const reasons = release.holdReasons.join('；') || '未通过渠道发布包检查';
      return `被挡下：${reasons}。修改需从该版本发起紧急修订。`;
    }
    const last = this.latestRecord(snapshot.id, release.channel);
    if (!last) return `待发送 · 将使用 v${snapshot.version} 锁定快照。`;
    const outcome = last.status === 'success' ? '发送成功' : '发送失败，可重试';
    return `第 ${last.attempt} 次尝试${outcome} · ${this.formatDateTime(last.createdAt)} · 使用 v${snapshot.version} 锁定快照。`;
  }

  attemptSend(snapshot: VersionSnapshot, channel: string): void {
    if (!this.canAttempt(snapshot, channel)) return;
    const attempt = this.draft.sendRecords.filter((record) => record.versionId === snapshot.id && record.channel === channel).length + 1;
    const success = Math.random() < 0.7;
    const record: SendRecord = {
      id: uid('send'), versionId: snapshot.id, version: snapshot.version, channel,
      status: success ? 'success' : 'failed', attempt,
      operator: this.draft.reviews.find((review) => review.role === '发布人')?.owner ?? '值班中心',
      createdAt: new Date().toISOString(),
      detail: success
        ? `${attempt > 1 ? '重试成功，' : ''}已按 v${snapshot.version} 锁定快照投递，渠道网关回执正常。`
        : `渠道网关超时，未送达；重试仍使用 v${snapshot.version} 锁定快照。`
    };
    // 发送记录只增不改：不进入撤销历史，也不随紧急修订回滚
    this.draft.sendRecords = [...this.draft.sendRecords, record];
    this.draft.updatedAt = new Date().toISOString();
    this.persist();
    if (success) {
      this.toastr.success(`${channel}已按 v${snapshot.version} 锁定快照送达。`, '发送成功');
    } else {
      this.toastr.danger(`${channel}网关超时，可使用 v${snapshot.version} 锁定快照重试。`, '发送失败');
    }
  }

  undo(): void {
    const previous = this.history.pop();
    if (!previous) {
      this.toastr.info('没有可撤销的操作。', '撤销');
      return;
    }
    this.future.push(clone(this.draft));
    previous.sendRecords = this.draft.sendRecords;
    this.draft = previous;
    this.persist();
  }

  redo(): void {
    const next = this.future.pop();
    if (!next) {
      this.toastr.info('没有可重做的操作。', '重做');
      return;
    }
    this.history.push(clone(this.draft));
    next.sendRecords = this.draft.sendRecords;
    this.draft = next;
    this.persist();
  }

  saveNow(): void {
    this.persist();
  }

  formatDateTime(value: string): string {
    if (!value) return '未设置';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('zh-CN', {
      month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false
    }).format(date);
  }

  trackById(_index: number, item: { id: string }): string {
    return item.id;
  }

  private buildChannelPackage(channel: string): ChannelPackage {
    const checks: ChannelPackageCheck[] = [];
    const languages = this.draft.requiredLocales
      .map((locale) => this.draft.languages.find((language) => language.id === locale))
      .filter((language): language is LanguageVersion => Boolean(language));
    this.draft.requiredLocales.forEach((locale) => {
      if (!this.draft.languages.some((language) => language.id === locale)) {
        const name = this.locales.find((item) => item.id === locale)?.name ?? locale;
        checks.push({
          id: `pkg-missing-${channel}-${locale}`, level: 'error', title: `缺少${name}版本`,
          detail: '该语言为必需语言，渠道发布包需要完整标题与正文。'
        });
      }
    });
    if (channel === '短信') this.addSmsChecks(checks, languages);
    else if (channel === '广播') this.addBroadcastChecks(checks);
    else if (channel === '社区大屏') this.addScreenChecks(checks, languages);
    else this.addGenericChannelChecks(checks, languages);
    if (!checks.length) checks.push({
      id: `pkg-ok-${channel}`, level: 'info', title: '渠道格式检查全部通过', detail: '该渠道发布包已就绪。'
    });
    const errorCount = checks.filter((check) => check.level === 'error').length;
    return {
      channel,
      ready: errorCount === 0,
      errorCount,
      warningCount: checks.filter((check) => check.level === 'warning').length,
      checks
    };
  }

  private addSmsChecks(checks: ChannelPackageCheck[], languages: LanguageVersion[]): void {
    const hardLimit = 320;
    const segment = 70;
    languages.forEach((language) => {
      const body = language.body.trim();
      const length = body.length;
      if (!length) {
        checks.push({
          id: `sms-empty-${language.id}`, level: 'error', title: `${language.name}正文为空`,
          detail: '短信渠道需要各必需语言的正文。'
        });
        return;
      }
      if (length > hardLimit) checks.push({
        id: `sms-length-${language.id}`, level: 'error', title: `${language.name}正文 ${length} 字，超出短信上限`,
        detail: `短信最长 ${hardLimit} 字，请再精简 ${length - hardLimit} 字。`
      });
      else if (length > segment) checks.push({
        id: `sms-segment-${language.id}`, level: 'warning', title: `${language.name}正文 ${length} 字，将拆分发送`,
        detail: `超过单条 ${segment} 字，预计拆分为 ${Math.ceil(length / 67)} 条短信。`
      });
      const urls = body.match(/https?:\/\/\S+/g) ?? [];
      const invalid = urls.filter((url) => !this.isValidUrl(url));
      if (invalid.length) checks.push({
        id: `sms-url-${language.id}`, level: 'error', title: `${language.name}链接格式无效`,
        detail: `请修正：${invalid.join('、')}。`
      });
      else if (!urls.length && /https?[:：]/.test(body)) checks.push({
        id: `sms-url-broken-${language.id}`, level: 'error', title: `${language.name}链接不完整`,
        detail: '检测到链接开头但缺少完整地址，请补全或删除。'
      });
      else if (!urls.length) checks.push({
        id: `sms-url-none-${language.id}`, level: 'info', title: `${language.name}未包含详情链接`,
        detail: '建议在短信末尾补充详情页短链接，便于群众核实。'
      });
      if (urls.some((url) => url.startsWith('http:'))) checks.push({
        id: `sms-url-http-${language.id}`, level: 'warning', title: `${language.name}链接未使用 https`,
        detail: '建议改用 https 短链接，避免被运营商拦截。'
      });
    });
  }

  private addBroadcastChecks(checks: ChannelPackageCheck[]): void {
    if (!this.draft.severity) checks.push({
      id: 'broadcast-severity', level: 'error', title: '缺少严重程度', detail: '广播稿件必须标注严重程度级别。'
    });
    else if (this.draft.severity === '蓝色') checks.push({
      id: 'broadcast-severity-low', level: 'warning', title: '蓝色预警使用广播需确认',
      detail: '蓝色为最低级别，通常不占用应急广播，请确认必要性。'
    });
    else if (this.draft.severity === '红色') checks.push({
      id: 'broadcast-severity-red', level: 'info', title: '红色预警将强制打断播出',
      detail: '广播平台将按最高优先级插播，请确保措辞简洁。'
    });
    const effectiveAt = this.toTime(this.draft.effectiveAt);
    if (!effectiveAt) {
      checks.push({ id: 'broadcast-effective', level: 'error', title: '缺少生效时间', detail: '广播排期需要明确的生效时间。' });
    } else {
      const now = Date.now();
      if (effectiveAt < now) checks.push({
        id: 'broadcast-effective-past', level: 'warning', title: '生效时间早于当前时间',
        detail: '广播将按立即播出处理，请确认。'
      });
      else if (effectiveAt - now > 24 * 60 * 60 * 1000) checks.push({
        id: 'broadcast-effective-far', level: 'warning', title: '生效时间超出 24 小时排期窗口',
        detail: '广播排期仅支持 24 小时内，请调整生效时间。'
      });
    }
  }

  private addScreenChecks(checks: ChannelPackageCheck[], languages: LanguageVersion[]): void {
    const titleLimit = 40;
    const sentenceLimit = 6;
    languages.forEach((language) => {
      const titleLength = language.title.trim().length;
      if (!titleLength) checks.push({
        id: `screen-title-empty-${language.id}`, level: 'error', title: `${language.name}标题为空`, detail: '大屏轮播需要标题。'
      });
      else if (titleLength > titleLimit) checks.push({
        id: `screen-title-${language.id}`, level: 'error', title: `${language.name}标题 ${titleLength} 字，超出大屏上限`,
        detail: `大屏标题最长 ${titleLimit} 字，请精简 ${titleLength - titleLimit} 字。`
      });
      const sentences = this.splitSentences(language.body).length;
      if (sentences > sentenceLimit) checks.push({
        id: `screen-sentences-${language.id}`, level: 'error', title: `${language.name}正文 ${sentences} 句，超出大屏上限`,
        detail: `大屏单屏最多展示 ${sentenceLimit} 句，请压缩到 ${sentenceLimit} 句以内。`
      });
    });
  }

  private addGenericChannelChecks(checks: ChannelPackageCheck[], languages: LanguageVersion[]): void {
    languages.forEach((language) => {
      if (!language.title.trim() || !language.body.trim()) checks.push({
        id: `generic-content-${language.id}`, level: 'error', title: `${language.name}内容不完整`,
        detail: '该渠道需要完整的标题和正文。'
      });
    });
    checks.push({
      id: 'generic-note', level: 'info', title: '该渠道无额外格式限制', detail: '通过必填与语言检查即可准备。'
    });
  }

  private isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  private commit(mutator: (draft: NoticeDraft) => void): void {
    this.history.push(clone(this.draft));
    if (this.history.length > 50) this.history.shift();
    const next = clone(this.draft);
    mutator(next);
    next.updatedAt = new Date().toISOString();
    this.draft = next;
    this.future = [];
    this.persist();
  }

  private persist(): void {
    this.lastSavedAt = this.formatDateTime(new Date().toISOString());
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...this.draft, updatedAt: new Date().toISOString() }));
  }

  private migrate(value: NoticeDraft): NoticeDraft {
    if (!value.id || !Array.isArray(value.languages) || !Array.isArray(value.versions)) return initialDraft();
    value.discussions ??= [];
    value.reviews ??= [];
    value.requiredLocales ??= ['zh-CN'];
    value.sendRecords ??= [];
    value.versions.forEach((version) => (version.releases ??= []));
    return value;
  }

  private splitSentences(text: string): string[] {
    return (text.match(/[^。！？.!?]+[。！？.!?]?/g) ?? []).map((item) => item.trim()).filter(Boolean);
  }

  private toTime(value: string): number {
    const time = new Date(value).getTime();
    return Number.isNaN(time) ? 0 : time;
  }

  private diffSentences(left: string[], right: string[]): DiffRow[] {
    const rows: DiffRow[] = [];
    const lcs: number[][] = Array.from({ length: left.length + 1 }, () => Array(right.length + 1).fill(0));
    for (let i = left.length - 1; i >= 0; i--) {
      for (let j = right.length - 1; j >= 0; j--) {
        lcs[i][j] = left[i] === right[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
      }
    }
    let i = 0;
    let j = 0;
    while (i < left.length || j < right.length) {
      if (i < left.length && j < right.length && left[i] === right[j]) {
        rows.push({ left: left[i], right: right[j], kind: 'same' }); i++; j++;
      } else if (i < left.length && j < right.length && lcs[i + 1][j] === lcs[i][j] && lcs[i][j + 1] === lcs[i][j]) {
        rows.push({ left: left[i], right: right[j], kind: 'changed' }); i++; j++;
      } else if (j < right.length && (i === left.length || lcs[i][j + 1] >= lcs[i + 1][j])) {
        rows.push({ left: '', right: right[j], kind: 'added' }); j++;
      } else if (i < left.length) {
        rows.push({ left: left[i], right: '', kind: 'removed' }); i++;
      }
    }
    return rows;
  }
}
