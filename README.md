# Upcoming flights & tests

A shared board for the flights and tests planned over the next few days. Open it, see what is coming up, add anything the team should not forget, change a plan, and remove an entry when it is finished.

Everyone who opens the page uses the same list. There are no accounts. Share the link only with the team: anyone who has it can add, edit, and remove entries.

## Live link

Open the board here and send this address to the team:

[https://extendsclass.com/api/json-storage/bin/ecafdcc](https://extendsclass.com/api/json-storage/bin/ecafdcc)

This address stays online. It does not depend on a laptop, an office PC, or this coding session. Phones and computers that open it share one list, saved on the web.

People who already have the page open see an add, an edit, or a removal within a few seconds. A **Live** mark under Planned means the page is connected.

[https://tectivejk.github.io/Upcoming-Test-Flights/](https://tectivejk.github.io/Upcoming-Test-Flights/) opens the same board.

## Install it on a phone

Use the live link above. Do not install from an app store.

### iPhone

1. Open the link in **Safari**. If it opened inside Mail or another app, choose Open in Safari.
2. Tap the **Share** button (the square with an arrow).
3. Scroll the share sheet and tap **Add to Home Screen**.
4. Leave the name as Flights & tests, then tap **Add**.

The icon appears on the home screen. Open it from there. It uses the same live board as everyone else.

### Android

1. Open the link in **Chrome**.
2. Tap the menu button (three dots) at the top right.
3. Tap **Install app**. If that is not listed, tap **Add to Home screen**.
4. Confirm.

The icon appears on the home screen or in the app list. Open it from there.

The same install steps are at the bottom of the board, under **Keep it on your phone**.

## Use the board

1. Open the page.
2. Read **Next up**, then the days under **Planned**.
3. Add a flight or test with a name, date, and time. Who and a short note are optional.
4. Use **Edit** beside a flight or test to change its date, time, or description. The note under it can be changed there too. **Save** updates the shared list. **Cancel** leaves the row as it was.
5. Remove an entry when it is done or cancelled. Removal asks you to confirm first.

While the page is open it keeps checking for changes. When anyone adds, edits, or removes an entry, every open board updates. If the connection drops, the page keeps checking and reconnects on its own. **Refresh** loads the latest list immediately.

Days are grouped like this:

- **Still on the board** — the time has already passed and nobody has removed it yet.
- **The next few days** — today through the coming week.
- **Later** — anything further out, so it is not lost.

Times use a 24-hour clock on the list.

## Run a private copy

Requires Node.js 20 or newer. A copy you start yourself has its own list. The team link above is the shared one.

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:4317](http://127.0.0.1:4317).

To run the production build on that computer:

```bash
npm run build
npm start
```

## How sharing works

The live link stores the list online. Add, edit, and remove update that list for the whole team, including people who already have the page open.

There is no login. Treat the address like an internal tool.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start a private copy on port 4317 |
| `npm run build` | Build the production app |
| `npm run build:hosted` | Build the shared page and publish it to the live link |
| `npm start` | Serve a private production copy on port 4317 |
| `npm run lint` | Run the linter |
