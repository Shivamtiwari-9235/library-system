import { describe, expect, it } from "vitest";
import {
  calculateDueDate,
  calculateFine,
  canBorrow,
  canIssueCopy,
  getFirstReservation,
} from "../lib/business-logic";

describe("library business rules", () => {
  it("calculates an exact 14-day due date", () => {
    expect(calculateDueDate("2026-01-01T10:00:00.000Z").toISOString()).toBe(
      "2026-01-15T10:00:00.000Z",
    );
  });

  it("calculates zero fine for an on-time return", () => {
    expect(calculateFine("2026-01-15T10:00:00.000Z", "2026-01-15T10:00:00.000Z").fine).toBe(0);
  });

  it("calculates ₹25 for five days late", () => {
    expect(calculateFine("2026-01-15T10:00:00.000Z", "2026-01-20T10:00:00.000Z").fine).toBe(25);
  });

  it("calculates ₹70 for fourteen days late", () => {
    expect(calculateFine("2026-01-15T10:00:00.000Z", "2026-01-29T10:00:00.000Z").fine).toBe(70);
  });

  it("enforces the three-book active borrowing limit", () => {
    expect(canBorrow(2)).toBe(true);
    expect(canBorrow(3)).toBe(false);
  });

  it("keeps reservations fair using FIFO order", () => {
    const reservations = [
      { memberId: "later", status: "waiting", reservedAt: "2026-01-02T10:00:00Z" },
      { memberId: "first", status: "waiting", reservedAt: "2026-01-01T10:00:00Z" },
    ];
    expect(getFirstReservation(reservations).memberId).toBe("first");
  });

  it("protects a held copy from unauthorized checkout", () => {
    expect(canIssueCopy({
      copyStatus: "reserved_held",
      memberId: "walk-in",
      heldForMemberId: "first",
    }).allowed).toBe(false);
  });
});
