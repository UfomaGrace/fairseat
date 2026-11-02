// HeaderSearch: the keyword search in the site header.
//
//   <HeaderSearch />                          // desktop: always shown
//   <HeaderSearch autoFocus onSearched={close} />  // phone: opened by the header's search button
//
// - Submitting opens Discover with ?q=. On /events it keeps the other filters (category, area,
//   dates) and starts again from the first page; elsewhere it starts a fresh search.
// - An empty search removes ?q.
// - On /events the field shows the URL's q, so Back and "Show all events" update it.
// - The label is visually hidden: the magnifier and the placeholder say what the field is.

import { Search } from "lucide-react";
import { useId, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router";
import { cn } from "../lib/cn";
import { Input } from "./ui/input";

/** maxLength of q in the yaml. */
const Q_MAX = 100;

export type HeaderSearchProps = {
  autoFocus?: boolean;
  /** Called after a search is sent, e.g. to close the phone search row. */
  onSearched?: () => void;
  className?: string;
};

export function HeaderSearch({ autoFocus, onSearched, className }: HeaderSearchProps) {
  const id = useId();
  const location = useLocation();
  const navigate = useNavigate();
  const onDiscover = location.pathname === "/events";
  const urlQ = onDiscover ? (new URLSearchParams(location.search).get("q") ?? "") : "";

  const [q, setQ] = useState(urlQ);
  const [shownQ, setShownQ] = useState(urlQ);
  if (shownQ !== urlQ) {
    setShownQ(urlQ);
    setQ(urlQ);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams(onDiscover ? location.search : "");
    const keyword = q.trim();
    if (keyword) params.set("q", keyword);
    else params.delete("q");
    params.delete("offset");
    const search = params.toString();
    navigate(search ? `/events?${search}` : "/events");
    onSearched?.();
  }

  return (
    <form role="search" onSubmit={handleSubmit} className={cn("relative", className)}>
      <label htmlFor={id} className="sr-only">
        Search events
      </label>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-(--color-text-muted)"
      />
      <Input
        id={id}
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        maxLength={Q_MAX}
        placeholder="Search events"
        autoFocus={autoFocus}
        value={q}
        onChange={(event) => setQ(event.target.value)}
        className="h-11 rounded-full bg-(--color-surface) pl-10 text-base md:text-sm"
      />
    </form>
  );
}
