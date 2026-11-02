// DateAreaFilter: the "Date and area" control beside the category chips on Discover.
//
//   <DateAreaFilter filters={filters} dateError={dateError} onApply={(changes) => update(changes)} />
//
// - A toggle button (aria-expanded) opens a small form: Area (location), From and To dates.
//   On phones the button shows only its icon; its name stays "Date and area".
// - The button counts what's set: "Date and area · 2".
// - Nothing applies until Apply, so typing an area doesn't fire a request per key. Bad dates are
//   caught here (findDateError) and never reach the URL. A bad date already in the URL (a hand-edited
//   link) opens the form with the same error; the page skips the request meanwhile.
// - Clear removes the area and dates, and keeps the keyword and category.
// - The fields show the URL's values again when it changes from outside (Back, "Show all events").
//
// Not the shared FilterBar: that is built around its own keyword field, and here the keyword lives
// in the header.

import { SlidersHorizontal } from "lucide-react";
import { useId, useState, type FormEvent } from "react";
import { FormField } from "../../components/ui/form-field";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { cn } from "../../lib/cn";
import { findDateError, TEXT_MAX, type DateError, type EventFilters, type FilterParam } from "./useEventFilters";

type AreaFields = { location: string; from: string; to: string };

export type DateAreaFilterProps = {
  filters: EventFilters;
  /** The URL's own date error, if any. */
  dateError: DateError | null;
  onApply: (changes: Partial<Record<FilterParam, string>>) => void;
  className?: string;
};

export function DateAreaFilter({ filters, dateError, onApply, className }: DateAreaFilterProps) {
  const panelId = useId();
  const fromUrl: AreaFields = { location: filters.location, from: filters.from, to: filters.to };
  const [open, setOpen] = useState(dateError !== null);
  const [draft, setDraft] = useState(fromUrl);
  const [error, setError] = useState<DateError | null>(null);
  // When the URL changes from outside, show its values again.
  const [shown, setShown] = useState(fromUrl);
  if (shown.location !== fromUrl.location || shown.from !== fromUrl.from || shown.to !== fromUrl.to) {
    setShown(fromUrl);
    setDraft(fromUrl);
    setError(null);
  }

  const shownError = error ?? dateError;
  const activeCount = [filters.location, filters.from, filters.to].filter(Boolean).length;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = { ...draft, location: draft.location.trim() };
    const problem = findDateError({ ...filters, ...next });
    setError(problem);
    if (!problem) onApply(next);
  }

  function clear() {
    setError(null);
    onApply({ location: "", from: "", to: "" });
  }

  function dateInput(field: "from" | "to", label: string) {
    const invalid = shownError?.field === field;
    return (
      <FormField label={label}>
        {(control) => (
          <Input
            {...control}
            type="date"
            className="h-11 text-base"
            value={draft[field]}
            aria-invalid={invalid || undefined}
            aria-describedby={invalid ? `${panelId}-error` : control["aria-describedby"]}
            onChange={(event) => setDraft({ ...draft, [field]: event.target.value })}
          />
        )}
      </FormField>
    );
  }

  return (
    <div className={className}>
      <Button
        variant="secondary"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
        className={cn(
          "h-11 rounded-full px-3 text-sm font-medium md:px-4",
          (open || activeCount > 0) && "border-(--color-text)",
        )}
      >
        <SlidersHorizontal aria-hidden="true" className="size-4" />
        <span className="sr-only md:not-sr-only">Date and area</span>
        {activeCount > 0 && <span> · {activeCount}</span>}
      </Button>

      <form
        id={panelId}
        hidden={!open}
        onSubmit={handleSubmit}
        className="mt-3 rounded-(--radius-card) border border-(--color-border) bg-(--color-bg) p-4 md:p-5"
      >
        <div className="grid gap-4 md:grid-cols-3">
          <FormField label="Area">
            {(control) => (
              <Input
                {...control}
                name="location"
                autoComplete="off"
                maxLength={TEXT_MAX}
                placeholder="e.g. Yaba"
                className="h-11 text-base"
                value={draft.location}
                onChange={(event) => setDraft({ ...draft, location: event.target.value })}
              />
            )}
          </FormField>
          {dateInput("from", "From")}
          {dateInput("to", "To")}
        </div>

        {shownError && (
          <p id={`${panelId}-error`} role="alert" className="mt-3 text-sm font-medium text-(--color-danger)">
            <span aria-hidden="true">! </span>
            {shownError.message}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button type="submit" className="h-11 rounded-full px-5 font-semibold">
            Apply
          </Button>
          {activeCount > 0 && (
            <Button variant="ghost" className="h-11 rounded-full px-4" onClick={clear}>
              Clear date and area
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
