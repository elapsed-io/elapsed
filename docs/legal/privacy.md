# Privacy

> **Draft, not published.** For the owner's review before Release 1's public launch. Built only from the
> plan's Privacy table and `docs/data-inventory.md`.

elapsed is a stopwatch for focused work. You use it without an account, and it is built to know as little
about you as possible. There are no ads, no analytics services and no tracking.

## What stays on your device

The timer keeps what it needs in your browser, on your device. None of it is sent to us.

- **The session in progress:** its start, pauses and end times, and the display modes it used. It is
  deleted when the session ends.
- **The session you just finished:** kept in this browser tab only, so a reload can show its results again.
  It is deleted when the tab closes or a new session starts.
- **Your settings:** your choices, such as the theme, font and display mode, once you change one.
- **A font file you load:** it stays on your device and is never uploaded.
- **A copy of the site's own files,** so the timer works offline.

You can remove your settings and files at any time with "clear device data" in settings, under privacy and
data. Your browser's own controls for site data remove everything.

## What we receive

- **Anonymous usage counts,** on unless you switch them off in settings, under privacy and data. We count
  visits (a page load that is not a reload or a back-and-forward navigation) and sessions started, as daily
  totals and nothing else. A count carries no cookie, no identifier and nothing about you or your device,
  and nothing is stored on your device to make it.
- **Crash reports,** only if you switch them on. A report holds the error message and where in the site's
  code it happened, the version of the site, and your browser's name and major version. Before it is sent,
  the parts of web addresses after a "?" or "#" are removed, addresses of other sites (such as browser
  extensions) are removed, and so is anything quoted in the error, since that could be something you typed.
  Reports are deleted after 14 days.

System notifications, if you switch them on, are shown by your device; nothing is sent to us for them.

## What we never collect

What you are working on, your name or email address, your location, your activity in other tabs, or a
fingerprint of your device. We set no cookies.

## Addresses and logs

Like every website, ours sees your IP address when your browser asks it for a page. We do not store it.
When crash reports are on, the address is held briefly in memory to allow at most five reports a minute
from one address, then forgotten. The site is hosted by Cloudflare, whose platform keeps its own standard
request logs. [Owner: name Cloudflare's privacy policy and how long its logs are kept, once confirmed.]

## Where it lives

Usage counts and crash reports are stored in a database on Cloudflare, on the site's own address, kept
apart from everything else. Counts are kept as totals; crash reports for 14 days.

## Children

The timer collects nothing that identifies a person, so it has no age limit.

## Changes and contact

When this page changes, the date below changes too. Questions: privacy@elapsed.io.

[Owner: effective date.]
