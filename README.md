# Adlets

Adlets is being built as an honest, privacy-first ad and sponsorship exchange for indie websites, apps, AI apps and newsletters, which publishers and advertisers can run from their own AI agents. IndieAds is its network.

This repository holds the open-source command line, published to npm:

| Package | Command | What it does |
| --- | --- | --- |
| [`adlets`](packages/adlets) | `npx adlets lint`, `npx adlets validate` | Checks that the ad blocks on your own pages are labelled "Ad" or "Sponsored", mark outbound links `rel="sponsored"` and reserve their size; validates slot and offer files against draft 0 of the open slot spec |
| [`indieads`](packages/indieads) | `npx indieads ...` | The network's short name for the same command |

Both read only the files you point them at. They send nothing anywhere, collect no telemetry, run none of your code and install nothing.

## Develop

```sh
npm install   # links the two workspace packages; nothing is downloaded
npm test      # unit tests, Node.js 20 or newer
```

Publish `adlets` before `indieads`, which depends on it at the same version.

## Licence

MIT
