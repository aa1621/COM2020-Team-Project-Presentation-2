import request from "supertest";
import { jest } from "@jest/globals";

const mockSingle = jest.fn();
const mockMaybeSingle = jest.fn();
const mockInsertSingle = jest.fn();

const mockEq = jest.fn(() => ({ maybeSingle: mockMaybeSingle, single: mockSingle }));
const mockSelect = jest.fn(() => ({ eq: mockEq }));
const mockInsertSelect = jest.fn(() => ({ single: mockInsertSingle }));
const mockInsert = jest.fn(() => ({ select: mockInsertSelect }));
const mockFrom = jest.fn((table) => {
  if (table === "users") {
    return {
      select: mockSelect,
      insert: mockInsert,
    };
  }
  return {};
});

jest.unstable_mockModule("../src/lib/supabaseClient.js", () => {
  return {
    supabaseAdmin: { from: mockFrom },
    supabaseUser: {},
  };
});

const { default: app } = await import("../src/app.js");

beforeEach(() => {
  mockFrom.mockClear();
  mockSelect.mockClear();
  mockEq.mockClear();
  mockMaybeSingle.mockReset();
  mockInsert.mockClear();
  mockInsertSelect.mockClear();
  mockInsertSingle.mockReset();
});

describe("Auth signup tests", () => {
  test("rejects missing username and password", async () => {
    const res = await request(app).post("/auth/signup").send({});

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Username and password are required." });
  });

  test("rejects short username", async () => {
    const res = await request(app).post("/auth/signup").send({
      username: "ab",
      password: "123456",
    });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Username must be at least 3 characters long." });
  });

  test("rejects short password", async () => {
    const res = await request(app).post("/auth/signup").send({
      username: "newuser",
      password: "123",
    });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Password must be at least 6 characters long." });
  });

  test("rejects duplicate usernames", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { user_id: "existing-id" },
      error: null,
    });

    const res = await request(app).post("/auth/signup").send({
      username: "existinguser",
      password: "123456",
    });

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: "That username is already taken." });
  });

  test("creates a participant account", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: null,
      error: null,
    });

    const mockUser = {
      user_id: "user-123",
      username: "newuser",
      display_name: "New User",
      role: "participant",
      group_id: null,
    };

    mockInsertSingle.mockResolvedValue({
      data: mockUser,
      error: null,
    });

    const res = await request(app).post("/auth/signup").send({
      username: "newuser",
      display_name: "New User",
      password: "123456",
    });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ user: mockUser });
  });
});
