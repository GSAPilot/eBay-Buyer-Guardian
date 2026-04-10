/* ============================================================
   eBay Buyer Guardian — Landing Page JS
   ============================================================ */

(function () {
  "use strict";

  /* ---------- FAQ Accordion ---------- */
  document.querySelectorAll(".faq-q").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = btn.parentElement;
      const isOpen = item.classList.contains("open");

      // Close all
      document.querySelectorAll(".faq-item").forEach((i) => {
        i.classList.remove("open");
        i.querySelector(".faq-q").setAttribute("aria-expanded", "false");
      });

      // Toggle clicked
      if (!isOpen) {
        item.classList.add("open");
        btn.setAttribute("aria-expanded", "true");
      }
    });
  });

  /* ---------- Smooth scroll for anchor links ---------- */
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (e) => {
      const target = document.querySelector(link.getAttribute("href"));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });

  /* ---------- Nav scroll effect ---------- */
  const nav = document.querySelector(".nav");
  let lastScroll = 0;

  window.addEventListener("scroll", () => {
    const currentScroll = window.pageYOffset;
    if (currentScroll > 100) {
      nav.style.boxShadow = "0 1px 8px rgba(0,0,0,0.06)";
    } else {
      nav.style.boxShadow = "none";
    }
    lastScroll = currentScroll;
  }, { passive: true });

  /* ---------- Intersection Observer for animations ---------- */
  const observerOptions = {
    threshold: 0.1,
    rootMargin: "0px 0px -40px 0px",
  };

  const animateOnScroll = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = "1";
        entry.target.style.transform = "translateY(0)";
        animateOnScroll.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // Apply initial hidden state & observe
  const animTargets = document.querySelectorAll(
    ".feature-card, .risk-card, .pricing-card, .step"
  );
  animTargets.forEach((el, i) => {
    el.style.opacity = "0";
    el.style.transform = "translateY(20px)";
    el.style.transition = `opacity 0.5s ease ${i * 0.05}s, transform 0.5s ease ${i * 0.05}s`;
    animateOnScroll.observe(el);
  });
})();
