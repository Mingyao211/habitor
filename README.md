# Habitor

A habit tracker for friends. Track habits, sleep and screen time, join a party, and compete in monthly challenges. The winner gets a trophy on their profile.

## Features

- Separate accounts with a username, avatar and bio
- Habits with one-tap check-offs and streaks: every day, specific days of the week, or a single day, with an optional time and reminder
- Sleep logged from bedtime and wake-up time; screen time logged daily
- Personal calendar heatmap with reminders: tap a date, add what's happening and a time, and get reminded
- Parties with invite codes, monthly challenges (lowest screen time, sleep champion, habit master, streak king), live leaderboards and trophies
- Evening screen-time check-in at a time each person chooses
- Sleep and screen-time tips when goals are missed
- Games tab: chess, checkers, Connect Four, tic-tac-toe and memory match, against the computer or 2 players on one phone
- Friends tab: search by display name or username, send, accept or decline requests, and text friends in the app
- Multiple accounts on one device: log in with username and password, save accounts, switch from the log out screen
- Unique usernames (display names can repeat)
- Five selectable themes: Quiet Ritual, Night Owl, Club League, Sunrise Pop, Field Notes

## Running it

`index.html` is a single self-contained page. Opened directly in a browser it runs in preview mode and saves data in that browser only. Shared data (parties, leaderboards, profiles) works when it is hosted as a Claude artifact, which provides the database and sign-in.

## Versions

- `web/` — the Supabase version (real email and password accounts, private chats, live updates). Deployed on Vercel.
- `index.html` — the original version that runs as a Claude artifact.
