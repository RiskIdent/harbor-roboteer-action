import {describe, expect, test} from "bun:test";
import {errorFromBody} from "./roboteer";

describe("errorFromBody", () => {
  const problem = "application/problem+json";
  const cases = [
    {body: "", mime: "", want: "(no body)"},
    {
      body: "foo",
      mime: "application/json",
      want: "(body is JSON, refusing to log it for brevity)",
    },
    {
      body: "foo",
      mime: "text/html",
      want: "(body is HTML, refusing to log it for brevity)",
    },
    {
      body: "foo",
      mime: "application/thingie+json",
      want: '(unknown content type: "application/thingie+json") foo',
    },
    {
      body: '{"title": "oh nooo", "detail": ""}',
      mime: problem,
      want: "oh nooo",
    },
    {body: '{"title": "oh nooo"}', mime: problem, want: "oh nooo"},
    {
      body: '{"title": "oh nooo", "detail": "thing went bad"}',
      mime: problem,
      want: "oh nooo: thing went bad",
    },
    {
      body: '{"title": "", "detail": "thing went bad"}',
      mime: problem,
      want: "thing went bad",
    },
    {
      body: '{"detail": "thing went bad"}',
      mime: problem,
      want: "thing went bad",
    },
    {
      body: '{"title": 123, "detail": false}',
      mime: problem,
      want: "123: false",
    },
    {
      body: '{"title": {"foo": "bar"}}',
      mime: problem,
      want: "[object Object]",
    },
  ];
  test.each(cases)("mime type '$mime'", ({body, mime, want}) => {
    expect(errorFromBody(body, mime)).toBe(want);
  });
});
