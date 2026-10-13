# Upcoming flights & tests

A shared board for the flights and tests planned over the next few days. Open it, see what is coming up, add anything the team should not forget, and remove an entry when it is finished.

Everyone who can open the page uses the same list. There are no accounts.

## Use the board

1. Open the page.
2. Read **Next up**, then the days under **Planned**.
3. Add a flight or test with a name, date, and time. Who and a short note are optional.
4. Remove an entry when it is done, cancelled, or was only an example. Removal asks you to confirm first.

The board refreshes on its own every few seconds, and when you come back to the tab. **Refresh** loads the latest list immediately.

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

Open [http://127.0.0.1:4317](http://127.0.0.1:4317).

To run the production build:

```bash
npm run build
npm start
```

That serves the same address.

## How sharing works

Entries are stored in `data/entries.json` on the computer that runs the app. That file is created automatically and is not part of the git history.

Anyone who opens this app talks to that one file. Add and remove update it for the whole team.

Run **one** copy, on a computer the team can reach, and share that address. If each person runs their own copy, each copy has its own list.

There is no login. Treat the address like an internal tool: anyone who can open it can change the board.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the board for local use on port 4317 |
| `npm run build` | Build the production app |
| `npm start` | Serve the production build on port 4317 |
| `npm run lint` | Run the linter |
