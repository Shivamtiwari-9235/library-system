export const MAX_ACTIVE_BORROWINGS = 3;
export const LOAN_DURATION_DAYS = 14;
export const DAILY_FINE_RUPEES = 5;
export const HOLD_WINDOW_HOURS = 48;

const DAY_IN_MS = 24 * 60 * 60 * 1000;

/**
 * Keep loan dates deterministic and timezone-safe by doing the calculation in UTC.
 */
export function calculateDueDate(issueDate) {
  const issuedAt = new Date(issueDate);
  if (Number.isNaN(issuedAt.getTime())) {
    throw new Error("A valid issue date is required.");
  }

  return new Date(issuedAt.getTime() + LOAN_DURATION_DAYS * DAY_IN_MS);
}

/**
 * Fines are based on calendar days late, never on a partial-day fraction.
 */
export function calculateFine(dueDate, returnedDate) {
  const dueAt = new Date(dueDate);
  const returnedAt = new Date(returnedDate);
  if (Number.isNaN(dueAt.getTime()) || Number.isNaN(returnedAt.getTime())) {
    throw new Error("Valid due and return dates are required.");
  }

  const overdueDays = Math.max(0, Math.ceil((returnedAt - dueAt) / DAY_IN_MS));
  return { overdueDays, fine: overdueDays * DAILY_FINE_RUPEES };
}

export function canBorrow(activeBorrowingCount) {
  return activeBorrowingCount < MAX_ACTIVE_BORROWINGS;
}

export function getFirstReservation(reservations) {
  return [...reservations]
    .filter((reservation) => reservation.status === "waiting")
    .sort((a, b) => new Date(a.reservedAt) - new Date(b.reservedAt))[0] ?? null;
}

export function canReserve({ availableCount, hasActiveReservation, holdsBook }) {
  return availableCount === 0 && !hasActiveReservation && !holdsBook;
}

export function canIssueCopy({ copyStatus, memberId, heldForMemberId }) {
  if (copyStatus === "reserved_held" && heldForMemberId !== memberId) {
    return {
      allowed: false,
      reason: "This copy is held for the first member in the reservation queue.",
    };
  }

  if (copyStatus !== "available" && !(copyStatus === "reserved_held" && heldForMemberId === memberId)) {
    return { allowed: false, reason: "This copy is not available for issue." };
  }

  return { allowed: true };
}

export function createHold(reservation, returnedAt) {
  const heldAt = new Date(returnedAt);
  if (!reservation?.memberId || Number.isNaN(heldAt.getTime())) {
    throw new Error("A reservation and valid return date are required.");
  }

  return {
    memberId: reservation.memberId,
    heldAt,
    expiresAt: new Date(heldAt.getTime() + HOLD_WINDOW_HOURS * 60 * 60 * 1000),
  };
}
