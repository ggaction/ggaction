(() => {
  const content = document.querySelector(".docs-content");
  if (!content) return;
  if (content.dataset.pageToc === "false") return;

  const headings = [...content.querySelectorAll(":scope > h2, :scope > h3")]
    .filter(heading => heading.id);
  const labels = new Map(headings.map(heading => [
    heading,
    heading.dataset.tocLabel ?? heading.textContent.trim()
  ]));

  for (const heading of headings) {
    const anchor = document.createElement("a");
    anchor.className = "docs-heading-anchor";
    anchor.href = `#${heading.id}`;
    anchor.textContent = "#";
    anchor.setAttribute("aria-label", `Link to ${labels.get(heading)}`);
    heading.append(anchor);
  }

  if (headings.length < 4) return;

  const navigationHeadings = headings.length > 30
    ? headings.filter(heading => heading.tagName === "H2")
    : headings;

  const navigation = document.createElement("details");
  navigation.className = "docs-page-toc";
  navigation.open = headings.length <= 30 && !window.matchMedia("(max-width: 860px)").matches;

  const summary = document.createElement("summary");
  const title = document.createElement("strong");
  title.textContent = "On this page";
  const count = document.createElement("span");
  const visible = heading => !heading.closest("[hidden]");
  function updateCount() {
    const shown = headings.filter(visible);
    const actions = shown.filter(heading => heading.dataset.actionName).length;
    count.textContent = actions > 0
      ? `${actions} actions · ${shown.length - actions} other sections`
      : `${shown.length} sections`;
  }
  updateCount();
  summary.append(title, count);
  navigation.append(summary);

  const list = document.createElement("ul");
  const items = new Map();
  for (const heading of navigationHeadings) {
    const item = document.createElement("li");
    if (heading.tagName === "H3") item.className = "is-nested";
    const link = document.createElement("a");
    link.href = `#${heading.id}`;
    link.textContent = labels.get(heading);
    link.addEventListener("click", () => {
      if (window.matchMedia("(max-width: 860px)").matches) navigation.open = false;
    });
    item.append(link);
    list.append(item);
    items.set(heading, item);
  }
  navigation.append(list);

  const firstHeading = content.querySelector(":scope > h2");
  content.insertBefore(navigation, firstHeading);

  let scheduled = false;
  function currentSectionOffset() {
    const heading = navigationHeadings[0];
    if (!heading) return 0;
    return Number.parseFloat(getComputedStyle(heading).scrollMarginTop) || 0;
  }
  function updateCurrentSection() {
    scheduled = false;
    const top = currentSectionOffset();
    const shown = navigationHeadings.filter(visible);
    if (shown.length === 0) return;
    let current = shown[0];
    for (const heading of shown) {
      if (heading.getBoundingClientRect().top > top) break;
      current = heading;
    }
    for (const item of items.values()) {
      item.classList.remove("is-current", "is-parent-current", "is-in-current-group");
    }
    items.get(current)?.classList.add("is-current");
    const currentIndex = navigationHeadings.indexOf(current);
    let parentIndex = current.tagName === "H2" ? currentIndex : -1;
    if (parentIndex === -1) {
      for (let index = currentIndex - 1; index >= 0; index -= 1) {
        if (navigationHeadings[index].tagName !== "H2") continue;
        parentIndex = index;
        items.get(navigationHeadings[index])?.classList.add("is-parent-current");
        break;
      }
    }
    if (parentIndex >= 0) {
      for (let index = parentIndex + 1; index < navigationHeadings.length; index += 1) {
        if (navigationHeadings[index].tagName === "H2") break;
        items.get(navigationHeadings[index])?.classList.add("is-in-current-group");
      }
    }
  }
  function scheduleUpdate() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(updateCurrentSection);
  }
  window.addEventListener("scroll", scheduleUpdate, { passive: true });
  window.addEventListener("resize", scheduleUpdate);
  document.addEventListener("docs:sections-changed", () => {
    for (const [heading, item] of items) item.hidden = !visible(heading);
    updateCount();
    scheduleUpdate();
  });
  updateCurrentSection();
})();
