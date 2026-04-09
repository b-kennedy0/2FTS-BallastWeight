(function () {
  "use strict";

  if (typeof document === "undefined") {
    return;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadSharedFooters);
  } else {
    loadSharedFooters();
  }

  async function loadSharedFooters() {
    const footerElements = document.querySelectorAll("[data-shared-footer]");

    if (!footerElements.length) {
      return;
    }

    await Promise.all(Array.from(footerElements, hydrateFooter));
  }

  async function hydrateFooter(element) {
    const src = element.dataset.footerSrc;

    if (!src) {
      return;
    }

    try {
      const response = await fetch(src, { cache: "no-store" });

      if (!response.ok) {
        throw new Error(`Footer request failed with status ${response.status}.`);
      }

      element.innerHTML = await response.text();
      updateFooterYear(element);
      markCurrentFooterLink(element);
    } catch (error) {
      console.error("Shared footer could not be loaded.", error);
    }
  }

  function updateFooterYear(element) {
    const currentYear = String(new Date().getFullYear());

    element.querySelectorAll("[data-current-year]").forEach((yearElement) => {
      yearElement.textContent = currentYear;
    });
  }

  function markCurrentFooterLink(element) {
    const currentPath = normalisePath(globalThis.location.pathname);

    element.querySelectorAll("a[href]").forEach((link) => {
      const href = link.getAttribute("href");

      if (!href || /^(https?:|mailto:|tel:|#)/i.test(href)) {
        return;
      }

      const url = new URL(href, globalThis.location.href);

      if (normalisePath(url.pathname) === currentPath) {
        link.setAttribute("aria-current", "page");
      }
    });
  }

  function normalisePath(pathname) {
    if (!pathname || pathname === "/") {
      return "/index.html";
    }

    return pathname.endsWith("/") ? `${pathname}index.html` : pathname;
  }
}());
