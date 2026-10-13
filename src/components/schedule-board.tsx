"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { mutateRemoteBoard, readRemoteBoard, remoteBoardUrl } from "@/lib/remote-board";
import {
  addDays,
  formatDateInput,
  groupEntries,
  hasPassed,
  kindLabel,
  validateNewEntry,
  type DayGroup,
  type Entry,
  type Kind,
} from "@/lib/schedule";
import { cn } from "@/lib/utils";

const fieldClassName = "h-11 px-3 text-base md:text-base";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; entries: Entry[]; stale: boolean };

export function ScheduleBoard() {
  const [load, setLoad] = useState<LoadState>({ status: "loading" });
  const [kind, setKind] = useState<Kind>("flight");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [owner, setOwner] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [clock, setClock] = useState<Date | null>(null);
  const [connected, setConnected] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const busy = useRef(0);
  const formId = useId();

  const applyEntries = useCallback((entries: Entry[], stale = false) => {
    setLoad({ status: "ready", entries, stale });
    setPendingRemoveId((current) =>
      current && entries.every((entry) => entry.id !== current) ? null : current,
    );
  }, []);

  const refresh = useCallback(
    async (mode: "initial" | "poll") => {
      try {
        if (remoteBoardUrl()) {
          const board = await readRemoteBoard();
          if (busy.current === 0) applyEntries(board.entries, false);
          return;
        }
        const response = await fetch("/api/entries", { cache: "no-store" });
        const body = (await response.json()) as {
          entries?: Entry[];
          error?: string;
        };
        if (!response.ok || !body.entries) {
          throw new Error(body.error || "The board could not be loaded.");
        }
        if (busy.current === 0) applyEntries(body.entries, false);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "The board could not be loaded.";
        if (mode === "initial") {
          setLoad({ status: "error", message });
        } else if (busy.current === 0) {
          setLoad((current) =>
            current.status === "ready" ? { ...current, stale: true } : current,
          );
        }
      }
    },
    [applyEntries],
  );

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const now = new Date();
      setClock(now);
      setDate((current) => current || formatDateInput(now));
    });
    const clockTimer = window.setInterval(() => setClock(new Date()), 30000);
    const startup = window.setTimeout(() => {
      void refresh("initial");
    }, 0);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(startup);
      window.clearInterval(clockTimer);
    };
  }, [refresh]);

  useEffect(() => {
    if (remoteBoardUrl()) {
      let stopped = false;
      let timer = 0;

      const tick = async () => {
        if (stopped || document.visibilityState === "hidden") return;
        try {
          const board = await readRemoteBoard();
          if (busy.current === 0) applyEntries(board.entries, false);
          setConnected(true);
        } catch {
          if (!stopped) setConnected(false);
        }
      };

      const loop = () => {
        void tick().finally(() => {
          if (!stopped) timer = window.setTimeout(loop, 4000);
        });
      };

      const onVisible = () => {
        if (document.visibilityState === "visible") void tick();
      };

      loop();
      document.addEventListener("visibilitychange", onVisible);
      return () => {
        stopped = true;
        window.clearTimeout(timer);
        document.removeEventListener("visibilitychange", onVisible);
      };
    }

    let stopped = false;
    let after = 0;
    const controller = new AbortController();

    const follow = async () => {
      while (!stopped) {
        try {
          const response = await fetch(`/api/live?after=${after}`, {
            cache: "no-store",
            signal: controller.signal,
          });
          if (response.status === 204) continue;
          if (!response.ok) throw new Error("The live connection failed.");
          const body = (await response.json()) as {
            entries?: Entry[];
            version?: number;
          };
          if (!body.entries || typeof body.version !== "number") {
            throw new Error("The live connection failed.");
          }
          after = body.version;
          applyEntries(body.entries, false);
          setConnected(true);
        } catch {
          if (stopped || controller.signal.aborted) return;
          setConnected(false);
          await new Promise((resolve) => window.setTimeout(resolve, 2000));
        }
      }
    };

    void follow();

    return () => {
      stopped = true;
      controller.abort();
    };
  }, [applyEntries]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setStatusMessage("");
    setSaving(true);
    busy.current += 1;
    try {
      if (remoteBoardUrl()) {
        const result = validateNewEntry({ kind, title, date, time, owner, notes });
        if (!result.ok) {
          setFormError(result.error);
          return;
        }
        const entry: Entry = {
          ...result.value,
          id: crypto.randomUUID(),
          example: false,
          createdAt: new Date().toISOString(),
        };
        const entries = await mutateRemoteBoard((current) =>
          current.some((item) => item.id === entry.id) ? current : [...current, entry],
        );
        applyEntries(entries, false);
        setTitle("");
        setNotes("");
        setStatusMessage(`${entry.title} added for everyone.`);
        titleRef.current?.focus();
        return;
      }
      const response = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, title, date, time, owner, notes }),
      });
      const body = (await response.json()) as { entry?: Entry; error?: string };
      if (!response.ok || !body.entry) {
        setFormError(body.error || "That entry could not be saved.");
        return;
      }
      setLoad((current) => {
        const entries =
          current.status === "ready"
            ? [...current.entries.filter((entry) => entry.id !== body.entry!.id), body.entry!]
            : [body.entry!];
        return { status: "ready", entries, stale: false };
      });
      setTitle("");
      setNotes("");
      setStatusMessage(`${body.entry.title} added for everyone.`);
      titleRef.current?.focus();
    } catch {
      setFormError("That entry could not be saved. Try again.");
    } finally {
      busy.current = Math.max(0, busy.current - 1);
      setSaving(false);
    }
  }

  async function onRemove(entry: Entry) {
    setFormError("");
    setStatusMessage("");
    setRemovingId(entry.id);
    busy.current += 1;
    try {
      if (remoteBoardUrl()) {
        const entries = await mutateRemoteBoard((current) =>
          current.filter((item) => item.id !== entry.id),
        );
        applyEntries(entries, false);
        setPendingRemoveId(null);
        setStatusMessage(`${entry.title} removed for everyone.`);
        listRef.current?.focus();
        return;
      }
      const response = await fetch(`/api/entries/${entry.id}`, {
        method: "DELETE",
      });
      if (!response.ok && response.status !== 404) {
        const body = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        setFormError(body.error || "That entry could not be removed.");
        return;
      }
      setLoad((current) => {
        if (current.status !== "ready") return current;
        return {
          status: "ready",
          stale: false,
          entries: current.entries.filter((item) => item.id !== entry.id),
        };
      });
      setPendingRemoveId(null);
      setStatusMessage(`${entry.title} removed for everyone.`);
      listRef.current?.focus();
    } catch {
      setFormError("That entry could not be removed. Try again.");
    } finally {
      busy.current = Math.max(0, busy.current - 1);
      setRemovingId(null);
    }
  }

  const grouped =
    load.status === "ready" && clock ? groupEntries(load.entries, clock) : null;
  const comingUp =
    load.status === "ready" && clock
      ? load.entries.filter((entry) => !hasPassed(entry, clock)).length
      : 0;
  const hasExamples =
    load.status === "ready" && load.entries.some((entry) => entry.example);

  return (
    <div className="flex flex-col gap-8">
      {load.status === "ready" && clock ? (
        <NextUp next={grouped?.next ?? null} today={grouped?.today ?? ""} />
      ) : null}

      <section
        aria-labelledby={`${formId}-add`}
        className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5"
      >
        <div className="mb-4 flex flex-col gap-1">
          <h2 id={`${formId}-add`} className="text-lg font-semibold">
            Add a flight or test
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            What, date, and time are required. Who and note are optional. It
            shows up on this board for the whole team.
          </p>
        </div>
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <fieldset className="grid gap-4 sm:grid-cols-[11rem_1fr]">
            <legend className="sr-only">Type and name</legend>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium" id={`${formId}-kind`}>
                Type
              </span>
              <div
                role="radiogroup"
                aria-labelledby={`${formId}-kind`}
                className="grid grid-cols-2 gap-2"
              >
                {(["flight", "test"] as const).map((value) => {
                  const selected = kind === value;
                  return (
                    <label
                      key={value}
                      className={cn(
                        "flex h-11 items-center justify-center rounded-lg border text-sm font-medium transition-colors has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50",
                        selected && value === "flight"
                          ? "border-flight bg-flight-soft text-flight"
                          : selected
                            ? "border-test bg-test-soft text-test"
                            : "border-border bg-background text-foreground",
                      )}
                    >
                      <input
                        className="sr-only"
                        type="radio"
                        name="kind"
                        value={value}
                        checked={selected}
                        onChange={() => setKind(value)}
                      />
                      {kindLabel(value)}
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${formId}-title`}>What</Label>
              <Input
                ref={titleRef}
                id={`${formId}-title`}
                className={fieldClassName}
                value={title}
                maxLength={80}
                required
                placeholder="TALON flight, motor test…"
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${formId}-date`}>Date</Label>
              <Input
                id={`${formId}-date`}
                className={fieldClassName}
                type="date"
                value={date}
                required
                onChange={(event) => setDate(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${formId}-time`}>Time</Label>
              <Input
                id={`${formId}-time`}
                className={fieldClassName}
                type="time"
                value={time}
                required
                onChange={(event) => setTime(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${formId}-owner`}>Who</Label>
              <Input
                id={`${formId}-owner`}
                className={fieldClassName}
                value={owner}
                maxLength={60}
                autoComplete="name"
                placeholder="Optional"
                onChange={(event) => setOwner(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${formId}-notes`}>Note</Label>
              <Input
                id={`${formId}-notes`}
                className={fieldClassName}
                value={notes}
                maxLength={240}
                placeholder="Optional"
                onChange={(event) => setNotes(event.target.value)}
              />
            </div>
          </div>

          {formError ? (
            <p role="alert" className="text-sm text-destructive">
              {formError}
            </p>
          ) : null}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {statusMessage}
            </p>
            <Button
              type="submit"
              size="lg"
              className="h-11 px-4 text-base sm:min-w-36"
              disabled={saving}
            >
              {saving ? "Adding…" : "Add to the board"}
            </Button>
          </div>
        </form>
      </section>

      <section aria-labelledby={`${formId}-plan`} className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id={`${formId}-plan`} className="text-lg font-semibold">
              Planned
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {load.status === "ready" && clock
                ? comingUp === 0
                  ? "Nothing is still ahead"
                  : comingUp === 1
                    ? "1 coming up"
                    : `${comingUp} coming up`
                : "The next few days, then anything further out."}
              <span className="mx-1.5">·</span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  className={cn(
                    "size-2 rounded-full",
                    connected ? "bg-primary" : "bg-destructive",
                  )}
                  aria-hidden="true"
                />
                {connected ? "Live" : "Reconnecting"}
              </span>
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-9"
            onClick={() => void refresh("poll")}
          >
            Refresh
          </Button>
        </div>

        {hasExamples ? (
          <p className="rounded-lg bg-secondary px-3 py-2 text-sm leading-6 text-secondary-foreground">
            A few example entries are here so the board is easy to read. Remove
            them, then add the real flights and tests.
          </p>
        ) : null}

        {load.status === "ready" && load.stale ? (
          <p role="status" className="text-sm text-destructive">
            Couldn&apos;t refresh. Showing the last list we loaded.
          </p>
        ) : null}

        <div ref={listRef} tabIndex={-1} className="outline-none">
          {load.status === "loading" ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
              Loading the board…
            </p>
          ) : null}

          {load.status === "error" ? (
            <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center">
              <p role="alert" className="text-sm">
                {load.message}
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-4 h-10"
                onClick={() => {
                  setLoad({ status: "loading" });
                  void refresh("initial");
                }}
              >
                Try again
              </Button>
            </div>
          ) : null}

          {load.status === "ready" && load.entries.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm leading-6 text-muted-foreground">
              The board is clear. Add the next flight or test so it is not
              forgotten.
            </p>
          ) : null}

          {grouped && clock && load.status === "ready" && load.entries.length > 0 ? (
            <div className="flex flex-col gap-6">
              {grouped.earlier.length > 0 ? (
                <DaySection
                  title="Still on the board"
                  description="These times have already passed. Remove them if the flight or test is finished."
                  groups={grouped.earlier}
                  now={clock}
                  pendingRemoveId={pendingRemoveId}
                  removingId={removingId}
                  onAskRemove={setPendingRemoveId}
                  onCancelRemove={() => setPendingRemoveId(null)}
                  onRemove={onRemove}
                />
              ) : null}
              {grouped.soon.length > 0 ? (
                <DaySection
                  title={
                    grouped.earlier.length > 0 || grouped.later.length > 0
                      ? "The next few days"
                      : undefined
                  }
                  groups={grouped.soon}
                  now={clock}
                  pendingRemoveId={pendingRemoveId}
                  removingId={removingId}
                  onAskRemove={setPendingRemoveId}
                  onCancelRemove={() => setPendingRemoveId(null)}
                  onRemove={onRemove}
                />
              ) : null}
              {grouped.later.length > 0 ? (
                <DaySection
                  title="Later"
                  description="Further out than the next week."
                  groups={grouped.later}
                  now={clock}
                  pendingRemoveId={pendingRemoveId}
                  removingId={removingId}
                  onAskRemove={setPendingRemoveId}
                  onCancelRemove={() => setPendingRemoveId(null)}
                  onRemove={onRemove}
                />
              ) : null}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function NextUp({ next, today }: { next: Entry | null; today: string }) {
  if (!next || !today) {
    return (
      <section
        aria-label="Next up"
        className="rounded-xl border border-dashed border-border bg-card px-4 py-4 text-sm text-muted-foreground"
      >
        Nothing is coming up yet.
      </section>
    );
  }

  const when =
    next.date === today
      ? "Today"
      : next.date === addDays(today, 1)
        ? "Tomorrow"
        : new Date(
            Number(next.date.slice(0, 4)),
            Number(next.date.slice(5, 7)) - 1,
            Number(next.date.slice(8, 10)),
          ).toLocaleDateString("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "short",
          });

  return (
    <section
      aria-label="Next up"
      className="rounded-xl border border-border bg-card px-4 py-4 shadow-sm sm:px-5"
    >
      <p className="text-xs font-medium tracking-wide text-primary uppercase">
        Next up
      </p>
      <div className="mt-2 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-4">
        <p className="font-mono text-3xl font-medium tracking-tight tabular-nums">
          {next.time}
        </p>
        <div>
          <p className="text-base font-medium">
            <span
              className={cn(
                "mr-2 inline-flex rounded-md px-1.5 py-0.5 text-xs font-medium",
                next.kind === "flight"
                  ? "bg-flight-soft text-flight"
                  : "bg-test-soft text-test",
              )}
            >
              {kindLabel(next.kind)}
            </span>
            {next.title}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {when}
            {next.owner ? ` · ${next.owner}` : ""}
            {next.notes ? ` · ${next.notes}` : ""}
          </p>
        </div>
      </div>
    </section>
  );
}

function DaySection({
  title,
  description,
  groups,
  now,
  pendingRemoveId,
  removingId,
  onAskRemove,
  onCancelRemove,
  onRemove,
}: {
  title?: string;
  description?: string;
  groups: DayGroup[];
  now: Date;
  pendingRemoveId: string | null;
  removingId: string | null;
  onAskRemove: (id: string) => void;
  onCancelRemove: () => void;
  onRemove: (entry: Entry) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {title ? (
        <div>
          <h3 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
            {title}
          </h3>
          {description ? (
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      ) : null}
      {groups.map((group) => (
        <section
          key={group.date}
          aria-labelledby={`day-${group.date}`}
          className="rounded-xl border border-border bg-card px-4 shadow-sm sm:px-5"
        >
          <h4 id={`day-${group.date}`} className="border-b border-border py-3 text-base font-semibold">
            {group.label}
          </h4>
          <ul>
            {group.entries.map((entry) => (
              <EntryRow
                key={entry.id}
                entry={entry}
                passed={hasPassed(entry, now)}
                confirming={pendingRemoveId === entry.id}
                removing={removingId === entry.id}
                onAskRemove={() => onAskRemove(entry.id)}
                onCancelRemove={onCancelRemove}
                onRemove={() => onRemove(entry)}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function EntryRow({
  entry,
  passed,
  confirming,
  removing,
  onAskRemove,
  onCancelRemove,
  onRemove,
}: {
  entry: Entry;
  passed: boolean;
  confirming: boolean;
  removing: boolean;
  onAskRemove: () => void;
  onCancelRemove: () => void;
  onRemove: () => void;
}) {
  return (
    <li
      className={cn(
        "grid grid-cols-[4.5rem_1fr] gap-x-3 gap-y-2 border-b border-border py-4 last:border-b-0 sm:grid-cols-[5.5rem_1fr_auto] sm:items-start",
        passed && "opacity-70",
      )}
      onKeyDown={(event) => {
        if (event.key === "Escape" && confirming) onCancelRemove();
      }}
    >
      <time
        dateTime={`${entry.date}T${entry.time}`}
        className="pt-0.5 font-mono text-lg font-medium tabular-nums tracking-tight"
      >
        {entry.time}
      </time>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex rounded-md px-1.5 py-0.5 text-xs font-medium",
              entry.kind === "flight"
                ? "bg-flight-soft text-flight"
                : "bg-test-soft text-test",
            )}
          >
            {kindLabel(entry.kind)}
          </span>
          {passed ? (
            <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Passed
            </span>
          ) : null}
          {entry.example ? (
            <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Example
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-base font-medium text-pretty">{entry.title}</p>
        {entry.owner || entry.notes ? (
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {entry.owner}
            {entry.owner && entry.notes ? " · " : ""}
            {entry.notes}
          </p>
        ) : null}
      </div>
      <div className="col-start-2 flex flex-wrap items-center gap-2 sm:col-start-auto sm:justify-end">
        {confirming ? (
          <>
            <span className="text-sm text-muted-foreground">Remove this?</span>
            <Button
              type="button"
              variant="destructive"
              className="h-9"
              disabled={removing}
              onClick={onRemove}
            >
              {removing ? "Removing…" : "Remove"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-9"
              disabled={removing}
              onClick={onCancelRemove}
            >
              Keep
            </Button>
          </>
        ) : (
          <Button
            type="button"
            variant="ghost"
            className="h-9 text-muted-foreground"
            aria-label={`Remove ${entry.title}`}
            onClick={onAskRemove}
          >
            Remove
          </Button>
        )}
      </div>
    </li>
  );
}
