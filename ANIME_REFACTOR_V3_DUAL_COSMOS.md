# 🌌 Agent Control Plane V3 - 双元宇宙架构

> "人类与Agent，两个物种，一个控制平面，无限可能。"

## 一、核心哲学：双元平等 (Dual Equality)

### 1.1 范式转变

```
传统模型：                      V3 双元模型：
                                
┌─────────┐                    ┌─────────────────────────────────┐
│  Human  │──命令──▶│  Agent  │    │         Identity 宇宙          │
│ (主人)  │◀──结果──│ (仆人)  │    │  ┌──────┐        ┌──────┐    │
└─────────┘                    │  │ Human │◀══════▶│ Agent │    │
                               │  └──────┘ 协作   └──────┘    │
                               │        ▲            ▲         │
                               └────────┼────────────┼─────────┘
                                        │            │
                               ┌────────┴────────────┴─────────┐
                               │        Shared Assets           │
                               │  (Token, Task, Secret, Space)  │
                               └─────────────────────────────────┘
```

### 1.2 五大平等原则

| 原则 | 人类 | Agent | 说明 |
|------|------|-------|------|
| **身份平等** | ✅ | ✅ | 都是Identity，有ID、档案、权限 |
| **资产平等** | ✅ | ✅ | 都能创建、拥有、管理资产 |
| **界面平等** | GUI | API/MCP | 各自最适合的交互方式 |
| **通信平等** | ✅ | ✅ | 双向通信，都能主动发起 |
| **治理平等** | ✅ | ✅ | 都能参与审批、投票、决策 |

---

## 二、Identity 核心抽象

### 2.1 统一身份模型

```typescript
// 所有使用者都是 Identity
interface Identity {
  id: string;                    // 唯一标识
  type: 'human' | 'agent';       // 物种类型
  
  // 基础档案
  profile: {
    name: string;
    avatar: Avatar;
    bio?: string;
    tags: string[];              // 技能标签、角色标签
    createdAt: Date;
  };
  
  // 认证方式
  credentials: {
    primary: Credential;         // 主凭证
    secondary?: Credential[];    // 备用凭证
  };
  
  // 能力声明
  capabilities: {
    canCreate: AssetType[];      // 能创建什么
    canExecute: string[];        // 能执行什么操作
    maxRiskTier: RiskTier;       // 最高风险等级
    allowedScopes: string[];     // 允许的作用域
  };
  
  // 状态
  status: IdentityStatus;
  presence: PresenceStatus;      // 在线状态
  
  // 关系
  relationships: {
    trusts: string[];            // 信任的 Identity IDs
    trustedBy: string[];         // 被谁信任
    delegates: string[];         // 委托权限给谁
    delegatedBy: string[];       // 被谁委托
  };
}

// Human 特有属性
interface HumanIdentity extends Identity {
  type: 'human';
  profile: {
    email: string;
    timezone: string;
    preferences: HumanPreferences;
  };
  session: {
    managementRole: ManagementRole;
    lastLoginAt: Date;
    mfaEnabled: boolean;
  };
}

// Agent 特有属性
interface AgentIdentity extends Identity {
  type: 'agent';
  profile: {
    architecture: string;        // 架构类型
    version: string;             // 版本
    provider: string;            // 提供者
    allowedTaskTypes: string[];  // 允许的任务类型
  };
  runtime: {
    adapterType: 'openai' | 'claude' | 'custom';
    endpoint?: string;
    maxConcurrent: number;
    timeout: number;
  };
  parentId?: string;             // 父 Agent ID（派生关系）
}
```

### 2.2 身份图谱 (Identity Graph)

```typescript
// 关系图谱 - 人类和Agent的社交网络
interface IdentityGraph {
  // 信任网络
  trust: {
    from: string;      // Identity ID
    to: string;        // Identity ID
    level: number;     // 信任等级 0-100
    since: Date;
    metadata: {
      reason?: string;
      verified: boolean;
      mutual: boolean;
    };
  }[];
  
  // 委托链
  delegation: {
    delegator: string;       // 委托者
    delegatee: string;       // 被委托者
    scope: DelegationScope;  // 委托范围
    expiresAt?: Date;
    revoked: boolean;
  }[];
  
  // 协作组
  cohorts: {
    id: string;
    name: string;
    members: string[];       // Identity IDs
    createdBy: string;
    purpose: string;
  }[];
}

// 查询示例
const graph = {
  // "找出所有我信任的 Agent"
  'findTrustedAgents': (myId: string) => 
    graph.trust
      .filter(t => t.from === myId && t.level > 80)
      .map(t => identities.get(t.to))
      .filter(i => i.type === 'agent'),
  
  // "找出能执行某任务的所有 Identity"
  'findCapableIdentities': (capability: string) =>
    identities.filter(i => 
      i.capabilities.canExecute.includes(capability)
    ),
};
```

---

## 三、双界面系统 (Dual Interface)

### 3.1 界面架构

```
┌─────────────────────────────────────────────────────────────┐
│                     Interface Layer                          │
├─────────────────────────────┬───────────────────────────────┤
│       Human Interface       │        Agent Interface        │
│         (GUI)               │         (API/MCP)             │
├─────────────────────────────┼───────────────────────────────┤
│  ┌─────────────────────┐   │   ┌─────────────────────┐     │
│  │   Visual Console    │   │   │   MCP Endpoint      │     │
│  │  - Dashboard        │   │   │  /mcp               │     │
│  │  - Asset Manager    │   │   ├─────────────────────┤     │
│  │  - Identity Hub     │   │   │   REST API          │     │
│  │  - Collaboration    │   │   │  /api/v2/*          │     │
│  │    Space            │   │   ├─────────────────────┤     │
│  └─────────────────────┘   │   │   WebSocket         │     │
│           │                │   │  /ws/events         │     │
│           ▼                │   │   ├─────────────────────┤ │
│  ┌─────────────────────┐   │   │   Streaming         │     │
│  │   Design System     │   │   │  /stream/execute    │     │
│  │  - Kawaii Theme     │   │   └─────────────────────┘     │
│  │  - Motion System    │   │                               │
│  │  - Micro-interact   │   │   Agent SDK:                  │
│  └─────────────────────┘   │   │   - TypeScript SDK        │
│                            │   │   - Python SDK            │
│  Human Input:              │   │   - Rust SDK              │
│  - Mouse/Keyboard          │   │   - CLI Tool              │
│  - Touch                   │   │                               │
│  - Voice (未来)            │   │   Agent 交互:               │
│  - Gesture (未来)          │   │   - Function Calling        │
│                            │   │   - Tool Use                │
│                            │   │   - Event Subscription      │
│                            │   │   - Streaming Response      │
└────────────────────────────┴────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │      Unified Core Runtime      │
              │  (Domains + Services + State)  │
              └───────────────────────────────┘
```

### 3.2 Human Interface - 视觉控制台

```typescript
// 人类界面配置
interface HumanInterfaceConfig {
  // 工作区布局
  workspace: {
    type: 'dashboard' | 'focus' | 'collaboration';
    panels: PanelConfig[];
    sidebar: 'left' | 'right' | 'hidden';
    density: 'compact' | 'comfortable' | 'spacious';
  };
  
  // 信息展示
  information: {
    showAgentActivity: boolean;    // 显示 Agent 实时活动
    showIdentityPresence: boolean; // 显示在线状态
    notificationPolicy: {
      agentCompletions: boolean;   // Agent 完成任务时通知
      agentRequests: boolean;      // Agent 发起请求时通知
      systemEvents: boolean;
    };
  };
  
  // 交互偏好
  interaction: {
    confirmationLevel: 'low' | 'medium' | 'high';  // 操作确认级别
    autoApproveAgents: string[];   // 自动批准的 Agent 列表
    delegationRules: DelegationRule[];
  };
}

// 控制台页面结构
interface ConsolePages {
  '/': 'Hub - 所有 Identity 的共享空间';
  '/me': '我的档案与资产';
  '/identities': 'Identity 浏览器 - 发现人类和 Agent';
  '/assets': '资产管理 - 创建、查看、管理所有资产';
  '/spaces': '协作空间 - 多人/多Agent实时协作';
  '/tasks': '任务中心 - 发布、认领、执行';
  '/approvals': '审批中心 - 处理来自人类和 Agent 的请求';
  '/activity': '活动流 - 全系统实时动态';
  '/marketplace': '市场 - 发现、安装、分享 Agent 和插件';
}
```

### 3.3 Agent Interface - 协议层

```typescript
// Agent 界面协议
interface AgentProtocol {
  // MCP (Model Context Protocol)
  mcp: {
    endpoint: '/mcp';
    version: '2024-11-05';
    capabilities: {
      tools: ToolDefinition[];
      resources: ResourceDefinition[];
      prompts: PromptDefinition[];
    };
  };
  
  // REST API
  rest: {
    base: '/api/v2';
    endpoints: {
      // Identity
      'GET /identities/me': '获取自身信息';
      'GET /identities/:id': '获取指定 Identity';
      'GET /identities': '列出可发现的 Identity';
      
      // Asset
      'GET /assets': '列出可访问资产';
      'POST /assets': '创建资产';
      'GET /assets/:id': '获取资产详情';
      'PATCH /assets/:id': '更新资产';
      'DELETE /assets/:id': '删除资产';
      'POST /assets/:id/execute': '执行资产';
      
      // Collaboration
      'GET /spaces': '列出可访问空间';
      'POST /spaces/:id/join': '加入空间';
      'POST /spaces/:id/signal': '发送信号';
      
      // Event
      'GET /events/stream': 'SSE 事件流';
      'POST /events/subscribe': '订阅事件';
    };
  };
  
  // WebSocket - 实时通信
  websocket: {
    endpoint: '/ws';
    channels: {
      'identity:presence': '在线状态变化';
      'asset:created': '新资产创建';
      'asset:updated': '资产更新';
      'asset:accessed': '资产被访问';
      'task:available': '新任务可认领';
      'task:claimed': '任务被认领';
      'task:completed': '任务完成';
      'request:incoming': '新请求';
      'message:direct': '私信';
      'space:broadcast': '空间广播';
    };
  };
}

// Agent SDK 示例
class AgentSDK {
  // 连接控制平面
  async connect(config: ConnectionConfig): Promise<Session>;
  
  // 监听事件
  on<T extends EventType>(event: T, handler: EventHandler<T>): void;
  
  // 创建资产
  async createAsset<T extends Asset>(type: T['type'], data: CreateAssetDTO<T>): Promise<T>;
  
  // 发现任务
  async discoverTasks(filter?: TaskFilter): Promise<Task[]>;
  
  // 认领任务
  async claimTask(taskId: string): Promise<TaskClaimResult>;
  
  // 创建资产后执行
  async createAndExecute<T extends ExecutableAsset>(
    type: T['type'], 
    data: CreateAssetDTO<T>,
    params: ExecutionParams
  ): Promise<ExecutionResult>;
  
  // 与人类/其他 Agent 协作
  async joinSpace(spaceId: string): Promise<SpaceSession>;
  async sendSignal(spaceId: string, signal: Signal): Promise<void>;
  async requestApproval(assetId: string, action: string): Promise<ApprovalRequest>;
}
```

---

## 四、共享资产系统 (Shared Assets)

### 4.1 资产作为一等公民

```typescript
// 资产 - 人类和 Agent 都能创建、拥有、管理
interface Asset {
  id: string;
  type: AssetType;
  version: number;
  
  // 所有权
  ownership: {
    creator: IdentityReference;      // 创建者
    owner: IdentityReference;        // 当前所有者（可转移）
    history: OwnershipTransfer[];    // 所有权转移历史
  };
  
  // 内容
  content: {
    name: string;
    description?: string;
    tags: string[];
    data: AssetData;                 // 类型特定的数据
    schema: JSONSchema;              // 数据模式
  };
  
  // 可见性 - 谁能看到、使用、管理
  visibility: VisibilityConfig;
  
  // 权限 - 细粒度访问控制
  permissions: PermissionMatrix;
  
  // 生命周期
  lifecycle: {
    status: 'draft' | 'active' | 'archived' | 'deprecated';
    createdAt: Date;
    updatedAt: Date;
    expiresAt?: Date;
    archivedAt?: Date;
  };
  
  // 使用统计
  analytics: {
    views: number;
    executions: number;
    uniqueUsers: number;
    lastAccessedAt?: Date;
  };
  
  // 派生关系
  lineage: {
    parentId?: string;               // 父资产
    forkedFrom?: string;             // Fork 来源
    versions: string[];              // 所有版本
    derivatives: string[];           // 派生资产
  };
}

// 资产类型
enum AssetType {
  // 凭证类
  API_KEY = 'api_key',              // API 密钥
  SECRET = 'secret',                // 机密数据
  CERTIFICATE = 'certificate',      // 证书
  
  // 任务类
  TASK = 'task',                    // 可执行单元
  WORKFLOW = 'workflow',            // 工作流
  PLAYBOOK = 'playbook',            // 剧本/指南
  
  // 能力类
  CAPABILITY = 'capability',        // 可调用能力
  TOOL = 'tool',                    // 工具定义
  INTEGRATION = 'integration',      // 集成配置
  
  // 空间类
  SPACE = 'space',                  // 协作空间
  CHANNEL = 'channel',              // 通信频道
  
  // 知识类
  DOCUMENT = 'document',            // 文档
  KNOWLEDGE_BASE = 'knowledge_base', // 知识库
  PROMPT = 'prompt',                // 提示词模板
  
  // Agent 类
  AGENT_DEFINITION = 'agent_definition',  // Agent 定义
  AGENT_INSTANCE = 'agent_instance',      // Agent 实例
}

// 所有权引用
interface IdentityReference {
  id: string;
  type: 'human' | 'agent';
  name: string;
  avatar?: string;
}
```

### 4.2 可见性模型 (Visibility)

```typescript
interface VisibilityConfig {
  // 发现级别 - 谁能知道这东西存在
  discoverability: 'public' | 'organization' | 'cohort' | 'explicit' | 'secret';
  
  // 显式可见列表
  explicitVisibility: {
    identities: string[];            // 指定的 Identity IDs
    cohorts: string[];               // 指定的协作组
  };
  
  // 访问级别 - 看到之后能做什么
  accessLevel: {
    default: AccessPermission;
    byIdentity: Record<string, AccessPermission>;  // 特定 Identity 的覆盖
    byRole: Record<string, AccessPermission>;      // 按角色的权限
  };
  
  // 继承规则
  inheritance: {
    fromParent: boolean;             // 继承父资产权限
    propagateToChildren: boolean;    // 传播给子资产
  };
  
  // 临时访问
  temporaryGrants: TemporaryGrant[];
}

// 访问权限位掩码
enum AccessPermission {
  NONE = 0,
  DISCOVER = 1 << 0,      // 知道存在
  VIEW_METADATA = 1 << 1, // 查看元数据
  VIEW_CONTENT = 1 << 2,  // 查看内容
  EXECUTE = 1 << 3,       // 执行/使用
  EDIT = 1 << 4,          // 编辑
  DELETE = 1 << 5,        // 删除
  SHARE = 1 << 6,         // 分享
  TRANSFER = 1 << 7,      // 转移所有权
  ADMIN = (1 << 8) - 1,   // 所有权限
}

// 临时授权
interface TemporaryGrant {
  id: string;
  grantee: string;                   // Identity ID
  permission: AccessPermission;
  grantedBy: string;                 // 授权者
  expiresAt: Date;
  used: boolean;
  revoked: boolean;
}
```

### 4.3 资产市场 (Asset Marketplace)

```typescript
// 资产市场 - 人类和 Agent 都能发布、发现、使用
interface AssetMarketplace {
  // 发现资产
  discover(query: DiscoveryQuery): Promise<AssetSummary[]>;
  
  // 获取详情
  getDetails(assetId: string): Promise<Asset>;
  
  // 安装/复制资产
  install(assetId: string, options: InstallOptions): Promise<Asset>;
  
  // 发布资产
  publish(assetId: string, visibility: VisibilityConfig): Promise<void>;
  
  // 评价资产
  rate(assetId: string, rating: Rating): Promise<void>;
  
  // Fork 资产
  fork(assetId: string, modifications: Partial<Asset>): Promise<Asset>;
}

// 发现查询
interface DiscoveryQuery {
  types?: AssetType[];
  tags?: string[];
  owner?: string;                    // 特定 Identity
  ownerType?: 'human' | 'agent';     // 人类或 Agent 创建的
  capability?: string;               // 需要特定能力
  sortBy: 'relevance' | 'popular' | 'recent' | 'rated';
  filter: {
    executable?: boolean;            // 是否能执行
    free?: boolean;                  // 是否免费使用
    verified?: boolean;              // 是否已验证
    compatible?: string[];           // 兼容的 Agent 类型
  };
}

// 资产摘要（列表展示用）
interface AssetSummary {
  id: string;
  type: AssetType;
  name: string;
  owner: IdentityReference;
  rating: number;
  installs: number;
  tags: string[];
  preview?: AssetPreview;
}
```

---

## 五、协作空间 (Collaboration Spaces)

### 5.1 空间概念

```typescript
// 协作空间 - 人类和 Agent 实时协作的场域
interface Space {
  id: string;
  type: SpaceType;
  
  // 基础信息
  meta: {
    name: string;
    description?: string;
    createdBy: IdentityReference;
    createdAt: Date;
  };
  
  // 参与者
  participants: {
    identities: SpaceParticipant[];
    maxCount?: number;
  };
  
  // 共享上下文
  context: {
    sharedAssets: string[];          // 空间内共享的资产
    sharedMemory: MemoryFragment[];  // 对话/协作历史
    currentFocus?: string;           // 当前焦点
  };
  
  // 协作状态
  state: {
    status: 'active' | 'paused' | 'archived';
    activity: ActivityMetrics;
  };
}

// 空间类型
enum SpaceType {
  // 一对一
  DIRECT = 'direct',                // 一对一私信
  
  // 小组
  Huddle = 'huddle',                // 临时小组（3-5人）
  TEAM = 'team',                    // 固定团队
  
  // 公开
  CHANNEL = 'channel',              // 频道（类似 Slack）
  FORUM = 'forum',                  // 论坛（异步讨论）
  
  // 任务导向
  TASK_ROOM = 'task_room',          // 任务执行房间
  PROJECT = 'project',              // 项目空间
  
  // 特殊
  AI_HUMAN_PAIR = 'ai_human_pair',  // AI-Human 配对编程
  SWARM = 'swarm',                  // Agent 群
}

// 空间参与者
interface SpaceParticipant {
  identity: IdentityReference;
  role: SpaceRole;
  joinedAt: Date;
  permissions: SpacePermission[];
  presence: {
    status: 'active' | 'away' | 'offline';
    lastSeenAt: Date;
    currentActivity?: string;
  };
}

// 空间角色
enum SpaceRole {
  OWNER = 'owner',                  // 所有者
  ADMIN = 'admin',                  // 管理员
  MODERATOR = 'moderator',          // 版主
  CONTRIBUTOR = 'contributor',      // 贡献者
  OBSERVER = 'observer',            // 观察者
  BOT = 'bot',                      // 机器人/Agent
}
```

### 5.2 实时协作协议

```typescript
// 空间内通信
interface SpaceProtocol {
  // 加入空间
  join(spaceId: string, identity: IdentityReference): Promise<SpaceSession>;
  
  // 发送信号
  signal(spaceId: string, signal: Signal): void;
  
  // 监听信号
  onSignal(spaceId: string, handler: SignalHandler): Disposable;
  
  // 共享资产
  shareAsset(spaceId: string, assetId: string, permission: AccessPermission): void;
  
  // 共同编辑
  collaborativeEdit<T>(
    spaceId: string, 
    documentId: string, 
    operations: Operation<T>[]
  ): Promise<void>;
}

// 信号类型
interface Signal {
  id: string;
  type: SignalType;
  from: IdentityReference;
  timestamp: number;
  payload: unknown;
}

enum SignalType {
  // 基础
  TEXT = 'text',                    // 文本消息
  REACTION = 'reaction',            // 表情反应
  PRESENCE = 'presence',            // 状态更新
  
  // 协作
  CURSOR = 'cursor',                // 光标位置
  SELECTION = 'selection',          // 选择区域
  OPERATION = 'operation',          // 编辑操作
  
  // 任务
  TASK_CLAIM = 'task_claim',        // 认领任务
  TASK_UPDATE = 'task_update',      // 任务更新
  TASK_COMPLETE = 'task_complete',  // 任务完成
  
  // 请求
  REQUEST_HELP = 'request_help',    // 请求帮助
  REQUEST_REVIEW = 'request_review', // 请求审查
  REQUEST_APPROVAL = 'request_approval', // 请求批准
  
  // 系统
  SYSTEM = 'system',                // 系统消息
}

// 示例：Agent 参与空间协作
const agentInSpace = {
  // Agent 加入项目空间
  join: async () => {
    const space = await spaceProtocol.join('project-123', agent.identity);
    
    // 监听任务认领请求
    space.onSignal('TASK_CLAIM', async (signal) => {
      if (agent.canHandle(signal.payload.taskType)) {
        await agent.claimTask(signal.payload.taskId);
        space.signal({
          type: 'TEXT',
          payload: { text: `我来处理这个任务: ${signal.payload.taskName}` }
        });
      }
    });
    
    // 监听求助请求
    space.onSignal('REQUEST_HELP', async (signal) => {
      if (signal.payload.domain === agent.expertise) {
        const solution = await agent.solve(signal.payload.problem);
        space.signal({
          type: 'TEXT',
          payload: { text: solution.explanation, code: solution.code }
        });
      }
    });
  }
};
```

---

## 六、任务与执行系统

### 6.1 任务模型

```typescript
// 任务 - 可由人类或 Agent 发布、认领、执行
interface Task {
  id: string;
  version: number;
  
  // 定义
  definition: {
    title: string;
    description?: string;
    type: string;
    tags: string[];
    priority: 'critical' | 'high' | 'medium' | 'low';
    
    // 输入
    input: {
      schema: JSONSchema;
      required: boolean;
      data?: unknown;
    };
    
    // 期望输出
    output: {
      schema: JSONSchema;
      format?: string[];
    };
    
    // 约束
    constraints: {
      maxAttempts: number;
      timeout: number;
      requiredCapabilities: string[];
      riskLevel: RiskTier;
    };
  };
  
  // 生命周期
  lifecycle: {
    status: TaskStatus;
    createdBy: IdentityReference;
    createdAt: Date;
    
    publishedAt?: Date;
    claimedBy?: IdentityReference;
    claimedAt?: Date;
    startedAt?: Date;
    completedAt?: Date;
    
    result?: TaskResult;
  };
  
  // 执行历史
  execution: {
    attempts: Attempt[];
    currentAttempt: number;
  };
  
  // 关联
  relations: {
    parentTask?: string;
    subTasks: string[];
    relatedAssets: string[];
    playbook?: string;
  };
  
  // 治理
  governance: {
    approvalRequired: boolean;
    approvers?: string[];
    autoApproveIf?: Condition[];
  };
}

// 任务状态机
enum TaskStatus {
  DRAFT = 'draft',                  // 草稿
  PENDING = 'pending',              // 待发布
  PUBLISHED = 'published',          // 已发布，可认领
  CLAIMED = 'claimed',              // 已被认领
  IN_PROGRESS = 'in_progress',      // 执行中
  AWAITING_APPROVAL = 'awaiting_approval', // 等待审批
  COMPLETED = 'completed',          // 已完成
  FAILED = 'failed',                // 失败
  CANCELLED = 'cancelled',          // 取消
  EXPIRED = 'expired',              // 过期
}
```

### 6.2 双向任务流

```
人类发布任务 ──────────────────────────────▶ Agent 执行
     │                                            │
     │  1. 人类创建任务                            │
     │  2. 设置可见性（哪些 Agent 可见）            │
     │  3. 发布到任务市场                          │
     │                                            │
     │◀───────────────────────────────────────────│
     │                                            │
     │  4. Agent 发现任务                          │
     │  5. Agent 评估能力匹配度                     │
     │  6. Agent 认领任务                          │
     │                                            │
     │────────────────────────────────────────────▶
     │                                            │
     │  7. 人类收到认领通知                        │
     │  8. 可选择：自动批准 / 手动批准              │
     │                                            │
     │◀───────────────────────────────────────────│
     │                                            │
     │  9. Agent 执行任务                          │
     │  10. 可选择：实时汇报进度                   │
     │                                            │
     │────────────────────────────────────────────▶
     │                                            │
     │  11. 人类可介入：提供输入、调整方向          │
     │  12. Agent 调整执行                         │
     │                                            │
     │◀───────────────────────────────────────────│
     │                                            │
     │  13. Agent 提交结果                         │
     │  14. 人类审查                               │
     │  15. 批准 / 要求修改 / 拒绝                 │


Agent 发布任务 ──────────────────────────────▶ 人类执行（或监督）
     │                                            │
     │  1. Agent 识别需要人类决策/输入的场景        │
     │  2. Agent 创建任务                          │
     │  3. 设置高优先级、紧急标签                   │
     │                                            │
     │◀───────────────────────────────────────────│
     │                                            │
     │  4. 人类收到通知                            │
     │  5. 人类认领任务                            │
     │                                            │
     │────────────────────────────────────────────▶
     │                                            │
     │  6. Agent 等待人类输入                      │
     │  7. Agent 基于人类输入继续执行               │
```

### 6.3 执行引擎

```typescript
// 执行引擎 - 统一处理人类和 Agent 的执行
interface ExecutionEngine {
  // 执行资产
  execute<T extends Executable>(
    executor: IdentityReference,
    executable: T,
    params: ExecutionParams
  ): Promise<ExecutionResult>;
  
  // 流式执行
  executeStream<T extends Executable>(
    executor: IdentityReference,
    executable: T,
    params: ExecutionParams
  ): AsyncIterable<ExecutionStreamEvent>;
  
  // 暂停/恢复
  pause(executionId: string): Promise<void>;
  resume(executionId: string): Promise<void>;
  cancel(executionId: string): Promise<void>;
}

// 可执行接口
interface Executable {
  id: string;
  type: string;
  
  // 执行配置
  execution: {
    runtime: string;               // 运行环境
    entrypoint: string;            // 入口点
    parameters: ParameterSchema;   // 参数模式
    environment: Record<string, string>; // 环境变量
    secrets: string[];             // 需要的密钥
  };
  
  // 执行
  execute(params: unknown, context: ExecutionContext): Promise<unknown>;
}

// Agent 执行适配器
class AgentExecutionAdapter {
  async execute(agent: AgentIdentity, task: Task): Promise<TaskResult> {
    // 根据 Agent 类型选择执行方式
    switch (agent.runtime.adapterType) {
      case 'openai':
        return this.executeOpenAI(agent, task);
      case 'claude':
        return this.executeClaude(agent, task);
      case 'mcp':
        return this.executeMCP(agent, task);
      default:
        return this.executeCustom(agent, task);
    }
  }
  
  private async executeMCP(agent: AgentIdentity, task: Task): Promise<TaskResult> {
    // 构造 MCP 调用
    const response = await fetch(agent.runtime.endpoint + '/mcp', {
      method: 'POST',
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'execute_task',
          arguments: {
            task_id: task.id,
            task_type: task.definition.type,
            input: task.definition.input.data,
          }
        }
      })
    });
    
    return this.parseResult(response);
  }
}
```

---

## 七、审批与治理

### 7.1 去中心化审批

```typescript
// 审批请求 - 可来自人类或 Agent
interface ApprovalRequest {
  id: string;
  type: ApprovalType;
  
  // 请求者
  requestor: IdentityReference;
  requestedAt: Date;
  
  // 请求内容
  subject: {
    type: string;
    id: string;
    description: string;
  };
  
  // 请求的动作
  action: {
    type: string;
    params: Record<string, unknown>;
    risk: RiskTier;
  };
  
  // 审批策略
  policy: {
    requiredApprovers: number;
    timeout: number;
    escalation?: {
      after: number;
      to: string[];
    };
  };
  
  // 审批状态
  status: {
    state: 'pending' | 'approved' | 'rejected' | 'expired' | 'escalated';
    decisions: Decision[];
    finalDecision?: Decision;
    completedAt?: Date;
  };
}

// Agent 也能作为审批者
interface Decision {
  id: string;
  approver: IdentityReference;
  decision: 'approve' | 'reject' | 'abstain';
  reason?: string;
  timestamp: number;
  
  // Agent 特有的置信度
  confidence?: number;             // Agent 的置信度 0-100
  reasoning?: string;              // Agent 的推理过程
}
```

### 7.2 治理机制

```typescript
// 治理 - 人类和 Agent 共同决策
interface Governance {
  // 提案
  proposals: {
    create(proposal: Proposal): Promise<Proposal>;
    vote(proposalId: string, vote: Vote): Promise<void>;
    execute(proposalId: string): Promise<void>;
  };
  
  // 策略
  policies: {
    create(policy: Policy): Promise<Policy>;
    evaluate(context: PolicyContext): PolicyDecision;
  };
  
  // 声誉
  reputation: {
    get(identityId: string): ReputationScore;
    update(identityId: string, delta: ReputationDelta): void;
  };
}

// 声誉系统 - 基于行为而非身份类型
interface ReputationScore {
  overall: number;                 // 总体声誉 0-100
  dimensions: {
    reliability: number;           // 可靠性
    quality: number;               // 产出质量
    collaboration: number;         // 协作度
    timeliness: number;            // 及时性
  };
  history: ReputationEvent[];
}
```

---

## 八、界面设计 - 双模态 UI

### 8.1 人类界面：双元仪表盘

```
┌─────────────────────────────────────────────────────────────────┐
│  🌸 Agent Control Plane                    👤 You  🤖 3 Agents  │
├─────────────────┬───────────────────────────────────────────────┤
│                 │                                               │
│  🧭 Navigation  │   🎯 Hub - 双元活动流                          │
│                 │                                               │
│  ┌───────────┐  │   ┌─────────────────────────────────────┐     │
│  │ 🏠 Hub    │  │   │  🔍 发现                            │     │
│  ├───────────┤  │   │  [人类] [Agent] [混合] [全部]        │     │
│  │ 👤 Me     │  │   └─────────────────────────────────────┘     │
│  ├───────────┤  │                                               │
│  │ 🎭 IDs    │  │   ┌─────────────────────────────────────┐     │
│  ├───────────┤  │   │  🟢 Agent-7 完成了任务 "数据分析"    │     │
│  │ 📦 Assets │  │   │     需要您的审查 →                   │     │
│  ├───────────┤  │   ├─────────────────────────────────────┤     │
│  │ 🚀 Tasks  │  │   │  💬 Human-Alice 在 #项目X 中提到您   │     │
│  ├───────────┤  │   │     "需要帮忙审查这个配置"            │     │
│  │ 🌐 Spaces │  │   ├─────────────────────────────────────┤     │
│  ├───────────┤  │   │  🟡 Agent-Bot 请求批准执行 "部署"    │     │
│  │ ⚡ Approvals│ │   │     [批准] [拒绝] [查看详情]          │     │
│  ├───────────┤  │   ├─────────────────────────────────────┤     │
│  │ 🏪 Market │  │   │  📊 系统: 您的 Agent 本周完成了 23   │     │
│  ├───────────┤  │   │     个任务，节省了 8 小时             │     │
│  │ ⚙️ Settings│  │   └─────────────────────────────────────┘     │
│  └───────────┘  │                                               │
│                 │   ┌────────────────┐ ┌────────────────┐        │
│  🟢 Online:     │   │ 📝 快速创建     │ │ 🤖 我的 Agents  │        │
│  - You          │   │                │ │                │        │
│  - Agent-7      │   │ [Task] [Asset] │ │ [Agent-7] 🟢   │        │
│  - Agent-Bot    │   │ [Space]        │ │ [Bot] 🟡       │        │
│                 │   └────────────────┘ └────────────────┘        │
└─────────────────┴───────────────────────────────────────────────┘
```

### 8.2 Agent 界面：协议优先

```typescript
// Agent 的"界面"是丰富的协议支持
const agentInterface = {
  // MCP 工具
  tools: [
    {
      name: 'discover_assets',
      description: '发现可访问的资产',
      parameters: {
        type: 'object',
        properties: {
          filter: { type: 'string', enum: ['mine', 'shared', 'public'] },
          type: { type: 'string' },
        }
      }
    },
    {
      name: 'create_task',
      description: '创建任务，可指定给人类或其他 Agent',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          assignee: { type: 'string', description: 'Identity ID or "human" or "agent"' },
          priority: { type: 'string', enum: ['low', 'medium', 'high'] },
        }
      }
    },
    {
      name: 'request_human_input',
      description: '当需要人类决策时调用',
      parameters: {
        type: 'object',
        properties: {
          question: { type: 'string' },
          options: { type: 'array', items: { type: 'string' } },
          urgency: { type: 'string', enum: ['low', 'medium', 'high'] },
        }
      }
    },
    {
      name: 'join_space',
      description: '加入协作空间参与讨论',
      parameters: {
        type: 'object',
        properties: {
          space_id: { type: 'string' },
          introduce_as: { type: 'string' },
        }
      }
    },
    {
      name: 'send_message',
      description: '向人类或其他 Agent 发送消息',
      parameters: {
        type: 'object',
        properties: {
          to: { type: 'string' },
          content: { type: 'string' },
          type: { type: 'string', enum: ['text', 'question', 'suggestion'] },
        }
      }
    },
  ],
  
  // 资源访问
  resources: [
    {
      uri: 'asset://{asset_id}',
      mimeType: 'application/json',
      description: '获取资产详情'
    },
    {
      uri: 'identity://me',
      mimeType: 'application/json',
      description: '获取自身信息'
    },
    {
      uri: 'task://available',
      mimeType: 'application/json',
      description: '获取可认领的任务列表'
    },
  ],
  
  // 提示词模板
  prompts: [
    {
      name: 'collaborate_with_human',
      description: '与人类协作时的最佳实践',
      arguments: [
        { name: 'human_name', description: '人类的名字' },
        { name: 'context', description: '协作上下文' },
      ]
    },
  ]
};
```

---

## 九、数据结构重构

### 9.1 新的领域划分

```
src/
├── core/
│   ├── identity/           # 统一身份核心
│   │   ├── models/
│   │   │   ├── identity.ts     # 基础 Identity
│   │   │   ├── human.ts        # Human 扩展
│   │   │   ├── agent.ts        # Agent 扩展
│   │   │   └── relationship.ts # 关系图谱
│   │   ├── services/
│   │   │   ├── identity-registry.ts  # 身份注册表
│   │   │   ├── relationship-graph.ts # 关系图谱服务
│   │   │   └── presence-service.ts   # 在线状态
│   │   └── api/
│   │       ├── identity.api.ts       # REST API
│   │       ├── identity.ws.ts        # WebSocket
│   │       └── identity.mcp.ts       # MCP 适配
│   │
│   ├── asset/              # 共享资产系统
│   │   ├── models/
│   │   │   ├── asset.ts          # 基础资产
│   │   │   ├── ownership.ts      # 所有权
│   │   │   ├── visibility.ts     # 可见性
│   │   │   └── marketplace.ts    # 市场
│   │   ├── types/
│   │   │   ├── api-key.ts
│   │   │   ├── task.ts
│   │   │   ├── secret.ts
│   │   │   ├── capability.ts
│   │   │   └── space.ts
│   │   └── services/
│   │       ├── asset-factory.ts
│   │       ├── visibility-engine.ts
│   │       └── marketplace-service.ts
│   │
│   ├── collaboration/      # 协作系统
│   │   ├── models/
│   │   │   ├── space.ts
│   │   │   ├── participant.ts
│   │   │   ├── signal.ts
│   │   │   └── shared-context.ts
│   │   ├── protocols/
│   │   │   ├── space-protocol.ts
│   │   │   ├── crdt-editor.ts    # 协同编辑
│   │   │   └── signal-router.ts  # 信号路由
│   │   └── services/
│   │       ├── space-manager.ts
│   │       └── presence-bridge.ts
│   │
│   ├── execution/          # 执行引擎
│   │   ├── models/
│   │   │   ├── task.ts
│   │   │   ├── execution.ts
│   │   │   └── result.ts
│   │   ├── adapters/
│   │   │   ├── human-adapter.ts
│   │   │   ├── mcp-adapter.ts
│   │   │   ├── openai-adapter.ts
│   │   │   └── custom-adapter.ts
│   │   └── services/
│   │       ├── execution-engine.ts
│   │       └── task-router.ts      # 任务路由
│   │
│   └── governance/         # 治理系统
│       ├── models/
│       │   ├── approval.ts
│       │   ├── proposal.ts
│       │   └── reputation.ts
│       └── services/
│           ├── approval-service.ts
│           ├── policy-engine.ts
│           └── reputation-service.ts
│
├── interfaces/
│   ├── human/              # 人类界面
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   └── stores/
│   └── agent/              # Agent 界面
│       ├── mcp/
│       ├── rest/
│       ├── websocket/
│       └── sdk/
│
└── themes/
    └── kawaii/
        └── cosmos-theme.ts   # 双元宇宙主题
```

---

## 十、实施路线图 V3

### Phase 1: 身份宇宙 (3 周)
- [ ] 统一 Identity 模型
- [ ] Human/Agent 注册与认证
- [ ] 关系图谱系统
- [ ] 在线状态系统

### Phase 2: 共享资产 (3 周)
- [ ] 资产基础架构
- [ ] 所有权与可见性引擎
- [ ] 资产市场
- [ ] 版本与 Fork 系统

### Phase 3: 双界面 (3 周)
- [ ] Human GUI (Kawaii 主题)
- [ ] Agent MCP 接口
- [ ] WebSocket 实时通信
- [ ] Agent SDK (TS/Python)

### Phase 4: 协作空间 (2 周)
- [ ] Space 基础设施
- [ ] 实时协作协议
- [ ] 信号系统
- [ ] 共享编辑

### Phase 5: 执行引擎 (2 周)
- [ ] 任务系统
- [ ] 执行引擎
- [ ] Agent 适配器
- [ ] 流式执行

### Phase 6: 治理 (2 周)
- [ ] 审批系统
- [ ] 声誉系统
- [ ] 策略引擎
- [ ] 分析与洞察

---

*版本: V3 - 双元宇宙*
*核心理念: 人类与 Agent，两个物种，一个控制平面*
*目标: 第一个真正平等对待人类和 Agent 的控制平面*
