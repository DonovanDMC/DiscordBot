# Discord Bot

This bot is used for user lookups, ticket updates, private threads, and more in the [E621 Discord Server](https://e621.net/static/discord).
It is intended to run beside [e621ng](https://github.com/e621ng/e621ng) and [discord_joiner](https://github.com/e621ng/discord_joiner). Pieces of both are required for full functionality.

## Setup
To run it, first copy `.env.example` to `.env`, and fill out the required fields.
You will need to either determine the ip address of your e621ng's redis instance, or add a port configuration.
You can get the ip address via this command:
```sh
docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' e621ng-redis-1
```
Two connections will be opened, one for sending commands, and one for pub/sub.

See the comments in the `.env.example` for explanations of env variables that can be set. Many are required to be set.

After that, simply run `docker compose up`, and the bot should work.

## Tests

A test exists for formatting dtext links. To run it, run this command:
```sh
npx mocha
```
