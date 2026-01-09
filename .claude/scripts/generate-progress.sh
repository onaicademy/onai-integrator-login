#!/bin/bash

# Progress Report Auto-Generator
# Usage: ./generate-progress.sh [summary]
#
# Creates a new progress report file with timestamp and template.
# Run at the END of each Claude Code session.

PROGRESS_DIR="$(dirname "$0")/../progress"
DATE=$(date +%Y-%m-%d)
TIME=$(date +%H:%M)
TIMEZONE="Almaty Time, UTC+5"

# Find next session number for today
SESSION_NUM=1
while [ -f "$PROGRESS_DIR/${DATE}_session_${SESSION_NUM}.md" ] || [ -f "$PROGRESS_DIR/${DATE}_session.md" -a $SESSION_NUM -eq 1 ]; do
    if [ $SESSION_NUM -eq 1 ] && [ -f "$PROGRESS_DIR/${DATE}_session.md" ]; then
        SESSION_NUM=2
    else
        SESSION_NUM=$((SESSION_NUM + 1))
    fi
done

# Determine filename
if [ $SESSION_NUM -eq 1 ]; then
    FILENAME="${DATE}_session.md"
else
    FILENAME="${DATE}_session_${SESSION_NUM}.md"
fi

FILEPATH="$PROGRESS_DIR/$FILENAME"

# Get summary from argument or use placeholder
SUMMARY="${1:-[Add summary of this session]}"

# Get recent commits
RECENT_COMMITS=$(git log --oneline -5 2>/dev/null || echo "No commits found")

# Get modified files
MODIFIED_FILES=$(git diff --name-only HEAD~5 2>/dev/null || echo "No changes tracked")

# Create the progress report
cat > "$FILEPATH" << EOF
# Progress Report - $DATE

## Session Info
- **Date**: $DATE
- **Time**: $TIME ($TIMEZONE)
- **Duration**: [Fill in]

## Summary
$SUMMARY

## Changes Made

### New Files
<!-- List new files created -->
- \`path/to/file\` - Description

### Modified Files
<!-- List modified files -->
$(echo "$MODIFIED_FILES" | head -10 | while read file; do echo "- \`$file\`"; done)

### Deleted Files
<!-- List deleted files (if any) -->

## Issues Fixed
<!-- List bugs fixed -->
- [FIX] Description

## Commits
\`\`\`
$RECENT_COMMITS
\`\`\`

## Feedback Received
<!-- User feedback and requests -->

## Next Steps
- [ ] Task 1
- [ ] Task 2

---
*Generated at $TIME on $DATE*
EOF

echo "✅ Created: $FILEPATH"
echo "📝 Please edit the file to add session details."
