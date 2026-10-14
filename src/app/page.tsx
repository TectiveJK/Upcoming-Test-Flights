import { AlertToggle } from "@/components/alert-toggle";
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
          is finished. Every open board updates at the same time. A phone with
          alerts on is notified when someone adds a plan, even if it is locked.
        </p>
      </header>
      <ScheduleBoard />
      <section className="mt-10 border-t border-border pt-6" aria-labelledby="phone-install">
        <h2 id="phone-install" className="text-lg font-semibold">
          Keep it on your phone
        </h2>
        <div className="mt-3">
          <AlertToggle />
        </div>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          Install the shared board from this page, not from an app store. The
          icon opens the same live list.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <h3 className="text-sm font-medium">iPhone</h3>
            <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm leading-6 text-muted-foreground">
              <li>Open this page in Safari.</li>
              <li>Tap Share, then Add to Home Screen.</li>
              <li>Open the new Flights &amp; tests icon.</li>
              <li>Tap Turn on alerts and allow notifications.</li>
            </ol>
          </div>
          <div>
            <h3 className="text-sm font-medium">Android</h3>
            <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm leading-6 text-muted-foreground">
              <li>Open this page in Chrome.</li>
              <li>Tap Turn on alerts and allow notifications.</li>
              <li>Optional: menu, then Install app or Add to Home screen.</li>
            </ol>
          </div>
        </div>
      </section>
    </main>
  );
}
