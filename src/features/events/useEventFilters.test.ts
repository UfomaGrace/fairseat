import { describe, expect, it } from "vitest";
import { findDateError, readEventFilters, toEventQuery } from "./useEventFilters";

const read = (search: string) => readEventFilters(new URLSearchParams(search));

describe("readEventFilters + toEventQuery", () => {
  it("sends only the filters that are set, with the page size", () => {
    expect(toEventQuery(read("?q=%20react%20&category=TECH&offset=20"))).toEqual({
      q: "react",
      category: "TECH",
      limit: 20,
      offset: 20,
    });
  });

  it("drops an unknown category and a bad offset", () => {
    expect(toEventQuery(read("?category=MUSIC&offset=-5"))).toEqual({ limit: 20, offset: 0 });
    expect(read("?offset=abc").offset).toBe(0);
  });
});

describe("findDateError", () => {
  it("accepts a valid range, including a single day", () => {
    expect(findDateError(read("?from=2026-11-01&to=2026-11-30"))).toBeNull();
    expect(findDateError(read("?from=2026-11-01&to=2026-11-01"))).toBeNull();
  });

  it("flags To before From", () => {
    expect(findDateError(read("?from=2026-11-30&to=2026-11-01"))?.field).toBe("to");
  });

  it("flags dates that aren't real days", () => {
    expect(findDateError(read("?from=2026-02-30"))?.field).toBe("from");
    expect(findDateError(read("?to=tomorrow"))?.field).toBe("to");
  });
});

describe("toEventQuery for the organiser list", () => {
  const organiserId = "6d1f9a10-0000-4000-8000-000000000102";

  it("sends organiserId and the toggles, and ignores the search filters", () => {
    expect(
      toEventQuery(read("?q=react&category=TECH&includePast=true&includeCancelled=true&offset=20"), { organiserId }),
    ).toEqual({ organiserId, includePast: true, includeCancelled: true, limit: 20, offset: 20 });
  });

  it("leaves out organiserId for admins and toggles that are off", () => {
    expect(toEventQuery(read("?includePast=yes"), { organiserId: undefined })).toEqual({ limit: 20, offset: 0 });
  });

  it("never sends the toggles on the public list", () => {
    expect(toEventQuery(read("?includePast=true&includeCancelled=true"))).toEqual({ limit: 20, offset: 0 });
  });
});
