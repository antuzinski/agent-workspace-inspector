# Agent Workspace Inspector

Универсальный skill для инспекции и минимальной настройки рабочего пространства **OpenAI Codex** или **Claude Code**.

Он проверяет реально загружаемые инструкции, skills, subagents, MCP, hooks, область действия настроек, маршрутизацию, handoff, checkpoints, верификацию и необязательную телеметрию. Сначала формирует аудит, затем предлагает минимальные изменения и ничего не перезаписывает без разрешения.

## Установка в Codex

Попросите Codex установить skill из:

```text
https://github.com/antuzinski/agent-workspace-inspector/tree/main/workspace-inspector
```

Либо скопируйте папку `workspace-inspector/` в:

```text
~/.codex/skills/workspace-inspector/
<repo>/.agents/skills/workspace-inspector/
```

Запуск:

```text
$workspace-inspector Проведи аудит этого рабочего пространства Codex и предложи минимально полезные изменения.
```

## Установка в Claude Code

Скопируйте папку `workspace-inspector/` в:

```text
~/.claude/skills/workspace-inspector/
<repo>/.claude/skills/workspace-inspector/
```

Запуск:

```text
/workspace-inspector проведи аудит этого рабочего пространства Claude Code
```

Общий `SKILL.md` совместим с обеими системами. Готовые шаблоны разделены на `assets/codex/` и `assets/claude/`.

## Что настраивается

- основная работа выполняется текущим агентом;
- bounded worker получает только самостоятельную и проверяемую часть;
- critical reviewer используется только при существенном риске или неразрешённой проблеме;
- subagents всегда возвращают результат основному агенту;
- checkpoint создаётся только на реальной границе зависимости, риска, паузы или делегирования;
- результат подтверждается пропорциональной проверкой.

Названия моделей не зафиксированы жёстко: доступность и оптимальный выбор зависят от продукта, тарифа и текущей версии.

Лицензия: MIT.
