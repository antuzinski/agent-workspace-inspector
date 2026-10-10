# Claude-версия harness · 2026-10-10

Та же схема, что и для Codex, в форме, которую понимает Claude. Нужна, чтобы вести один проект попеременно в Codex и Claude, не теряя выводов.

| Что | Где | Куда ставить |
|---|---|---|
| Глобальные правила | [CLAUDE.md](CLAUDE.md) | Claude Code: `~/.claude/CLAUDE.md`. В Claude-чате роль глобальных правил играют настройки аккаунта |
| Передача проекта между Codex и Claude | [skills/project-handoff](skills/project-handoff/SKILL.md) | `~/.claude/skills/` или плагин аккаунта |
| Пять рабочих навыков | [../skills](../skills/) — общие для Codex и Claude | `~/.claude/skills/` или плагин аккаунта |
| Роли bounded-worker и critical-reviewer | [../../workspace-inspector/assets/claude/agents](../../workspace-inspector/assets/claude/agents/) | `~/.claude/agents/` или плагин аккаунта |

## Как это работает

- Состояние проекта живёт в его папке: `AGENTS.md` (правила), `PROJECT_OVERVIEW.md` с разделом «Лента обновлений» (где остановились и что решили), файлы артефактов и git. Codex ведёт ленту по правилу из [AGENTS.md](../AGENTS.md), Claude — по навыку project-handoff, формат записей один.
- Роли переводятся: Luna → bounded-worker, Astra и sol-reviewer → critical-reviewer.
- Модель по умолчанию — та, что выбрана в клиенте; для Opus 5.5 разумная стартовая точка — средний уровень усилий, выше — только при измеренной пользе. Агенты используют `model: inherit`.
- Навыки подключаются по описанию задачи; правила не требуют помощника на каждом этапе.

## Что не входит

Runtime (`context-guard.mjs`, `runtime.mjs`), hooks и Unsnooze рассчитаны на Codex и сюда не перенесены. Трассировка в Claude Code — встроенные транскрипты сессий (`~/.claude/projects/`). По умолчанию они удаляются через 30 дней; чтобы их сохранить, задайте `cleanupPeriodDays` в `~/.claude/settings.json`.

critical-reviewer основан на идеях [pavel-molyanov/molyanov-ai-dev](https://github.com/pavel-molyanov/molyanov-ai-dev) (MIT).

## Проверка после установки в Claude Code

`/context` — загружен ли `CLAUDE.md`; `/agents` — видны ли обе роли; в списке навыков — нет ли дублей одного навыка из папки и из плагина. Это проверяет обнаружение, а не пользу: её оценивают на обычных задачах.
