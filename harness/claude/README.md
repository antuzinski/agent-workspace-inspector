# Claude-версия harness · 2026-10-10

Та же схема, что и для Codex, в форме, которую понимает Claude. Нужна, чтобы вести один проект попеременно в Codex и Claude, не теряя выводов.

| Что | Где | Куда ставить |
|---|---|---|
| Глобальные правила | [CLAUDE.md](CLAUDE.md) | Claude Code: `~/.claude/CLAUDE.md`. В Claude-чате роль глобальных правил играют настройки аккаунта |
| Передача проекта между Codex и Claude | [skills/project-handoff](skills/project-handoff/SKILL.md) | `~/.claude/skills/` или плагин аккаунта |
| Пять рабочих навыков | [../skills](../skills/) — общие для Codex и Claude | `~/.claude/skills/` или плагин аккаунта |
| Роли bounded-worker и critical-reviewer | [../../workspace-inspector/assets/claude/agents](../../workspace-inspector/assets/claude/agents/) | `~/.claude/agents/` или плагин аккаунта |
| Часовой кэш промпта для основного агента и субагентов | [settings.json](settings.json) | слить ключи в `~/.claude/settings.json`; плагин эти ключи не задаёт |

## Как это работает

- Состояние проекта живёт в его папке: `AGENTS.md` (правила), `PROJECT_OVERVIEW.md` с разделом «Лента обновлений» (где остановились и что решили), файлы артефактов и git. Codex ведёт ленту по правилу из [AGENTS.md](../AGENTS.md), Claude — по навыку project-handoff, формат записей один.
- Роли переводятся: Luna → bounded-worker, Astra и sol-reviewer → critical-reviewer.
- Модель по умолчанию — та, что выбрана в клиенте; для Opus 5.5 разумная стартовая точка — средний уровень усилий, выше — только при измеренной пользе. Агенты используют `model: inherit`.
- Навыки подключаются по описанию задачи; правила не требуют помощника на каждом этапе.

## Кэш промпта

По умолчанию субагенты, форки, workflows и компакция держат кэш 5 минут даже на подписке, а при API-ключе, облачном провайдере или usage credits — и основной чат. Субагент, который ждёт ответа, тестов или сборки дольше пяти минут, на следующем шаге заново записывает весь контекст по ставке записи. Поэтому в [settings.json](settings.json) оба бакета переведены на `1h`:

- `promptCacheTtl` — основной чат. На подписке в пределах лимита это и так 1 час; явное значение сохраняет его при usage credits и включает при API-ключе.
- `subagentPromptCacheTtl` — всё остальное: субагенты, форки, workflows, компакция.

Нужен Claude Code v2.1.242+. Ключи в `settings.json` работают при любой авторизации, переменные окружения не нужны. Если они заданы, они важнее файла: `CLAUDE_CODE_PROMPT_CACHE_TTL` (основной чат) и `CLAUDE_CODE_SUBAGENT_PROMPT_CACHE_TTL` (субагенты). `FORCE_PROMPT_CACHING_5M=1` перекрывает всё.

Цена: часовая запись стоит 2× базового входа против 1,25× у пятиминутной, а чтение на Opus 5.5 — 0,05×. Выигрыш есть, когда паузы длиннее 5 минут случаются; на коротких непрерывных сессиях это переплата. Главный расход всё равно — размер контекста, который читается на каждом шаге, поэтому длинные задачи лучше дробить на свежих агентов с коротким отчётом.

Проверка: `claude -p "hello" --output-format json` → в `usage.cache_creation` растёт `ephemeral_1h_input_tokens`, а не `ephemeral_5m_input_tokens`; в `/usage` — строка `Prompt cache (main)`. [Документация](https://code.claude.com/docs/en/prompt-caching#cache-lifetime)

## Что не входит

Runtime (`context-guard.mjs`, `runtime.mjs`), hooks и Unsnooze рассчитаны на Codex и сюда не перенесены. Трассировка в Claude Code — встроенные транскрипты сессий (`~/.claude/projects/`). По умолчанию они удаляются через 30 дней; чтобы их сохранить, задайте `cleanupPeriodDays` в `~/.claude/settings.json`.

critical-reviewer основан на идеях [pavel-molyanov/molyanov-ai-dev](https://github.com/pavel-molyanov/molyanov-ai-dev) (MIT).

## Проверка после установки в Claude Code

`/context` — загружен ли `CLAUDE.md`; `/agents` — видны ли обе роли; в списке навыков — нет ли дублей одного навыка из папки и из плагина. Это проверяет обнаружение, а не пользу: её оценивают на обычных задачах.
