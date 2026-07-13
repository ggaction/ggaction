(() => {
  const toggle = document.querySelector("#nav-toggle-button");
  const sidebar = document.querySelector("#docs-sidebar");
  const close = document.querySelector(".docs-sidebar-close");
  const backdrop = document.querySelector(".nav-backdrop");

  if (!toggle || !sidebar || !close || !backdrop) return;

  function setOpen(open, { restoreFocus = false } = {}) {
    document.body.classList.toggle("is-navigation-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute(
      "aria-label",
      open ? "Close documentation navigation" : "Open documentation navigation"
    );
    if (open) close.focus();
    if (!open && restoreFocus) toggle.focus();
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
    }
  });
  window.addEventListener("resize", () => {
    if (window.matchMedia("(min-width: 861px)").matches) setOpen(false);
  });
})();
