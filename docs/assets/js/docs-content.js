(() => {
  const content = document.querySelector(".docs-content");
  if (!content) return;

  const metadataNode = document.querySelector("#docs-action-metadata");
  const actionMetadata = new Map(Object.entries(
    metadataNode ? JSON.parse(metadataNode.textContent) : {}
  ));
  const redirectsNode = document.querySelector("#docs-action-redirects");
  if (redirectsNode && window.location.hash.length > 1) {
    const redirects = JSON.parse(redirectsNode.textContent);
    const target = redirects[window.location.hash.slice(1)];
    const docsRoot = document.querySelector(".docs-brand")?.href;
    if (target && docsRoot) window.location.replace(new URL(target.slice(1), docsRoot));
  }

  function enhanceActionHeadings() {
    const actionHeadings = [];
    for (const heading of content.querySelectorAll(":scope > h2, :scope > h3")) {
      const code = heading.querySelector(":scope > code:only-child");
      if (!code) continue;
      const signature = code.textContent.trim();
      const name = signature.match(/^([A-Za-z][A-Za-z0-9]*)/)?.[1];
      const metadata = name && actionMetadata.get(name);
      if (!metadata) continue;

      heading.classList.add("docs-action-heading");
      heading.dataset.tocLabel = name;
      code.textContent = name;

      const badge = document.createElement("span");
      badge.className = `docs-action-kind docs-action-kind--${metadata.operation}`;
      badge.textContent = metadata.operation;
      heading.append(badge);

      if (signature.includes("(")) {
        const signatureBlock = document.createElement("div");
        signatureBlock.className = "docs-action-signature";
        signatureBlock.setAttribute("aria-label", `${name} signature`);
        const signatureCode = document.createElement("code");
        signatureCode.textContent = signature;
        signatureBlock.append(signatureCode);
        heading.after(signatureBlock);
      }
      actionHeadings.push({ heading, name, ...metadata });
    }
    return actionHeadings;
  }

  function addActionFilter(actionHeadings) {
    if (actionHeadings.length < 20) return;

    const regions = actionHeadings.map((action, index) => {
      const nodes = [action.heading];
      let next = action.heading.nextElementSibling;
      while (next && !next.matches("h2, h3")) {
        nodes.push(next);
        next = next.nextElementSibling;
      }
      return { ...action, index, nodes };
    });

    const filter = document.createElement("div");
    filter.className = "docs-action-filter";
    const label = document.createElement("label");
    label.htmlFor = "docs-action-filter-input";
    label.textContent = "Filter actions";
    const input = document.createElement("input");
    input.id = "docs-action-filter-input";
    input.type = "search";
    input.placeholder = "Try create, edit, encode, or an action name";
    const status = document.createElement("span");
    status.className = "docs-action-filter__status";
    status.setAttribute("aria-live", "polite");
    filter.append(label, input, status);

    const firstCategory = content.querySelector(":scope > h2");
    content.insertBefore(filter, firstCategory);

    function update() {
      const query = input.value.trim().toLowerCase();
      let visible = 0;
      for (const region of regions) {
        const matches = !query || [
          region.name, region.operation, region.layer, region.domain
        ].join(" ").toLowerCase().includes(query);
        for (const node of region.nodes) node.hidden = !matches;
        if (matches) visible += 1;
      }
      status.textContent = `${visible} of ${regions.length} actions`;
    }
    input.addEventListener("input", update);
    update();
  }

  const actionHeadings = enhanceActionHeadings();
  addActionFilter(actionHeadings);

  const galleryFilter = content.querySelector(".docs-gallery-filter");
  if (galleryFilter) {
    const cards = [...content.querySelectorAll("[data-gallery-tasks]")];
    const buttons = [...galleryFilter.querySelectorAll("[data-gallery-filter]")];
    const status = content.querySelector(".docs-gallery-filter__status");

    function applyGalleryFilter(selected, { updateHistory = false } = {}) {
      const button = buttons.find(candidate => candidate.dataset.galleryFilter === selected) ?? buttons[0];
      const resolved = button.dataset.galleryFilter;
      for (const candidate of galleryFilter.querySelectorAll("[data-gallery-filter]")) {
        const active = candidate === button;
        candidate.classList.toggle("is-active", active);
        candidate.setAttribute("aria-pressed", String(active));
      }
      let visible = 0;
      for (const card of cards) {
        const tasks = card.dataset.galleryTasks.split(/\s+/);
        card.hidden = resolved !== "all" && !tasks.includes(resolved);
        if (!card.hidden) visible += 1;
      }
      if (status) status.textContent = `${visible} ${visible === 1 ? "chart" : "charts"}`;
      if (updateHistory) {
        const url = new URL(window.location.href);
        if (resolved === "all") url.searchParams.delete("chart-task");
        else url.searchParams.set("chart-task", resolved);
        window.history.pushState({}, "", url);
      }
    }

    galleryFilter.addEventListener("click", event => {
      const button = event.target.closest("[data-gallery-filter]");
      if (!button) return;
      applyGalleryFilter(button.dataset.galleryFilter, { updateHistory: true });
    });

    window.addEventListener("popstate", () => {
      applyGalleryFilter(new URL(window.location.href).searchParams.get("chart-task") ?? "all");
    });
    applyGalleryFilter(new URL(window.location.href).searchParams.get("chart-task") ?? "all");
  }

  function updateOverflow(region, element, label) {
    const overflowing = element.scrollWidth > element.clientWidth + 1;
    const atEnd = element.scrollLeft + element.clientWidth >= element.scrollWidth - 2;
    region.classList.toggle("has-overflow", overflowing);
    region.classList.toggle("is-scrolled-end", !overflowing || atEnd);
    if (overflowing) {
      element.tabIndex = 0;
      element.setAttribute("aria-label", label);
    } else {
      element.removeAttribute("tabindex");
      element.removeAttribute("aria-label");
    }
  }

  function wrapScrollable(element, className, label) {
    const region = document.createElement("div");
    region.className = `docs-scroll-region ${className}`;
    element.before(region);
    region.append(element);
    const update = () => updateOverflow(region, element, label);
    element.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    requestAnimationFrame(update);
    return region;
  }

  for (const pre of content.querySelectorAll("pre")) {
    const code = pre.querySelector("code");
    const languageOwner = (code ?? pre).closest('[class*="language-"]');
    const language = [...(languageOwner?.classList ?? [])]
      .find(name => name.startsWith("language-"))?.slice("language-".length);
    const role = ["bash", "shell", "sh"].includes(language)
      ? "Command"
      : ["text", "plaintext"].includes(language)
        ? "Output"
        : language === "typescript" && code.textContent.includes("interface ChartProgramActions")
          ? "Type contract"
          : "Code";
    const region = wrapScrollable(pre, "docs-code-block", `Scrollable ${role.toLowerCase()}`);
    const label = document.createElement("span");
    label.className = "docs-code-label";
    label.textContent = role;
    region.prepend(label);
    if (role === "Output") continue;
    const button = document.createElement("button");
    button.className = "docs-copy-button";
    button.type = "button";
    button.textContent = "Copy";
    button.setAttribute("aria-label", "Copy code to clipboard");
    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(pre.textContent);
        button.textContent = "Copied";
        button.setAttribute("aria-label", "Code copied to clipboard");
        window.setTimeout(() => {
          button.textContent = "Copy";
          button.setAttribute("aria-label", "Copy code to clipboard");
        }, 1400);
      } catch {
        button.textContent = "Select code";
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(pre);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    });
    label.after(button);
  }

  for (const table of content.querySelectorAll("table")) {
    wrapScrollable(table, "docs-table-region", "Scrollable data table");
  }
})();
