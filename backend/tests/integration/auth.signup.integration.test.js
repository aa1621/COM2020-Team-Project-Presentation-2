import request from "supertest";
import { jest } from "@jest/globals";

const maybeSingleMock = jest.fn();
const insertSingleMock = jest.fn();

const supabaseAdmin = {
  from: jest.fn((table) => {
    if (table !== "users") {
      throw new Error(`Unexpected table: ${table}`);
    }

    return {
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          maybeSingle: maybeSingleMock,
        })),
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: insertSingleMock,
        })),
      })),
    };
  }),
};

const supabaseUser = {};

jest.unstable_mockModule("../../src/lib/supabaseClient.js", () => ({
  supabaseAdmin,
  supabaseUser,
}));

const { default: app } = await import("../../src/app.js");

describe("Auth signup integration tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("POST /auth/signup creates a user with valid input", async () => {
    maybeSingleMock.mockResolvedValueOnce({
      data: null,
      error: null,
    });

    insertSingleMock.mockResolvedValueOnce({
      data: {
        user_id: "user-123",
        username: "jason123",
        display_name: "Jason",
        role: "participant",
        group_id: null,
      },
      error: null,
    });

    const res = await request(app).post("/auth/signup").send({
      username: "jason123",
      display_name: "Jason",
      password: "secret1",
    });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      user: {
        user_id: "user-123",
        username: "jason123",
        display_name: "Jason",
        role: "participant",
        group_id: null,
      },
    });
  });

  test("POST /auth/signup returns 409 when username already exists", async () => {
    maybeSingleMock.mockResolvedValueOnce({
      data: { user_id: "existing-user" },
      error: null,
    });

    const res = await request(app).post("/auth/signup").send({
      username: "jason123",
      password: "secret1",
    });

    expect(res.status).toBe(409);
    expect(res.body).toEqual({
      error: "That username is already taken.",
    });
  });
});