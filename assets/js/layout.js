// layout.js – Global UI interactions for Grains Hub
// Handles: hamburger menu, mobile nav, sticky header, smooth scroll

/* -----------------------------------------
   HAMBURGER MENU (Mobile Navigation)
----------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('navLinks');

  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      navLinks.classList.toggle('active');
      hamburger.classList.toggle('open');
    });

    // Close menu when clicking a link
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('active');
        hamburger.classList.remove('open');
      });
    });
  }
});

/* -----------------------------------------
   STICKY HEADER (Premium UX)
----------------------------------------- */
window.addEventListener('scroll', () => {
  const header = document.querySelector('header');
  if (!header) return;

  if (window.scrollY > 40) {
    header.classList.add('sticky');
  } else {
    header.classList.remove('sticky');
  }
});

/* -----------------------------------------
   SMOOTH SCROLL FOR ANCHOR LINKS
----------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (!target) return;

      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
});

/* -----------------------------------------
   FUTURE‑PROOF HOOKS
----------------------------------------- */
// Add any global UI interactions here later:
// - Dark mode toggle
// - Language switcher
// - Toast notifications
// - Floating buttons
// - Page transitions
