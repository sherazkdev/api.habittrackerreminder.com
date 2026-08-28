import { describe, expect, it } from "vitest";
import { apiOkFields } from "@/lib/api-response";

describe("apiOkFields", () => {
  it("returns the spec-flat reminder shape plus a data copy", async () => {
    const response = apiOkFields({
      habitId: "abc123",
      scheduledTimes: ["08:00"],
    });
    const body = await response.json();
    expect(body).toEqual({
      success: true,
      habitId: "abc123",
      scheduledTimes: ["08:00"],
      data: {
        habitId: "abc123",
        scheduledTimes: ["08:00"],
      },
    });
  });
});
