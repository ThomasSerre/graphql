if (!localStorage.getItem("jwt")) {
  window.location.href = "index.html";
}

loadProfile();

async function loadProfile() {
  try {
    const data = await gql(`
    {
        user {
            id
            login
            firstName
            lastName
            totalUp
            totalDown
        }

        transaction(
            where: {
                type: {
                    _eq: "xp"
                }
                eventId: {
                    _eq: 904
                }
            }
            order_by: {
                createdAt: asc
            }
        ) {
            amount
            createdAt
            path
            objectId
        }

        result {
            grade

            object {
                id
                type
            }
        }

        
        object(limit: 5) {
          id
          name
          type
        }
    

        progress(
            order_by:{
                createdAt:asc
            }
        ){
            grade
            path
            object {
              id
              name
              type
            }
        }
    }
    `);

    const user = data.user[0];

    displayUser(user);

    displayAudit(user);

    console.log(data);

    displayXP(data.transaction);

    displayValidatedProjects(data.result);

    displayPiscine(data.progress);

    displayAttempts(data.progress);

    drawXPGraph(data.transaction);

    buildProjectGraph(data.transaction);
  } catch (error) {
    console.error(error);

    alert("Erreur lors du chargement du profil.");
  }
}

function displayUser(user) {
  const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();

  document.getElementById("userLogin").textContent = fullName || user.login;

  document.getElementById("userId").textContent = user.login;

  document.getElementById("avatar").textContent = (user.firstName || user.login)
    .charAt(0)
    .toUpperCase();
}

function displayXP(transactions) {
  const totalXP = transactions.reduce(
    (sum, transaction) => sum + transaction.amount,
    0,
  );

  document.getElementById("xpTotal").textContent = formatXP(totalXP);
}

function displayResults(results) {
  let pass = 0;
  let fail = 0;

  const projectResults = results.filter((r) => r.object.type === "project");

  projectResults.forEach((result) => {
    if (result.grade >= 1) {
      pass++;
    } else {
      fail++;
    }
  });

  document.getElementById("passFail").textContent = `${pass} / ${fail} `;

  drawPassFailGraph(pass, fail);
}

function buildProjectGraph(transactions) {
  const projects = transactions
    .map((t) => ({
      name: t.path.split("/").pop(),
      amount: t.amount,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);

  drawProjectGraph(projects);
}

function displayAudit(user) {
  const up = user.totalUp || 0;
  const down = user.totalDown || 0;

  const ratio = down === 0 ? "∞" : (up / down).toFixed(2);

  document.getElementById("auditRatio").innerHTML = `
        <strong></strong> ${ratio}<br>
    `;
}

document.getElementById("logoutBtn").addEventListener("click", logout);

function checkAuth() {
  const token = localStorage.getItem("jwt");

  if (!token) {
    window.location.replace("index.html");
  }
}

checkAuth();

function drawPiscineGraph(svgId, list) {
  const svg = document.getElementById(svgId);

  svg.innerHTML = "";

  // 1. Regroupement par exercice (1 seul résultat par exercice)
  const exercises = {};

  list.forEach((item) => {
    if (!item.object || item.object.type !== "exercise") return;

    const id = item.object.id;

    if (!exercises[id]) {
      exercises[id] = {
        name: item.object.name,
        grade: item.grade,
      };
    } else {
      // on garde la meilleure tentative
      exercises[id].grade = Math.max(exercises[id].grade, item.grade);
    }
  });

  const values = Object.values(exercises);

  const pass = values.filter((e) => e.grade >= 1).length;
  const fail = values.length - pass;

  const total = pass + fail;

  // 2. Si aucune donnée
  if (total === 0) {
    svg.setAttribute("viewBox", "0 0 320 320");

    svg.innerHTML = `
      <text
        x="160"
        y="160"
        text-anchor="middle"
        fill="white"
        font-size="20"
      >
        Aucune donnée
      </text>
    `;

    return;
  }

  // 3. Calcul du cercle
  const progress = pass / total;

  const radius = 90;
  const circumference = 2 * Math.PI * radius;

  const dashOffset = circumference * (1 - progress);

  console.log({
    progress,
    circumference,
    dashOffset,
  });

  svg.setAttribute("viewBox", "0 0 320 320");

  // 4. SVG
  svg.innerHTML = `
    <!-- cercle FAIL (fond) -->
    <circle
      cx="160"
      cy="160"
      r="${radius}"
      stroke="#ef4444"
      stroke-width="30"
      fill="none"
      stroke-linecap="round"
    />

    <!-- cercle PASS -->
    <circle
      cx="160"
      cy="160"
      r="${radius}"
      stroke="#22c55e"
      stroke-width="30"
      fill="none"
      stroke-dasharray="${circumference}"
      stroke-dashoffset="${dashOffset}"
      transform="rotate(-90 160 160)"
      stroke-linecap="round"
    >
      <animate
        attributeName="stroke-dashoffset"
        from="${circumference}"
        to="${dashOffset}"
        dur="1s"
        fill="freeze"
      />
    </circle>

    <!-- pourcentage -->
    <text
      x="160"
      y="150"
      text-anchor="middle"
      fill="white"
      font-size="26"
      font-weight="bold"
    >
      ${(progress * 100).toFixed(0)}%
    </text>

    <!-- PASS -->
    <text
      x="160"
      y="180"
      text-anchor="middle"
      fill="#22c55e"
      font-size="16"
    >
      PASS : ${pass}
    </text>

    <!-- FAIL -->
    <text
      x="160"
      y="205"
      text-anchor="middle"
      fill="#ef4444"
      font-size="16"
    >
      FAIL : ${fail}
    </text>
  `;
}

function displayPiscine(progress) {
  const go = progress.filter((item) => item.path.includes("piscine-go"));

  const js = progress.filter((item) => item.path.includes("piscine-js"));

  drawPiscineGraph("goGraph", go);
  drawPiscineGraph("jsGraph", js);

  displayAttempts(go, "goAttemptTable");
  displayAttempts(js, "jsAttemptTable");
}

function displayAttempts(progress, tableId) {
  const attempts = {};

  progress.forEach((item) => {
    const exercise = item.object.name;

    attempts[exercise] = (attempts[exercise] || 0) + 1;
  });

  fillAttemptTable(tableId, attempts);
}

function displayValidatedProjects(results) {
  const validatedProjects = new Set(
    results
      .filter(
        (result) =>
          result.grade >= 1 &&
          result.object &&
          result.object.type === "project",
      )
      .map((result) => result.object.id),
  ).size;

  document.getElementById("validatedProjects").textContent = validatedProjects;
}
