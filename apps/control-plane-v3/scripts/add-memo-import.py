files = [
    'apps/control-plane-v3/src/app/tasks/page.tsx',
    'apps/control-plane-v3/src/app/assets/page.tsx',
    'apps/control-plane-v3/src/app/settings/page.tsx',
    'apps/control-plane-v3/src/app/identities/page.tsx',
    'apps/control-plane-v3/src/app/tokens/page.tsx',
    'apps/control-plane-v3/src/app/reviews/page.tsx',
    'apps/control-plane-v3/src/app/inbox/page.tsx',
    'apps/control-plane-v3/src/app/runs/page.tsx',
    'apps/control-plane-v3/src/app/playbooks/page.tsx',
    'apps/control-plane-v3/src/app/marketplace/page.tsx',
    'apps/control-plane-v3/src/app/approvals/page.tsx',
]

for path in files:
    with open(path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    for i, line in enumerate(lines):
        if 'from "react"' in line or "from 'react'" in line:
            if 'memo' not in line:
                # e.g. import { FormEvent, useMemo, useState } from 'react';
                line = line.replace(' } ', ', memo } ')
                lines[i] = line
            break
    
    with open(path, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print(f"Fixed import in {path}")
