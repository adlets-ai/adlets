# indieads

IndieAds is the network of indie websites, apps, AI apps and newsletters that the Adlets exchange is being built to serve. This package is the network's short name for the [`adlets`](https://www.npmjs.com/package/adlets) command: `npx indieads` runs exactly the same tool.

```sh
npx indieads lint ./dist             # check ad blocks: label, rel="sponsored", reserved size
npx indieads lint ./dist --strict    # exit code 1 on any error, for CI
npx indieads validate slot.json      # check slot and offer files against spec draft 0
npx indieads about
```

It reads only the files you point it at. It sends nothing anywhere, collects no telemetry, runs none of your code and installs nothing. See the `adlets` README for every check and the slot spec.

Node.js 20 or newer.

## Licence

MIT
