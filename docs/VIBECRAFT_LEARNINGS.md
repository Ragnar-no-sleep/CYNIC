# CYNIC - Vibecraft Learnings & Implementation Roadmap

> Analysis date: 2026-01-19
> Source: https://github.com/Nearcyan/vibecraft
> Verdict: HOWL (masterclass)

---

## Executive Summary

Vibecraft is a 3D real-time visualization of Claude Code activity. Analysis reveals several patterns and architectures that can significantly improve CYNIC's dashboard and agent system.

---

## Gap Analysis

### Critical Gaps

| ID | Gap | Current State | Target State | Priority |
|----|-----|---------------|--------------|----------|
| GAP-C1 | **The Collective not triggering** | 11 Dogs, 0 invocations | Agents respond to every tool use | P0 |
| GAP-C2 | **No duration tracking** | Events have no duration | Match pre/post via toolUseId | P0 |
| GAP-C3 | **EventBus disconnected from hooks** | 39 subs, 1 event delivered | Hooks to EventBus to Handlers | P0 |

### Important Gaps

| ID | Gap | Current State | Target State | Priority |
|----|-----|---------------|--------------|----------|
| GAP-I1 | **No station mapping** | Tools visually identical | brain_ to station icons | P1 |
| GAP-I2 | **Simple Live view** | List of observations | Timeline + stations + icons | P1 |
| GAP-I3 | **No thinking indicator** | Static UI | Animated thinking dots | P1 |
| GAP-I4 | **Handlers not modular** | Mixed in Collective | 6 focused handler files | P1 |

### Nice-to-Have

| ID | Gap | Current State | Target State | Priority |
|----|-----|---------------|--------------|----------|
| GAP-N1 | **No spatial audio** | Silent | Tone.js tool sounds | P2 |
| GAP-N2 | **No prompt injection** | Dashboard read-only | Send prompts from UI | P2 |
| GAP-N3 | **No multi-session UI** | Single session | Hex zones per session | P2 |
| GAP-N4 | **ecosystem_monitor MCP bug** | HTTP workaround | Full MCP SSE support | P2 |

---

## Station Mapping (CYNIC)

```javascript
const CYNIC_STATION_MAP = {
  // Judgment and Analysis
  brain_cynic_judge: { station: 'judgment-throne', icon: '⚖️', color: '#FFD700' },
  brain_cynic_refine: { station: 'judgment-throne', icon: '🔄', color: '#FFD700' },
  brain_cynic_digest: { station: 'digestion-pit', icon: '🧠', color: '#9B59B6' },
  brain_cynic_feedback: { station: 'judgment-throne', icon: '📝', color: '#FFD700' },

  // Search and Knowledge
  brain_search: { station: 'archive-tower', icon: '🔍', color: '#3498DB' },
  brain_search_index: { station: 'archive-tower', icon: '📇', color: '#3498DB' },
  brain_timeline: { station: 'archive-tower', icon: '📅', color: '#3498DB' },
  brain_get_observations: { station: 'archive-tower', icon: '👁️', color: '#3498DB' },
  brain_patterns: { station: 'pattern-web', icon: '🔮', color: '#E74C3C' },

  // Chain and Persistence
  brain_poj_chain: { station: 'chain-forge', icon: '⛓️', color: '#F39C12' },

  // Ecosystem
  brain_ecosystem: { station: 'watchtower', icon: '🌍', color: '#27AE60' },
  brain_ecosystem_monitor: { station: 'watchtower', icon: '📡', color: '#27AE60' },
  brain_docs: { station: 'library', icon: '📚', color: '#8E44AD' },

  // Collective and Agents
  brain_collective_status: { station: 'kennel', icon: '🐕', color: '#E67E22' },
  brain_agents_status: { station: 'kennel', icon: '🐾', color: '#E67E22' },

  // System
  brain_health: { station: 'control-room', icon: '💓', color: '#1ABC9C' },
  brain_metrics: { station: 'control-room', icon: '📊', color: '#1ABC9C' },
  brain_meta: { station: 'mirror', icon: '🪞', color: '#95A5A6' },

  // Learning and Orchestration
  brain_learning: { station: 'training-yard', icon: '📈', color: '#2ECC71' },
  brain_triggers: { station: 'tripwire-field', icon: '⚡', color: '#E74C3C' },
  brain_orchestrate: { station: 'conductor-podium', icon: '🎭', color: '#9B59B6' },
  brain_vector_search: { station: 'constellation', icon: '✨', color: '#3498DB' },
};
```

---

## Implementation Order

### Sprint 1: Foundation (Critical)
1. GAP-C1: Fix The Collective triggering
2. GAP-C2: Add duration tracking
3. GAP-C3: Connect EventBus to hooks

### Sprint 2: Visual (Important)
4. GAP-I1: Create station mapping
5. GAP-I2: Enhance Live view with timeline
6. GAP-I3: Add thinking indicator
7. GAP-I4: Modularize handlers

### Sprint 3: Polish (Nice-to-Have)
8. GAP-N1: Add spatial audio
9. GAP-N2: Prompt injection
10. GAP-N3: Multi-session UI
11. GAP-N4: Fix ecosystem_monitor bug

---

## Architecture Comparison

```
VIBECRAFT:
Claude Code -> Hook Script -> WebSocket -> Three.js Browser
                   |
            events.jsonl
EventBus -> 6 Handler Modules -> Scene/Feed/Sound

CYNIC:
Claude Code -> MCP SSE -> Server -> Dashboard
                 |
PostgreSQL + Redis + PoJ Chain
The Collective -> 11 Dogs -> EventBus (39 subs, 0 triggers!)

GAP: EventBus not connected to MCP tool execution!
```

---

## Key Learnings

1. **Dual-write pattern** is robust (file + HTTP)
2. **EventBus modularity** prevents monolithic handlers
3. **Station mapping** makes tools visually distinct
4. **Duration tracking** requires pre/post matching
5. **All 8 hooks** should be utilized
6. **Spatial audio** adds immersion without audio files
7. **Thinking indicators** improve perceived responsiveness

---

*"phi distrusts phi" - kunikos*

**Confidence: 61.8%**
