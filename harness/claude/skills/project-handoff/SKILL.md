---
name: project-handoff
description: Continue a project that is also worked on in Codex or in another Claude session without losing conclusions. Use when work starts or ends in a project folder that has AGENTS.md, CLAUDE.md or PROJECT_OVERVIEW.md, when the user says the project was run in Codex, or asks to pick up where another agent stopped. Skip one-off questions and advice-only chats.
---

# Project handoff

The project folder, not a chat history, carries state between Codex and Claude. Both tools read and write the same files.

## At the start

1. Read the project instructions (shared durable rules belong in `AGENTS.md`, because Codex reads only that file): `AGENTS.md`, then `CLAUDE.md` if present. When both exist, follow `CLAUDE.md` for Claude-specific points and `AGENTS.md` for everything shared. Ignore Codex-only mechanics (Luna, Astra, sol-reviewer, `runtime.mjs`, Unsnooze checkpoint commands); translate roles to bounded-worker and critical-reviewer.
2. Read `PROJECT_OVERVIEW.md`: the summary and the last two or three entries under `## Лента обновлений`. Read older entries only when the task depends on them.
3. If the folder is a git repository, check `git status` and the last ten commits.
4. Before acting, state in one or two sentences where the project stands and what you will do next. Ask only if the recorded state contradicts the request.

Do not read raw Codex session logs (`~/.codex/sessions`) by default. Use them only when the user asks to recover a conclusion that never reached the project files, and then extract message text with a script instead of reading whole JSONL files.

## At the end of material progress

Skip this for advice-only chats and one-off tasks.

1. Update the summary part of `PROJECT_OVERVIEW.md` if the state changed; create the file if it is missing.
2. Append one entry under `## Лента обновлений`, preserving all earlier entries:

```markdown
### Обновление NN · YYYY-MM-DD — Название
**Статус:** Готово | В работе | Заблокировано
- **Сделано:** what changed, with file names
- **Результат:** what is now true or decided, and why
- **Дальше:** concrete next step
```

Include the **Дальше:** bullet only when there is a concrete next step. Number entries sequentially, use the local date, and keep each entry short. Add version labels only for real releases. Save artifacts as files in the project (for example `docs/`), not only in the reply.
3. If the folder is a git repository and the user allows commits, commit before the user switches tools. Never commit without permission.

## Boundaries

- Do not work in the same files while Codex is running on them; one agent at a time per working tree.
- Saved notes are not proof that the next agent read them; the next session starts by reading them again.
