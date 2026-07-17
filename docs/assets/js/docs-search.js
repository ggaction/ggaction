(() => {
  const input = document.querySelector("#docs-search-input");
  const results = document.querySelector("#docs-search-results");
  const config = document.querySelector("#docs-search-config");

  if (!input || !results || !config) return;

  let sections;
  let loading;
  let activeIndex = -1;

  function buildSections(pages) {
    return pages.flatMap(page => {
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
  }

  function setBusy(busy) {
    input.setAttribute("aria-busy", String(busy));
    results.setAttribute("aria-busy", String(busy));
  }

  async function loadSections() {
    if (sections) return sections;
    if (loading) return loading;
    setBusy(true);
    loading = fetch(config.dataset.indexUrl, {
      headers: { Accept: "application/json" }
    }).then(response => {
      if (!response.ok) throw new Error(`Search index request failed: ${response.status}`);
      return response.json();
    }).then(pages => {
      if (!Array.isArray(pages)) throw new Error("Search index must be an array.");
      sections = buildSections(pages);
      return sections;
    }).catch(() => {
      input.disabled = true;
      input.placeholder = "Search unavailable";
      clearResults();
      return [];
    }).finally(() => setBusy(false));
    return loading;
  }

  function clearResults() {
    results.replaceChildren();
    results.hidden = true;
    activeIndex = -1;
    input.removeAttribute("aria-activedescendant");
    input.setAttribute("aria-expanded", "false");
  }

  function options() {
    return [...results.querySelectorAll("[role='option']")];
  }

  function setActive(index) {
    const available = options();
    if (available.length === 0) return;
    activeIndex = (index + available.length) % available.length;
    for (const [optionIndex, option] of available.entries()) {
      option.setAttribute("aria-selected", String(optionIndex === activeIndex));
    }
    const active = available[activeIndex];
    input.setAttribute("aria-activedescendant", active.id);
    active.scrollIntoView({ block: "nearest" });
  }

  function excerpt(content, query) {
    const normalized = content.replace(/\s+/g, " ").trim();
    const index = normalized.toLowerCase().indexOf(query);
    if (index === -1) return normalized.slice(0, 110);
    const start = Math.max(0, index - 42);
    const end = Math.min(normalized.length, index + query.length + 68);
    return `${start > 0 ? "…" : ""}${normalized.slice(start, end)}${end < normalized.length ? "…" : ""}`;
  }

  input.addEventListener("focus", () => {
    void loadSections();
  }, { once: true });

  input.addEventListener("input", async () => {
    const query = input.value.trim().toLowerCase();
    if (query.length < 2) {
      clearResults();
      return;
    }

    const searchableSections = await loadSections();
    if (query !== input.value.trim().toLowerCase()) return;

    const ranked = searchableSections
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
    activeIndex = -1;
    input.removeAttribute("aria-activedescendant");
    if (matches.length === 0) {
      const empty = document.createElement("li");
      empty.className = "docs-search-empty";
      empty.textContent = "No matching pages";
      results.append(empty);
    } else {
      for (const [index, match] of matches.entries()) {
        const item = document.createElement("li");
        const link = document.createElement("a");
        link.setAttribute("role", "option");
        link.setAttribute("aria-selected", "false");
        link.id = `docs-search-option-${index}`;
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
      if (options().length === 0) return;
      event.preventDefault();
      setActive(activeIndex + (event.key === "ArrowDown" ? 1 : -1));
      return;
    }

    if (event.key === "Enter" && activeIndex >= 0) {
      const active = options()[activeIndex];
      if (!active) return;
      event.preventDefault();
      active.click();
    }
  });

  document.addEventListener("click", event => {
    if (!event.target.closest(".docs-search")) clearResults();
  });

  document.addEventListener("keydown", event => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      document.dispatchEvent(new CustomEvent("docs:open-navigation"));
      input.focus();
      input.select();
    }
  });
})();
