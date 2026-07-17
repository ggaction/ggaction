(() => {
  const content = document.querySelector(".docs-content");
  if (!content) return;

  const actionPrefixes = Object.freeze([
    "create", "edit", "encode", "filter", "highlight", "select", "render"
  ]);

  function actionKind(name) {
    return actionPrefixes.find(prefix => name.startsWith(prefix));
  }

  function enhanceActionHeadings() {
    const actionHeadings = [];
    for (const heading of content.querySelectorAll(":scope > h2, :scope > h3")) {
      const code = heading.querySelector(":scope > code:only-child");
      if (!code) continue;
      const signature = code.textContent.trim();
      const name = signature.match(/^([A-Za-z][A-Za-z0-9]*)/)?.[1];
      const kind = name && actionKind(name);
      if (!kind) continue;

      heading.classList.add("docs-action-heading");
      heading.dataset.tocLabel = name;
      code.textContent = name;

      const badge = document.createElement("span");
      badge.className = `docs-action-kind docs-action-kind--${kind}`;
      badge.textContent = kind;
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
      actionHeadings.push({ heading, name, kind });
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
        const matches = !query || `${region.name} ${region.kind}`.toLowerCase().includes(query);
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
    const region = wrapScrollable(pre, "docs-code-block", "Scrollable code example");
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
    region.prepend(button);
  }

  for (const table of content.querySelectorAll("table")) {
    wrapScrollable(table, "docs-table-region", "Scrollable data table");
  }
})();
