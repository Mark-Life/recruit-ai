#!/bin/bash
# Rewrite "bun test" to "bun run test" — bun treats them differently

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command')

if [[ "$COMMAND" == "bun test"* ]]; then
  MODIFIED_COMMAND="${COMMAND/bun test/bun run test}"
  jq -n \
    --arg cmd "$MODIFIED_COMMAND" \
    '{
      "hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "permissionDecision": "allow",
        "permissionDecisionReason": "Rewritten bun test to bun run test",
        "updatedInput": {
          "command": $cmd
        }
      }
    }'
fi
