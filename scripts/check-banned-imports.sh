#!/bin/bash

echo "Running banned imports check..."

BANNED_PATTERNS=(
  "auth()"
  "firestore()"
  "storage()"
  "firestore\.FieldValue"
  "SafeAreaView.*from ['\"]react-native['\"]"
)

# Search in specific directories
SEARCH_DIRS=("src" "app")

FAILED=0

for pattern in "${BANNED_PATTERNS[@]}"; do
  echo "Checking for pattern: $pattern"
  # Use grep to find the pattern recursively in the directories
  if grep -r -n -E "$pattern" "${SEARCH_DIRS[@]}"; then
    echo "ERROR: Found banned pattern '$pattern'"
    FAILED=1
  fi
done

if [ "$FAILED" -eq 1 ]; then
  echo "Check failed!"
  exit 1
fi

echo "Check passed!"
exit 0
