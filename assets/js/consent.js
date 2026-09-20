/* ============================================================
   GRAINS HUB CONSENT v1.0
   Custom consent banner + Google Consent Mode v2
   ------------------------------------------------------------
   GA4: G-2PS53TBMK5
   GTM: GTM-N8MK4H67

   Purpose:
   - Show consent notice when no preference exists
   - Allow analytics acceptance or rejection
   - Persist the visitor's choice
   - Update Google Consent Mode v2
   - Keep advertising consent denied
   ============================================================ */

(function () {
  'use strict';

  var STORAGE_KEY = 'grainsHubConsent';
  var CONSENT_VERSION = '1.0';

  /* ------------------------------------------------------------
     DATA LAYER / GTAG HELPER
     ------------------------------------------------------------ */

  window.dataLayer = window.dataLayer || [];

  function gtag() {
    window.dataLayer.push(arguments);
  }

  /* ------------------------------------------------------------
     STORAGE
     ------------------------------------------------------------ */

  function getStoredConsent() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);

      if (!raw) return null;

      var saved = JSON.parse(raw);

      if (
        !saved ||
        saved.version !== CONSENT_VERSION ||
        (saved.analytics !== 'granted' &&
         saved.analytics !== 'denied')
      ) {
        return null;
      }

      return saved;
    } catch (error) {
      console.warn('Grains Hub consent: unable to read preference.', error);
      return null;
    }
  }

  function saveConsent(analyticsState) {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          version: CONSENT_VERSION,
          analytics: analyticsState,
          updatedAt: new Date().toISOString()
        })
      );
    } catch (error) {
      console.warn('Grains Hub consent: unable to save preference.', error);
    }
  }

  /* ------------------------------------------------------------
     GOOGLE CONSENT MODE UPDATE
     Advertising remains denied.
     ------------------------------------------------------------ */

  function updateGoogleConsent(analyticsState) {
    gtag('consent', 'update', {
      analytics_storage: analyticsState,
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied'
    });
  }

  /* ------------------------------------------------------------
     STYLES
     ------------------------------------------------------------ */

  function injectStyles() {
    if (document.getElementById('gh-consent-styles')) return;

    var style = document.createElement('style');
    style.id = 'gh-consent-styles';

    style.textContent = `
      #gh-consent-banner {
        position: fixed;
        left: 20px;
        right: 20px;
        bottom: 20px;
        z-index: 2147483647;
        max-width: 1100px;
        margin: 0 auto;
        padding: 20px 22px;
        background: #1a1a2e;
        color: #ffffff;
        border: 1px solid rgba(193, 168, 117, 0.45);
        border-radius: 14px;
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.28);
        font-family: Inter, -apple-system, BlinkMacSystemFont,
          "Segoe UI", sans-serif;
      }

      #gh-consent-banner * {
        box-sizing: border-box;
      }

      .gh-consent-inner {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 24px;
      }

      .gh-consent-copy {
        flex: 1;
      }

      .gh-consent-title {
        margin: 0 0 6px;
        color: #e3c46a;
        font-size: 17px;
        font-weight: 700;
      }

      .gh-consent-text {
        margin: 0;
        color: rgba(255, 255, 255, 0.88);
        font-size: 14px;
        line-height: 1.55;
      }

      .gh-consent-text a {
        color: #e3c46a;
        text-decoration: underline;
        text-underline-offset: 2px;
      }

      .gh-consent-actions {
        display: flex;
        flex-shrink: 0;
        gap: 10px;
      }

      .gh-consent-btn {
        min-height: 42px;
        padding: 10px 18px;
        border-radius: 50px;
        font: inherit;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
        transition: transform 0.2s ease, background 0.2s ease;
      }

      .gh-consent-btn:hover {
        transform: translateY(-1px);
      }

      .gh-consent-reject {
        background: transparent;
        color: #ffffff;
        border: 1px solid rgba(255, 255, 255, 0.55);
      }

      .gh-consent-reject:hover {
        background: rgba(255, 255, 255, 0.08);
      }

      .gh-consent-accept {
        background: #c1a875;
        color: #1a1a2e;
        border: 1px solid #c1a875;
      }

      .gh-consent-accept:hover {
        background: #e3c46a;
      }

      @media (max-width: 720px) {
        #gh-consent-banner {
          left: 12px;
          right: 12px;
          bottom: 12px;
          padding: 18px;
        }

        .gh-consent-inner {
          display: block;
        }

        .gh-consent-actions {
          margin-top: 16px;
          width: 100%;
        }

        .gh-consent-btn {
          flex: 1;
        }
      }

      @media (max-width: 440px) {
        .gh-consent-actions {
          flex-direction: column-reverse;
        }

        .gh-consent-btn {
          width: 100%;
        }
      }
    `;

    document.head.appendChild(style);
  }

  /* ------------------------------------------------------------
     BANNER
     ------------------------------------------------------------ */

  function removeBanner() {
    var banner = document.getElementById('gh-consent-banner');

    if (banner) {
      banner.remove();
    }
  }

  function applyChoice(analyticsState) {
    saveConsent(analyticsState);
    updateGoogleConsent(analyticsState);
    removeBanner();

    window.dispatchEvent(
      new CustomEvent('grainsHubConsentChanged', {
        detail: {
          analytics: analyticsState
        }
      })
    );
  }

  function showBanner() {
    if (document.getElementById('gh-consent-banner')) return;

    injectStyles();

    var banner = document.createElement('div');
    banner.id = 'gh-consent-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-live', 'polite');
    banner.setAttribute('aria-label', 'Cookie consent');

    banner.innerHTML = `
      <div class="gh-consent-inner">

        <div class="gh-consent-copy">
          <p class="gh-consent-title">Your privacy choices</p>

          <p class="gh-consent-text">
            Grains Hub uses essential technologies to operate the site.
            With your permission, we also use analytics to understand
            site usage and improve Grains Hub.
            <a href="/cookies.html">Cookie Policy</a>
          </p>
        </div>

        <div class="gh-consent-actions">
          <button
            type="button"
            class="gh-consent-btn gh-consent-reject"
            id="gh-consent-reject">
            Reject non-essential
          </button>

          <button
            type="button"
            class="gh-consent-btn gh-consent-accept"
            id="gh-consent-accept">
            Accept analytics
          </button>
        </div>

      </div>
    `;

    document.body.appendChild(banner);

    document
      .getElementById('gh-consent-reject')
      .addEventListener('click', function () {
        applyChoice('denied');
      });

    document
      .getElementById('gh-consent-accept')
      .addEventListener('click', function () {
        applyChoice('granted');
      });
  }

  /* ------------------------------------------------------------
     PUBLIC COOKIE SETTINGS HOOK

     Later, any button/link can call:
       window.GrainsHubConsent.openSettings();
     ------------------------------------------------------------ */

  window.GrainsHubConsent = {
    openSettings: function () {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (error) {
        console.warn('Grains Hub consent: unable to reset preference.', error);
      }

      updateGoogleConsent('denied');
      showBanner();
    },

    getPreference: function () {
      return getStoredConsent();
    }
  };

  /* ------------------------------------------------------------
     INITIALIZE
     ------------------------------------------------------------ */

  function init() {
    var saved = getStoredConsent();

    if (!saved) {
      showBanner();
      return;
    }

    /*
      The early <head> bootstrap already restores the saved state.
      This update keeps the runtime state synchronized.
    */
    updateGoogleConsent(saved.analytics);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
