import * as io from "@actions/io";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";

export async function setupDockerAuth(host: string, basicAuth: string) {
  const dockerConfig = path.join(os.homedir(), ".docker", "config.json");
  injectDockerAuthIntoFile(dockerConfig, {host, basicAuth});
}

export async function setupHelmAuth(host: string, basicAuth: string) {
  const helmConfig = path.join(os.homedir(), ".config", "helm", "registry", "config.json");
  injectDockerAuthIntoFile(helmConfig, {host, basicAuth});
}

async function injectDockerAuthIntoFile(file: string, auth: {host: string; basicAuth: string}): Promise<void> {
  await io.mkdirP(path.dirname(file));
  const dockerConfig = await tryReadJsonFile(file);
  await writeJsonFile(file, injectDockerAuth(dockerConfig, auth));
}

export function injectDockerAuth(
  previousFile: any | null,
  auth: {
    host: string;
    basicAuth: string;
  },
): object {
  previousFile = !previousFile || Array.isArray(previousFile) ? {} : previousFile;
  previousFile.auths = previousFile.auths || {};
  previousFile.auths[auth.host] = {auth: auth.basicAuth};
  return previousFile;
}

async function tryReadJsonFile(file: string): Promise<any | null> {
  const content = (await tryReadFile(file)).trim();
  if (!content) {
    return null;
  }
  return JSON.parse(file);
}

async function tryReadFile(file: string): Promise<string> {
  try {
    return await fs.readFile(file, {encoding: "utf8"});
  } catch {
    return "";
  }
}

function writeJsonFile(file: string, data: any): Promise<void> {
  return fs.writeFile(file, JSON.stringify(data, null, 2));
}
