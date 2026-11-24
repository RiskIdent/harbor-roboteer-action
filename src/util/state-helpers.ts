import * as core from "@actions/core";

const CLEANUP_STATE_KEY = "harbor-roboteer-cleanup";

/**
 * Indicates whether the POST action is running
 */
export const isPost = !!core.getState("isPost");

// Publish a variable so that when the POST action runs, it can determine it should run the cleanup logic.
// This is necessary since we don't have a separate entry point.
// Copied from: https://github.com/actions/checkout/blob/v3.5.3/src/state-helper.ts
if (!isPost) {
  core.saveState("isPost", "true");
}

interface CleanupState {
  deleteToken: string;
  robotId: number;
}

export function addCleanupState(state: CleanupState) {
  const oldState = getCleanupStates();
  oldState.push(state);
  core.saveState(CLEANUP_STATE_KEY, oldState);
}

export function getCleanupStates(): CleanupState[] {
  const raw = core.getState(CLEANUP_STATE_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed: CleanupState[] = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      core.warning("Failed to read cleanup state. State was not an array");
      return [];
    }
    const filtered = parsed.filter(x => typeof x === "object" && x.deleteToken && x.robotId);
    if (filtered.length !== parsed.length) {
      core.warning("Failed to read cleanup state. Skipping invalid array elements");
    }
    return filtered;
  } catch {
    core.warning("Failed to read cleanup state. State was not valid JSON");
    return [];
  }
}
