GHUTRA CONNECT — GitHub Pages deployment
========================================
DESTINATION: https://grains.ae/connect/

1. Unzip this package.
2. Open your GitHub repository that publishes grains.ae.
3. Upload the entire "connect" folder to the PUBLISHED ROOT of that repository (usually the repository root; if GitHub Pages uses /docs, upload it inside /docs instead).
4. Commit the files. Wait for GitHub Pages deployment.
5. Open https://grains.ae/connect/ on a phone. Test Save Contact, Email, Website and Company Profile.
6. The QR image in the package points to this permanent URL. Only print/share it AFTER the page is live.

IMPORTANT — PERSONAL DETAILS TO COMPLETE:
Edit connect/contact-config.json in GitHub and fill in:
  "phone": "+971..."       (full international format)
  "whatsapp": "+971..."    (can be same as phone)
  "linkedin": "https://www.linkedin.com/in/..."
These three are deliberately blank. Until added, Call and LinkedIn stay hidden; WhatsApp stays hidden too.
Email is shahidbashir@grains.ae and should be confirmed before publication.

CONTENT:
- connect/index.html : mobile-friendly landing page
- connect/contact-config.json : editable contact details (no coding needed)
- connect/assets/ghutra-logo.svg : Ghutra corporate logo
- connect/assets/Ghutra_Company_Profile.pdf : existing 4-page profile
- Ghutra_Connect_QR.png : printable QR linking to /connect/

PRIVACY: Trade license, IDs and other private documents are NOT included.
NOTE: The page uses no external libraries, cookies, tracking scripts, or third-party QR redirect service.
NOTE: Existing GitHub Pages custom-domain setup remains unchanged; do not add or replace CNAME.
NOTE: If a repository already has a connect folder, back it up before overwriting.
