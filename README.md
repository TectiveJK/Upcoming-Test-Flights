# Upcoming flights & tests

A shared board for the flights and tests planned over the next few days. Open it, see what is coming up, add anything the team should not forget, and remove an entry when it is finished.

Everyone who opens the page uses the same list. There are no accounts. Share the link only with the team: anyone who has it can add and remove entries.

## Shared link

Open the live board here and send this address to the team:

[https://volt-wild-modems-watched.trycloudflare.com](https://volt-wild-modems-watched.trycloudflare.com)

People who already have that page open see an add or a removal immediately. A **Live** mark under Planned means the page is connected.

The link stays up while this copy of the board is running. Phones and computers that open it share one list.

## Install it on a phone

Use the shared link above. Do not install from an app store, and do not use a localhost address on the phone.

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
4. Remove an entry when it is done, cancelled, or was only an example. Removal asks you to confirm first.

While the page is open it stays connected. When anyone adds or removes an entry, every open board updates immediately. If the connection drops, the page keeps checking and reconnects on its own. **Refresh** loads the latest list immediately.

The first time the app starts, it adds a few example entries so the layout is easy to read. Remove them before using the board for real plans.

Days are grouped like this:

- **Still on the board** — the time has already passed and nobody has removed it yet.
- **The next few days** — today through the coming week.
- **Later** — anything further out, so it is not lost.

Times use a 24-hour clock on the list.

## Run it locally

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:4317](http://127.0.0.1:4317). That address works on the computer running the app. It is not the link to send to other people.

To run the production build:

```bash
npm run build
npm start
```

That serves the same local address. Use one running copy for the whole team. Phones and laptops that open the shared link above share that copy.

## How sharing works

Entries are stored in `data/entries.json` on the computer that runs the app. That file is created automatically and is not part of the git history.

Anyone who opens this app talks to that one file. Add and remove update it for the whole team, including people who already have the page open.

If each person runs their own copy, each copy has its own list.

There is no login. Treat the address like an internal tool.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the board for local use on port 4317 |
| `npm run build` | Build the production app |
| `npm start` | Serve the production build on port 4317 |
| `npm run lint` | Run the linter |
