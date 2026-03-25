import request from "supertest";
import app from "../../src/app.js";
import { supabaseAdmin } from "../../src/lib/supabaseClient.js";

const DEMO_USER_ID =
  process.env.DEMO_USER_ID || "c1aae9c3-5157-4a26-a7b3-28d8905cfef0";

describe("Groups integration test", () => {
  let createdGroupId = null;
  let groupName = null;

  test("creates group in real database", async () => {
    groupName = `Integration Test Group ${Date.now()}`;

    const res = await request(app)
      .post("/groups")
      .set("x-user-id", DEMO_USER_ID)
      .send({
        name: groupName,
        type: "society",
      });

    expect(res.status).toBe(201);
    expect(res.body.group).toBeDefined();

    createdGroupId = res.body.group.group_id;

    const { data: group, error } = await supabaseAdmin
      .from("groups")
      .select("*")
      .eq("group_id", createdGroupId)
      .single();

    expect(error).toBeNull();
    expect(group).not.toBeNull();
    expect(group.name).toBe(groupName);
  });

  afterAll(async () => {
    if (createdGroupId) {
      await supabaseAdmin
        .from("groups")
        .delete()
        .eq("group_id", createdGroupId);
    }
  });
});
