document.querySelectorAll("[include-html]").forEach(async el => {
  const file = el.getAttribute("include-html");
  const res = await fetch(file);
  if (res.ok) {
    el.innerHTML = await res.text();
  } else {
    el.innerHTML = "Footer failed to load.";
  }
});
