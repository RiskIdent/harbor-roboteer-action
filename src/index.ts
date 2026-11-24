import * as core from "@actions/core";
import {setupDockerAuth, setupHelmAuth} from "./util/auth-setup";
import {createRobotAccount, deleteRobotAccount} from "./util/roboteer";
import {addCleanupState, getCleanupStates, isPost} from "./util/state-helpers";

interface Inputs {
  harborUrl: string;
  roboteerUrl: string;
  robotName: string;
  setupDockerAuth: boolean;
  setupHelmAuth: boolean;
  audience: string;
}

function getInput(): Inputs {
  const harborUrl = core.getInput("harbor-url", {required: true});
  return {
    harborUrl: harborUrl,
    roboteerUrl: core.getInput("roboteer-url") || harborUrl,
    robotName: core.getInput("robot-name") || "",
    setupDockerAuth: core.getBooleanInput("setup-docker-auth"),
    setupHelmAuth: core.getBooleanInput("setup-helm-auth"),
    audience: core.getInput("audience") || "harbor-roboteer",
  };
}

async function main() {
  const input = getInput();
  const githubToken = await core.getIDToken(input.audience);

  const payload = JSON.parse(Buffer.from(githubToken.split(".")[1], "base64").toString());
  await core.group("GitHub OIDC JWT claims", async () => console.log(payload));

  try {
    const resp = await createRobotAccount({
      jwt: githubToken,
      robotName: input.robotName,
      roboteerUrl: input.roboteerUrl,
    });

    core.setSecret(resp.robot.password);
    core.setSecret(resp.deleteToken);

    core.info(`Created robot account: '${resp.robot.username}' (id=${resp.robot.id})`);

    const basicAuth = Buffer.from(`${resp.robot.username}:${resp.robot.password}`).toString("base64");

    core.setOutput("username", resp.robot.username);
    core.setOutput("password", resp.robot.password);
    core.setOutput("robot-id", resp.robot.id);
    core.setOutput("auth", basicAuth);
    core.setOutput("delete-token", resp.deleteToken);

    addCleanupState({deleteToken: resp.deleteToken, robotId: resp.robot.id});

    if (input.setupDockerAuth) {
      const harborHostname = new URL(input.harborUrl).hostname;
      core.info(`Adding auth for '${harborHostname}' to ~/.docker/config.json`);
      setupDockerAuth(harborHostname, basicAuth);
    }
    if (input.setupHelmAuth) {
      const harborHostname = new URL(input.harborUrl).hostname;
      core.info(`Adding auth for '${harborHostname}' to ~/.config/helm/registry/config.json`);
      setupHelmAuth(harborHostname, basicAuth);
    }
  } catch (e) {
    core.setFailed(`${e}`);
  }
}

async function cleanup() {
  const input = getInput();
  const cleanupStates = getCleanupStates();
  if (cleanupStates.length === 0) {
    core.info(`No robot accounts to clean up.`);
    return;
  }
  for (const state of cleanupStates) {
    try {
      await deleteRobotAccount({
        roboteerUrl: input.roboteerUrl,
        deleteToken: state.deleteToken,
        robotId: state.robotId,
      });
      core.info(`Cleaned up robot account id=${state.robotId}`);
    } catch (e) {
      core.setFailed(`Failed to delete robot account: ${e}`);
    }
  }
}

if (isPost) {
  cleanup();
} else {
  main();
}
