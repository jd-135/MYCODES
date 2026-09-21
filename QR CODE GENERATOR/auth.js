// ============================================================
// SIMPLE LOGIN — one fixed email + password, no Supabase Auth needed.
// Change these two lines to whatever you want your login to be:
// ============================================================
const LOGIN_EMAIL = "admin@example.com";
const LOGIN_PASSWORD = "mypassword123";

window.appState = { user: null, profile: null };

const authScreen = document.querySelector("#authScreen");
const appShellEls = [document.querySelector(".side-nav"), document.querySelector(".app-shell")];
const loginForm = document.querySelector("#loginForm");
const authError = document.querySelector("#authError");
const logoutButton = document.querySelector("#logoutButton");

function showAuthScreen() {
  authScreen.hidden = false;
  appShellEls.forEach((el) => el && el.classList.add("hidden"));
}

function showApp() {
  authScreen.hidden = true;
  appShellEls.forEach((el) => el && el.classList.remove("hidden"));
  document.querySelector("#profileButton").textContent = "AD";
  document.querySelector("#profileAvatar").textContent = "AD";
  document.querySelector("#profileName").textContent = LOGIN_EMAIL;
  document.querySelector("#profileEmail").textContent = LOGIN_EMAIL;
}

function setAuthError(message) {
  authError.textContent = message || "";
  authError.hidden = !message;
}

function checkSession() {
  const loggedIn = sessionStorage.getItem("loggedIn") === "true";
  if (loggedIn) {
    window.appState.user = { email: LOGIN_EMAIL };
    showApp();
  } else {
    showAuthScreen();
  }
}

loginForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  setAuthError("");
  const email = document.querySelector("#loginEmail").value.trim();
  const password = document.querySelector("#loginPassword").value;

  if (email === LOGIN_EMAIL && password === LOGIN_PASSWORD) {
    sessionStorage.setItem("loggedIn", "true");
    window.appState.user = { email };
    showApp();
  } else {
    setAuthError("Wrong email or password.");
  }
});

logoutButton?.addEventListener("click", () => {
  sessionStorage.removeItem("loggedIn");
  window.appState.user = null;
  window.location.hash = "home";
  showAuthScreen();
});

checkSession();
