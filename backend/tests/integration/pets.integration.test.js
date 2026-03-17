import request from "supertest";
import { jest } from "@jest/globals";

const maybeSingleMock = jest.fn();
const insertSingleMock = jest.fn();
const updateMaybeSingleMock = jest.fn();

const supabaseUser = {
  from: jest.fn((table) => {
    if (table === "pets") {
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            maybeSingle: maybeSingleMock,
          })),
        })),
      };
    }

    throw new Error(`Unexpected table: ${table}`);
  }),
};

const supabaseAdmin = {
  from: jest.fn((table) => {
    if (table === "pets") {
      return {
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: insertSingleMock,
          })),
        })),
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              maybeSingle: updateMaybeSingleMock,
            })),
          })),
        })),
      };
    }

    throw new Error(`Unexpected table: ${table}`);
  }),
};

jest.unstable_mockModule("../../src/lib/supabaseClient.js", () => ({
  supabaseUser,
  supabaseAdmin,
}));

const { default: app } = await import("../../src/app.js");

describe("Pets integration tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("POST /pets returns 400 when x-user-id header is missing", async () => {
    const res = await request(app).post("/pets").send({
      pet_type: "cat",
      nickname: "Milo",
    });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: 'Missing user id. Pass header "x-user-id"',
    });
  });

  test("POST /pets returns 400 when pet_type is invalid", async () => {
    const res = await request(app)
      .post("/pets")
      .set("x-user-id", "demo")
      .send({
        pet_type: "dog",
        nickname: "Milo",
      });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: "pet_type is required. Valid options cat, bird, turtle",
    });
  });

  test("PATCH /pets/me/nickname returns 400 when nickname is empty", async () => {
    const res = await request(app)
      .patch("/pets/me/nickname")
      .set("x-user-id", "demo")
      .send({
        nickname: "   ",
      });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: "nickname is required",
    });
  });
});