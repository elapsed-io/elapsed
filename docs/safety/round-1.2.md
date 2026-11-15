# Safety overview: Release 1, round 2 (Timer engine)

Date: 2026-11-15. Template: plan, Safety overviews > Round overview.

## 1. What changed

`packages/core` now holds the session model from the plan's Data model (segments, gaps, mode spans, end
reason, local day; schema 1), pure functions for every transition and derived value, a strict validator
with a schema-migration entry point, a typed synchronous event bus, a single scheduler that keeps one timer
in monotonic time, and the timer engine. The engine takes an injected clock (device time, monotonic time,
timers), an injected id generator and an injected time zone; it computes elapsed time only from stored
timestamps, wakes only when the visible value will change (every second for the first 10 s, every 10 s to
a minute, then every minute, by default), and emits typed events. Following the owner's decisions of
2026-11-15, it detects a device clock set back while the page is open by comparing the device clock with
the monotonic clock and shifts the open session back by the jump; a forward jump counts like sleep; time
zones and daylight saving are not jumps. A fake clock that models sleep on both kinds of platform,
background throttling and clock changes is exported for tests. The engine is not connected to the page
yet (round 3), so the shipped site is unchanged.

## 2. Data

None newly read, stored or sent. A session exists only in the engine's memory and only in tests until
round 3 connects the engine to the page; it is not persisted until round 4. The session holds only the
fields in the plan's Data model: timestamps, the display modes shown, the end reason and the local day.
It holds nothing about what the user is working on. `docs/data-inventory.md` is updated to say so.

## 3. Inputs

| Input | Validation |
| --- | --- |
| Stored or synced sessions (used from round 4; the Release 3 server reuses it) | `migrateSession` reads the schema number and dispatches; `parseSession` accepts exactly the schema's fields, plain objects with data fields only (accessors rejected without running them), whole non-negative safe-integer times, ordered non-overlapping segments with at most one running segment and only last, ordered gaps and mode spans, a first mode that starts with the session, a known end reason consistent with the segments, a real calendar date, and caps from the config module (10,000 segments, 10,000 gaps, 1,000 mode changes). It returns a fresh frozen object, never the input. |
| Display mode ids (`start`, `switchMode`) | Lowercase letters, digits and hyphens, starting with a letter, at most 32 characters. Anything else throws. |
| End reasons, seconds display | Checked against their fixed lists at runtime; anything else throws. |
| Session ids from the injected generator | Must be lowercase UUIDs; anything else throws before a session exists. |
| Time zone from the injected provider | Checked with `Intl`; an unknown zone falls back to UTC. |
| The device clock | Not trusted to move forward only: backward jumps beyond 250 ms shift the open session, smaller steps are absorbed, and every recorded time is at least the session's latest record. |

## 4. Dependencies

None added. No runtime dependencies; no new development dependencies.

## 5. Security surface

No CSP, header, storage, endpoint or authentication changes. The core package gains a second export,
`@stopwatch/core/testing` (the fake clock), which the site never imports. Lint now bans `Date.now()`,
argument-less `new Date()`, `performance.now()` and `Math.random()` in core source, so time and randomness
can only enter through injected dependencies.

## 6. Abuse cases

| Abuse case | Defence |
| --- | --- |
| A corrupted or crafted stored session (round 4 onward): wrong types, extra fields, `__proto__` keys, getters, reversed or overlapping segments, two running segments, impossible dates | `parseSession` rejects each, with tests for every case listed; it builds a new object field by field and never merges untrusted objects. |
| An oversized stored session used to slow the page or the server | Hard caps on every list; validation is a single linear pass. |
| Pause and resume spammed to bloat a session | At the 10,000-segment cap the engine refuses to pause; the session keeps running and can still be ended. |
| Setting the device clock back to rewrite history or break ordering | The open session shifts with the clock, so stored times stay ordered and focused time is unchanged: no gain. Ended sessions are never shifted. A shift never moves a time before 1970. |
| Setting the device clock forward to inflate focused time | Indistinguishable from a sleeping device, so it is credited, as the owner accepted. Round 4's check-ins credit unattended time only up to the next check-in, and Release 3's server checks times against its own clock. |
| Setting the clock back and then forward again to gain time | The backward step gains nothing; the forward step is the case above. |
| A misbehaving subscriber (a display mode or, later, a widget) throwing to stop the timer | The bus isolates handler errors and reports them; the scheduler isolates task errors. Tested. |
| A subscriber mutating the shared session | Sessions are deep-frozen. Tested. |
| A subscriber issuing commands inside an event | Re-entrant events are queued, so every subscriber sees one consistent order. Tested. |
| Malicious mode ids reaching the DOM in later rounds | The id pattern allows only `a-z`, `0-9` and `-`. |
| Timer floods | One timer for the whole engine; every wake is for a visible change. The tests count wakes exactly. |

## 7. Tests

156 new unit tests (249 in total), all with the fake clock:

- Local day: the 04:00 boundary, month, year and leap-day rollover, five time zones, both US daylight
  saving transitions, unknown zones.
- Session commands and derived values: the plan's data model exactly, deep freezing, illegal transitions,
  backdating limits, mode switches, shifting, focused time, pause count, longest stretch, milestone dating
  across pauses.
- Validation: 32 invalid shapes, accessor fields, error paths, schema migration and unsupported schemas.
- Event bus: typing, unsubscribe, re-entrant ordering, error isolation, handlers added or removed during
  delivery.
- Scheduler: one timer for the earliest task, replacement and cancellation, late timers running every due
  task in order, immunity to device clock changes, failing tasks, self-rescheduling, disposal.
- View: precision windows for all three seconds settings, rounding, the next change, the paused counter.
- Engine: exact wake counts (74 wakes in the first hour with seconds blurring away; 600 in ten minutes with
  seconds always shown; 10 with them never shown), pause and resume losing and gaining nothing, milestones
  dated exactly, ending, restarting, mode switches, the segment cap, error isolation, re-entrancy,
  frozen sessions, disposal.
- **Sleep**: with the monotonic clock paused (macOS) and running (Windows); one render on waking rather than
  one per missed minute; sleep during a pause.
- **Throttling**: timers aligned to a minute (exact focus at every wake, no drift over two hours), to a
  second, and a milestone noticed late but dated exactly.
- **Clock changes**: set back while running, while paused, during a long freeze, by small steps that add up,
  while idle and after a session ended; set forward; time zone and daylight saving changes.
- **Randomised**: 16 fixed seeds × 1,500 operations mixing every command, both kinds of sleep, throttling
  and clock changes. With an honest clock, focus matches an independent model of true time exactly. With a
  changing clock, every session stays valid, focus never goes backward, milestones are exact and at most one
  timer is ever pending. This test found one bug, fixed in this round (decision 45).
- Lint: the new core rules against banned and allowed snippets.

## 8. Open risks and follow-ups

1. **Stale display after waking on macOS (round 3).** When the monotonic clock pauses during sleep, the
   engine's next wake comes only after its remaining delay (up to a minute). Round 3 must call
   `engine.sync()` on `visibilitychange`, `pageshow` and `focus`; round 4's 30-second heartbeat also bounds it.
2. **Reopening with the clock behind (round 4).** The owner's rule (decision 40) needs the heartbeat, which
   round 4 adds; the pure `shiftSession` it will use is built and tested.
3. **Forward jumps are credited** until round 4's check-ins and Release 3's server checks exist. Accepted by
   the owner.
4. **Event list additions.** `mode.switched` and `clock.jumped` extend the plan's event list (decision 48).
5. **Real browser clocks.** The fake clock models documented platform behaviour; refresh, sleep and
   multi-tab behaviour on real browsers get end-to-end tests in round 4 and device checks in round 8.
6. **Time zone data** comes from each browser's `Intl` database, which can lag rule changes in rare zones.
   It affects only which day a session counts toward.
7. **The config module is not frozen at runtime** (`as const` is type-level). All code that can reach it is
   first-party; one test changes a limit temporarily and restores it. Revisit if third-party code ever runs
   in the timer page's context, which the plan forbids.
