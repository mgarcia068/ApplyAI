// js/services/theme.js
const THEME_KEY = "applyai-theme";

function applyTheme(theme) {
  if (theme === "light") {
    document.documentElement.setAttribute("data-theme", "light");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
}

function getSavedTheme() {
  return localStorage.getItem(THEME_KEY) || "dark";
}

function toggleTheme() {
  const currentTheme = getSavedTheme();
  const newTheme = currentTheme === "dark" ? "light" : "dark";
  localStorage.setItem(THEME_KEY, newTheme);
  applyTheme(newTheme);
}

// Auto-apply theme right away to avoid flashing
applyTheme(getSavedTheme());
