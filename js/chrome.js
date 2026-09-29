const LINKS = [
  ["home", "Home", "index.html"],
  ["job", "Job", "job.html?id=jn-1048"],
  ["send", "Send", "send.html"],
  ["desk", "Board", "desk.html"],
];

export function mountChrome(active) {
  const header = document.createElement("header");
  header.className = "top";
  header.innerHTML = `
    <a class="skip" href="#content">Skip to content</a>
    <a class="mark" href="index.html"><b>3D</b> Works</a>
    <nav aria-label="Shop">
      <a href="index.html">Home</a>
      <a href="index.html#path">Process</a>
      <a href="index.html#materials">Materials</a>
      <a href="send.html">Quote</a>
      <a href="desk.html">Board</a>
      <a class="btn" href="send.html">Get a quote</a>
    </nav>
  `;
  document.body.prepend(header);
  if (active === "desk") document.body.classList.add("is-board");

  const dock = document.createElement("nav");
  dock.className = "dock";
  dock.setAttribute("aria-label", "Pages");
  dock.innerHTML = LINKS.map(([key, label, href]) => {
    const current = key === active ? ' aria-current="page"' : "";
    return `<a href="${href}"${current}>${label}</a>`;
  }).join("");
  document.body.append(dock);

  const foot = document.createElement("p");
  foot.className = "colophon";
  foot.textContent = "Demo in this browser. Files are not uploaded. Pay does not charge a card.";
  document.body.insertBefore(foot, dock);
}

export function stageHtml() {
  return `
    <p class="turn">Drag to turn</p>
  `;
}
