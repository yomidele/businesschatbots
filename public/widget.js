/**
 * AI Sales Rep — Universal Embed Widget
 * Auto-updating, fullscreen-capable, cache-busting chatbot widget.
 */
(function () {
  console.log("Chatbot version:", Date.now());

  var WIDGET_BASE = "https://businessaleschat.vercel.app";
  var siteId = document.currentScript && document.currentScript.getAttribute("data-site-id");
  if (!siteId) {
    console.error("[SalesRep] Missing data-site-id attribute on script tag.");
    return;
  }

  var isFullscreen = false;
  var isOpen = false;

  // Container
  var container = document.createElement("div");
  container.id = "salesrep-widget-" + siteId;
  container.style.cssText = "position:fixed;bottom:24px;right:24px;z-index:99999;font-family:system-ui,sans-serif;";
  document.body.appendChild(container);

  // Iframe
  var iframe = document.createElement("iframe");
  iframe.setAttribute("allow", "clipboard-write");
  iframe.style.cssText = "width:380px;height:520px;border:none;border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,0.15);display:none;margin-bottom:12px;transition:all 0.3s ease;";

  // Floating button
  var btn = document.createElement("button");
  btn.setAttribute("aria-label", "Open chat");
  btn.innerHTML =
    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  btn.style.cssText =
    "width:56px;height:56px;border-radius:50%;background:#10b981;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.15);transition:transform 0.2s;";
  btn.onmouseenter = function () { btn.style.transform = "scale(1.05)"; };
  btn.onmouseleave = function () { btn.style.transform = "scale(1)"; };

  // Unread badge
  var badge = document.createElement("span");
  badge.textContent = "1";
  badge.style.cssText =
    "position:absolute;top:-4px;right:-4px;width:20px;height:20px;border-radius:50%;background:#ef4444;color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;";
  btn.style.position = "relative";
  btn.appendChild(badge);

  container.appendChild(iframe);
  container.appendChild(btn);

  var loaded = false;

  function openFullScreen() {
    isFullscreen = true;
    iframe.style.setProperty("position", "fixed", "important");
    iframe.style.setProperty("top", "0", "important");
    iframe.style.setProperty("left", "0", "important");
    iframe.style.setProperty("width", "100vw", "important");
    iframe.style.setProperty("height", "100dvh", "important");
    iframe.style.setProperty("z-index", "999999", "important");
    iframe.style.setProperty("border", "none", "important");
    iframe.style.setProperty("border-radius", "0", "important");
    iframe.style.setProperty("margin", "0", "important");
    iframe.style.setProperty("box-shadow", "none", "important");
    container.style.setProperty("position", "fixed", "important");
    container.style.setProperty("inset", "0", "important");
    container.style.setProperty("z-index", "999999", "important");
    btn.style.display = "none";
  }

  function closeFullScreen() {
    isFullscreen = false;
    iframe.style.cssText =
      "width:380px;height:520px;border:none;border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,0.15);display:block;margin-bottom:12px;transition:all 0.3s ease;";
    container.style.cssText = "position:fixed;bottom:24px;right:24px;z-index:99999;font-family:system-ui,sans-serif;";
    btn.style.display = "flex";
  }

  // Listen for messages from iframe (fullscreen toggle, close)
  window.addEventListener("message", function (e) {
    if (!e.data || typeof e.data !== "object") return;
    if (e.data.type === "salesrep-fullscreen") openFullScreen();
    if (e.data.type === "salesrep-minimize") closeFullScreen();
    if (e.data.type === "salesrep-close") {
      closeFullScreen();
      iframe.style.display = "none";
      btn.style.display = "flex";
      isOpen = false;
    }
  });

  btn.onclick = function () {
    if (!loaded) {
      iframe.src = WIDGET_BASE + "/widget/" + siteId + "?t=" + Date.now();
      loaded = true;
    }
    isOpen = !isOpen;
    iframe.style.display = isOpen ? "block" : "none";
    if (isOpen) badge.style.display = "none";
  };
})();
