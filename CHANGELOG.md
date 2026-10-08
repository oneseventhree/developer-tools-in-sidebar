# Changelog

## v1.0.0-beta-02

- Fix the sidebar shortcut not appearing when the frontend module loads before Home Assistant has rendered the sidebar.
- Keep retrying until the Home Assistant sidebar is available.
- Observe the Home Assistant shell so the shortcut is restored if the sidebar is created or replaced after the module loads.

## v1.0.0-beta-01

- Initial beta release.
- Restore Developer tools to the fixed Home Assistant sidebar directly above Settings.
- Open Home Assistant's native Tools page at `/config/tools`.
- Allow the shortcut to be enabled per administrator user.
- Follow the active Home Assistant theme and sidebar layout.
