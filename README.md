# Tools in Sidebar

A HACS custom integration that restores **Tools** to the fixed section of the Home Assistant sidebar, immediately above **Settings**.

The shortcut opens Home Assistant's real `/config/tools` page. It does not iframe, copy, or replace Home Assistant's Tools interface.

## Features

- Restores **Tools** directly above **Settings**.
- Uses Home Assistant's sidebar components so the item follows the active theme and sidebar layout.
- Lets you choose which **administrator accounts** see the shortcut.
- Does not change Home Assistant permissions. It only controls shortcut visibility.
- Updates visibility when the integration options are changed.

## Installation with HACS

Until this repository is available in the default HACS list:

1. Open HACS.
2. Open the menu and choose **Custom repositories**.
3. Add `https://github.com/oneseventhree/tools-in-sidebar`.
4. Select **Integration** as the category.
5. Install **Tools in Sidebar**.
6. Restart Home Assistant.
7. Go to **Settings → Devices & services → Add integration**.
8. Search for **Tools in Sidebar**.
9. Choose the administrator accounts that should see the shortcut.
10. Reload the Home Assistant frontend once after adding the user: **Windows:** `Ctrl + Shift + R` · **Mac:** `Cmd + Shift + R`.

## Per-user visibility

Only administrator accounts are offered in the integration's user selector.

If an administrator is selected, **Tools** appears immediately above **Settings** for that user. Unselected users do not get the shortcut.

This setting controls visibility only. It does not grant or revoke Home Assistant permissions. An administrator who is not selected can still navigate directly to `/config/tools`.

## Compatibility

The integration targets Home Assistant **2026.8.0 or newer**, where the current Tools route is `/config/tools`.

## Frontend implementation

Home Assistant does not currently expose a supported extension point for inserting third-party items into the fixed bottom section of the sidebar. This integration therefore hooks Home Assistant's current sidebar render cycle and renders the shortcut immediately before Settings.

Because that uses an internal frontend implementation detail, a future Home Assistant frontend change may require an update to this integration.

## Version

Current stable release: **v1.0.0**.

## License

MIT
