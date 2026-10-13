# Upcoming flights & tests

A shared board for the flights and tests planned over the next few days. Open it, see what is coming up, add anything the team should not forget, and remove an entry when it is finished.

Everyone who opens the page uses the same list. There are no accounts. Share the link only with the team: anyone who has it can add and remove entries.

## Keep the board up

One computer runs the board. That computer stays powered on. Phones and laptops only open the page, and they all share the list on that computer.

The link to share is that computer’s address, on port 4317:

`http://<that-computer>:4317`

That address stays up while the computer is on. After you enable the service below, a reboot starts the board again on the same address.

On the computer that will host the board (Node.js 20 or newer, and `npm` on the system path):

```bash
sudo mkdir -p /opt/upcoming-flights
sudo chown "$USER" /opt/upcoming-flights
git clone https://github.com/TectiveJK/Upcoming-Test-Flights.git /opt/upcoming-flights
cd /opt/upcoming-flights
npm install
npm run build
```

Set `User=` in `deploy/upcoming-flights.service` to the output of `whoami`, then enable the service:

```bash
sudo cp deploy/upcoming-flights.service /etc/systemd/system/upcoming-flights.service
sudo systemctl daemon-reload
sudo systemctl enable --now upcoming-flights
```

From another machine on the same network, open `http://<that-computer>:4317`. Send that address to the team. If other machines cannot open it, allow TCP port 4317 on the host firewall.

People away from the office need a company hostname that points at this computer. The board listens on port 4317.

Check that it is running:

```bash
systemctl status upcoming-flights
```

The list is stored in `/opt/upcoming-flights/data/entries.json` on that computer. Run this one copy. A second copy keeps a separate list.

## Preview address

This session also publishes a temporary address:

[https://volt-wild-modems-watched.trycloudflare.com](https://volt-wild-modems-watched.trycloudflare.com)

It is open while this session’s computer is still running. When that computer stops, Cloudflare drops the name. The same name cannot be started again. Use the always-on computer’s address as the link the team keeps.

People who already have the page open see an add or a removal immediately. A **Live** mark under Planned means the page is connected.

## Install it on a phone

Use the always-on address from above. Do not install from an app store.

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

## Run a copy on your own computer

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:4317](http://127.0.0.1:4317). That address works on the computer running the app. It is a private copy unless other people open that same computer’s address.

To run the production build in the foreground:

```bash
npm run build
npm start
```

For the link the team keeps, use [Keep the board up](#keep-the-board-up) so the process comes back after a reboot.

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
