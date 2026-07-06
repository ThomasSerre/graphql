const AUTH_URL = "https://zone01normandie.org/api/auth/signin";

async function login() {
  const loginInput = document.getElementById("login").value.trim();

  const passwordInput = document.getElementById("password").value;

  const errorElement = document.getElementById("error");

  errorElement.textContent = "";

  if (!loginInput || !passwordInput) {
    errorElement.textContent = "Veuillez remplir tous les champs.";

    return;
  }

  try {
    const credentials = btoa(`${loginInput}:${passwordInput}`);

    const response = await fetch(AUTH_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
      },
    });

    if (!response.ok) {
      throw new Error("Identifiants invalides.");
    }

    const token = await response.text();

    localStorage.setItem("jwt", token.replace(/^"|"$/g, ""));

    window.location.href = "pages/profile.html";
  } catch (error) {
    errorElement.textContent = error.message;
  }
}

function logout() {
  localStorage.removeItem("jwt");
  sessionStorage.clear();
  window.location.href = "../index.html";
}
