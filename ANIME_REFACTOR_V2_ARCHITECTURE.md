# 🚀 Agent Control Plane - 高扩展性二次元前端架构 V2

## 一、架构哲学

### 1.1 核心原则

| 原则 | 说明 |
|------|------|
| **插件即一切** | 所有功能都是插件，核心仅提供运行时 |
| **契约驱动** | 接口先于实现，强类型约束 |
| **无中心依赖** | 消除循环依赖，单向数据流 |
| **运行时组装** | 启动时动态注册，非编译时绑定 |
| **领域隔离** | 按业务域划分模块，禁止跨域调用 |

### 1.2 架构对比

```
传统架构：                    V2 架构：
┌─────────────┐              ┌─────────────────────────────────────┐
│   页面 A    │              │           Core Runtime              │
├─────────────┤              │  (Plugin Registry + Event Bus)      │
│   页面 B    │              └─────────────────────────────────────┘
├─────────────┤                            │
│   页面 C    │              ┌─────────────┼─────────────┐
└─────────────┘              ▼             ▼             ▼
                           ┌─────┐    ┌─────┐     ┌──────────┐
                           │Auth │    │Token│ ... │Extension │
                           │插件 │    │插件 │     │  插件     │
                           └─────┘    └─────┘     └──────────┘
                               │          │              │
                           ┌───┴──┐  ┌───┴──┐      ┌────┴────┐
                           │UI组件│  │UI组件│      │ UI组件   │
                           └──────┘  └──────┘      └─────────┘
```

---

## 二、核心运行时 (Core Runtime)

### 2.1 运行时架构

```typescript
// 核心运行时 - 零业务逻辑
interface CoreRuntime {
  // 插件系统
  plugin: PluginSystem;
  
  // 事件总线
  event: EventBus;
  
  // 状态容器
  state: StateContainer;
  
  // 路由管理
  router: RouterManager;
  
  // 依赖注入
  di: DIContainer;
  
  // 配置中心
  config: ConfigStore;
  
  // 主题引擎
  theme: ThemeEngine;
  
  // 国际化
  i18n: I18nEngine;
}
```

### 2.2 插件系统

```typescript
// 插件生命周期
interface Plugin {
  readonly id: string;
  readonly version: string;
  readonly dependencies?: string[];
  
  // 生命周期钩子
  install(runtime: CoreRuntime): void | Promise<void>;
  activate(): void | Promise<void>;
  deactivate(): void | Promise<void>;
  uninstall(): void | Promise<void>;
}

// 插件扩展点
interface ExtensionPoint<T = unknown> {
  readonly id: string;
  register(contribution: T): Disposable;
  getContributions(): T[];
}

// 扩展点定义
const ExtensionPoints = {
  // 路由扩展
  ROUTES: createExtensionPoint<RouteConfig>('core.routes'),
  
  // 菜单扩展
  MENUS: createExtensionPoint<MenuItem>('core.menus'),
  
  // 组件扩展
  COMPONENTS: createExtensionPoint<ComponentRegistration>('core.components'),
  
  // 权限扩展
  PERMISSIONS: createExtensionPoint<PermissionDefinition>('core.permissions'),
  
  // 设置扩展
  SETTINGS: createExtensionPoint<SettingSchema>('core.settings'),
  
  // 主题扩展
  THEMES: createExtensionPoint<ThemeDefinition>('core.themes'),
  
  // 快捷键扩展
  KEYBINDINGS: createExtensionPoint<KeyBinding>('core.keybindings'),
  
  // 图标扩展
  ICONS: createExtensionPoint<IconSet>('core.icons'),
} as const;
```

### 2.3 事件总线设计

```typescript
// 领域事件 - 严格类型化
interface DomainEvents {
  // 认证领域
  'auth:login': { userId: string; identity: Identity };
  'auth:logout': { userId: string };
  'auth:token:refresh': { token: string };
  
  // Token 领域
  'token:created': { tokenId: string; type: TokenType; owner: Identity };
  'token:updated': { tokenId: string; changes: Partial<Token> };
  'token:deleted': { tokenId: string };
  'token:access:granted': { tokenId: string; accessor: Identity };
  'token:access:revoked': { tokenId: string; accessor: Identity };
  
  // Agent 领域
  'agent:registered': { agentId: string; name: string };
  'agent:activated': { agentId: string };
  'agent:deactivated': { agentId: string };
  
  // UI 领域
  'ui:theme:changed': { theme: string };
  'ui:layout:changed': { layout: LayoutConfig };
  'ui:notification': { type: 'success' | 'error' | 'info'; message: string };
  
  // 系统领域
  'system:error': { error: Error; context: unknown };
  'system:plugin:installed': { pluginId: string };
}

// 事件总线实现
interface EventBus {
  emit<K extends keyof DomainEvents>(
    event: K,
    payload: DomainEvents[K]
  ): void;
  
  on<K extends keyof DomainEvents>(
    event: K,
    handler: (payload: DomainEvents[K]) => void | Promise<void>
  ): Disposable;
  
  once<K extends keyof DomainEvents>(
    event: K,
    handler: (payload: DomainEvents[K]) => void
  ): Disposable;
  
  // 领域订阅 - 只监听特定领域
  subscribeDomain<D extends Domain>(
    domain: D,
    handler: DomainEventHandler<D>
  ): Disposable;
}
```

### 2.4 依赖注入容器

```typescript
// 服务标识符 - 编译时安全
const Services = {
  API_CLIENT: createServiceIdentifier<ApiClient>('services.api-client'),
  AUTH_MANAGER: createServiceIdentifier<AuthManager>('services.auth-manager'),
  TOKEN_SERVICE: createServiceIdentifier<TokenService>('services.token-service'),
  PERMISSION_SERVICE: createServiceIdentifier<PermissionService>('services.permission-service'),
  THEME_SERVICE: createServiceIdentifier<ThemeService>('services.theme-service'),
  NOTIFICATION_SERVICE: createServiceIdentifier<NotificationService>('services.notification-service'),
} as const;

// 依赖注入实现
interface DIContainer {
  register<T>(id: ServiceIdentifier<T>, implementation: Constructor<T> | T): void;
  resolve<T>(id: ServiceIdentifier<T>): T;
  resolveAsync<T>(id: ServiceIdentifier<T>): Promise<T>;
  createScope(): DIScope;
}
```

---

## 三、领域划分 (Domain Separation)

### 3.1 领域边界

```
src/
├── core/                          # 核心运行时
│   ├── runtime/                   # 运行时实现
│   ├── plugin/                    # 插件系统
│   ├── event/                     # 事件总线
│   ├── di/                        # 依赖注入
│   └── state/                     # 状态管理
│
├── domains/                       # 业务领域 - 完全隔离
│   ├── auth/                      # 认证域
│   │   ├── domain.ts              # 领域定义
│   │   ├── events.ts              # 领域事件
│   │   ├── plugin.ts              # 领域插件
│   │   ├── services/              # 领域服务
│   │   ├── stores/                # 领域状态
│   │   ├── components/            # 领域组件
│   │   ├── hooks/                 # 领域 Hooks
│   │   ├── pages/                 # 领域页面
│   │   └── index.ts               # 公开接口
│   │
│   ├── identity/                  # 身份域 (User + Agent)
│   │   ├── domain.ts
│   │   ├── plugin.ts
│   │   ├── entities/
│   │   │   ├── user.entity.ts
│   │   │   └── agent.entity.ts
│   │   ├── repositories/
│   │   └── ...
│   │
│   ├── asset/                     # 资产域 (Token)
│   │   ├── domain.ts
│   │   ├── entities/
│   │   │   ├── token.entity.ts
│   │   │   ├── apikey.entity.ts
│   │   │   ├── task.entity.ts
│   │   │   └── secret.entity.ts
│   │   ├── value-objects/
│   │   │   ├── visibility.vo.ts
│   │   │   ├── permission.vo.ts
│   │   │   └── ownership.vo.ts
│   │   ├── services/
│   │   │   ├── token-factory.service.ts
│   │   │   ├── visibility-evaluator.service.ts
│   │   │   └── permission-checker.service.ts
│   │   └── plugin.ts
│   │
│   ├── capability/                # 能力域
│   ├── approval/                  # 审批域
│   ├── audit/                     # 审计域
│   └── workspace/                 # 工作空间域
│
├── shared/                        # 共享层 - 仅工具，无业务
│   ├── types/                     # 基础类型
│   ├── utils/                     # 工具函数
│   ├── ui-primitives/             # 原子组件
│   └── constants/                 # 常量
│
├── themes/                        # 主题系统
│   ├── engine/                    # 主题引擎
│   ├── base/                      # 基础主题
│   ├── kawaii/                    # 二次元主题
│   └── extensions/                # 主题扩展
│
└── app/                           # 应用入口
    ├── bootstrap.ts               # 启动引导
    ├── registry.ts                # 插件注册表
    └── layout.tsx                 # 根布局
```

### 3.2 领域通信规则

```typescript
// ❌ 禁止：直接跨域调用
// domains/asset/services/token.service.ts
class TokenService {
  constructor(
    // 禁止！直接依赖其他领域
    private userService: UserService,
    private agentService: AgentService,
  ) {}
}

// ✅ 正确：通过事件总线通信
// domains/asset/services/token.service.ts
class TokenService {
  constructor(
    private eventBus: EventBus,
    private identityRepository: IdentityRepository, // 通过仓储接口
  ) {}
  
  async createToken(data: CreateTokenDTO) {
    // 创建 Token
    const token = await this.tokenRepository.create(data);
    
    // 发布领域事件
    this.eventBus.emit('token:created', {
      tokenId: token.id,
      type: token.type,
      owner: token.owner,
    });
    
    return token;
  }
}

// domains/identity/services/identity-sync.service.ts
class IdentitySyncService {
  constructor(private eventBus: EventBus) {
    // 订阅 Token 领域事件
    this.eventBus.on('token:created', async ({ owner }) => {
      // 同步身份资产计数
      await this.updateAssetCount(owner.id);
    });
  }
}
```

---

## 四、状态管理架构

### 4.1 分层状态

```typescript
// 第一层：核心状态 - 运行时级
interface CoreState {
  runtime: {
    version: string;
    plugins: Map<string, PluginMeta>;
    ready: boolean;
  };
  session: {
    identity: Identity | null;
    permissions: Permission[];
    expiresAt: number;
  };
}

// 第二层：领域状态 - 按域隔离
// domains/asset/stores/token.store.ts
interface TokenState {
  tokens: Map<string, Token>;
  selectedTokenId: string | null;
  filters: TokenFilter;
  loading: boolean;
}

// 第三层：UI 状态 - 组件级
interface UIState {
  sidebar: {
    collapsed: boolean;
    activePanel: string;
  };
  modal: {
    stack: ModalInstance[];
  };
  theme: {
    mode: 'light' | 'dark';
    variant: string;
  };
}
```

### 4.2 状态流设计

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Action    │────▶│   Service   │────▶│ Repository  │
│  (Intent)   │     │ (Business)  │     │  (Data)     │
└─────────────┘     └─────────────┘     └─────────────┘
                                                │
                       ┌────────────────────────┘
                       ▼
              ┌─────────────────┐
              │   Event Bus     │
              └─────────────────┘
                       │
       ┌───────────────┼───────────────┐
       ▼               ▼               ▼
┌────────────┐ ┌────────────┐ ┌────────────┐
│  Store A   │ │  Store B   │ │  Store C   │
│  (Domain)  │ │  (Domain)  │ │   (UI)     │
└────────────┘ └────────────┘ └────────────┘
```

### 4.3 实现示例

```typescript
// domains/asset/stores/token.store.ts
import { createStore } from '@core/state';
import { TokenService } from '../services/token.service';

export const useTokenStore = createStore<TokenState>(
  'asset.tokens', // 命名空间
  (set, get, subscribe) => ({
    tokens: new Map(),
    selectedTokenId: null,
    filters: {},
    loading: false,
    
    // 动作
    async loadTokens() {
      set({ loading: true });
      const service = getService(Services.TOKEN_SERVICE);
      const tokens = await service.listTokens();
      
      set({
        tokens: new Map(tokens.map(t => [t.id, t])),
        loading: false,
      });
    },
    
    selectToken(id: string) {
      set({ selectedTokenId: id });
    },
    
    updateToken(id: string, changes: Partial<Token>) {
      set(state => {
        const token = state.tokens.get(id);
        if (!token) return state;
        
        state.tokens.set(id, { ...token, ...changes });
        return { tokens: new Map(state.tokens) };
      });
    },
  })
);

// 自动订阅领域事件
useTokenStore.subscribeToEvent('token:created', ({ tokenId }) => {
  useTokenStore.getState().loadTokens();
});
```

---

## 五、主题系统架构

### 5.1 主题引擎

```typescript
// 主题架构
interface ThemeEngine {
  // 注册主题
  register(theme: ThemeDefinition): void;
  
  // 激活主题
  activate(themeId: string): Promise<void>;
  
  // 获取当前主题
  getCurrent(): ThemeDefinition;
  
  // 订阅主题变化
  onChange(handler: (theme: ThemeDefinition) => void): Disposable;
  
  // 动态修改变量
  setVariable(key: string, value: string): void;
}

// 主题定义
interface ThemeDefinition {
  id: string;
  name: string;
  version: string;
  
  // 变量系统
  variables: CSSVariables;
  
  // 组件变体
  components: ComponentVariants;
  
  // 动画定义
  animations: AnimationDefinitions;
  
  // 图标集
  icons: IconSet;
  
  // 音效 (可选)
  sounds?: SoundSet;
  
  // 扩展点
  extensions?: ThemeExtension[];
}
```

### 5.2 Kawaii 主题实现

```typescript
// themes/kawaii/theme.ts
export const kawaiiTheme: ThemeDefinition = {
  id: 'kawaii-tech',
  name: 'Kawaii Tech',
  version: '1.0.0',
  
  variables: {
    // 色彩
    '--kw-primary-50': '#FFF0F5',
    '--kw-primary-100': '#FFE4E1',
    '--kw-primary-500': '#FF1493',
    '--kw-secondary-mint': '#98FB98',
    '--kw-secondary-sky': '#87CEEB',
    
    // 形状
    '--kw-radius-sm': '8px',
    '--kw-radius-md': '16px',
    '--kw-radius-lg': '24px',
    '--kw-radius-xl': '32px',
    
    // 动画
    '--kw-duration-fast': '150ms',
    '--kw-duration-normal': '300ms',
    '--kw-duration-slow': '500ms',
    '--kw-easing-bounce': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    '--kw-easing-smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
  
  components: {
    Button: {
      base: 'rounded-full font-medium transition-all duration-200',
      variants: {
        primary: 'bg-gradient-to-r from-pink-400 to-pink-600 text-white shadow-lg hover:shadow-pink-300/50',
        secondary: 'bg-white border-2 border-pink-200 text-pink-600 hover:bg-pink-50',
        ghost: 'text-pink-600 hover:bg-pink-100',
      },
      sizes: {
        sm: 'px-4 py-2 text-sm',
        md: 'px-6 py-3 text-base',
        lg: 'px-8 py-4 text-lg',
      },
    },
    
    Card: {
      base: 'rounded-3xl bg-white/80 backdrop-blur-sm border border-pink-100 shadow-soft',
      hover: 'hover:shadow-glow hover:-translate-y-1 transition-all duration-300',
    },
    
    Input: {
      base: 'rounded-2xl border-2 border-pink-200 bg-white focus:border-pink-400 focus:ring-4 focus:ring-pink-100',
    },
    
    Badge: {
      variants: {
        success: 'bg-green-100 text-green-700 border-green-200',
        warning: 'bg-yellow-100 text-yellow-700 border-yellow-200',
        error: 'bg-red-100 text-red-700 border-red-200',
        info: 'bg-blue-100 text-blue-700 border-blue-200',
        pink: 'bg-pink-100 text-pink-700 border-pink-200 animate-pulse',
      },
    },
  },
  
  animations: {
    // 入场动画
    'fade-in': {
      from: { opacity: 0 },
      to: { opacity: 1 },
      duration: '300ms',
    },
    
    'slide-up': {
      from: { opacity: 0, transform: 'translateY(20px)' },
      to: { opacity: 1, transform: 'translateY(0)' },
      duration: '400ms',
      easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    },
    
    'bounce-in': {
      from: { opacity: 0, transform: 'scale(0.8)' },
      '50%': { transform: 'scale(1.05)' },
      to: { opacity: 1, transform: 'scale(1)' },
      duration: '500ms',
    },
    
    // 交互动画
    'hover-lift': {
      from: { transform: 'translateY(0)' },
      to: { transform: 'translateY(-4px)' },
      duration: '200ms',
    },
    
    'press-scale': {
      from: { transform: 'scale(1)' },
      to: { transform: 'scale(0.95)' },
      duration: '100ms',
    },
    
    // 装饰动画
    'float': {
      '0%, 100%': { transform: 'translateY(0)' },
      '50%': { transform: 'translateY(-10px)' },
      duration: '3s',
      iteration: 'infinite',
    },
    
    'sparkle': {
      '0%, 100%': { opacity: 0, transform: 'scale(0)' },
      '50%': { opacity: 1, transform: 'scale(1)' },
      duration: '1.5s',
      iteration: 'infinite',
    },
    
    'glow-pulse': {
      '0%, 100%': { boxShadow: '0 0 20px rgba(255, 105, 180, 0.2)' },
      '50%': { boxShadow: '0 0 40px rgba(255, 105, 180, 0.5)' },
      duration: '2s',
      iteration: 'infinite',
    },
  },
  
  icons: {
    // 自定义图标映射
    'token': 'CustomTokenIcon',
    'agent': 'CustomAgentIcon',
    'magic': 'SparklesIcon',
    'cute-check': 'HeartCheckIcon',
  },
};
```

### 5.3 主题扩展机制

```typescript
// 主题扩展 - 允许运行时修改
interface ThemeExtension {
  id: string;
  appliesTo: string[]; // 适用的主题 ID
  
  // 覆盖变量
  variables?: Partial<CSSVariables>;
  
  // 覆盖组件样式
  components?: Partial<ComponentVariants>;
  
  // 添加动画
  animations?: Partial<AnimationDefinitions>;
  
  // 添加音效
  sounds?: SoundSet;
}

// 示例：节日主题扩展
const festivalExtension: ThemeExtension = {
  id: 'festival-christmas',
  appliesTo: ['kawaii-tech'],
  
  variables: {
    '--kw-primary-500': '#DC143C', // 圣诞红
    '--kw-secondary-mint': '#228B22', // 圣诞绿
  },
  
  components: {
    Button: {
      variants: {
        primary: 'bg-gradient-to-r from-red-500 to-green-500',
      },
    },
  },
  
  animations: {
    'snow-fall': {
      // 雪花飘落动画
    },
  },
};
```

---

## 六、权限系统架构

### 6.1 权限模型

```typescript
// 权限原语
interface Permission {
  resource: string;     // 资源类型
  action: string;       // 动作
  scope?: string;       // 作用域
  conditions?: Condition[]; // 条件
}

// 权限定义示例
const Permissions = {
  // Token 权限
  TOKEN_CREATE: { resource: 'token', action: 'create' },
  TOKEN_READ: { resource: 'token', action: 'read' },
  TOKEN_UPDATE: { resource: 'token', action: 'update' },
  TOKEN_DELETE: { resource: 'token', action: 'delete' },
  TOKEN_EXECUTE: { resource: 'token', action: 'execute' },
  TOKEN_SHARE: { resource: 'token', action: 'share' },
  
  // 带条件的权限
  TOKEN_UPDATE_OWN: {
    resource: 'token',
    action: 'update',
    conditions: [{ type: 'owner', value: 'self' }],
  },
  
  TOKEN_READ_RESTRICTED: {
    resource: 'token',
    action: 'read',
    conditions: [{ type: 'visibility', value: 'restricted' }],
  },
} as const;

// 角色定义
interface Role {
  id: string;
  name: string;
  permissions: Permission[];
  extends?: string[]; // 继承其他角色
}

// 动态权限检查
interface PermissionService {
  // 检查权限
  check(permission: Permission, context: PermissionContext): boolean;
  
  // 异步检查（可能需要远程验证）
  checkAsync(permission: Permission, context: PermissionContext): Promise<boolean>;
  
  // 获取权限列表
  getPermissions(identity: Identity): Permission[];
  
  // 添加临时权限
  grantTemporary(permission: Permission, duration: number): Disposable;
}
```

### 6.2 可见性引擎

```typescript
// 可见性规则引擎
interface VisibilityEngine {
  // 评估可见性
  evaluate(
    asset: Asset,
    accessor: Identity,
    context: VisibilityContext
  ): VisibilityResult;
  
  // 注册可见性规则
  registerRule(rule: VisibilityRule): void;
}

// 可见性规则
interface VisibilityRule {
  id: string;
  priority: number;
  
  // 匹配条件
  matches(asset: Asset, accessor: Identity): boolean;
  
  // 评估结果
  evaluate(asset: Asset, accessor: Identity): VisibilityLevel;
}

// 可见性级别
enum VisibilityLevel {
  DENIED = 0,      // 完全拒绝
  VISIBLE = 1,     // 仅可见
  METADATA = 2,    // 可见元数据
  READONLY = 3,    // 只读访问
  EXECUTE = 4,     // 可执行
  FULL = 5,        // 完全访问
}

// 示例规则：Token 关联规则
const tokenLinkedRule: VisibilityRule = {
  id: 'token-linked',
  priority: 100,
  
  matches(asset, accessor) {
    return asset.visibility.mode === 'restricted';
  },
  
  evaluate(asset, accessor) {
    const allowedTokens = asset.visibility.allowedTokens || [];
    const accessorTokens = accessor.tokens || [];
    
    // 检查 accessor 的 token 是否在允许列表中
    const hasAccess = accessorTokens.some(t => allowedTokens.includes(t));
    
    return hasAccess ? VisibilityLevel.FULL : VisibilityLevel.DENIED;
  },
};
```

---

## 七、API 层架构

### 7.1 分层 API 客户端

```typescript
// 基础 HTTP 层
interface HttpClient {
  request<T>(config: RequestConfig): Promise<T>;
  get<T>(url: string, config?: RequestConfig): Promise<T>;
  post<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T>;
  // ...
}

// 领域 API 层 - 按域隔离
// domains/asset/api/token.api.ts
export class TokenApi {
  constructor(private http: HttpClient) {}
  
  async listTokens(filters?: TokenFilter): Promise<Token[]> {
    return this.http.get('/api/tokens', { params: filters });
  }
  
  async createToken(data: CreateTokenDTO): Promise<Token> {
    return this.http.post('/api/tokens', data);
  }
  
  async updateVisibility(
    tokenId: string, 
    visibility: VisibilityConfig
  ): Promise<void> {
    return this.http.patch(`/api/tokens/${tokenId}/visibility`, visibility);
  }
}

// API 组合层 - 跨域协调
// 禁止在领域内部使用，仅用于页面/组件
export class AssetComposer {
  constructor(
    private tokenApi: TokenApi,
    private identityApi: IdentityApi,
    private permissionApi: PermissionApi,
  ) {}
  
  // 组合查询：获取 Token 及其权限信息
  async getTokenWithPermissions(tokenId: string) {
    const [token, permissions] = await Promise.all([
      this.tokenApi.getToken(tokenId),
      this.permissionApi.getTokenPermissions(tokenId),
    ]);
    
    return { token, permissions };
  }
}
```

### 7.2 请求中间件链

```typescript
// 中间件接口
interface RequestMiddleware {
  name: string;
  onRequest?(config: RequestConfig): RequestConfig | Promise<RequestConfig>;
  onResponse?<T>(response: T): T | Promise<T>;
  onError?(error: Error): Error | Promise<Error>;
}

// 中间件注册
const httpClient = createHttpClient({
  baseURL: process.env.API_URL,
  middlewares: [
    // 认证中间件
    authMiddleware,
    // 缓存中间件
    cacheMiddleware,
    // 重试中间件
    retryMiddleware,
    // 日志中间件
    loggingMiddleware,
    // 错误处理中间件
    errorMiddleware,
  ],
});
```

---

## 八、扩展机制

### 8.1 插件开发套件 (SDK)

```typescript
// 插件 SDK
export interface PluginSDK {
  // 注册路由
  registerRoute(route: RouteConfig): void;
  
  // 注册菜单
  registerMenuItem(item: MenuItem): void;
  
  // 注册组件
  registerComponent(name: string, component: ComponentType): void;
  
  // 注册设置
  registerSetting(schema: SettingSchema): void;
  
  // 注册权限
  registerPermission(permission: PermissionDefinition): void;
  
  // 订阅事件
  onEvent<K extends keyof DomainEvents>(
    event: K, 
    handler: EventHandler<K>
  ): Disposable;
  
  // 触发事件
  emitEvent<K extends keyof DomainEvents>(
    event: K, 
    payload: DomainEvents[K]
  ): void;
  
  // 获取服务
  getService<T>(id: ServiceIdentifier<T>): T;
  
  // 状态管理
  createStore<T>(name: string, initializer: StoreInitializer<T>): Store<T>;
}

// 插件入口
export interface PluginEntry {
  activate(sdk: PluginSDK): void | Promise<void>;
  deactivate(): void | Promise<void>;
}

// 示例插件
const myPlugin: PluginEntry = {
  activate(sdk) {
    // 注册路由
    sdk.registerRoute({
      path: '/my-feature',
      component: MyFeaturePage,
      layout: 'dashboard',
    });
    
    // 注册菜单
    sdk.registerMenuItem({
      id: 'my-feature',
      label: 'My Feature',
      icon: 'sparkles',
      position: 'sidebar',
      order: 100,
    });
    
    // 订阅事件
    sdk.onEvent('token:created', ({ tokenId }) => {
      // 处理 Token 创建
    });
    
    // 创建状态
    const store = sdk.createStore('my-feature', (set) => ({
      data: null,
      loadData: async () => {
        const service = sdk.getService(Services.MY_SERVICE);
        const data = await service.fetchData();
        set({ data });
      },
    }));
  },
  
  deactivate() {
    // 清理资源
  },
};
```

### 8.2 可视化插件配置

```typescript
// 插件配置界面
interface PluginConfigUI {
  // 配置表单 Schema
  schema: JSONSchema;
  
  // 默认值
  defaultValues: Record<string, unknown>;
  
  // 验证规则
  validators: Record<string, ValidationRule[]>;
  
  // 依赖关系
  dependencies: {
    // 当字段 A 变化时，字段 B 的选项变化
    'fieldA': {
      target: 'fieldB',
      transform: (value: unknown) => Option[];
    };
  };
}

// 运行时配置存储
interface PluginConfigStore {
  // 获取插件配置
  get<T>(pluginId: string): T;
  
  // 更新配置
  set<T>(pluginId: string, config: T): void;
  
  // 订阅配置变化
  onChange(pluginId: string, handler: (config: unknown) => void): Disposable;
  
  // 导出配置
  export(): Record<string, unknown>;
  
  // 导入配置
  import(configs: Record<string, unknown>): void;
}
```

---

## 九、构建与部署

### 9.1 模块化构建

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    // 代码分割策略
    rollupOptions: {
      output: {
        manualChunks: {
          // 核心运行时
          'core': ['@core/runtime', '@core/plugin', '@core/event'],
          
          // 领域模块 - 按需加载
          'domain-auth': ['./src/domains/auth'],
          'domain-asset': ['./src/domains/asset'],
          'domain-identity': ['./src/domains/identity'],
          
          // UI 库
          'ui': ['react', 'react-dom', 'framer-motion'],
          
          // 工具
          'utils': ['lodash-es', 'date-fns', 'zod'],
        },
      },
    },
    
    // 动态导入
    dynamicImportVarsOptions: {
      warnOnError: true,
    },
  },
  
  // 插件系统 - 外部插件目录
  plugins: [
    pluginLoader({
      dirs: ['./src/plugins', '/opt/acp/plugins'],
      hotReload: process.env.NODE_ENV === 'development',
    }),
  ],
});
```

### 9.2 插件打包格式

```
my-plugin.acp/
├── manifest.json          # 插件元数据
├── index.js               # 入口文件
├── assets/                # 静态资源
│   ├── icons/
│   └── images/
├── locales/               # 国际化
│   ├── en.json
│   └── zh.json
├── themes/                # 主题扩展
│   └── overrides.css
└── config.schema.json     # 配置 Schema
```

```json
// manifest.json
{
  "id": "com.example.my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "description": "A sample plugin",
  "author": "Example Inc.",
  "license": "MIT",
  "minRuntimeVersion": "2.0.0",
  "dependencies": [
    "com.example.base-plugin"
  ],
  "permissions": [
    "token:read",
    "token:write"
  ],
  "entry": "index.js",
  "configSchema": "config.schema.json"
}
```

---

## 十、性能优化策略

### 10.1 按需加载

```typescript
// 领域级懒加载
const AssetDomain = lazy(() => import('./domains/asset'));
const IdentityDomain = lazy(() => import('./domains/identity'));

// 组件级懒加载
const TokenList = lazy(() => import('./domains/asset/components/TokenList'));

// 预加载策略
const preloadAssetDomain = () => {
  const AssetDomain = import('./domains/asset');
};

// 路由级预加载
const router = createRouter({
  routes: [
    {
      path: '/tokens',
      component: TokenList,
      preload: preloadAssetDomain,
    },
  ],
});
```

### 10.2 状态持久化

```typescript
// 分层持久化
const persistenceConfig = {
  // 核心状态 - 本地存储
  core: {
    storage: 'localStorage',
    keys: ['session', 'preferences'],
  },
  
  // 领域状态 - IndexedDB
  domains: {
    storage: 'indexedDB',
    ttl: 24 * 60 * 60 * 1000, // 24小时
  },
  
  // UI 状态 - 会话存储
  ui: {
    storage: 'sessionStorage',
  },
};
```

---

## 十一、开发工具

### 11.1 插件开发 CLI

```bash
# 创建新插件
acp-cli create-plugin my-plugin

# 开发模式 - 热重载
acp-cli dev --plugin ./my-plugin

# 打包插件
acp-cli build --plugin ./my-plugin --output ./dist

# 验证插件
acp-cli validate ./my-plugin.acp

# 发布插件
acp-cli publish ./my-plugin.acp --registry https://plugins.acp.io
```

### 11.2 调试工具

```typescript
// 开发者工具插件
interface DevTools {
  // 查看插件状态
  inspectPlugins(): PluginInfo[];
  
  // 查看事件流
  inspectEvents(): EventStream;
  
  // 查看状态树
  inspectState(): StateTree;
  
  // 性能分析
  profilePerformance(): PerformanceReport;
  
  // 模拟事件
  simulateEvent<K extends keyof DomainEvents>(
    event: K, 
    payload: DomainEvents[K]
  ): void;
}
```

---

## 十二、实施路线图

### Phase 1: 核心运行时 (2 周)
- [ ] 插件系统实现
- [ ] 事件总线实现
- [ ] 依赖注入容器
- [ ] 状态管理框架
- [ ] 主题引擎

### Phase 2: 基础领域 (2 周)
- [ ] Auth 领域
- [ ] Identity 领域
- [ ] Core UI 组件库

### Phase 3: 业务领域 (3 周)
- [ ] Asset 领域 (Token 管理)
- [ ] Capability 领域
- [ ] Approval 领域
- [ ] Workspace 领域

### Phase 4: UI/UX (2 周)
- [ ] Kawaii 主题实现
- [ ] 页面布局
- [ ] 动画系统
- [ ] 交互优化

### Phase 5: 插件生态 (2 周)
- [ ] 插件 SDK
- [ ] 插件市场
- [ ] 开发工具
- [ ] 文档系统

---

*架构版本: v2.0*  
*设计原则: 插件即一切，契约驱动，零耦合*  
*目标: 构建可运行 10 年的前端架构*
