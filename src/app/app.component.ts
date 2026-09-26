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
  channelPackages: FrozenChannelPackage[];
  sendRecords: ChannelSendRecord[];
}

type SendStatus = 'pending' | 'sending' | 'sent' | 'failed';

interface ChannelPackageIssue {
  id: string;
  localeId?: string;
  text: string;
}

interface ChannelPayloadPreview {
  localeId: string;
  name: string;
  titleLength: number;
  bodyLength: number;
  sentenceCount: number;
  hasLink: boolean;
}

interface ChannelPackage {
  channel: string;
  ready: boolean;
  issues: ChannelPackageIssue[];
  previews: ChannelPayloadPreview[];
}

interface FrozenChannelPackage {
  channel: string;
  ready: boolean;
  issues: string[];
}

interface ChannelSendRecord {
  id: string;
  channel: string;
  status: SendStatus;
  attempts: number;
  recipientCount: number;
  lastAttemptAt?: string;
  sentAt?: string;
  detail: string;
  snapshotVersion: string;
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
  status: NoticeStatus;
  version: string;
  lockedAt?: string;
  basedOnVersionId?: string;
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
    channelPackages: [
      { channel: '短信', ready: true, issues: [] },
      { channel: '广播', ready: true, issues: [] },
      { channel: '社区大屏', ready: true, issues: [] }
    ],
    sendRecords: [
      {
        id: 'record-100-sms', channel: '短信', status: 'sent', attempts: 1, recipientCount: 28640,
        lastAttemptAt: '2026-09-23T08:12:00+08:00', sentAt: '2026-09-23T08:12:00+08:00',
        detail: '短信网关回执成功，使用 1.0.0 锁定快照。', snapshotVersion: '1.0.0'
      },
      {
        id: 'record-100-broadcast', channel: '广播', status: 'sent', attempts: 1, recipientCount: 41,
        lastAttemptAt: '2026-09-23T08:13:00+08:00', sentAt: '2026-09-23T08:13:00+08:00',
        detail: '应急广播播送一次，使用 1.0.0 锁定快照。', snapshotVersion: '1.0.0'
      },
      {
        id: 'record-100-screen', channel: '社区大屏', status: 'sent', attempts: 1, recipientCount: 126,
        lastAttemptAt: '2026-09-23T08:15:00+08:00', sentAt: '2026-09-23T08:15:00+08:00',
        detail: '社区大屏已上屏，使用 1.0.0 锁定快照。', snapshotVersion: '1.0.0'
      }
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
    sendRecords: [
      {
        id: 'record-110-sms', channel: '短信', status: 'sent', attempts: 2, recipientCount: 96420,
        lastAttemptAt: '2026-09-24T10:41:00+08:00', sentAt: '2026-09-24T10:41:00+08:00',
        detail: '首次发送网关超时，按 1.1.0 锁定快照重试后成功，原失败记录保留。', snapshotVersion: '1.1.0'
      },
      {
        id: 'record-110-broadcast', channel: '广播', status: 'failed', attempts: 1, recipientCount: 63,
        lastAttemptAt: '2026-09-24T10:42:00+08:00',
        detail: '广播基站链路中断；可继续使用 1.1.0 锁定快照重试。', snapshotVersion: '1.1.0'
      },
      {
        id: 'record-110-screen', channel: '社区大屏', status: 'sent', attempts: 1, recipientCount: 214,
        lastAttemptAt: '2026-09-24T10:44:00+08:00', sentAt: '2026-09-24T10:44:00+08:00',
        detail: '社区大屏已上屏，使用 1.1.0 锁定快照。', snapshotVersion: '1.1.0'
      }
    ],
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
    eventAt: '2026-09-27T07:30',
    effectiveAt: '2026-09-27T09:00',
    expiresAt: '2026-09-28T08:00',
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

    this.draft.languages.forEach((language) => {
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

  // 渠道发布包：短信按字数/链接、广播按严重程度/生效时间、社区大屏按标题长度/句数分别检查。
  // 一路不合格只阻断该渠道，其余渠道照常生成可发布包。
  readonly smsBodyLimits: Record<string, number> = { 'zh-CN': 70, ja: 70, ko: 70 };
  readonly smsDefaultLimit = 160;
  readonly screenTitleLimits: Record<string, number> = { 'zh-CN': 20, ja: 24, ko: 24 };
  readonly screenDefaultTitleLimit = 42;
  readonly screenSentenceMin = 2;
  readonly screenSentenceMax = 4;
  readonly broadcastAllowedSeverities = ['橙色', '红色'];

  get channelPackages(): ChannelPackage[] {
    return this.draft.channels.map((channel) => this.buildChannelPackage(channel));
  }

  get readyChannelCount(): number {
    return this.channelPackages.filter((item) => item.ready).length;
  }

  get packageIssueCount(): number {
    return this.channelPackages.reduce((total, item) => total + item.issues.length, 0);
  }

  get lockedVersion(): VersionSnapshot | undefined {
    return this.draft.versions.find((version) => version.id === this.draft.basedOnVersionId)
      ?? (this.isLocked ? this.draft.versions.at(-1) : undefined);
  }

  channelRuleHint(channel: string): string {
    if (channel === '短信') return '检查每个必需语言正文是否在短信字数内，并包含可访问链接';
    if (channel === '广播') return '核对严重程度是否允许广播播送、生效时间是否有效';
    if (channel === '社区大屏') return '检查每个必需语言标题长度与正句句数是否适合上屏';
    return '检查每个必需语言的标题与正文是否齐备';
  }

  private buildChannelPackage(channel: string): ChannelPackage {
    const issues: ChannelPackageIssue[] = [];
    this.draft.requiredLocales.forEach((localeId) => {
      const language = this.draft.languages.find((item) => item.id === localeId);
      const name = this.locales.find((item) => item.id === localeId)?.name ?? localeId;
      if (!language) {
        issues.push({
          id: `pkg-${channel}-missing-${localeId}`, localeId,
          text: `${name}版本缺失：该语言为必需语言，无法生成${channel}内容`
        });
        return;
      }
      if (!language.title.trim()) {
        issues.push({
          id: `pkg-${channel}-title-${localeId}`, localeId,
          text: `${name}标题为空`
        });
      }
      if (!language.body.trim()) {
        issues.push({
          id: `pkg-${channel}-body-${localeId}`, localeId,
          text: `${name}正文为空`
        });
      }
    });
    if (channel === '短信') this.checkSmsPackage(issues);
    if (channel === '广播') this.checkBroadcastPackage(issues);
    if (channel === '社区大屏') this.checkScreenPackage(issues);
    const previews: ChannelPayloadPreview[] = this.draft.requiredLocales.map((localeId) => {
      const language = this.draft.languages.find((item) => item.id === localeId);
      return {
        localeId,
        name: language?.name ?? this.locales.find((item) => item.id === localeId)?.name ?? localeId,
        titleLength: this.displayLength(language?.title ?? ''),
        bodyLength: this.displayLength(language?.body ?? ''),
        sentenceCount: language ? this.splitSentences(language.body).length : 0,
        hasLink: language ? this.hasHttpLink(language.body) : false
      };
    });
    return { channel, ready: issues.length === 0, issues, previews };
  }

  private checkSmsPackage(issues: ChannelPackageIssue[]): void {
    this.draft.requiredLocales.forEach((localeId) => {
      const language = this.draft.languages.find((item) => item.id === localeId);
      if (!language || !language.body.trim()) return;
      const limit = this.smsBodyLimits[localeId] ?? this.smsDefaultLimit;
      const length = this.displayLength(language.body);
      if (length > limit) {
        issues.push({
          id: `pkg-sms-length-${localeId}`, localeId,
          text: `${language.name}正文 ${length} 字，超出单条短信上限 ${limit} 字（${language.id === 'zh-CN' || language.id === 'ja' || language.id === 'ko' ? '按中/日/韩文短信计长' : '按拉丁字母短信计长'}），需精简或拆分`
        });
      }
      if (!this.hasHttpLink(language.body)) {
        issues.push({
          id: `pkg-sms-link-${localeId}`, localeId,
          text: `${language.name}正文缺少链接：短信需附 https:// 详情链接，便于居民查看全文`
        });
      }
    });
  }

  private checkBroadcastPackage(issues: ChannelPackageIssue[]): void {
    if (!this.broadcastAllowedSeverities.includes(this.draft.severity)) {
      issues.push({
        id: 'pkg-broadcast-severity',
        text: `严重程度为“${this.draft.severity}”，应急广播仅允许在${this.broadcastAllowedSeverities.join('、')}预警时播送`
      });
    }
    const effectiveAt = this.toTime(this.draft.effectiveAt);
    if (!effectiveAt) {
      issues.push({ id: 'pkg-broadcast-effective-empty', text: '生效时间未填写，无法安排广播播送窗口' });
    } else if (effectiveAt <= Date.now()) {
      issues.push({
        id: 'pkg-broadcast-effective-past',
        text: `生效时间 ${this.formatDateTime(this.draft.effectiveAt)} 已过，广播内容将失去时效，请发起紧急修订更新时间`
      });
    }
  }

  private checkScreenPackage(issues: ChannelPackageIssue[]): void {
    this.draft.requiredLocales.forEach((localeId) => {
      const language = this.draft.languages.find((item) => item.id === localeId);
      if (!language) return;
      const titleLimit = this.screenTitleLimits[localeId] ?? this.screenDefaultTitleLimit;
      const titleLength = this.displayLength(language.title);
      if (language.title.trim() && titleLength > titleLimit) {
        issues.push({
          id: `pkg-screen-title-${localeId}`, localeId,
          text: `${language.name}标题 ${titleLength} 字，超出大屏标题上限 ${titleLimit} 字`
        });
      }
      if (language.body.trim()) {
        const count = this.splitSentences(language.body).length;
        if (count < this.screenSentenceMin || count > this.screenSentenceMax) {
          issues.push({
            id: `pkg-screen-sentences-${localeId}`, localeId,
            text: `${language.name}正文 ${count} 句，大屏建议控制在 ${this.screenSentenceMin}-${this.screenSentenceMax} 句以便滚动阅读`
          });
        }
      }
    });
  }

  private displayLength(text: string): number {
    return Array.from(text.trim()).length;
  }

  private hasHttpLink(text: string): boolean {
    return /https?:\/\/[^\s。！？.!?]+/i.test(text);
  }

  getRecord(version: VersionSnapshot | undefined, channel: string): ChannelSendRecord | undefined {
    return version?.sendRecords?.find((record) => record.channel === channel);
  }

  frozenIssues(channel: string): string[] {
    return this.lockedVersion?.channelPackages.find((item) => item.channel === channel)?.issues ?? [];
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

  isSentenceDiscussed(index: number): boolean {
    return this.activeDiscussions.some((discussion) => discussion.sentenceIndex === index && !discussion.resolved);
  }

  get nextVersion(): string {
    const base = this.draft.emergencyRevision ? this.draft.version.replace('-emergency', '') : this.draft.version;
    const numbers = base.match(/\d+/g)?.map(Number) ?? [1, 0, 0];
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
    if (this.blockingChecks.length) {
      this.toastr.warning(`仍有 ${this.blockingChecks.length} 项整篇阻断问题，不能锁定。`, '发布检查未通过');
      this.activeView = 'checks';
      return;
    }
    if (!this.draft.channels.length) {
      this.toastr.warning('请至少选择一个目标渠道。', '没有可发布渠道');
      this.activeView = 'checks';
      return;
    }
    const packages = this.channelPackages;
    const readyChannels = packages.filter((item) => item.ready);
    if (!readyChannels.length) {
      this.toastr.warning('每个渠道包都不合格，请先按渠道提示补齐内容。', '没有可发布渠道');
      this.activeView = 'checks';
      return;
    }
    const blockedChannels = packages.filter((item) => !item.ready).map((item) => item.channel);
    const snapshot: VersionSnapshot = {
      id: uid('version'),
      label: this.draft.emergencyRevision ? '紧急修订锁定版本' : '最终锁定版本',
      createdAt: new Date().toISOString(), version: this.nextVersion,
      title: this.draft.title, severity: this.draft.severity, scope: this.draft.scope, eventAt: this.draft.eventAt,
      effectiveAt: this.draft.effectiveAt, expiresAt: this.draft.expiresAt, channels: [...this.draft.channels],
      languages: clone(this.draft.languages),
      note: blockedChannels.length
        ? `发布检查通过；${blockedChannels.join('、')}渠道包不合格已冻结，其余渠道可发送。`
        : '发布检查通过并锁定。',
      emergency: this.draft.emergencyRevision,
      channelPackages: packages.map((item) => ({
        channel: item.channel, ready: item.ready, issues: item.issues.map((issue) => issue.text)
      })),
      sendRecords: readyChannels.map((item) => this.createPendingRecord(item.channel, this.nextVersion))
    };
    this.commit((draft) => {
      draft.versions.push(snapshot);
      draft.version = snapshot.version;
      draft.status = 'locked';
      draft.lockedAt = snapshot.createdAt;
      draft.basedOnVersionId = snapshot.id;
      draft.emergencyRevision = false;
    });
    this.compareBaseId = this.draft.versions.at(-2)?.id ?? '';
    this.compareTargetId = this.draft.versions.at(-1)?.id ?? '';
    if (blockedChannels.length) {
      this.toastr.warning(`版本 ${snapshot.version} 已锁定；${blockedChannels.join('、')}被挡下，其余渠道可发送。`, '部分渠道已冻结');
    } else {
      this.toastr.success(`版本 ${snapshot.version} 已锁定，全部渠道可发送。`, '最终版本已冻结');
    }
  }

  get sendingCount(): number {
    return this.lockedVersion?.sendRecords?.filter((record) => record.status === 'sending').length ?? 0;
  }

  sendChannel(channel: string): void {
    const version = this.lockedVersion;
    if (!version) return;
    const record = version.sendRecords?.find((item) => item.channel === channel);
    if (!record || record.status === 'sent' || record.status === 'sending') return;
    record.status = 'sending';
    record.attempts += 1;
    record.lastAttemptAt = new Date().toISOString();
    record.snapshotVersion = version.version;
    record.detail = `正在按 ${version.version} 锁定快照发送，草稿后续修改不会影响本次内容。`;
    this.persist();
    // 模拟渠道网关：约三分之二概率成功；失败后可基于同一锁定快照重试。
    window.setTimeout(() => {
      const current = this.lockedVersion?.sendRecords?.find((item) => item.channel === channel);
      if (!current || current.status !== 'sending') return;
      const success = Math.random() > 0.34;
      current.status = success ? 'sent' : 'failed';
      current.lastAttemptAt = new Date().toISOString();
      if (success) {
        current.sentAt = current.lastAttemptAt;
        current.detail = `渠道回执成功：内容取自 ${version.version} 锁定快照，第 ${current.attempts} 次发送。`;
        this.toastr.success(`${channel} 已发送（${version.version} 锁定快照）。`, '发送成功');
      } else {
        current.detail = `渠道网关超时/回执失败：仍可重试，重试继续使用 ${version.version} 锁定快照。`;
        this.toastr.danger(`${channel} 发送失败，可直接重试。`, '发送失败');
      }
      this.persist();
    }, 900);
  }

  sendStatusLabel(status: SendStatus): string {
    return status === 'sent' ? '已发送' : status === 'sending' ? '发送中' : status === 'failed' ? '发送失败' : '待发送';
  }

  jumpToLocale(localeId?: string): void {
    if (localeId && this.draft.languages.some((language) => language.id === localeId)) {
      this.selectedLanguageId = localeId;
    }
    this.activeView = 'compose';
  }

  startEmergencyRevision(): void {
    const base = this.lockedVersion;
    if (!base) return;
    const numbers = base.version.match(/\d+/g)?.map(Number) ?? [1, 0, 0];
    const emergencyVersion = `${numbers[0] || 1}.${(numbers[1] || 0) + 1}.0-emergency`;
    this.commit((draft) => {
      // 紧急修订必须从锁定版本发起：复制锁定快照内容，已锁定版本及其发送记录原样保留。
      draft.title = base.title;
      draft.severity = base.severity;
      draft.scope = base.scope;
      draft.eventAt = base.eventAt;
      draft.effectiveAt = base.effectiveAt;
      draft.expiresAt = base.expiresAt;
      draft.channels = [...base.channels];
      draft.requiredLocales = Array.from(new Set(base.languages.map((language) => language.id)));
      draft.languages = clone(base.languages);
      draft.status = 'draft';
      draft.emergencyRevision = true;
      draft.version = emergencyVersion;
      draft.basedOnVersionId = base.id;
      draft.lockedAt = undefined;
      draft.reviews = draft.reviews.map((review) => ({ ...review, status: 'pending', note: '' }));
    });
    this.activeView = 'compose';
    this.toastr.warning(`已基于 ${base.version} 锁定稿创建紧急修订；原版本与发送记录不会被覆盖。`, '进入紧急修订');
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

  undo(): void {
    const previous = this.history.pop();
    if (!previous) {
      this.toastr.info('没有可撤销的操作。', '撤销');
      return;
    }
    this.future.push(clone(this.draft));
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

  private createPendingRecord(channel: string, snapshotVersion: string): ChannelSendRecord {
    const recipients: Record<string, number> = {
      '短信': 96420, '广播': 63, '社区大屏': 214, '政务新媒体': 152000, '应急喇叭': 87, '网站': 1
    };
    return {
      id: uid('record'), channel, status: 'pending', attempts: 0,
      recipientCount: recipients[channel] ?? 0,
      detail: '等待发送；发送时使用本版本锁定快照。', snapshotVersion
    };
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
    value.channels ??= [];
    value.versions.forEach((version) => {
      version.channelPackages ??= version.channels.map((channel) => ({
        channel, ready: true, issues: [] as string[]
      }));
      version.sendRecords ??= [];
      // 刷新中断时“发送中”记录无法收到回执，落盘为失败以便重试（记录本身保留）。
      version.sendRecords.forEach((record) => {
        if (record.status === 'sending') {
          record.status = 'failed';
          record.detail = '上次发送中断未收到回执，可使用同一锁定快照重试。';
        }
      });
    });
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
