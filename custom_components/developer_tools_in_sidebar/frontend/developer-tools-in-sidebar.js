(() => {
  "use strict";

  const DOMAIN = "developer_tools_in_sidebar";
  const WS_TYPE = `${DOMAIN}/config`;
  const ITEM_ID = "sidebar-developer-tools";
  const TOOLTIP_ID = `${ITEM_ID}-tooltip`;
  const RETRY_MS = 500;

  let currentConfig = {
    enabled: false,
    title: "Developer tools",
    icon: "mdi:hammer",
    path: "/config/tools",
    event: `${DOMAIN}_updated`,
  };

  let sidebarObserver;
  let observedSidebarRoot;
  let eventUnsubscribe;
  let bootTimer;
  let refreshInFlight = false;

  const getHomeAssistant = () => document.querySelector("home-assistant");

  const getHass = () => getHomeAssistant()?.hass;

  const getSidebar = () => {
    const homeAssistant = getHomeAssistant();
    const homeAssistantMain = homeAssistant?.shadowRoot?.querySelector(
      "home-assistant-main"
    );
    const mainRoot = homeAssistantMain?.shadowRoot;

    return (
      mainRoot?.querySelector("ha-sidebar") ||
      mainRoot?.querySelector("#drawer ha-sidebar") ||
      null
    );
  };

  const restoreSettingsSelection = (root) => {
    const settings = root?.querySelector("#sidebar-config");
    if (!settings) return;

    if (window.location.pathname.startsWith("/config")) {
      settings.classList.add("selected");
    }
  };

  const removeInjectedItem = (root) => {
    root?.querySelector(`#${ITEM_ID}`)?.remove();
    root?.querySelector(`#${TOOLTIP_ID}`)?.remove();
    restoreSettingsSelection(root);
  };

  const createButton = (config) => {
    const button = document.createElement("ha-list-item-button");
    button.id = ITEM_ID;
    button.classList.add("developer-tools-sidebar");
    button.setAttribute("href", config.path);
    button.href = config.path;

    const icon = document.createElement("ha-icon");
    icon.setAttribute("slot", "start");
    icon.setAttribute("icon", config.icon);

    const label = document.createElement("span");
    label.classList.add("item-text");
    label.setAttribute("slot", "headline");
    label.textContent = config.title;

    button.append(icon, label);
    return button;
  };

  const createTooltip = (config) => {
    const tooltip = document.createElement("ha-tooltip");
    tooltip.id = TOOLTIP_ID;
    tooltip.setAttribute("for", ITEM_ID);
    tooltip.setAttribute("show-delay", "0");
    tooltip.setAttribute("hide-delay", "0");
    tooltip.setAttribute("placement", "right");
    tooltip.textContent = config.title;
    return tooltip;
  };

  const syncSelectedState = (root, button) => {
    const settings = root.querySelector("#sidebar-config");
    const isTools = window.location.pathname.startsWith(currentConfig.path);

    button.classList.toggle("selected", isTools);

    if (!settings) return;

    if (isTools) {
      settings.classList.remove("selected");
    } else if (window.location.pathname.startsWith("/config")) {
      settings.classList.add("selected");
    }
  };

  const syncSidebar = () => {
    const sidebar = getSidebar();
    const root = sidebar?.shadowRoot;
    if (!sidebar || !root) return false;

    if (observedSidebarRoot !== root) {
      sidebarObserver?.disconnect();
      observedSidebarRoot = root;
      sidebarObserver = new MutationObserver(() => syncSidebar());
      sidebarObserver.observe(root, { childList: true, subtree: true });
    }

    const settings = root.querySelector("#sidebar-config");
    let button = root.querySelector(`#${ITEM_ID}`);
    let tooltip = root.querySelector(`#${TOOLTIP_ID}`);

    if (!currentConfig.enabled || !settings) {
      removeInjectedItem(root);
      return true;
    }

    if (!button) {
      button = createButton(currentConfig);
    }

    if (!tooltip) {
      tooltip = createTooltip(currentConfig);
    }

    button.setAttribute("href", currentConfig.path);
    button.href = currentConfig.path;
    button.querySelector("ha-icon")?.setAttribute("icon", currentConfig.icon);
    const label = button.querySelector(".item-text");
    if (label) label.textContent = currentConfig.title;
    tooltip.textContent = currentConfig.title;

    const parent = settings.parentNode;
    if (parent) {
      if (button.parentNode !== parent || button.nextSibling !== tooltip) {
        parent.insertBefore(button, settings);
        parent.insertBefore(tooltip, settings);
      } else if (tooltip.nextSibling !== settings) {
        parent.insertBefore(tooltip, settings);
      }
    }

    syncSelectedState(root, button);
    return true;
  };

  const refreshConfig = async () => {
    if (refreshInFlight) return;

    const hass = getHass();
    if (!hass?.callWS) return;

    refreshInFlight = true;
    try {
      const result = await hass.callWS({ type: WS_TYPE });
      currentConfig = { ...currentConfig, ...result };
      syncSidebar();
    } catch (error) {
      currentConfig = { ...currentConfig, enabled: false };
      syncSidebar();
      console.debug(`[${DOMAIN}] Backend is not ready yet`, error);
    } finally {
      refreshInFlight = false;
    }
  };

  const subscribeToConfigChanges = async () => {
    if (eventUnsubscribe) return;

    const hass = getHass();
    const eventType = currentConfig.event;
    if (!hass?.connection?.subscribeEvents || !eventType) return;

    try {
      eventUnsubscribe = await hass.connection.subscribeEvents(
        () => refreshConfig(),
        eventType
      );
    } catch (error) {
      console.debug(
        `[${DOMAIN}] Could not subscribe to config changes`,
        error
      );
    }
  };

  const boot = async () => {
    const hass = getHass();
    if (!hass?.user || !hass?.callWS) {
      bootTimer = window.setTimeout(boot, RETRY_MS);
      return;
    }

    await refreshConfig();
    await subscribeToConfigChanges();
    syncSidebar();
  };

  window.addEventListener("location-changed", () => syncSidebar());
  window.addEventListener("popstate", () => syncSidebar());
  window.addEventListener("pageshow", () => {
    refreshConfig();
    syncSidebar();
  });

  window.addEventListener("pagehide", () => {
    sidebarObserver?.disconnect();
    sidebarObserver = undefined;
    observedSidebarRoot = undefined;
    if (typeof eventUnsubscribe === "function") eventUnsubscribe();
    eventUnsubscribe = undefined;
    if (bootTimer) window.clearTimeout(bootTimer);
  });

  boot();
})();
