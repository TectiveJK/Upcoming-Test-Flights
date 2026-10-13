import { ScheduleBoard } from "@/components/schedule-board";

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8">
        <p className="text-sm font-medium tracking-wide text-primary uppercase">
          Shared board
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Upcoming flights & tests
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
          See what is planned, when it happens, and what is coming up next.
          Anyone on the team can add a flight or test, or remove one when it
          is finished. Every open board updates at the same time.
        </p>
      </header>
      <ScheduleBoard />
    </main>
  );
}
