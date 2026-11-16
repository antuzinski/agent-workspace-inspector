---
name: visual-review-page
description: |
  Build a local HTML review page when the user explicitly asks for one or responds to an existing
  review page. Otherwise trigger only when at least three real alternatives or four connected
  stages/components need a visual layout that adds decision or review value beyond a clear chat,
  table, or Mermaid answer.
---

# Visual Explanation and Review Page

Use this skill only when the user asks for a separate page/review, answers on an existing page, or all
of these conditions hold: at least three real alternatives or four connected stages/components must
be compared or followed; visual layout or feedback fields materially help the user's task beyond text,
a table, or Mermaid; and the page adds a usable decision/review surface rather than just extra space.
Otherwise answer fully in chat. When you do create a page, the chat must still give the complete main
conclusion, key reasons, and required next steps; the page may add supporting detail but must not be
the only place where the answer can be understood. If the page or browser is unavailable, complete
the answer in chat and name the specific limitation.

Choose visuals that clarify the content: a process diagram for steps and handoffs, a labeled example
for an abstract idea, or a table/diagram for a comparison. Do not add imagery just to decorate.

## Explain and analyze in plain words

For explanations, show the idea, how its parts connect, and one concrete example when useful. For
analysis, distinguish observed facts from interpretation, uncertainty, and recommendation. For plans,
show the sequence, expected result, dependencies, and any real unresolved choice.

Do not turn an explanation into a fake approval flow: omit answer fields and decision prompts unless
the user actually needs to choose or comment. Empty answer fields never mean consent.

## Show, don't describe

Whatever can be shown is shown; text captions it and says what to look at. Pick what fits:

- **Variants**: each option shown finished, side by side, on the user's own material.
- **Sizes, zones, positions**: frames drawn over a real frame or screenshot (green: stay inside,
  red: never cross) instead of pixel numbers. Frames must match what is really on screen.
- **Layout or mechanism**: a small diagram of the idea next to the real result.
- **Before / after**: real frames side by side, a red box on the problem.
- **A one-moment error**: the still frame at that moment, or a strip of frames around it.
- **Sound**: one player with a variant switch that keeps the playback position.
- **The result itself** when it can be made in advance, including the awkward cases.

Abstract charts for something visible in the material, or frames that do not match the real frame,
mislead more than text.

## Decisions in plain words

The user agrees on meaning, not on code or instruction text:

- **Skill, prompt, or process change**: what the agent does now and what it will do after, in
  plain words, with a real-life example.
- **Code or script change**: what happens now on a live example, then the new steps in order and
  what that means for the user.
- No code, diffs, or verbatim instruction paragraphs. Exception: wording the user will see as
  written (a message, a caption, UI text) is shown as written.

## Page shape

One reading column. The top states the subject and the main answer. For an explanation, start with the
core idea; for analysis, give the finding and evidence; for a plan, give the goal and sequence. Add
"What I need from you" only if a real choice or feedback is needed.

Use sections and visuals that fit the subject. Use now/after, recommendation, questions, answer fields,
"Not doing", and collapsed evidence only when they add useful information. Each actual decision gets
its own question and answer field; give fields stable `data-id` values.

## Build and open

1. Create a page folder inside the current project next to the task's work files, so a later
   session can find it. Copy [page.html](assets/page.html) there as `index.html` and media into
   `v/`. Do not commit page folders unless the user asks.
2. Write the content as HTML using the template's components; give each answer field a stable
   `data-id` that never changes or repeats across rounds. Translate the UI labels and page text into
   the user's language.
3. Start the server using the command-execution tool and open its printed URL in the runtime's
   built-in browser. On Windows use `py -3`; on macOS/Linux use `python3`:

   ```powershell
   py -3 <skill-dir>\scripts\serve.py <page-folder>
   ```

   Keep the running command session so its printed URL is available. If a background process is
   needed, redirect output to a log inside the page folder and read the URL from that log.
4. Look at the page in the browser where the user will read it and fix anything that does not
   load or overflows.
5. In chat, give the URL and a brief summary. Mention open questions only when there are genuine
   decisions to answer.

## When the user has answered

When the user says in any words that they have answered, read `answers.json` in the page folder and
revise the page or plan based on their comments. Page answers are feedback, not permission. Do not add
a redundant approval pause when the user already authorized the work. If authorization or a decision
is still needed, answers alone do not grant it; wait for explicit direction. A doubt or question is not
agreement.

- Above each answered field, show what the user wrote and what the agent changed or why not.
- Move `answers.json` to `answers-<round>.json` so the fields start empty for the next round.
- The header says what changed since the last version; agreed items collapse and stay unchanged.
- Restart the server if it stopped, reopen the same page, and report as in step 5.
