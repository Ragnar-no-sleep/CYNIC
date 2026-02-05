---
name: proactive
description: Display TriggerEngine state - proactive suggestions system. Use when asked about proactive triggers, suggestion system, burnout detection, error pattern detection, or CYNIC's anticipation capabilities.
user-invocable: true
---

# /proactive - Trigger Engine Dashboard

*"Le chien anticipe"* - CYNIC becomes proactive, not just reactive

## Execution

Run the trigger engine dashboard script:

```bash
node scripts/lib/proactive-dashboard.mjs
```

Display the output directly to the user. The dashboard shows trigger state with ANSI colors.

## What It Shows

1. **Engine Status**: Enabled, voting threshold
2. **Triggers**: All 6 trigger types with cooldown status
3. **Context**: Current user energy, focus, goals
4. **Pending Suggestions**: Awaiting outcome
5. **Acceptance Rates**: How often suggestions are followed

## The 6 Triggers

| Trigger | Condition | Action |
|---------|-----------|--------|
| ERROR_PATTERN | Same error 3+ times | Suggest fix |
| CONTEXT_DRIFT | User strays from goal | Remind goal |
| BURNOUT_RISK | Energy < 38.2% (φ⁻²) | Suggest break |
| PATTERN_MATCH | Similar success found | Suggest reuse |
| DEADLINE_NEAR | Goal deadline < 24h | Prioritize |
| LEARNING_OPP | New pattern emerging | Highlight |

## Urgency Levels

| Level | When Used | Display |
|-------|-----------|---------|
| SUBTLE | Non-intrusive hints | Cyan |
| ACTIVE | Worth attention | Yellow |
| URGENT | Action required | Red |

## Cooldowns

Each trigger has a cooldown to prevent spam:

| Trigger | Cooldown |
|---------|----------|
| ERROR_PATTERN | 5 min |
| CONTEXT_DRIFT | 10 min |
| BURNOUT_RISK | 30 min |
| PATTERN_MATCH | 2 min |
| DEADLINE_NEAR | 15 min |
| LEARNING_OPP | 5 min |

## Force Fire (Testing)

To test a trigger, use the `forceFire()` method:

```javascript
const engine = getTriggerEngine();
engine.forceFire('BURNOUT_RISK'); // Forces burnout trigger
```

## CYNIC Voice

**Normal**: `*sniff* Trigger engine operational. Watching for patterns.`

**Suggestion Active**: `*ears perk* 💡 PROACTIVE: [message]`

**Burnout Detected**: `*concerned sniff* Energy low. Consider a break.`

## See Also

- `/psy` - Human psychology dashboard
- `/patterns` - Detected patterns
- `/health` - System health
- `/stats` - Telemetry
