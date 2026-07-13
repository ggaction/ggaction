(() => {
  const input = document.querySelector("#docs-search-input");
  const results = document.querySelector("#docs-search-results");
  const source = document.querySelector("#docs-search-index");

  if (!input || !results || !source) return;

  let pages = [];
  try {
    pages = JSON.parse(source.textContent);
  } catch {
    input.disabled = true;
    input.placeholder = "Search unavailable";
    return;
  }

  const sections = pages.flatMap(page => {
    const documentFragment = new DOMParser().parseFromString(page.html, "text/html");
    const pageText = documentFragment.body.textContent.replace(/\s+/g, " ").trim();
    const entries = [{
      pageTitle: page.title,
      sectionTitle: undefined,
      url: page.url,
      content: pageText
    }];

    for (const heading of documentFragment.querySelectorAll("h2[id], h3[id]")) {
      const content = [];
      let sibling = heading.nextElementSibling;
      while (sibling && !["H2", "H3"].includes(sibling.tagName)) {
        content.push(sibling.textContent);
        sibling = sibling.nextElementSibling;
      }
      entries.push({
        pageTitle: page.title,
        sectionTitle: heading.textContent.trim(),
        url: `${page.url}#${heading.id}`,
        content: content.join(" ").replace(/\s+/g, " ").trim()
      });
    }
    return entries;
  });

  function clearResults() {
    results.replaceChildren();
    results.hidden = true;
    input.setAttribute("aria-expanded", "false");
  }

  function excerpt(content, query) {
    const normalized = content.replace(/\s+/g, " ").trim();
    const index = normalized.toLowerCase().indexOf(query);
    if (index === -1) return normalized.slice(0, 110);
    const start = Math.max(0, index - 42);
    const end = Math.min(normalized.length, index + query.length + 68);
    return `${start > 0 ? "…" : ""}${normalized.slice(start, end)}${end < normalized.length ? "…" : ""}`;
  }

  input.addEventListener("input", () => {
    const query = input.value.trim().toLowerCase();
    if (query.length < 2) {
      clearResults();
      return;
    }

    const ranked = sections
      .map(section => {
        const pageTitle = section.pageTitle.toLowerCase();
        const sectionTitle = section.sectionTitle?.toLowerCase();
        const content = section.content.toLowerCase();
        const score = sectionTitle === query
          ? 5
          : sectionTitle?.includes(query)
            ? 4
            : pageTitle === query
              ? 3
              : pageTitle.includes(query)
                ? 2
                : content.includes(query)
                  ? 1
                  : 0;
        return { ...section, score };
      })
      .filter(section => section.score > 0)
      .sort((left, right) =>
        right.score - left.score ||
        left.pageTitle.localeCompare(right.pageTitle) ||
        (left.sectionTitle ?? "").localeCompare(right.sectionTitle ?? "")
      );

    const seenPages = new Set();
    const matches = ranked.filter(section => {
      if (seenPages.has(section.url.split("#")[0])) return false;
      seenPages.add(section.url.split("#")[0]);
      return true;
    }).slice(0, 8);

    results.replaceChildren();
    if (matches.length === 0) {
      const empty = document.createElement("li");
      empty.className = "docs-search-empty";
      empty.textContent = "No matching pages";
      results.append(empty);
    } else {
      for (const match of matches) {
        const item = document.createElement("li");
        const link = document.createElement("a");
        link.setAttribute("role", "option");
        link.href = match.url;
        link.textContent = match.sectionTitle
          ? `${match.pageTitle} › ${match.sectionTitle}`
          : match.pageTitle;
        const preview = document.createElement("span");
        preview.className = "docs-search-snippet";
        preview.textContent = excerpt(match.content, query);
        link.append(preview);
        item.append(link);
        results.append(item);
      }
    }
    results.hidden = false;
    input.setAttribute("aria-expanded", "true");
  });

  input.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      input.value = "";
      clearResults();
      return;
    }

    if (["ArrowDown", "ArrowUp"].includes(event.key)) {
      const links = [...results.querySelectorAll("a")];
      if (links.length === 0) return;
      event.preventDefault();
      const target = event.key === "ArrowDown" ? links[0] : links.at(-1);
      target.focus();
    }
  });

  results.addEventListener("keydown", event => {
    if (!["ArrowDown", "ArrowUp", "Escape"].includes(event.key)) return;
    event.preventDefault();
    if (event.key === "Escape") {
      input.focus();
      input.value = "";
      clearResults();
      return;
    }
    const links = [...results.querySelectorAll("a")];
    const index = links.indexOf(document.activeElement);
    const offset = event.key === "ArrowDown" ? 1 : -1;
    const next = links[(index + offset + links.length) % links.length];
    next.focus();
  });

  document.addEventListener("click", event => {
    if (!event.target.closest(".docs-search")) clearResults();
  });

  document.addEventListener("keydown", event => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      input.focus();
      input.select();
    }
  });
})();
