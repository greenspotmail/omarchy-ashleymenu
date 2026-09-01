# ashley.menu

A restyled version of Omarchy's built-in app launcher/menu (`omarchy.menu`),
cloned via `omarchy plugin clone omarchy.menu`.

Changes from stock:

- **Docked left, full height** — the main nav menu sits flush against the
  left edge, just below the top bar, and fills the screen top to bottom
  instead of a small centered popup.
- **Slightly wider** — 340px instead of the stock 300px.
- **Slide in/out** — the menu slides in from the left edge on open and
  slides back out on close, instead of popping instantly.
- **Tighter row spacing** — reduced vertical gap between menu rows.

Dmenu-style popups (power menu, screenshot options, font picker, etc. —
anything opened via `omarchy-menu-select`/`omarchy-menu-input`) are
untouched and still open as small centered popups, since those are
short-lived scripted dialogs rather than the main launcher.

## Assumptions

This assumes a horizontal bar docked at the **top** of the screen
(`"bar": {"position": "top"}` in `~/.config/omarchy/shell.json`). If you
move the bar elsewhere, adjust `barThickness`/`dockTop` in `Menu.qml`
accordingly.

## Install

```bash
omarchy plugin add <this-repo-url> --enable
```

## Notes

After editing `Menu.qml`, Quickshell's plugin hot-reload doesn't always
pick up structural layout changes (only some property/logic edits apply
live). If a change doesn't seem to show up, run:

```bash
omarchy restart shell
```
