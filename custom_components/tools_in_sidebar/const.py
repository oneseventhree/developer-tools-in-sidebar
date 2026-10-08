"""Constants for Tools in Sidebar."""

DOMAIN = "tools_in_sidebar"

CONF_USER_IDS = "user_ids"
CONF_TOOLS_SECTION = "tools_section"

DEFAULT_TITLE = "Tools"
DEFAULT_ICON = "mdi:hammer"
TOOLS_PATH = "/config/tools"
DEFAULT_TOOLS_SECTION = "yaml"
TOOLS_SECTIONS = {
    "yaml",
    "state",
    "action",
    "template",
    "event",
    "statistics",
    "assist",
}

FRONTEND_URL = f"/{DOMAIN}/tools-in-sidebar.js"
EVENT_CONFIG_UPDATED = f"{DOMAIN}_updated"
