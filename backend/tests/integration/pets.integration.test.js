import request from "supertest";
import { jest } from "@jest/globals";

const maybeSingleMock = jest.fn();
const insertSingleMock = jest.fn();
const updateMaybeSingleMock = jest.fn();
const catalogMaybeSingleMock = jest.fn();
const catalogOrderMock = jest.fn();

const supabaseUser = {
  from: jest.fn((table) => {
    if (table === "pet_catalog") {
      return {
        select: jest.fn(() => ({
          eq: jest.fn((column, value) => {
            if (column === "is_active") {
              return {
                order: catalogOrderMock,
              };
            }

            return {
              maybeSingle: catalogMaybeSingleMock,
            };
          }),
        })),
      };
    }

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
    maybeSingleMock.mockResolvedValueOnce({ data: null, error: null });
    catalogMaybeSingleMock.mockResolvedValueOnce({ data: null, error: null });

    const res = await request(app)
      .post("/pets")
      .set("x-user-id", "demo")
      .send({
        pet_type: "dog",
        nickname: "Milo",
      });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: "Selected pet was not found in the catalog",
    });
  });

  test("GET /pets/catalog returns active pets", async () => {
    catalogOrderMock.mockResolvedValueOnce({
      data: [
        {
          pet_type: "cat",
          name: "Cat",
          description: "Starter cat",
          image_url: "https://example.com/cat.png",
          is_active: true,
          sort_order: 1,
        },
      ],
      error: null,
    });

    const res = await request(app).get("/pets/catalog");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      pets: [
        {
          pet_type: "cat",
          name: "Cat",
          description: "Starter cat",
          image_url: "https://example.com/cat.png",
          is_active: true,
          sort_order: 1,
        },
      ],
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
