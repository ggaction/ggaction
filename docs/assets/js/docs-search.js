(() => {
  const input = document.querySelector("#docs-search-input");
  const results = document.querySelector("#docs-search-results");
  const config = document.querySelector("#docs-search-config");

  if (!input || !results || !config) return;

  const docsRoot = new URL(config.dataset.rootUrl, document.baseURI);
  let sections;
  let loading;
  let activeIndex = -1;

  function searchable(value) {
    return value
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
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
    }).then(index => {
      if (!Array.isArray(index)) throw new Error("Search index must be an array.");
      sections = index;
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
    const query = searchable(input.value);
    if (query.length < 2) {
      clearResults();
      return;
    }

    const searchableSections = await loadSections();
    if (query !== searchable(input.value)) return;

    const queryCompact = query.replaceAll(" ", "");
    const queryTokens = query.split(" ");

    const ranked = searchableSections
      .map(section => {
        const pageTitle = searchable(section.pageTitle);
        const sectionTitle = searchable(section.sectionTitle ?? "");
        const keywordValues = section.keywords.map(searchable);
        const keywords = keywordValues.join(" ");
        const content = searchable(section.summary);
        const combined = `${sectionTitle} ${pageTitle} ${keywords} ${content}`;
        const compact = combined.replaceAll(" ", "");
        const allTokens = queryTokens.every(token => combined.includes(token));
        const compactKeywordValues = keywordValues.map(value => value.replaceAll(" ", ""));
        const score = sectionTitle === query || sectionTitle.replaceAll(" ", "") === queryCompact
          ? 12
          : pageTitle === query || pageTitle.replaceAll(" ", "") === queryCompact
            ? 11
            : keywordValues.includes(query) || compactKeywordValues.includes(queryCompact)
              ? 10
              : sectionTitle.includes(query) || sectionTitle.replaceAll(" ", "").includes(queryCompact)
                ? 9
                : pageTitle.includes(query) || pageTitle.replaceAll(" ", "").includes(queryCompact)
                  ? 8
                  : keywordValues.some(value => value.includes(query)) ||
                      compactKeywordValues.some(value => value.includes(queryCompact))
                    ? 7
                    : allTokens || compact.includes(queryCompact)
                      ? 2
                      : 0;
        // Prefer a named topic over an equally ranked action intent alias.
        const titleMatch = pageTitle.includes(query) || sectionTitle.includes(query);
        return { ...section, score, titleMatch };
      })
      .filter(section => section.score > 0)
      .sort((left, right) =>
        right.score - left.score ||
        Number(right.titleMatch) - Number(left.titleMatch) ||
        left.pageTitle.localeCompare(right.pageTitle) ||
        (left.sectionTitle ?? "").localeCompare(right.sectionTitle ?? "")
      );

    const pageCounts = new Map();
    const matches = ranked.filter(section => {
      const pageUrl = section.url.split("#")[0];
      const count = pageCounts.get(pageUrl) ?? 0;
      if (count >= 3) return false;
      pageCounts.set(pageUrl, count + 1);
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
        link.href = new URL(match.url.replace(/^\/+/, ""), docsRoot);
        const kind = document.createElement("span");
        kind.className = "docs-search-kind";
        kind.textContent = match.kind;
        const title = document.createElement("span");
        title.className = "docs-search-title";
        title.textContent = match.sectionTitle
          ? `${match.pageTitle} › ${match.sectionTitle}`
          : match.pageTitle;
        const preview = document.createElement("span");
        preview.className = "docs-search-snippet";
        preview.textContent = excerpt(match.summary, query);
        link.append(kind, title, preview);
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
