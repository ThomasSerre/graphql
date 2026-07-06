function formatXP(xp) {
  if (xp >= 1_000_000) return (xp / 1_000_000).toFixed(2) + " MB";
  if (xp >= 1_000) return (xp / 1_000).toFixed(2) + " kB";
  return xp + " B";
}

function drawXPGraph(transactions) {
  const svg = document.getElementById("xpGraph");
  svg.innerHTML = "";
  svg.setAttribute("viewBox", "0 0 900 320");

  if (!transactions || transactions.length < 2) return;

  const width = 900;
  const height = 300;
  const padding = 40;

  const sorted = [...transactions].sort(
    (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
  );

  let cumulative = 0;

  const data = sorted.map((t) => {
    cumulative += t.amount;
    return {
      date: new Date(t.createdAt),
      xp: cumulative,
      gain: t.amount,
    };
  });

  const minDate = data[0].date.getTime();
  const maxDate = data[data.length - 1].date.getTime();
  const maxXP = data[data.length - 1].xp;

  const scaleX = (t) =>
    padding + ((t - minDate) / (maxDate - minDate)) * (width - 2 * padding);

  const scaleY = (xp) =>
    height - padding - (xp / maxXP) * (height - 2 * padding);

  // Top 5 biggest XP gains
  const topGains = new Set(
    [...data].sort((a, b) => b.gain - a.gain).slice(0, 5).map((d) => d.date.getTime()),
  );

  // Nice round Y-axis ticks
  const yTicks = (() => {
    const rough = maxXP / 5;
    const mag = Math.pow(10, Math.floor(Math.log10(rough)));
    const norm = rough / mag;
    const nice = norm <= 1.5 ? 1 : norm <= 3 ? 2 : norm <= 7 ? 5 : 10;
    const step = nice * mag;
    const ticks = [];
    for (let v = 0; v <= maxXP; v += step) ticks.push(v);
    if (ticks.length < 2) ticks.push(step);
    return ticks;
  })();

  // AXES + GRILLE + LABELS Y + LABELS X
  const axis = document.createElementNS("http://www.w3.org/2000/svg", "g");
  let axisHTML = `
    <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#444"/>
    <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="#444"/>
  `;
  for (const val of yTicks) {
    const y = scaleY(val);
    axisHTML += `
      <line x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}" stroke="#222" stroke-dasharray="4,4"/>
      <text x="${padding - 8}" y="${y + 4}" text-anchor="end" fill="#888" font-size="10" font-family="Inter, Arial, sans-serif">${formatXP(val)}</text>
    `;
  }

  // X-axis month/year labels
  const xCount = Math.min(6, data.length);
  if (xCount > 1) {
    const xStep = (data.length - 1) / (xCount - 1);
    for (let i = 0; i < xCount; i++) {
      const d = data[Math.round(i * xStep)];
      const x = scaleX(d.date.getTime());
      const label = d.date.toLocaleDateString("fr-FR", { month: "short", year: "numeric" });
      axisHTML += `
        <text x="${x}" y="${height - padding + 16}" text-anchor="middle" fill="#888" font-size="10" font-family="Inter, Arial, sans-serif">${label}</text>
      `;
    }
  }

  axis.innerHTML = axisHTML;
  svg.appendChild(axis);

  // LIGNE
  const points = data
    .map((d) => `${scaleX(d.date.getTime())},${scaleY(d.xp)}`)
    .join(" ");

  const polyline = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "polyline",
  );
  polyline.setAttribute("points", points);
  polyline.setAttribute("fill", "none");
  polyline.setAttribute("stroke", "#22c55e");
  polyline.setAttribute("stroke-width", "3");

  svg.appendChild(polyline);

  const tooltip = document.createElementNS("http://www.w3.org/2000/svg", "g");
  tooltip.setAttribute("visibility", "hidden");

  const tooltipRect = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "rect",
  );
  tooltipRect.setAttribute("fill", "rgba(17, 24, 39, 0.9)");
  tooltipRect.setAttribute("stroke", "rgba(34, 197, 94, 0.4)");
  tooltipRect.setAttribute("stroke-width", "1");
  tooltipRect.setAttribute("rx", "10");

  const tooltipText = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "text",
  );
  tooltipText.setAttribute("fill", "#fff");
  tooltipText.setAttribute("font-size", "12");
  tooltipText.setAttribute("font-family", "Inter, Arial, sans-serif");

  const line1 = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
  line1.setAttribute("x", "10");
  line1.setAttribute("y", "18");
  line1.setAttribute("fill", "#22c55e");
  line1.setAttribute("font-weight", "bold");

  const line2 = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
  line2.setAttribute("x", "10");
  line2.setAttribute("y", "36");
  line2.setAttribute("fill", "#cbd5e1");

  tooltipText.appendChild(line1);
  tooltipText.appendChild(line2);

  tooltip.appendChild(tooltipRect);
  tooltip.appendChild(tooltipText);
  svg.appendChild(tooltip);

  // POINTS
  data.forEach((d) => {
    const x = scaleX(d.date.getTime());
    const y = scaleY(d.xp);
    const isTopGain = topGains.has(d.date.getTime());

    const circle = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "circle",
    );
    circle.setAttribute("cx", x);
    circle.setAttribute("cy", y);
    circle.setAttribute("r", isTopGain ? 7 : 4);
    circle.setAttribute("fill", isTopGain ? "#f59e0b" : "#22c55e");
    circle.style.cursor = "pointer";

    if (isTopGain) {
      circle.setAttribute("stroke", "#fff");
      circle.setAttribute("stroke-width", "2");
    }

    // HOVER IN
    circle.addEventListener("mouseenter", () => {
      tooltip.setAttribute("visibility", "visible");
      line1.textContent = `${formatXP(d.xp)} XP`;
      line2.textContent = d.date.toLocaleDateString("fr-FR");
      const bbox = tooltipText.getBBox();
      const tx = x + 10 > width - 120 ? x - bbox.width - 20 : x + 10;
      tooltipRect.setAttribute("width", bbox.width + 16);
      tooltipRect.setAttribute("height", bbox.height + 10);
      tooltip.setAttribute("transform", `translate(${tx}, ${y - 30})`);
    });

    // HOVER OUT
    circle.addEventListener("mouseleave", () => {
      tooltip.setAttribute("visibility", "hidden");
    });

    svg.appendChild(circle);

    // LABEL for top gains
    if (isTopGain) {
      const labelY = y < 40 ? y + 20 : y - 12;
      const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
      label.setAttribute("x", x);
      label.setAttribute("y", labelY);
      label.setAttribute("text-anchor", "middle");
      label.setAttribute("fill", "#f59e0b");
      label.setAttribute("font-size", "10");
      label.setAttribute("font-weight", "bold");
      label.setAttribute("font-family", "Inter, Arial, sans-serif");
      label.textContent = `+${formatXP(d.gain)}`;
      svg.appendChild(label);
    }
  });
}

function drawProjectGraph(projects) {
  const svg = document.getElementById("projectGraph");

  svg.innerHTML = "";

  const width = 900;
  const height = 300;

  const maxXP = Math.max(...projects.map((p) => p.amount));

  projects.slice(0, 10).forEach((project, index) => {
    const barWidth = 60;

    const x = index * 80 + 30;

    const barHeight = (project.amount / maxXP) * 220;

    const y = height - barHeight - 30;

    svg.innerHTML += `
                <rect
                    x="${x}"
                    y="${y}"
                    width="${barWidth}"
                    height="${barHeight}"
                    fill="#22c55e"
                />
                <text
                    x="${x + barWidth / 2}"
                    y="${y - 8}"
                    text-anchor="middle"
                    fill="#22c55e"
                    font-size="12"
                    font-weight="bold"
                >
                    ${(project.amount / 1000).toFixed(1)}k
                </text>
                <text
                    x="${x}"
                    y="${height - 5}"
                    fill="white"
                    font-size="10"
                >
                    ${
                      project.name.length > 15
                        ? project.name.slice(0, 15) + "…"
                        : project.name
                    }
                </text>
            `;
  });
}

function drawAttemptsGraph(attempts) {
  const svg = document.getElementById("attemptGraph");

  svg.innerHTML = "";

  const width = 900;
  const height = 300;

  const entries = Object.entries(attempts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const max = Math.max(...entries.map((e) => e[1]));

  const barWidth = 50;

  entries.forEach(([name, value], index) => {
    const x = 60 + index * 75;

    const barHeight = (value / max) * 220;

    const y = height - barHeight - 30;

    svg.innerHTML += `

            <rect
                x="${x}"
                y="${y}"
                width="${barWidth}"
                height="${barHeight}"
                fill="#3b82f6"
            >
                <title>
${name}
${value} tentative(s)
                </title>
            </rect>

            <text
                x="${x + 25}"
                y="${y - 8}"
                text-anchor="middle"
                fill="white"
                font-size="12"
            >
                ${value}
            </text>

            <text
                transform="translate(${x + 20},295) rotate(-45)"
                text-anchor="end"
                fill="white"
                font-size="10"
            >
                ${name}
            </text>

        `;
  });
}

function fillAttemptTable(tableId, attempts) {
  const table = document.getElementById(tableId);

  if (!table) {
    console.error(`Table "${tableId}" introuvable.`);
    return;
  }

  const tbody = table.querySelector("tbody");

  if (!tbody) {
    console.error(`Aucun <tbody> dans "${tableId}".`);
    return;
  }

  tbody.innerHTML = "";

  Object.entries(attempts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([exercise, count]) => {
      tbody.innerHTML += `
                <tr>
                    <td>${exercise}</td>
                    <td>${count}</td>
                </tr>
            `;
    });
}
