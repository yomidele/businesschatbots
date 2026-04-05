/**
 * AI Sales Rep — Standalone Embeddable Chatbot Widget
 * Works on ANY website without React dependencies.
 * 
 * Usage:
 * <script>
 *   window.CHATBOT_CONFIG = {
 *     businessId: "your-site-id",
 *     themeColor: "#10b981",
 *     position: "bottom-right"
 *   };
 * </script>
 * <script src="https://yourdomain.com/chatbot.js"></script>
 */
(function () {
  "use strict";

  var config = window.CHATBOT_CONFIG || {};
  var siteId = config.businessId || (document.currentScript && document.currentScript.getAttribute("data-site-id"));
  if (!siteId) {
    console.error("[Chatbot] Missing businessId in CHATBOT_CONFIG or data-site-id attribute.");
    return;
  }

  var SUPABASE_URL = config.supabaseUrl || "https://eqemgveuvkdyectdzpzy.supabase.co";
  var SUPABASE_KEY = config.supabaseKey || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxZW1ndmV1dmtkeWVjdGR6cHp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MzI1NzEsImV4cCI6MjA5MDIwODU3MX0.QixH7bgN8PsZLSYtsjPLBti7BxUV572vRIWr2mwBHvA";
  var themeColor = config.themeColor || "#10b981";
  var position = config.position || "bottom-right";

  var isOpen = false;
  var messages = [];
  var conversationId = null;
  var visitorId = getVisitorId();
  var isLoading = false;
  var siteName = "AI Sales Rep";

  function getVisitorId() {
    var key = "salesrep_visitor_id";
    var id = null;
    try { id = localStorage.getItem(key); } catch (e) {}
    if (!id) { id = generateUUID(); try { localStorage.setItem(key, id); } catch (e) {} }
    return id;
  }

  function generateUUID() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
  }

  // Load cached messages
  try {
    var cached = localStorage.getItem("salesrep_msgs_" + siteId);
    if (cached) messages = JSON.parse(cached);
  } catch (e) {}

  function cacheMessages() {
    try { localStorage.setItem("salesrep_msgs_" + siteId, JSON.stringify(messages.slice(-50))); } catch (e) {}
  }

  // Fetch site name
  fetch(SUPABASE_URL + "/rest/v1/sites?select=name&id=eq." + siteId, {
    headers: { apikey: SUPABASE_KEY, Authorization: "Bearer " + SUPABASE_KEY }
  }).then(function (r) { return r.json(); }).then(function (d) {
    if (d && d[0] && d[0].name) { siteName = d[0].name; updateHeader(); }
  }).catch(function () {});

  // ── CSS ──
  var style = document.createElement("style");
  style.textContent = [
    "#srep-widget{position:fixed;z-index:999999;font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;font-size:14px;line-height:1.5}",
    "#srep-widget *{box-sizing:border-box;margin:0;padding:0}",
    "#srep-bubble{width:56px;height:56px;border-radius:50%;background:" + themeColor + ";border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(0,0,0,0.2);transition:transform 0.2s}",
    "#srep-bubble:hover{transform:scale(1.08)}",
    "#srep-badge{position:absolute;top:-3px;right:-3px;width:20px;height:20px;border-radius:50%;background:#ef4444;color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center}",
    "#srep-panel{display:none;width:380px;max-width:calc(100vw - 32px);height:560px;max-height:calc(100vh - 100px);border-radius:16px;overflow:hidden;box-shadow:0 12px 48px rgba(0,0,0,0.2);flex-direction:column;background:#fff;margin-bottom:12px}",
    "#srep-panel.open{display:flex}",
    "#srep-header{padding:14px 16px;display:flex;align-items:center;gap:10px;background:" + themeColor + ";color:#fff;flex-shrink:0}",
    "#srep-header-avatar{width:32px;height:32px;border-radius:8px;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center}",
    "#srep-header-name{font-weight:600;font-size:14px}",
    "#srep-header-status{font-size:11px;opacity:0.8;display:flex;align-items:center;gap:4px}",
    "#srep-header-dot{width:6px;height:6px;border-radius:50%;background:#4ade80;animation:srep-pulse 2s infinite}",
    "@keyframes srep-pulse{0%,100%{opacity:1}50%{opacity:0.4}}",
    "#srep-close{margin-left:auto;background:none;border:none;color:#fff;cursor:pointer;width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center}",
    "#srep-close:hover{background:rgba(255,255,255,0.15)}",
    "#srep-messages{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px}",
    ".srep-msg{display:flex;gap:8px;max-width:88%;animation:srep-slide 0.25s ease-out}",
    ".srep-msg.user{margin-left:auto;flex-direction:row-reverse}",
    ".srep-msg-avatar{width:26px;height:26px;border-radius:8px;background:" + themeColor + ";display:flex;align-items:center;justify-content:center;flex-shrink:0}",
    ".srep-msg.user .srep-msg-avatar{background:#e5e7eb}",
    ".srep-msg-bubble{padding:10px 14px;border-radius:14px;font-size:13px;line-height:1.55;word-break:break-word}",
    ".srep-msg.assistant .srep-msg-bubble{background:#f3f4f6;color:#1f2937;border-bottom-left-radius:4px}",
    ".srep-msg.user .srep-msg-bubble{background:" + themeColor + ";color:#fff;border-bottom-right-radius:4px}",
    ".srep-msg-bubble img{max-width:100%;border-radius:8px;margin:8px 0;cursor:pointer}",
    ".srep-msg-bubble a{color:" + themeColor + ";text-decoration:underline}",
    ".srep-msg.user .srep-msg-bubble a{color:#fff}",
    ".srep-product-card{border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;margin:8px 0;max-width:260px;background:#fff}",
    ".srep-product-card img{width:100%;height:140px;object-fit:cover}",
    ".srep-product-card-body{padding:10px}",
    ".srep-product-card h4{font-weight:600;font-size:13px;margin-bottom:4px}",
    ".srep-product-card .price{color:#16a34a;font-weight:700;font-size:14px}",
    ".srep-product-card .desc{font-size:11px;color:#6b7280;margin:4px 0}",
    ".srep-carousel{display:flex;gap:10px;overflow-x:auto;padding:4px 0}",
    ".srep-carousel::-webkit-scrollbar{height:4px}",
    ".srep-carousel::-webkit-scrollbar-thumb{background:#d1d5db;border-radius:4px}",
    ".srep-typing{display:flex;gap:4px;align-items:center;padding:10px 14px;background:#f3f4f6;border-radius:14px;width:fit-content}",
    ".srep-typing span{width:6px;height:6px;border-radius:50%;background:#9ca3af;animation:srep-bounce 1.4s infinite}",
    ".srep-typing span:nth-child(2){animation-delay:0.15s}",
    ".srep-typing span:nth-child(3){animation-delay:0.3s}",
    "@keyframes srep-bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}}",
    "@keyframes srep-slide{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}",
    "#srep-input-area{padding:12px;border-top:1px solid #e5e7eb;display:flex;gap:8px;flex-shrink:0;background:#fff}",
    "#srep-input{flex:1;border:1px solid #d1d5db;border-radius:10px;padding:10px 14px;font-size:13px;outline:none;font-family:inherit}",
    "#srep-input:focus{border-color:" + themeColor + ";box-shadow:0 0 0 2px " + themeColor + "33}",
    "#srep-send{width:36px;height:36px;border-radius:10px;background:" + themeColor + ";border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:opacity 0.2s}",
    "#srep-send:disabled{opacity:0.4;cursor:default}",
    "#srep-send:hover:not(:disabled){opacity:0.85}",
    "#srep-upload-btn{width:36px;height:36px;border-radius:10px;background:none;border:1px solid #d1d5db;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0}",
    "#srep-upload-btn:hover{background:#f3f4f6}",
    "#srep-lightbox{position:fixed;inset:0;z-index:9999999;background:rgba(0,0,0,0.85);display:none;align-items:center;justify-content:center;padding:16px}",
    "#srep-lightbox.open{display:flex}",
    "#srep-lightbox img{max-width:100%;max-height:100%;object-fit:contain;border-radius:8px}",
    "#srep-lightbox-close{position:absolute;top:16px;right:16px;width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,0.15);border:none;cursor:pointer;color:#fff;font-size:20px}",
    "#srep-welcome{text-align:center;padding:32px 16px;color:#6b7280}",
    "#srep-welcome svg{margin:0 auto 12px}",
    "@media(max-width:480px){#srep-panel{width:100vw;height:calc(100dvh - 80px);max-width:100vw;max-height:calc(100dvh - 80px);border-radius:16px 16px 0 0;position:fixed;bottom:0;left:0;right:0;margin-bottom:0}}",
  ].join("\n");
  document.head.appendChild(style);

  // ── DOM ──
  var widget = document.createElement("div");
  widget.id = "srep-widget";
  widget.style.cssText = position === "bottom-left" ? "bottom:20px;left:20px" : "bottom:20px;right:20px";

  // Panel
  var panel = document.createElement("div");
  panel.id = "srep-panel";

  // Header
  var header = document.createElement("div");
  header.id = "srep-header";
  header.innerHTML = '<div id="srep-header-avatar"><svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div><div><div id="srep-header-name">' + escapeHtml(siteName) + '</div><div id="srep-header-status"><span id="srep-header-dot"></span> Online</div></div><button id="srep-close" aria-label="Close chat"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>';
  panel.appendChild(header);

  // Messages
  var messagesDiv = document.createElement("div");
  messagesDiv.id = "srep-messages";
  panel.appendChild(messagesDiv);

  // Input
  var inputArea = document.createElement("div");
  inputArea.id = "srep-input-area";

  var fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "image/*";
  fileInput.style.display = "none";

  var uploadBtn = document.createElement("button");
  uploadBtn.id = "srep-upload-btn";
  uploadBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>';
  uploadBtn.onclick = function () { fileInput.click(); };

  var input = document.createElement("input");
  input.id = "srep-input";
  input.placeholder = "What are you looking for?";
  input.autocomplete = "off";

  var sendBtn = document.createElement("button");
  sendBtn.id = "srep-send";
  sendBtn.disabled = true;
  sendBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>';

  inputArea.appendChild(fileInput);
  inputArea.appendChild(uploadBtn);
  inputArea.appendChild(input);
  inputArea.appendChild(sendBtn);
  panel.appendChild(inputArea);

  // Bubble
  var bubble = document.createElement("button");
  bubble.id = "srep-bubble";
  bubble.setAttribute("aria-label", "Open chat");
  bubble.style.position = "relative";
  bubble.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><span id="srep-badge">1</span>';

  // Lightbox
  var lightbox = document.createElement("div");
  lightbox.id = "srep-lightbox";
  lightbox.innerHTML = '<button id="srep-lightbox-close">&times;</button><img src="" alt="Full size" />';
  lightbox.onclick = function () { lightbox.classList.remove("open"); };
  lightbox.querySelector("#srep-lightbox-close").onclick = function () { lightbox.classList.remove("open"); };

  widget.appendChild(panel);
  widget.appendChild(bubble);
  document.body.appendChild(widget);
  document.body.appendChild(lightbox);

  // ── RENDER MESSAGES ──
  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function renderMarkdownBasic(text) {
    // Convert markdown images: ![alt](url)
    var html = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" onclick="document.getElementById(\'srep-lightbox\').classList.add(\'open\');document.querySelector(\'#srep-lightbox img\').src=\'$2\'" />');
    // Convert markdown links: [text](url)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    // Bold: **text**
    html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    // Italic: *text*
    html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "<em>$1</em>");
    // Newlines
    html = html.replace(/\n/g, "<br>");
    // Detect raw image URLs and render them
    html = html.replace(/(https?:\/\/[^\s<"']+\.(?:jpg|jpeg|png|gif|webp)(?:\?[^\s<"']*)?)/gi, function (url) {
      // Skip if already in an img or a tag
      return '<img src="' + url + '" onclick="document.getElementById(\'srep-lightbox\').classList.add(\'open\');document.querySelector(\'#srep-lightbox img\').src=\'' + url + '\'" />';
    });
    return html;
  }

  function renderProductCard(product) {
    var card = '<div class="srep-product-card">';
    if (product.image) card += '<img src="' + escapeHtml(product.image) + '" alt="' + escapeHtml(product.name) + '" />';
    card += '<div class="srep-product-card-body">';
    card += "<h4>" + escapeHtml(product.name) + "</h4>";
    if (product.description) card += '<p class="desc">' + escapeHtml(product.description) + "</p>";
    if (product.price) card += '<p class="price">' + escapeHtml(product.price) + "</p>";
    if (product.actionUrl) card += '<a href="' + escapeHtml(product.actionUrl) + '" target="_blank" style="display:block;margin-top:8px;text-align:center;padding:8px;background:' + themeColor + ';color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:12px">' + escapeHtml(product.actionLabel || "View") + "</a>";
    card += "</div></div>";
    return card;
  }

  function parseAndRender(content, role) {
    if (role === "user") return escapeHtml(content);

    // Try parsing as JSON
    try {
      var parsed = JSON.parse(content);
      if (parsed.type === "product") return renderProductCard(parsed);
      if (parsed.type === "carousel") {
        var html = '<div class="srep-carousel">';
        (parsed.items || []).forEach(function (item) { html += renderProductCard(item); });
        return html + "</div>";
      }
      if (parsed.type === "image") {
        return '<img src="' + escapeHtml(parsed.url) + '" alt="' + escapeHtml(parsed.caption || "Image") + '" />' + (parsed.caption ? "<br><small>" + escapeHtml(parsed.caption) + "</small>" : "");
      }
      if (parsed.type === "text") return renderMarkdownBasic(parsed.content);
    } catch (e) {}

    return renderMarkdownBasic(content);
  }

  function updateHeader() {
    var nameEl = document.getElementById("srep-header-name");
    if (nameEl) nameEl.textContent = siteName;
  }

  function renderMessages() {
    var html = "";
    if (messages.length === 0) {
      html = '<div id="srep-welcome"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg><p>👋 Welcome! What are you looking to buy today?</p></div>';
    } else {
      messages.forEach(function (msg) {
        var avatarSvg = msg.role === "assistant"
          ? '<svg width="14" height="14" fill="none" stroke="white" stroke-width="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>'
          : '<svg width="14" height="14" fill="none" stroke="#6b7280" stroke-width="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
        html += '<div class="srep-msg ' + msg.role + '">';
        html += '<div class="srep-msg-avatar">' + avatarSvg + '</div>';
        html += '<div class="srep-msg-bubble">';
        if (msg.image_url) html += '<img src="' + escapeHtml(msg.image_url) + '" alt="Uploaded" style="max-width:200px" /><br>';
        html += parseAndRender(msg.content, msg.role);
        html += "</div></div>";
      });
    }
    if (isLoading) {
      html += '<div class="srep-msg assistant"><div class="srep-msg-avatar"><svg width="14" height="14" fill="none" stroke="white" stroke-width="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div><div class="srep-typing"><span></span><span></span><span></span></div></div>';
    }
    messagesDiv.innerHTML = html;
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  // ── API ──
  function sendMessage(text, imageUrl) {
    if (isLoading) return;
    var content = (text || "").trim();
    if (!content && !imageUrl) return;

    var userMsg = { role: "user", content: content || "📷 Image uploaded" };
    if (imageUrl) userMsg.image_url = imageUrl;
    messages.push(userMsg);
    cacheMessages();
    renderMessages();
    input.value = "";
    sendBtn.disabled = true;
    isLoading = true;
    renderMessages();

    var bodyMessages = messages.map(function (m) { return { role: m.role, content: m.content }; });
    if (imageUrl && content === "📷 Image uploaded") {
      bodyMessages[bodyMessages.length - 1].content = "User uploaded an image: " + imageUrl;
    }

    fetch(SUPABASE_URL + "/functions/v1/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_KEY,
        Authorization: "Bearer " + SUPABASE_KEY
      },
      body: JSON.stringify({
        siteId: siteId,
        messages: bodyMessages.slice(-12),
        conversationId: conversationId,
        visitorId: visitorId
      })
    }).then(function (resp) {
      var ct = resp.headers.get("content-type") || "";
      var convoHeader = resp.headers.get("X-Conversation-Id");
      if (convoHeader) conversationId = convoHeader;

      if (ct.includes("application/json")) {
        return resp.json().then(function (data) {
          if (data.conversationId) conversationId = data.conversationId;
          if (data.reply) {
            messages.push({ role: "assistant", content: data.reply });
            cacheMessages();
          }
          isLoading = false;
          renderMessages();
        });
      }

      // SSE streaming
      if (!resp.body) {
        isLoading = false;
        renderMessages();
        return;
      }

      var reader = resp.body.getReader();
      var decoder = new TextDecoder();
      var assistantContent = "";

      function readChunk() {
        reader.read().then(function (result) {
          if (result.done) {
            if (assistantContent) {
              messages.push({ role: "assistant", content: assistantContent });
              cacheMessages();
            }
            isLoading = false;
            renderMessages();
            return;
          }
          var text = decoder.decode(result.value, { stream: true });
          var lines = text.split("\n");
          for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            if (!line.startsWith("data: ") || line.includes("[DONE]")) continue;
            try {
              var parsed = JSON.parse(line.slice(6));
              var c = parsed.choices && parsed.choices[0] && parsed.choices[0].delta && parsed.choices[0].delta.content;
              if (c) assistantContent += c;
            } catch (e) {}
          }
          // Update live
          if (assistantContent) {
            var lastMsg = messages[messages.length - 1];
            if (lastMsg && lastMsg.role === "assistant") {
              lastMsg.content = assistantContent;
            } else {
              messages.push({ role: "assistant", content: assistantContent });
            }
            renderMessages();
          }
          readChunk();
        });
      }
      readChunk();
    }).catch(function (err) {
      console.error("[Chatbot] Error:", err);
      messages.push({ role: "assistant", content: "Sorry, something went wrong. Please try again." });
      cacheMessages();
      isLoading = false;
      renderMessages();
    });
  }

  // ── IMAGE UPLOAD ──
  fileInput.onchange = function () {
    var file = fileInput.files && fileInput.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert("File must be under 5MB."); return; }
    if (!/^image\//.test(file.type)) { alert("Please upload an image file."); return; }

    var formData = new FormData();
    var timestamp = Date.now();
    var random = Math.random().toString(36).substr(2, 9);
    var ext = file.name.split(".").pop();
    var path = "chat-uploads/" + siteId + "/" + visitorId + "/" + timestamp + "_" + random + "." + ext;

    // Upload to Supabase Storage
    fetch(SUPABASE_URL + "/storage/v1/object/product-images/" + path, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: "Bearer " + SUPABASE_KEY,
        "Content-Type": file.type,
        "x-upsert": "true"
      },
      body: file
    }).then(function (resp) {
      if (!resp.ok) throw new Error("Upload failed");
      var publicUrl = SUPABASE_URL + "/storage/v1/object/public/product-images/" + path;
      sendMessage("📷 Image uploaded", publicUrl);
    }).catch(function (err) {
      console.error("[Chatbot] Upload error:", err);
      alert("Failed to upload image. Please try again.");
    });

    fileInput.value = "";
  };

  // ── EVENT HANDLERS ──
  input.oninput = function () { sendBtn.disabled = !input.value.trim(); };
  input.onkeydown = function (e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input.value); } };
  sendBtn.onclick = function () { sendMessage(input.value); };

  bubble.onclick = function () {
    isOpen = !isOpen;
    panel.classList.toggle("open", isOpen);
    if (isOpen) {
      var badge = document.getElementById("srep-badge");
      if (badge) badge.style.display = "none";
      renderMessages();
      setTimeout(function () { input.focus(); }, 100);
    }
  };

  document.getElementById("srep-close").onclick = function () {
    isOpen = false;
    panel.classList.remove("open");
  };

  // Initial render
  renderMessages();
})();
