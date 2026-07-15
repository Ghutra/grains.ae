/* ============================================================
   INCLUDE.JS - Universal HTML Includes
   Loads header, footer, and other partials
   ============================================================ */

document.addEventListener('DOMContentLoaded', function() {
  // Find all elements with include-html attribute
  document.querySelectorAll('[include-html]').forEach(function(el) {
    const url = el.getAttribute('include-html');
    fetch(url)
      .then(function(response) {
        if (!response.ok) throw new Error('Failed to load ' + url);
        return response.text();
      })
      .then(function(html) {
        el.outerHTML = html;
      })
      .catch(function(err) {
        console.warn('Include error:', err);
        el.outerHTML = '<!-- Failed to load: ' + url + ' -->';
      });
  });
});
