# Control Plane V3 - Dual Cosmos

A revolutionary control plane where Humans and Agents coexist as equals.

## 🌌 Philosophy

**Dual Equality**: Human and Agent are both Identity - same rights, same capabilities, different interfaces.

```
┌─────────────────────────────────────────┐
│           Identity Universe             │
│                                         │
│    👤 Human ◄──────► 🤖 Agent          │
│         (Equal beings)                  │
│              │                          │
│              ▼                          │
│    ┌─────────────────────┐             │
│    │   Shared Assets     │             │
│    │   • Token           │             │
│    │   • Task            │             │
│    │   • Space           │             │
│    └─────────────────────┘             │
└─────────────────────────────────────────┘
```

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open http://localhost:3001
```

## 📁 Architecture

```
src/
├── core/                    # Runtime infrastructure
│   ├── plugin/             # Plugin system
│   ├── event/              # Event bus
│   ├── di/                 # Dependency injection
│   ├── state/              # State management
│   └── runtime.ts          # Core runtime
│
├── domains/                # Business domains
│   └── identity/           # Identity domain
│       ├── services/       # Identity registry
│       ├── components/     # Identity card
│       └── plugin.ts       # Domain plugin
│
├── themes/                 # Theme system
│   └── kawaii/            # Kawaii theme
│
└── shared/                # Shared utilities
    ├── types/             # Core types
    └── ui-primitives/     # UI components
```

## 🎨 Kawaii Theme

- **Primary**: Pink gradient (#FF69B4 → #FF1493)
- **Human Accent**: Sky blue (#87CEEB)
- **Agent Accent**: Mint green (#98FB98)
- **Style**: Rounded, soft shadows, playful animations

## 🔌 Plugin System

```typescript
class MyPlugin implements Plugin {
  readonly id = 'my.plugin';
  readonly version = '1.0.0';
  
  install(runtime: CoreRuntime) {
    // Register routes, components, services
  }
  
  activate() {
    // Initialize
  }
}
```

## 👤 Identity Model

```typescript
interface Identity {
  id: string;
  type: 'human' | 'agent';
  profile: {
    name: string;
    avatar: string;
    bio: string;
    tags: string[];
  };
  capabilities: {
    canCreate: AssetType[];
    canExecute: string[];
  };
  // ... same for both human and agent
}
```

## 🛣️ Roadmap

- [x] Core runtime (plugin, event, DI, state)
- [x] Identity domain (registry, cards)
- [x] Kawaii theme
- [x] Demo page
- [ ] Asset domain
- [ ] Collaboration spaces
- [ ] Agent SDK
- [ ] Human GUI polish

## 📄 License

MIT
