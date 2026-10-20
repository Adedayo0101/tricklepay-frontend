#!/bin/sh
set -e

# Configures git to use the version-controlled .githooks directory,
# or copies hooks to .git/hooks if core.hooksPath cannot be set.
if git config core.hooksPath .githooks; then
  echo "Git hooks configured successfully: core.hooksPath set to .githooks"
else
  mkdir -p .git/hooks
  cp .githooks/pre-commit .git/hooks/pre-commit
  chmod +x .git/hooks/pre-commit
  echo "Git hooks installed to .git/hooks/pre-commit"
fi
