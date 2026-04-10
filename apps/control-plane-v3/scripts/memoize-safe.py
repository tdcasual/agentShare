import re
import os

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

gray_rules = [
    (r'text-gray-900', 'text-[var(--kw-text)]'),
    (r'text-gray-800', 'text-[var(--kw-text)]'),
    (r'text-gray-700', 'text-[var(--kw-text)]'),
    (r'text-gray-600', 'text-[var(--kw-text-muted)]'),
    (r'text-gray-500', 'text-[var(--kw-text-muted)]'),
    (r'text-gray-400', 'text-[var(--kw-text-muted)]'),
    (r'text-gray-300', 'text-[var(--kw-border)]'),
    (r'text-gray-200', 'text-[var(--kw-border)]'),
    (r'text-gray-100', 'text-[var(--kw-surface-alt)]'),
    (r'placeholder:text-gray-400', 'placeholder:text-[var(--kw-text-muted)]'),
    (r'placeholder:text-gray-500', 'placeholder:text-[var(--kw-text-muted)]'),
    (r'hover:bg-gray-100', 'hover:bg-[var(--kw-surface-alt)]'),
    (r'hover:bg-gray-50', 'hover:bg-[var(--kw-surface-alt)]'),
    (r'bg-gray-50', 'bg-[var(--kw-surface-alt)]'),
    (r'bg-gray-100', 'bg-[var(--kw-surface-alt)]'),
]

for path in files:
    with open(path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    # Apply gray normalization
    content = ''.join(lines)
    for pattern, repl in gray_rules:
        content = re.sub(pattern, repl, content)
    lines = content.split('\n')
    # Restore newlines because split('\n') removes them
    if lines and lines[-1] == '':
        lines = lines[:-1]
    lines = [line + '\n' for line in lines]
    
    # Add memo import if missing
    has_memo = any('memo' in line and 'from' in line and 'react' in line for line in lines[:15])
    react_import_idx = None
    for i, line in enumerate(lines[:15]):
        if "from 'react'" in line or 'from "react"' in line:
            react_import_idx = i
            break
    
    if react_import_idx is not None and not has_memo:
        line = lines[react_import_idx]
        if line.strip().startswith('import {') and 'memo' not in line:
            # Add memo to existing react import
            if line.strip().endswith('};'):
                line = line.replace(' }', ', memo }')
            elif line.strip().endswith('"'):
                # e.g. import { useState } from "react";
                line = line.replace(' }', ', memo }')
            lines[react_import_idx] = line
        else:
            # Insert new import after this line
            lines.insert(react_import_idx + 1, "import { memo } from 'react';\n")
    
    # Find and memoize *Content function
    start_idx = None
    for i, line in enumerate(lines):
        if re.match(r'^function (\w+Content)\(\) \{$', line.strip()):
            name = re.match(r'^function (\w+Content)\(\) \{$', line.strip()).group(1)
            start_idx = i
            # Replace declaration
            indent = len(line) - len(line.lstrip())
            lines[i] = ' ' * indent + f'const {name} = memo(function {name}() {{\n'
            break
    
    if start_idx is not None:
        # Find matching closing brace using depth counter
        depth = 1
        end_idx = None
        for i in range(start_idx + 1, len(lines)):
            stripped = lines[i].strip()
            # Simple brace counting (not string-aware but sufficient for these files)
            for ch in stripped:
                if ch == '{':
                    depth += 1
                elif ch == '}':
                    depth -= 1
            if depth == 0:
                end_idx = i
                break
        
        if end_idx is not None:
            lines[end_idx] = lines[end_idx].rstrip() + ');\n'
    
    with open(path, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print(f"Updated {path}")

print("Done.")
