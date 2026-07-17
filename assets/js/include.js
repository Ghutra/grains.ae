/* ============================================================
   INCLUDE.JS - Universal HTML Includes
   WITH HAMBURGER FIX
   ============================================================ */

document.addEventListener('DOMContentLoaded', function() {
  // ============================================================
  // 1. LOAD INCLUDES
  // ============================================================
  document.querySelectorAll('[include-html]').forEach(function(el) {
    var url = el.getAttribute('include-html');
    fetch(url)
      .then(function(response) {
        if (!response.ok) throw new Error('Failed to load ' + url);
        return response.text();
      })
      .then(function(html) {
        el.outerHTML = html;
        // After header is loaded, initialize hamburger
        if (url.includes('header')) {
          initHamburger();
        }
      })
      .catch(function(err) {
        console.warn('Include error:', err);
      });
  });

  // ============================================================
  // 2. HAMBURGER MENU - ALWAYS WORKS
  // ============================================================
  function initHamburger() {
    var hamburger = document.getElementById('hamburger');
    var navLinks = document.getElementById('navLinks');

    if (hamburger && navLinks) {
      console.log('✅ Hamburger found, setting up...');

      // Remove any existing listeners by cloning
      var newHamburger = hamburger.cloneNode(true);
      hamburger.parentNode.replaceChild(newHamburger, hamburger);
      
      var newNavLinks = navLinks.cloneNode(true);
      navLinks.parentNode.replaceChild(newNavLinks, navLinks);

      // Get fresh references
      var freshHamburger = document.getElementById('hamburger');
      var freshNavLinks = document.getElementById('navLinks');

      // Toggle
      freshHamburger.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        freshNavLinks.classList.toggle('active');
        freshHamburger.classList.toggle('active');
        console.log('🍔 Menu toggled');
      });

      // Close on link click
      freshNavLinks.querySelectorAll('a').forEach(function(link) {
        link.addEventListener('click', function() {
          freshNavLinks.classList.remove('active');
          freshHamburger.classList.remove('active');
        });
      });

      // Close on outside click
      document.addEventListener('click', function(e) {
        if (!freshNavLinks.contains(e.target) && !freshHamburger.contains(e.target)) {
          freshNavLinks.classList.remove('active');
          freshHamburger.classList.remove('active');
        }
      });

      console.log('✅ Hamburger ready');
    } else {
      console.warn('⚠️ Hamburger or navLinks not found');
    }
  }

  // ============================================================
  // 3. ACTIVE NAV STATE
  // ============================================================
  function setActiveNav() {
    var currentPath = window.location.pathname;
    var navMap = {
      '/': 'navHome',
      '/index.html': 'navHome',
      '/why': 'navWhy',
      '/why/': 'navWhy',
      '/pulse/index.html': 'navPulse',
      '/pulse': 'navPulse',
      '/trust': 'navTrust',
      '/trust/': 'navTrust',
      '/about': 'navAbout',
      '/about/': 'navAbout',
      '/shop': 'navShop',
      '/shop/': 'navShop'
    };

    var activeId = navMap[currentPath] || null;
    if (!activeId) {
      if (currentPath.includes('/pulse/')) activeId = 'navPulse';
      else if (currentPath.includes('/shop/')) activeId = 'navShop';
      else if (currentPath.includes('/about/')) activeId = 'navAbout';
      else if (currentPath.includes('/trust/')) activeId = 'navTrust';
      else if (currentPath.includes('/why/')) activeId = 'navWhy';
    }

    if (activeId) {
      var activeLink = document.getElementById(activeId);
      if (activeLink) {
        activeLink.classList.add('active');
        console.log('📍 Active nav:', activeId);
      }
    }
  }

  // ============================================================
  // 4. RUN AFTER HEADER LOADS
  // ============================================================
  // Check if header already exists
  setTimeout(function() {
    if (document.getElementById('hamburger')) {
      initHamburger();
      setActiveNav();
    }
  }, 500);

  // Also run after DOM is fully ready
  setTimeout(function() {
    if (document.getElementById('hamburger')) {
      initHamburger();
      setActiveNav();
    }
  }, 1000);

  console.log('✅ Include.js loaded with hamburger fix');
});
