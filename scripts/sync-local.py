"""Export the maintained shared skills and portable policy; never export config or state."""
import argparse
import os
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
SKILLS = ('clear-writing', 'code-workflow', 'decision-review', 'product-work',
          'research-workflow', 'visual-review-page')

def export(source):
    policy = (source / 'AGENTS.md').read_text(encoding='utf-8-sig')
    policy = policy.split('\n## GitHub synchronization')[0].rstrip() + '\n'
    policy = re.sub(r'- Use Unsnooze for a recovery checkpoint when needed\..*?checkpoint save --stdin`\n',
        '- If a recovery tool is installed, use its local checkpoint command when needed. Do not copy another machine\'s paths.\n',
        policy, flags=re.S)
    if re.search(r'[A-Za-z]:\\|/Users/|/home/', policy):
        raise ValueError('Personal path in policy: review before export')
    files = {'harness/AGENTS.md': policy.encode('utf-8'),
             'harness/claude/CLAUDE.md': policy.replace('# Codex working policy', '# Claude working policy').encode('utf-8')}
    for name in SKILLS:
        folder = source / 'skills' / name
        if not (folder / 'SKILL.md').is_file():
            raise FileNotFoundError(folder / 'SKILL.md')
        for path in folder.rglob('*'):
            if path.is_file() and not any(p.startswith('.') or p == '__pycache__' for p in path.relative_to(folder).parts):
                files[f'harness/skills/{name}/{path.relative_to(folder).as_posix()}'] = path.read_bytes()
    return files

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--codex-home', type=Path, default=Path(os.environ.get('CODEX_HOME', Path.home() / '.codex')))
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    files = export(args.codex_home)
    changes = []
    for relative, content in files.items():
        target = ROOT / relative
        if not target.is_file() or target.read_bytes() != content:
            changes.append(relative)
            if not args.check:
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(content)
    # Do not silently delete extra files: maintainers review removals explicitly.
    extra = [p.relative_to(ROOT).as_posix() for p in (ROOT / 'harness/skills').rglob('*')
             if p.is_file() and p.relative_to(ROOT).as_posix() not in files]
    for relative in changes:
        print(('DIFF ' if args.check else 'UPDATED ') + relative)
    for relative in extra:
        print('REVIEW EXTRA ' + relative)
    if not changes and not extra:
        print('Shared skills and portable policies match the local source.')
    raise SystemExit(1 if extra or (args.check and changes) else 0)

if __name__ == '__main__':
    main()
