import {describe, expect, test} from "bun:test";
import {injectDockerAuth} from "./auth-setup";

describe("inject docker auth", () => {
  test("add auth on empty", () => {
    expect(
      injectDockerAuth(null, {
        host: "example.com",
        basicAuth: "YWRtaW46cGFzc3dvcmQ=", // admin:password
      }),
    ).toEqual({
      auths: {
        "example.com": {
          auth: "YWRtaW46cGFzc3dvcmQ=",
        },
      },
    });
  });

  test("keep other auth", () => {
    expect(
      injectDockerAuth(
        {
          auths: {
            "other.example.com": {
              auth: "foobar",
            },
          },
        },
        {
          host: "example.com",
          basicAuth: "YWRtaW46cGFzc3dvcmQ=", // admin:password
        },
      ),
    ).toEqual({
      auths: {
        "example.com": {
          auth: "YWRtaW46cGFzc3dvcmQ=",
        },
        "other.example.com": {
          auth: "foobar",
        },
      },
    });
  });

  test("keep unknown fields", () => {
    expect(
      injectDockerAuth(
        {
          someOtherField: 123,
        },
        {
          host: "example.com",
          basicAuth: "YWRtaW46cGFzc3dvcmQ=", // admin:password
        },
      ),
    ).toEqual({
      someOtherField: 123,
      auths: {
        "example.com": {
          auth: "YWRtaW46cGFzc3dvcmQ=",
        },
      },
    });
  });

  test("replace array", () => {
    expect(
      injectDockerAuth(["hello"], {
        host: "example.com",
        basicAuth: "YWRtaW46cGFzc3dvcmQ=", // admin:password
      }),
    ).toEqual({
      auths: {
        "example.com": {
          auth: "YWRtaW46cGFzc3dvcmQ=",
        },
      },
    });
  });

  test("override host auth", () => {
    expect(
      injectDockerAuth(
        {
          auths: {
            "example.com": {
              username: "admin",
              password: "password",
            },
          },
        },
        {
          host: "example.com",
          basicAuth: "YWRtaW46cGFzc3dvcmQ=", // admin:password
        },
      ),
    ).toEqual({
      auths: {
        "example.com": {
          auth: "YWRtaW46cGFzc3dvcmQ=",
        },
      },
    });
  });
});
