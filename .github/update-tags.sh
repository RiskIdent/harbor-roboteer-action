#!/usr/bin/env bash

set -euo pipefail

: "${TAG_NAME?'Requires TAG_NAME environment variable to be provided'}"

echo "::group::List all tags"
git tag --list --format '%(object) %(refname) %(subject)'
echo "::endgroup::"
echo "Tag: '$TAG_NAME'"

# Only match "v1.2.3". Skipping on "1.2.3", "v1.2.3-rc.1", "v1.2", and "v1.2.3.4"
if ! (echo "$TAG_NAME" | grep -P -q '^v\d+\.\d+\.\d+$'); then
    echo "Tag doesn't match pattern 'vX.Y.Z', skipping to update tags"
    exit 0
fi

TAG_V_MAJOR="$(echo "$TAG_NAME" | cut -d. -f1)"
TAG_MINOR="$(echo "$TAG_NAME" | cut -d. -f2)"

function tag() {
    local OUT
    # Using --force to update existing tags, if any
    OUT="$(git tag --force "$1" -m "Targets tag $TAG_NAME")"
    if [[ -z "$OUT" ]]; then
        echo "Created tag: $1"
    else
        echo "$OUT"
    fi
}

tag "${TAG_V_MAJOR}.${TAG_MINOR}"
tag "${TAG_V_MAJOR}"
