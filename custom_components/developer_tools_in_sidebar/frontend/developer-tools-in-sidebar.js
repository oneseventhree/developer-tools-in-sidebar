(() => {
  "use strict";

  const DOMAIN = "developer_tools_in_sidebar";
  const VERSION = "1.0.0-beta-04";
  const WS_TYPE = `${DOMAIN}/config`;
  const ITEM_ID = "sidebar-developer-tools";
  const PATCH_FLAG = "__developerToolsInSidebarPatched";
  const BUTTON_KEY = Symbol.for("developer_tools_in_sidebar.button");
  const RETRY_MS = 500;

  let currentConfig = {
    enabled: false,
    title: "Tools",
    icon: "mdi:hammer",
    path: "/config/tools",
    event: `${DOMAIN}_updated`,
  };

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

  const requestSidebarUpdate = () => {
    const sidebar = getSidebar();
    if (sidebar?.requestUpdate) {
      sidebar.requestUpdate();
    }
  };

  const createButton = () => {
    const button = document.createElement("ha-list-item-button");
    button.id = ITEM_ID;
    button.classList.add("developer-tools-sidebar");

    const icon = document.createElement("ha-icon");
    icon.setAttribute("slot", "start");

    const label = document.createElement("span");
    label.classList.add("item-text");
    label.setAttribute("slot", "headline");

    button.append(icon, label);
    return button;
  };

  const updateButton = (button, isSelected) => {
    button.setAttribute("href", currentConfig.path);
    button.href = currentConfig.path;
    button.classList.toggle("selected", isSelected);

    button
      .querySelector("ha-icon")
      ?.setAttribute("icon", currentConfig.icon);

    const label = button.querySelector(".item-text");
    if (label) {
      label.textContent = currentConfig.title;
    }
  };

  const installSidebarPatch = async () => {
    await customElements.whenDefined("ha-sidebar");

    const Sidebar = customElements.get("ha-sidebar");
    const prototype = Sidebar?.prototype;

    if (
      !prototype ||
      typeof prototype._renderConfiguration !== "function" ||
      prototype[PATCH_FLAG]
    ) {
      requestSidebarUpdate();
      return;
    }

    const originalRenderConfiguration = prototype._renderConfiguration;

    prototype._renderConfiguration = function (selectedPanel) {
      const isTools =
        currentConfig.enabled &&
        window.location.pathname.startsWith(currentConfig.path);

      const originalResult = originalRenderConfiguration.call(
        this,
        isTools ? "__developer_tools_in_sidebar__" : selectedPanel
      );

      if (!currentConfig.enabled || !this.hass?.user?.is_admin) {
        return originalResult;
      }

      let button = this[BUTTON_KEY];
      if (!button) {
        button = createButton();
        this[BUTTON_KEY] = button;
      }

      updateButton(button, isTools);

      if (!this.alwaysExpand && typeof this._renderToolTip === "function") {
        return [
          button,
          this._renderToolTip(ITEM_ID, currentConfig.title),
          originalResult,
        ];
      }

      return [button, originalResult];
    };

    Object.defineProperty(prototype, PATCH_FLAG, {
      configurable: false,
      enumerable: false,
      value: true,
      writable: false,
    });

    requestSidebarUpdate();
  };

  const refreshConfig = async () => {
    if (refreshInFlight) return;

    const hass = getHass();
    if (!hass?.callWS) return;

    refreshInFlight = true;

    try {
      const result = await hass.callWS({ type: WS_TYPE });
      currentConfig = { ...currentConfig, ...result };
    } catch (error) {
      currentConfig = { ...currentConfig, enabled: false };
      console.debug(`[${DOMAIN}] Backend is not ready yet`, error);
    } finally {
      refreshInFlight = false;
      requestSidebarUpdate();
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

    bootTimer = undefined;

    await installSidebarPatch();
    await refreshConfig();
    await subscribeToConfigChanges();
    requestSidebarUpdate();
  };

  window.addEventListener("location-changed", () => requestSidebarUpdate());
  window.addEventListener("popstate", () => requestSidebarUpdate());
  window.addEventListener("pageshow", () => {
    refreshConfig();
    requestSidebarUpdate();
  });

  window.addEventListener("pagehide", () => {
    if (typeof eventUnsubscribe === "function") {
      eventUnsubscribe();
    }
    eventUnsubscribe = undefined;

    if (bootTimer) {
      window.clearTimeout(bootTimer);
      bootTimer = undefined;
    }
  });

  console.info(`Developer Tools in Sidebar ${VERSION} loaded`);
  boot();
})();
