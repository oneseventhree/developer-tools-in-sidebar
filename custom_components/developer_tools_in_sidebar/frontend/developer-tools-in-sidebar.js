(() => {
  "use strict";

  const DOMAIN = "developer_tools_in_sidebar";
  const VERSION = "1.0.0-beta-02";
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

  let shellObserver;
  let observedMainRoot;
  let sidebarObserver;
  let observedSidebarRoot;
  let eventUnsubscribe;
  let bootTimer;
  let sidebarRetryTimer;
  let refreshInFlight = false;

  const getHomeAssistant = () => document.querySelector("home-assistant");

  const getHass = () => getHomeAssistant()?.hass;

  const getMainRoot = () => {
    const homeAssistant = getHomeAssistant();
    const homeAssistantMain = homeAssistant?.shadowRoot?.querySelector(
      "home-assistant-main"
    );

    return homeAssistantMain?.shadowRoot || null;
  };

  const getSidebar = () => {
    const mainRoot = getMainRoot();

    return (
      mainRoot?.querySelector("ha-sidebar") ||
      mainRoot?.querySelector("#drawer ha-sidebar") ||
      null
    );
  };

  const scheduleSidebarSync = () => {
    if (sidebarRetryTimer) return;

    sidebarRetryTimer = window.setTimeout(() => {
      sidebarRetryTimer = undefined;
      if (!syncSidebar()) {
        scheduleSidebarSync();
      }
    }, RETRY_MS);
  };

  const ensureShellObserver = () => {
    const mainRoot = getMainRoot();
    if (!mainRoot) return false;

    if (observedMainRoot !== mainRoot) {
      shellObserver?.disconnect();
      observedMainRoot = mainRoot;
      shellObserver = new MutationObserver(() => syncSidebar());
      shellObserver.observe(mainRoot, { childList: true, subtree: true });
    }

    return true;
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
    ensureShellObserver();

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

    if (!currentConfig.enabled) {
      removeInjectedItem(root);
      return true;
    }

    if (!settings) {
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
    if (label) {
      label.textContent = currentConfig.title;
    }

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

      if (!syncSidebar()) {
        scheduleSidebarSync();
      }
    } catch (error) {
      currentConfig = { ...currentConfig, enabled: false };

      if (!syncSidebar()) {
        scheduleSidebarSync();
      }

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

    if (!syncSidebar()) {
      scheduleSidebarSync();
    }
  };

  window.addEventListener("location-changed", () => {
    if (!syncSidebar()) {
      scheduleSidebarSync();
    }
  });

  window.addEventListener("popstate", () => {
    if (!syncSidebar()) {
      scheduleSidebarSync();
    }
  });

  window.addEventListener("pageshow", () => {
    refreshConfig();

    if (!syncSidebar()) {
      scheduleSidebarSync();
    }
  });

  window.addEventListener("pagehide", () => {
    shellObserver?.disconnect();
    shellObserver = undefined;
    observedMainRoot = undefined;

    sidebarObserver?.disconnect();
    sidebarObserver = undefined;
    observedSidebarRoot = undefined;

    if (typeof eventUnsubscribe === "function") {
      eventUnsubscribe();
    }
    eventUnsubscribe = undefined;

    if (bootTimer) {
      window.clearTimeout(bootTimer);
      bootTimer = undefined;
    }

    if (sidebarRetryTimer) {
      window.clearTimeout(sidebarRetryTimer);
      sidebarRetryTimer = undefined;
    }
  });

  console.info(`Developer Tools in Sidebar ${VERSION} loaded`);
  boot();
})();
