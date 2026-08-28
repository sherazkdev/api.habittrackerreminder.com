import { NextResponse } from "next/server";

export function apiOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ success: true, data }, init);
}

/** Spec-flat body (`habitId`, `scheduledTimes`) plus `data` for existing clients. */
export function apiOkFields<T extends Record<string, unknown>>(fields: T, init?: ResponseInit) {
  return NextResponse.json({ success: true, ...fields, data: fields }, init);
}

export function apiError(code: string, message: string, status = 400) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}
