import request from "supertest";
import { jest } from "@jest/globals";

const singleInviteMock = jest.fn();

const supabaseUser = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        order: jest.fn(),
      })),
    })),
  })),
};

const supabaseAdmin = {
  from: jest.fn((table) => {
    if (table !== "group_invites") {
      throw new Error(`Unexpected table: ${table}`);
    }

    return {
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: singleInviteMock,
        })),
      })),
    };
  }),
};

jest.unstable_mockModule("../../src/lib/supabaseClient.js", () => ({
  supabaseUser,
  supabaseAdmin,
}));

const { default: app } = await import("../../src/app.js");

describe("Invites integration tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET /invites returns 400 when "x-user-id" header is missing', async () => {
    const res = await request(app).get("/invites");

    expect(res.status).toBe(400);

    // matches your current controller exactly
    expect(res.body).toEqual({
      erorr: 'Missing "x-user-id" header',
    });
  });

  test("POST /invites/:inviteId/respond returns 400 for invalid decision", async () => {
    const res = await request(app)
      .post("/invites/invite-1/respond")
      .set("x-user-id", "demo")
      .send({ decision: "maybe" });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: 'decision must be "accept" or "decline"',
    });
  });
});