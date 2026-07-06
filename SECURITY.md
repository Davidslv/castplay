# Security Policy

## Reporting a vulnerability

Please report suspected vulnerabilities **privately**, not in a public issue.

- Preferred: open a [private security advisory](https://github.com/Davidslv/castplay/security/advisories/new) on this repository (GitHub → *Security* → *Report a vulnerability*).
- Or email **davidslv.london@gmail.com** with "castplay security" in the subject.

Please include what you observed, a minimal `.cast` or HTML snippet that reproduces it, and the browser/version. As a solo-maintained project there is no formal SLA, but you can expect an acknowledgement within a few days. Please give a reasonable window to fix before public disclosure.

## Supported versions

castplay follows [Semantic Versioning](https://semver.org). Only the latest released version receives fixes; there are no long-term support branches.

| Version | Supported |
|---|---|
| 1.x (latest) | ✅ |
| < 1.0 | ❌ |

## Threat model — what castplay actually does

Being honest about the trust boundary matters more than boilerplate. castplay is a **client-side, browser-only** library. It:

- reads `.cast` text — either from an inline `<script type="text/cast">` block on your own page, or from a URL **you** put in `data-cast` and fetch over http(s);
- **HTML-escapes** every character of the recorded text (`&`, `<`, `>`) before inserting it, so a `.cast` **cannot inject markup or scripts** through its output text;
- wraps text only in `<span>` elements whose styling comes from a **fixed, in-code colour palette** — never from the cast — so a cast cannot inject arbitrary CSS either;
- runs **entirely in the browser**: no `eval`, no cookies, no storage, and no network access beyond the single `fetch()` of the exact URL you supply.

**Where the trust boundary sits.** The page author controls which cast is loaded (the `data-cast` value and the inline block) and how the terminal element is styled. Within that, the *content* of a cast is treated as untrusted text and escaped. The practical guidance:

- **Prefer inline casts** for anything you control — the page stays self-contained with no network dependency.
- If you `fetch()` a cast from a URL, apply the same trust you would to any other content you display: serve it from an origin you control or trust. castplay escapes the text, but you still own what you choose to show your users.
- castplay does not sanitise or sandbox beyond the escaping described above, and deliberately does no more — it is a display component, not a security boundary for hostile input.

## What is out of scope

- The **`.cast` files you author or host** — their content is your responsibility.
- **How you style the terminal element** — CSS you write is yours.
- Vulnerabilities in the **browser, OS, or a bundler** you run castplay through.
