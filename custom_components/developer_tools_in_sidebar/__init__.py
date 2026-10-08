"""Developer Tools in Sidebar integration."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.components.frontend import add_extra_js_url, remove_extra_js_url
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry, ConfigEntryState
from homeassistant.core import HomeAssistant, callback

from .const import (
    CONF_USER_IDS,
    DEFAULT_ICON,
    DEFAULT_TITLE,
    DOMAIN,
    EVENT_CONFIG_UPDATED,
    FRONTEND_URL,
    TOOLS_PATH,
)

FRONTEND_FILE = Path(__file__).parent / "frontend" / "developer-tools-in-sidebar.js"

DATA_STATIC_REGISTERED = "static_registered"
DATA_EXTRA_JS_REGISTERED = "extra_js_registered"


async def async_setup(hass: HomeAssistant, config: dict[str, Any]) -> bool:
    """Set up Developer Tools in Sidebar."""
    hass.data.setdefault(
        DOMAIN,
        {
            DATA_STATIC_REGISTERED: False,
            DATA_EXTRA_JS_REGISTERED: False,
        },
    )

    websocket_api.async_register_command(hass, websocket_get_config)
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Developer Tools in Sidebar from a config entry."""
    domain_data = hass.data.setdefault(
        DOMAIN,
        {
            DATA_STATIC_REGISTERED: False,
            DATA_EXTRA_JS_REGISTERED: False,
        },
    )

    if not domain_data[DATA_STATIC_REGISTERED]:
        await hass.http.async_register_static_paths(
            [
                StaticPathConfig(
                    FRONTEND_URL,
                    str(FRONTEND_FILE),
                    cache_headers=False,
                )
            ]
        )
        domain_data[DATA_STATIC_REGISTERED] = True

    if not domain_data[DATA_EXTRA_JS_REGISTERED]:
        add_extra_js_url(hass, FRONTEND_URL)
        domain_data[DATA_EXTRA_JS_REGISTERED] = True

    entry.async_on_unload(entry.add_update_listener(_async_entry_updated))
    hass.bus.async_fire(EVENT_CONFIG_UPDATED)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    domain_data = hass.data.get(DOMAIN)
    if domain_data and domain_data.get(DATA_EXTRA_JS_REGISTERED):
        remove_extra_js_url(hass, FRONTEND_URL)
        domain_data[DATA_EXTRA_JS_REGISTERED] = False

    hass.bus.async_fire(EVENT_CONFIG_UPDATED)
    return True


async def _async_entry_updated(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Notify loaded frontends that per-user visibility changed."""
    hass.bus.async_fire(EVENT_CONFIG_UPDATED)


def _active_entry(hass: HomeAssistant) -> ConfigEntry | None:
    """Return the active integration entry, if present."""
    return next(
        (
            entry
            for entry in hass.config_entries.async_entries(DOMAIN)
            if entry.state is ConfigEntryState.LOADED
        ),
        None,
    )


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/config"})
@callback
def websocket_get_config(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Return sidebar configuration for the currently authenticated user."""
    entry = _active_entry(hass)
    selected_user_ids: list[str] = []

    if entry is not None:
        selected_user_ids = list(
            entry.options.get(
                CONF_USER_IDS,
                entry.data.get(CONF_USER_IDS, []),
            )
        )

    user = connection.user
    enabled = bool(
        entry is not None
        and user is not None
        and user.is_admin
        and user.id in selected_user_ids
    )

    connection.send_result(
        msg["id"],
        {
            "enabled": enabled,
            "title": DEFAULT_TITLE,
            "icon": DEFAULT_ICON,
            "path": TOOLS_PATH,
            "event": EVENT_CONFIG_UPDATED,
        },
    )
