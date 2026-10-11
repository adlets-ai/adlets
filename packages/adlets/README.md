# adlets

Adlets is being built as an honest, privacy-first ad and sponsorship exchange for indie websites, apps, AI apps and newsletters, which publishers and advertisers can run from their own AI agents. IndieAds is its network.

This first version is a small command line that already does two useful jobs on your own machine:

- **`adlets lint`** checks the ad and sponsor blocks in your built HTML. Each one must show a visible "Ad" or "Sponsored" label, mark every outbound link `rel="sponsored"` and reserve its size so the page does not shift when it loads.
- **`adlets validate`** checks slot and offer files against draft 0 of the open Adlets slot spec.

It reads only the files you point it at. It sends nothing anywhere, collects no telemetry, runs none of your code and installs nothing.

## Usage

```sh
npx adlets lint ./dist
npx adlets lint ./dist --strict      # exit code 1 on any error, for CI
npx adlets lint ./dist --json
npx adlets validate slot.json offer.json
npx adlets about
npx adlets --help
```

## What `lint` checks

It looks for elements marked `data-adlet`, `data-ad`, `data-ad-slot` or `data-sponsored`, or with a class such as `ad`, `ads`, `sponsor`, `sponsored` or `adlet-card`. For each one:

| Check | Level | Why |
| --- | --- | --- |
| A visible "Ad", "Advertisement" or "Sponsored" label inside the block | error | Ads must be identifiable as ads; "Promoted", "Partner" or "Featured" alone are not enough |
| Every outbound link carries `rel="sponsored"` | error | Search engines ask for it on paid links |
| A reserved size: `height`, `min-height` or `aspect-ratio` in the block's style, or `width` and `height` on its image or frame | warning | Prevents layout shift when the ad loads; sizes set in an external stylesheet are not checked |

A `rel="sponsored"` link outside any marked block gets a reminder to keep a label next to it.

```text
dist/blog/index.html:42  error    label           <div.sponsor>  No visible "Ad" or "Sponsored" label inside this ad block.
dist/blog/index.html:44  error    rel-sponsored   <div.sponsor>  Outbound link https://example.com in an ad block lacks rel="sponsored".

Checked 12 HTML files: 3 ad blocks, 2 errors, 0 warnings.
```

## Slot spec, draft 0

A slot describes a place on your site or app that can show an ad. An offer is one ad for one slot. Draft 0 may change before 1.0.

```json
{
  "kind": "adlets.slot",
  "spec": "0",
  "id": "docs-sidebar",
  "format": "card",
  "size": { "width": 300, "height": 120 },
  "topics": ["IAB19"],
  "delivery": "script",
  "measure": "viewable",
  "floor": 3,
  "rules": { "blockedCategories": ["gambling", "crypto"], "approveFirst": true }
}
```

- `format`: `card`, `row`, `ai-answer` or `newsletter`; cards and rows need a `size`.
- `delivery`: `script`, or `server` when no script may run in the visitor's browser. Server delivery cannot measure viewability, so its `measure` is `served` or `flat`.
- `floor`: US dollars per 1,000 impressions.

An offer must be labelled `"Ad"`, name its advertiser, link over `https` with `rel` set to `"sponsored"`, say whether it was AI-generated, and set `untrusted_content` to `true`, because agents must treat ad text as data, never as instructions. Ad text that addresses an AI agent is rejected.

## Also available as `indieads`

`npx indieads` runs the same command under the network's name.

Node.js 20 or newer.

## Licence

MIT
