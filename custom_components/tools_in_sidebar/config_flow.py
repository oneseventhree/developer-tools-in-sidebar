"""Config flow for Tools in Sidebar."""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant import config_entries
from homeassistant.core import callback
from homeassistant.helpers.selector import (
    SelectOptionDict,
    SelectSelector,
    SelectSelectorConfig,
    SelectSelectorMode,
)

from .const import (
    CONF_TOOLS_SECTION,
    CONF_USER_IDS,
    DEFAULT_TOOLS_SECTION,
    DOMAIN,
    TOOLS_SECTIONS,
)

TOOLS_SECTION_OPTIONS = [
    SelectOptionDict(value="yaml", label="YAML"),
    SelectOptionDict(value="state", label="States"),
    SelectOptionDict(value="action", label="Actions"),
    SelectOptionDict(value="template", label="Template"),
    SelectOptionDict(value="event", label="Events"),
    SelectOptionDict(value="statistics", label="Statistics"),
    SelectOptionDict(value="assist", label="Assist"),
]


async def _admin_user_options(hass) -> list[SelectOptionDict]:
    """Return active, non-system admin users as selector options."""
    users = await hass.auth.async_get_users()
    return [
        SelectOptionDict(value=user.id, label=user.name or user.id)
        for user in sorted(users, key=lambda item: (item.name or item.id).casefold())
        if user.is_active
        and user.is_admin
        and not getattr(user, "system_generated", False)
    ]


def _schema(
    options: list[SelectOptionDict],
    selected: list[str],
    tools_section: str,
) -> vol.Schema:
    """Build the options schema."""
    return vol.Schema(
        {
            vol.Optional(
                CONF_USER_IDS,
                description={"suggested_value": selected},
            ): SelectSelector(
                SelectSelectorConfig(
                    options=options,
                    multiple=True,
                    mode=SelectSelectorMode.DROPDOWN,
                )
            ),
            vol.Required(
                CONF_TOOLS_SECTION,
                default=tools_section,
            ): SelectSelector(
                SelectSelectorConfig(
                    options=TOOLS_SECTION_OPTIONS,
                    mode=SelectSelectorMode.DROPDOWN,
                )
            ),
        }
    )


def _validated_tools_section(value: str | None) -> str:
    """Return a valid Tools section."""
    if value in TOOLS_SECTIONS:
        return value
    return DEFAULT_TOOLS_SECTION


class ToolsSidebarConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow for Tools in Sidebar."""

    VERSION = 1

    async def async_step_user(
        self,
        user_input: dict[str, Any] | None = None,
    ) -> config_entries.ConfigFlowResult:
        """Handle the initial step."""
        if self._async_current_entries():
            return self.async_abort(reason="single_instance_allowed")

        options = await _admin_user_options(self.hass)
        option_ids = {option["value"] for option in options}

        if user_input is not None:
            selected = [
                user_id
                for user_id in user_input.get(CONF_USER_IDS, [])
                if user_id in option_ids
            ]
            tools_section = _validated_tools_section(
                user_input.get(CONF_TOOLS_SECTION)
            )
            return self.async_create_entry(
                title="Tools in Sidebar",
                data={},
                options={
                    CONF_USER_IDS: selected,
                    CONF_TOOLS_SECTION: tools_section,
                },
            )

        current_user_id = self.context.get("user_id")
        defaults = [current_user_id] if current_user_id in option_ids else []

        return self.async_show_form(
            step_id="user",
            data_schema=_schema(options, defaults, DEFAULT_TOOLS_SECTION),
        )

    @staticmethod
    @callback
    def async_get_options_flow(
        config_entry: config_entries.ConfigEntry,
    ) -> config_entries.OptionsFlow:
        """Return the options flow."""
        return ToolsSidebarOptionsFlow(config_entry)


class ToolsSidebarOptionsFlow(config_entries.OptionsFlow):
    """Handle Tools in Sidebar options."""

    def __init__(self, config_entry: config_entries.ConfigEntry) -> None:
        """Initialize the options flow."""
        self._entry = config_entry

    async def async_step_init(
        self,
        user_input: dict[str, Any] | None = None,
    ) -> config_entries.ConfigFlowResult:
        """Edit shortcut visibility and the default Tools section."""
        options = await _admin_user_options(self.hass)
        option_ids = {option["value"] for option in options}

        if user_input is not None:
            selected = [
                user_id
                for user_id in user_input.get(CONF_USER_IDS, [])
                if user_id in option_ids
            ]
            tools_section = _validated_tools_section(
                user_input.get(CONF_TOOLS_SECTION)
            )
            return self.async_create_entry(
                title="",
                data={
                    CONF_USER_IDS: selected,
                    CONF_TOOLS_SECTION: tools_section,
                },
            )

        selected = list(
            self._entry.options.get(
                CONF_USER_IDS,
                self._entry.data.get(CONF_USER_IDS, []),
            )
        )
        tools_section = _validated_tools_section(
            self._entry.options.get(
                CONF_TOOLS_SECTION,
                self._entry.data.get(
                    CONF_TOOLS_SECTION,
                    DEFAULT_TOOLS_SECTION,
                ),
            )
        )

        return self.async_show_form(
            step_id="init",
            data_schema=_schema(options, selected, tools_section),
        )
