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

for path in files:
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Fix the missing opening brace
    content = re.sub(r'const (\w+Content) = memo\(function \1\(\) $', r'const \1 = memo(function \1() {', content, flags=re.MULTILINE)
    
    # Find the matching closing brace for the memoized function and add );
    # We know these functions end with a line that is just `  }` followed by a blank line and then another declaration.
    # But since the previous regex may have already added `);` in some wrong places, let's be systematic.
    
    # First remove any orphan `);` that might have been inserted incorrectly
    content = re.sub(r'(\n  \}\));(\n\n(?:function |export default function |interface |const ))', r'\n  }\n\n\2', content)
    
    # Now find the last `  }\n\n(function |export default function ...)` before the helper functions
    # and add `);` after the `}`
    # We look for `  }\n\nfunction ` or `  }\n\nexport default function ` or `  }\n\ninterface `
    content = re.sub(r'(\n  \})\n\n(function |export default function |interface |const )', r'\1);\n\n\2', content)
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Fixed {path}")

print("Done fixing.")
