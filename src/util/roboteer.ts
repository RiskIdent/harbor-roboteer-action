import * as core from "@actions/core";
import * as httpm from "@actions/http-client";
import * as am from "@actions/http-client/lib/auth";

interface CreateResponse {
  robot: {
    id: number;
    username: string;
    password: string;
  };
  deleteToken: string;
}

export function createRobotAccount(opts: {
  jwt: string;
  roboteerUrl: string;
  robotName: string;
}): Promise<CreateResponse> {
  const http = new httpm.HttpClient("harbor-login-action", [new am.BearerCredentialHandler(opts.jwt)]);

  return retry(async () => {
    const resp = await http.post(
      new URL("api/roboteer/v1/robot", opts.roboteerUrl).toString(),
      JSON.stringify({name: opts.robotName}, null, 2),
    );

    const body = await resp.readBody();
    const statusCode = resp.message.statusCode ?? 0;
    const mimeType = contentMimeType(resp.message.headers[httpm.Headers.ContentType]);
    if (mimeType == "text/html") {
      throw new Error(
        `Expected ${httpm.MediaTypes.ApplicationJson} response, but got HTML response.\n\nWe are probably talking to Harbor when we should be talking to harbor-roboteer. The harbor-roboteer server will never respond with HTML.`,
      );
    }
    if (statusCode < 200 || statusCode >= 300) {
      throw new Error(
        `Failed to create robot account. HTTP status ${statusCode} ${resp.message.statusMessage ?? "unknown"}, response body: ${errorFromBody(body, mimeType)}\n\nSee the logs on harbor-roboteer for more information, or contact your system administrators.`,
      );
    }
    if (mimeType != httpm.MediaTypes.ApplicationJson) {
      throw new Error(`Expected ${httpm.MediaTypes.ApplicationJson} response, but got ${mimeType || "none"}`);
    }

    const obj: CreateResponse = JSON.parse(body);
    if (!obj.deleteToken || !obj.robot || !obj.robot.id || !obj.robot.username || !obj.robot.password) {
      throw new Error(`Incomplete response. Missing fields`);
    }

    return obj;
  });
}

export function deleteRobotAccount(opts: {deleteToken: string; robotId: number; roboteerUrl: string}): Promise<void> {
  const http = new httpm.HttpClient("harbor-login-action", [new am.BearerCredentialHandler(opts.deleteToken)]);

  return retry(async () => {
    const resp = await http.del(
      new URL(`api/roboteer/v1/robot?robot_id=${encodeURIComponent(opts.robotId)}`, opts.roboteerUrl).toString(),
    );

    const body = await resp.readBody();
    const statusCode = resp.message.statusCode ?? 0;
    const mimeType = contentMimeType(resp.message.headers[httpm.Headers.ContentType]);
    if (mimeType == "text/html") {
      throw new Error(
        `Expected ${httpm.MediaTypes.ApplicationJson} response, but got HTML response.\n\nWe are probably talking to Harbor when we should be talking to harbor-roboteer. The harbor-roboteer server will never respond with HTML.`,
      );
    }
    if (statusCode < 200 || statusCode >= 300) {
      throw new Error(
        `Failed to delete robot account. HTTP status ${statusCode} ${resp.message.statusMessage ?? "unknown"}, response body: ${errorFromBody(body, mimeType)}`,
      );
    }
    if (statusCode !== 204) {
      core.warning(
        `Expected HTTP status 204 No Content when deleting robot account, but got ${resp.message.statusCode} ${resp.message.statusMessage}`,
      );
    }
  });
}

export function errorFromBody(body: string, mimeType: string): string {
  switch (mimeType) {
    case "text/html":
      return "(body is HTML, refusing to log it for brevity)";
    case "application/json":
      return "(body is JSON, refusing to log it for brevity)";
    case "application/problem+json":
      return tryParseProblem(body);
    default:
      if (mimeType == "" && body == "") {
        return "(no body)";
      }
      const trimmed = body.length < 500 ? body : body.substring(0, 500) + "... (trimmed)";
      return `(unknown content type: "${mimeType}") ${trimmed}`;
  }
}

function contentMimeType(contentType: string | undefined): string {
  return contentType?.split(";")[0].trim() || "";
}

function tryParseProblem(body: string): string {
  try {
    const obj = JSON.parse(body);
    if (typeof obj !== "object" || Array.isArray(obj)) {
      return "(invalid application/problem+json)";
    }
    const title = `${obj.title ?? ""}`.trim();
    const detail = `${obj.detail ?? ""}`.trim();
    if (title && detail) {
      return `${title}: ${detail}`;
    }
    if (title) {
      return title;
    }
    if (detail) {
      return detail;
    }
    return "(empty application/problem+json)";
  } catch {
    return "(invalid application/problem+json)";
  }
}

async function retry<T>(func: () => Promise<T>): Promise<T> {
  const ATTEMPTS = 5;
  let delayMs = 1000;
  let lastErr;
  for (var attempt = 0; attempt < ATTEMPTS; attempt++) {
    if (attempt > 0) {
      core.warning(`Operation failed. Retrying in ${delayMs}ms`);
      await sleep(delayMs);
      delayMs *= 1.5; // 1000 => 1500 => 2250 => 3375 => 5062
    }
    try {
      return await func();
    } catch (e) {
      lastErr = e;
    }
  }
  throw new Error(`retried ${ATTEMPTS} times: ${lastErr}`);
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise(res => {
    setTimeout(res, milliseconds);
  });
}
