/**
 * Jest global setup: enforce deterministic unit tests.
 *
 * - Disallow real outbound network calls during unit tests.
 * - Keep unit tests isolated and safe to run anywhere.
 *
 * Important: store spy handles returned by jest.spyOn(...) and restore those,
 * rather than calling mockRestore() on the module functions directly.
 */
const http = require("node:http");
const https = require("node:https");

let httpRequestSpy;
let httpGetSpy;
let httpsRequestSpy;
let httpsGetSpy;

beforeAll(() => {
  httpRequestSpy = jest.spyOn(http, "request").mockImplementation(() => {
    throw new Error("Unit tests must not make real HTTP requests. Mock the network layer.");
  });

  httpGetSpy = jest.spyOn(http, "get").mockImplementation(() => {
    throw new Error("Unit tests must not make real HTTP requests. Mock the network layer.");
  });

  httpsRequestSpy = jest.spyOn(https, "request").mockImplementation(() => {
    throw new Error("Unit tests must not make real HTTPS requests. Mock the network layer.");
  });

  httpsGetSpy = jest.spyOn(https, "get").mockImplementation(() => {
    throw new Error("Unit tests must not make real HTTPS requests. Mock the network layer.");
  });
});

afterAll(() => {
  // Restore only if the spy exists (defensive in case something changes later)
  if (httpRequestSpy) httpRequestSpy.mockRestore();
  if (httpGetSpy) httpGetSpy.mockRestore();
  if (httpsRequestSpy) httpsRequestSpy.mockRestore();
  if (httpsGetSpy) httpsGetSpy.mockRestore();
});
