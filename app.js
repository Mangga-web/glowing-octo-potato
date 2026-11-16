const toolRegistry = new Map();

function registerTool(tool) {
  if (!tool || typeof tool.id !== "string" || !/^[a-z0-9-]+$/.test(tool.id)) {
    throw new TypeError("Tool id must contain lowercase letters, numbers, or hyphens.");
  }
  if (typeof tool.name !== "string" || typeof tool.description !== "string") {
    throw new TypeError("Tools need a name and description.");
  }
  if (toolRegistry.has(tool.id)) throw new Error(`Tool already registered: ${tool.id}`);
  toolRegistry.set(tool.id, {
    id: tool.id,
    name: tool.name,
    description: tool.description,
    category: typeof tool.category === "string" ? tool.category : "扩展工具",
    action: typeof tool.action === "function" ? tool.action : null,
  });
  renderTools();
}

window.toolbox = Object.freeze({ registerTool });

registerTool({
  id: "web-search",
  name: "网页搜索",
  description: "使用你选择的搜索引擎查找公开网页。",
  category: "搜索",
  action: () => showView("search"),
});
registerTool({
  id: "mail-shortcuts",
  name: "邮箱快捷入口",
  description: "打开 Gmail 或 Outlook，或快速撰写邮件。",
  category: "通信",
  action: () => showView("mail"),
});
registerTool({
  id: "url-check",
  name: "网址格式检查",
  description: "在本机检查网址格式及常见风险信号。",
  category: "安全",
  action: () => showView("scan"),
});

const viewNames = {
  search: "搜索浏览",
  mail: "邮箱",
  scan: "安全检查",
  toolbox: "工具箱",
};

function showView(name) {
  if (!viewNames[name]) return;
  document.querySelectorAll(".view").forEach((view) => {
    const active = view.id === `view-${name}`;
    view.hidden = !active;
    view.classList.toggle("active", active);
  });
  document.querySelectorAll(".nav-item").forEach((button) => {
    const active = button.dataset.view === name;
    button.classList.toggle("active", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  document.getElementById("current-section").textContent = viewNames[name];
}

function renderTools() {
  const grid = document.getElementById("tool-grid");
  if (!grid) return;
  grid.replaceChildren();
  for (const tool of toolRegistry.values()) {
    const card = document.createElement("article");
    card.className = "tool-card";
    const header = document.createElement("div");
    header.className = "tool-card-head";
    const badge = document.createElement("span");
    badge.className = "tool-badge";
    badge.textContent = tool.category;
    const button = document.createElement("button");
    button.className = "button button-secondary";
    button.type = "button";
    button.textContent = "打开";
    button.disabled = !tool.action;
    button.addEventListener("click", () => tool.action?.());
    header.append(badge, button);
    const title = document.createElement("h2");
    title.textContent = tool.name;
    const description = document.createElement("p");
    description.textContent = tool.description;
    card.append(header, title, description);
    grid.append(card);
  }
}

document.querySelectorAll(".nav-item").forEach((button) => {
  button.addEventListener("click", () => showView(button.dataset.view));
});
document.querySelectorAll("[data-open-view]").forEach((button) => {
  button.addEventListener("click", () => showView(button.dataset.openView));
});

document.getElementById("search-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const query = document.getElementById("search-query").value.trim();
  if (!query) return;
  const provider = document.getElementById("search-provider").value;
  const searchUrl = new URL(provider);
  searchUrl.searchParams.set("q", query);
  window.open(searchUrl.toString(), "_blank", "noopener,noreferrer");
});

document.getElementById("compose-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const recipient = document.getElementById("mail-to").value.trim();
  const subject = document.getElementById("mail-subject").value.trim();
  const mailto = new URL(`mailto:${recipient}`);
  if (subject) mailto.searchParams.set("subject", subject);
  window.location.href = mailto.toString();
});

document.getElementById("scan-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = document.getElementById("scan-url").value.trim();
  const result = document.getElementById("scan-result");
  const title = result.querySelector("strong");
  const detail = result.querySelector("p");
  result.classList.remove("is-warning", "is-error");

  let url;
  try {
    url = new URL(input);
  } catch {
    result.classList.add("is-error");
    result.querySelector(".result-icon").textContent = "!";
    title.textContent = "网址格式无效";
    detail.textContent = "请输入完整网址，例如 https://example.com。";
    return;
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    result.classList.add("is-error");
    result.querySelector(".result-icon").textContent = "!";
    title.textContent = "不支持的协议";
    detail.textContent = "仅接受 HTTP 或 HTTPS 网址；请勿打开不熟悉的文件或应用链接。";
    return;
  }

  const warnings = [];
  if (url.protocol !== "https:") warnings.push("网址未使用 HTTPS");
  if (url.username || url.password) warnings.push("网址中包含登录凭据");
  if (url.hostname.startsWith("xn--") || url.hostname.split(".").some((part) => part.startsWith("xn--"))) {
    warnings.push("域名包含国际化编码字符");
  }
  result.querySelector(".result-icon").textContent = warnings.length ? "!" : "✓";
  if (warnings.length) {
    result.classList.add("is-warning");
    title.textContent = "发现需要留意的信号";
    detail.textContent = `${warnings.join("；")}。本地检查不能判断网站是否恶意。`;
  } else {
    title.textContent = "网址格式正常";
    detail.textContent = "未发现基础格式问题；这不代表网站安全，工作台未连接信誉或反病毒服务。";
  }
});

async function checkServer() {
  const status = document.getElementById("server-status");
  const dot = document.getElementById("server-dot");
  try {
    const response = await fetch("/api/health", { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("Health check failed");
    const health = await response.json();
    status.textContent = `运行中 · v${health.version}`;
    dot.classList.add("online");
  } catch {
    status.textContent = "未连接";
    dot.classList.add("offline");
  }
}

renderTools();
checkServer();
