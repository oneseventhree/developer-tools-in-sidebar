# Changelog

## v1.0.0-beta-04

- Restore the sidebar label to **Tools**, matching the older Home Assistant sidebar wording.
- Keep the integration name as Developer Tools in Sidebar while the visible shortcut remains simply **Tools**.
- Keep the safer sidebar render-cycle implementation introduced in beta-03.

## v1.0.0-beta-03

- Remove the MutationObserver-based sidebar injection that could repeatedly reinsert DOM on Home Assistant state updates and eventually destabilise the frontend.
- Render the Developer tools shortcut through Home Assistant's own sidebar render cycle instead of mutating the rendered sidebar DOM.
- Keep Settings unselected while the native Tools page is open.
- Preserve per-user visibility and the fixed position immediately above Settings.

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
