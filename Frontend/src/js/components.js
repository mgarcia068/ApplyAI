// USO: agregar en cada HTML, antes del cierre de </body>:
//   <div id="navbar-placeholder"></div>   ← al inicio del body
//   <div id="footer-placeholder"></div>   ← al final del body
//   <script src="js/components.js"></script>

const isLanding =
  window.location.pathname === "/" ||
  window.location.pathname.endsWith("index.html");

async function loadComponent(url, placeholderId) {
  const placeholder = document.getElementById(placeholderId);
  if (!placeholder) return;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`No se pudo cargar ${url}`);
    placeholder.outerHTML = await res.text();
  } catch (err) {
    console.warn("[ApplyAI] componente no encontrado:", url, err);
  }
}

function initNavbar() {
  const navbar = document.getElementById("navbar");
  if (!navbar) return;

  if (!isLanding) {
    navbar.classList.add("solid");
    return;
  }

  const onScroll = () => {
    navbar.classList.toggle("scrolled", window.scrollY > 40);
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

function markActiveLink() {
  const currentPath = window.location.pathname;
  const links = document.querySelectorAll(".navbar__actions a");

  links.forEach((link) => {
    const linkPath = new URL(link.href).pathname;
    if (linkPath === currentPath) {
      link.classList.add("active");
    }
  });
}

async function init() {
  await loadComponent("components/navbar.html", "navbar-placeholder");
  await loadComponent("components/footer.html", "footer-placeholder");

  initNavbar();
  markActiveLink();
}

document.addEventListener("DOMContentLoaded", init);
