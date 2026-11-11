import { describe, it, expect } from "vitest";
import {
  alertStatusToState,
  countInbox,
  DEFAULT_FILTER,
  filterInbox,
  inboxQuery,
  mapAlert,
  mapHrv,
  mapMessage,
  mapNoData,
  parseInboxFilter,
  parseInboxKey,
  resolveAlertState,
  stateToAlertStatus,
  type InboxFilter,
  type InboxItem,
} from "../model";

const C1 = "11111111-1111-4111-8111-111111111111";
const C2 = "22222222-2222-4222-8222-222222222222";
const A1 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const CONV = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const MSG = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const NOW = new Date("2026-11-11T12:00:00Z");

const alertRow = (over: Partial<Parameters<typeof mapAlert>[0]> = {}) => ({
  id: A1, clientId: C1, type: "sleep_low", priority: "action", title: "Sleep score below threshold",
  message: "Automated alert.", status: "active", createdAt: "2026-11-10T08:00:00Z", ...over,
});

const params = (q: string) => new URLSearchParams(q);

describe("state model", () => {
  it("maps alert status to New → Acknowledged → Resolved and back", () => {
    expect(alertStatusToState("active")).toBe("new");
    expect(alertStatusToState("acknowledged")).toBe("acknowledged");
    expect(alertStatusToState("resolved")).toBe("resolved");
    expect(alertStatusToState("dismissed")).toBe("resolved");
    expect(stateToAlertStatus("new")).toBe("active");
    expect(stateToAlertStatus("resolved")).toBe("resolved");
  });
  it("a coach override applies unless the alert row is already resolved", () => {
    expect(resolveAlertState("active", "acknowledged")).toBe("acknowledged");
    expect(resolveAlertState("acknowledged", "resolved")).toBe("resolved");
    expect(resolveAlertState("resolved", "new")).toBe("resolved");
  });
});

describe("mapping", () => {
  it("alert priority becomes severity", () => {
    expect(mapAlert(alertRow({ priority: "urgent" }), "Ann").severity).toBe("urgent");
    expect(mapAlert(alertRow(), "Ann")).toMatchObject({ severity: "action", state: "new", category: "health", key: `alert:${A1}` });
    expect(mapAlert(alertRow({ priority: "info" }), "Ann").severity).toBe("info");
  });
  it("booking notices are Info sessions, whatever their priority", () => {
    const item = mapAlert(alertRow({ type: "scheduling", priority: "urgent", title: "Follow-Up scheduled" }), "Ann");
    expect(item).toMatchObject({ kind: "scheduling", category: "sessions", severity: "info" });
  });
  it("mental-wellbeing alerts never show what the client wrote", () => {
    const item = mapAlert(alertRow({ type: "mood_low", title: "Journal: I feel awful", message: "private text" }), "Ann");
    expect(item.title).toBe("Mental wellbeing flagged");
    expect(item.detail).not.toContain("private");
    expect(item.title).not.toContain("Journal");
  });
  it("HRV deviation: >40% urgent, >25% action, otherwise nothing", () => {
    const base = { clientId: C1, avgRmssd: 50, readingAt: "2026-11-11T06:00:00Z" };
    expect(mapHrv({ ...base, latestRmssd: 25 }, "Ann")?.severity).toBe("urgent");
    expect(mapHrv({ ...base, latestRmssd: 35 }, "Ann")).toMatchObject({ severity: "action", key: `hrv:${C1}:2026-11-11` });
    expect(mapHrv({ ...base, latestRmssd: 45 }, "Ann")).toBeNull();
    expect(mapHrv({ ...base, avgRmssd: 0, latestRmssd: 45 }, "Ann")).toBeNull();
  });
  it("no device data names how long since the last sync", () => {
    const item = mapNoData({ clientId: C1, lastSyncAt: "2026-11-08T12:00:00Z" }, "Ann", NOW);
    expect(item).toMatchObject({ severity: "action", detail: "Last sync 3 days ago", key: `no_data:${C1}:2026-11-08` });
    expect(mapNoData({ clientId: C1, lastSyncAt: null }, "Ann", NOW).key).toBe(`no_data:${C1}:never`);
  });
  it("message awaiting reply is an Action with a Reply link", () => {
    const item = mapMessage({ conversationId: CONV, messageId: MSG, clientId: C1, body: "Hi coach", sentAt: "2026-11-09T12:00:00Z" }, "Ann", NOW);
    expect(item).toMatchObject({ severity: "action", category: "messages", title: "Waiting 2 days", key: `msg:${CONV}:${MSG}` });
    expect(item.action.href).toBe(`/trainer/messages?conversationId=${CONV}`);
  });
});

describe("keys", () => {
  it("parses only well-formed keys", () => {
    expect(parseInboxKey(`alert:${A1}`)).toEqual({ kind: "alert", alertId: A1 });
    expect(parseInboxKey(`hrv:${C1}:2026-11-11`)).toEqual({ kind: "hrv", clientId: C1 });
    expect(parseInboxKey(`no_data:${C1}:never`)).toEqual({ kind: "no_data", clientId: C1 });
    expect(parseInboxKey(`msg:${CONV}:${MSG}`)).toEqual({ kind: "message", conversationId: CONV });
    expect(parseInboxKey("alert:not-a-uuid")).toBeNull();
    expect(parseInboxKey(`alert:${A1}; drop table`)).toBeNull();
  });
});

describe("filter and counts", () => {
  const items: InboxItem[] = [
    mapAlert(alertRow({ id: A1, priority: "urgent" }), "Ann"),
    mapAlert(alertRow({ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2", status: "acknowledged" }), "Ann"),
    mapAlert(alertRow({ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3", status: "resolved" }), "Ann"),
    mapAlert(alertRow({ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4", clientId: C2, type: "scheduling" }), "Bo"),
    mapMessage({ conversationId: CONV, messageId: MSG, clientId: C2, body: "?", sentAt: "2026-11-11T10:00:00Z" }, "Bo", NOW),
  ];
  const filters: InboxFilter[] = [
    DEFAULT_FILTER,
    { ...DEFAULT_FILTER, state: "all" },
    { ...DEFAULT_FILTER, state: "resolved" },
    { ...DEFAULT_FILTER, categories: ["health"] },
    { ...DEFAULT_FILTER, categories: ["messages", "sessions"] },
    { ...DEFAULT_FILTER, clientId: C2 },
  ];

  it("header counts always equal the rows listed", () => {
    for (const f of filters) {
      const c = countInbox(items, f);
      expect(filterInbox(items, f)).toHaveLength(c.total);
      for (const s of ["urgent", "action", "info"] as const) {
        expect(filterInbox(items, { ...f, severity: s })).toHaveLength(c[s]);
      }
    }
  });
  it("Open = New + Acknowledged; Info notices never count as Action", () => {
    expect(countInbox(items, DEFAULT_FILTER)).toEqual({ urgent: 1, action: 2, info: 1, total: 4 });
  });
  it("sorts urgent first, then New before Acknowledged", () => {
    const list = filterInbox(items, DEFAULT_FILTER);
    expect(list[0].severity).toBe("urgent");
    expect(list.map((i) => i.state).slice(1, 3)).toEqual(["new", "acknowledged"]);
  });
});

describe("URL filter", () => {
  it("defaults to Open, any date, all types", () => {
    expect(parseInboxFilter(params(""))).toEqual(DEFAULT_FILTER);
  });
  it("round-trips and ignores junk", () => {
    const f = parseInboxFilter(params(`state=resolved&severity=urgent&category=messages,sessions,bogus&client=${C1}`));
    expect(f).toEqual({ state: "resolved", severity: "urgent", categories: ["messages", "sessions"], clientId: C1 });
    expect(parseInboxFilter(params(inboxQuery(f).slice(1)))).toEqual(f);
    expect(parseInboxFilter(params("state=nope&severity=loud")).state).toBe("open");
    expect(inboxQuery(DEFAULT_FILTER)).toBe("");
  });
  it("old routes land on the matching filter", () => {
    expect(parseInboxFilter(params("category=health")).categories).toEqual(["health"]);
    expect(parseInboxFilter(params("category=messages,sessions")).categories).toEqual(["messages", "sessions"]);
  });
});
