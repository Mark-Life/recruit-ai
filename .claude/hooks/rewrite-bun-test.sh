#!/bin/bash
# Deny "bun test" and remind to use "bun run test" instead
jq -n '{
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "deny",
    permissionDecisionReason: "Run bun run test instead"
  }
}'
