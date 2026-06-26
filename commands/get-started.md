---
description: Walk the full Fingerprint Get Started flow — detect the stack, install frontend identification, add server-side verification, and complete the remaining protection steps.
argument-hint: [optional-path]
allowed-tools: [Read, Glob, Grep, Bash, Edit, Write, Skill]
---

# Fingerprint — Get Started

Invoke the **`fingerprint-get-started`** skill (Skill tool) and follow it. It detects the project's
tech stack and walks the full Get Started checklist — frontend install, server-side verification,
ad-blocker protection, rules, tagging, and key protection — applying the matching per-stack and
feature skill for each step.

The user invoked this with: `$ARGUMENTS` — if it's a path, get started in that directory; otherwise
use the current working directory.
