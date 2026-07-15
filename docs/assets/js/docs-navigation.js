(() => {
  const toggle = document.querySelector("#nav-toggle-button");
  const sidebar = document.querySelector("#docs-sidebar");
  const close = document.querySelector(".docs-sidebar-close");
  const backdrop = document.querySelector(".nav-backdrop");
  const main = document.querySelector("#main-content");
  const footer = document.querySelector(".docs-footer");
  const mobile = window.matchMedia("(max-width: 860px)");

  if (!toggle || !sidebar || !close || !backdrop) return;

  function setInert(element, value) {
    if (!element) return;
    element.inert = value;
    if (value) element.setAttribute("aria-hidden", "true");
    else element.removeAttribute("aria-hidden");
  }

  function revealActiveLink() {
    const active = sidebar.querySelector("a[aria-current='page']");
    if (!active) return;
    const sidebarBounds = sidebar.getBoundingClientRect();
    const activeBounds = active.getBoundingClientRect();
    if (
      activeBounds.top < sidebarBounds.top ||
      activeBounds.bottom > sidebarBounds.bottom
    ) active.scrollIntoView({ block: "center" });
  }

  function syncGroups() {
    for (const group of sidebar.querySelectorAll(".docs-nav-group")) {
      group.open = !mobile.matches || Boolean(group.querySelector("[aria-current='page']"));
    }
  }

  function setOpen(open, { restoreFocus = false } = {}) {
    open = mobile.matches && open;
    document.body.classList.toggle("is-navigation-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute(
      "aria-label",
      open ? "Close documentation navigation" : "Open documentation navigation"
    );
    if (mobile.matches) {
      setInert(sidebar, !open);
      setInert(main, open);
      setInert(footer, open);
    } else {
      setInert(sidebar, false);
      setInert(main, false);
      setInert(footer, false);
    }
    if (open) {
      syncGroups();
      close.focus();
      revealActiveLink();
    }
    if (!open && restoreFocus) toggle.focus();
  }

  function focusableElements() {
    return [...sidebar.querySelectorAll(
      "a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex='-1'])"
    )].filter(element => element.getClientRects().length > 0);
  }

  toggle.addEventListener("click", () => {
    setOpen(!document.body.classList.contains("is-navigation-open"));
  });
  close.addEventListener("click", () => setOpen(false, { restoreFocus: true }));
  backdrop.addEventListener("click", () => setOpen(false, { restoreFocus: true }));
  sidebar.addEventListener("click", event => {
    if (event.target.closest("a")) setOpen(false);
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && document.body.classList.contains("is-navigation-open")) {
      setOpen(false, { restoreFocus: true });
      return;
    }
    if (event.key === "Tab" && document.body.classList.contains("is-navigation-open")) {
      const focusable = focusableElements();
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });
  document.addEventListener("docs:open-navigation", () => setOpen(true));
  mobile.addEventListener("change", () => {
    syncGroups();
    setOpen(false);
  });
  syncGroups();
  setOpen(false);
  requestAnimationFrame(revealActiveLink);
})();
