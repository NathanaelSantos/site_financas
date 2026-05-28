const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const quizState = {};
const profileResult = document.querySelector("#profileResult");
const profileAdvice = document.querySelector("#profileAdvice");

const profileTexts = {
  conservador: {
    title: "Conservador",
    text: "Boa combinação para quem valoriza segurança, liquidez e previsibilidade antes de buscar retornos maiores.",
  },
  moderado: {
    title: "Moderado",
    text: "Boa combinação para quem aceita oscilações moderadas e quer diversificar entre renda fixa e renda variável.",
  },
  arrojado: {
    title: "Arrojado",
    text: "Boa combinação para quem tem longo prazo, reserva pronta e tolerância a quedas temporárias.",
  },
};

document.querySelectorAll(".quiz-group button").forEach((button) => {
  button.addEventListener("click", () => {
    const group = button.closest(".quiz-group");
    const question = group.dataset.question;
    quizState[question] = Number(button.dataset.score);

    group.querySelectorAll("button").forEach((option) => {
      option.classList.toggle("active", option === button);
    });

    updateProfile();
  });
});

function updateProfile() {
  const answers = Object.values(quizState);

  if (answers.length < 3) {
    profileResult.textContent = "Responda às três perguntas";
    profileAdvice.textContent =
      "O resultado aparecerá aqui quando todas as escolhas forem marcadas.";
    return;
  }

  const average = answers.reduce((sum, score) => sum + score, 0) / answers.length;
  const key = average < 1.7 ? "conservador" : average < 2.45 ? "moderado" : "arrojado";
  const profile = profileTexts[key];

  profileResult.textContent = profile.title;
  profileAdvice.textContent = profile.text;
}

const filterButtons = document.querySelectorAll(".filter-btn");
const investmentCards = document.querySelectorAll(".investment-card");

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const filter = button.dataset.filter;

    filterButtons.forEach((item) => {
      item.classList.toggle("active", item === button);
    });

    investmentCards.forEach((card) => {
      const visible = filter === "todos" || card.dataset.category === filter;
      card.hidden = !visible;
    });
  });
});

const fields = {
  initial: document.querySelector("#initialAmount"),
  monthly: document.querySelector("#monthlyAmount"),
  annualRate: document.querySelector("#annualRate"),
  years: document.querySelector("#years"),
  inflation: document.querySelector("#inflationRate"),
};

const output = {
  totalInvested: document.querySelector("#totalInvested"),
  grossValue: document.querySelector("#grossValue"),
  earnings: document.querySelector("#earnings"),
  realValue: document.querySelector("#realValue"),
};

const chart = document.querySelector("#growthChart");
const ctx = chart.getContext("2d");

document.querySelectorAll("[data-scenario]").forEach((button) => {
  button.addEventListener("click", () => {
    fields.annualRate.value = button.dataset.rate;
    document.querySelectorAll("[data-scenario]").forEach((item) => {
      item.classList.toggle("active", item === button);
    });
    simulate();
  });
});

Object.values(fields).forEach((field) => {
  field.addEventListener("input", () => {
    document.querySelectorAll("[data-scenario]").forEach((button) => {
      button.classList.toggle("active", button.dataset.rate === fields.annualRate.value);
    });
    simulate();
  });
});

window.addEventListener("resize", () => {
  simulate();
  drawFinanceCharts();
});

function readNumber(field) {
  const value = Number.parseFloat(field.value.replace(",", "."));
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

function simulate() {
  const initial = readNumber(fields.initial);
  const monthly = readNumber(fields.monthly);
  const annualRate = readNumber(fields.annualRate) / 100;
  const years = Math.max(1, Math.min(50, Math.round(readNumber(fields.years))));
  const inflation = readNumber(fields.inflation) / 100;
  const months = years * 12;
  const monthlyRate = Math.pow(1 + annualRate, 1 / 12) - 1;
  const monthlyInflation = Math.pow(1 + inflation, 1 / 12) - 1;

  let balance = initial;
  const history = [{ month: 0, invested: initial, balance, real: initial }];

  for (let month = 1; month <= months; month += 1) {
    balance = balance * (1 + monthlyRate) + monthly;
    const invested = initial + monthly * month;
    const real = balance / Math.pow(1 + monthlyInflation, month);
    history.push({ month, invested, balance, real });
  }

  const final = history.at(-1);
  const earnings = Math.max(0, final.balance - final.invested);

  output.totalInvested.textContent = currency.format(final.invested);
  output.grossValue.textContent = currency.format(final.balance);
  output.earnings.textContent = currency.format(earnings);
  output.realValue.textContent = currency.format(final.real);

  drawChart(history);
}

function drawChart(history) {
  const ratio = window.devicePixelRatio || 1;
  const rect = chart.getBoundingClientRect();
  const width = Math.max(320, Math.floor(rect.width));
  const height = Math.max(260, Math.floor(rect.height));

  chart.width = width * ratio;
  chart.height = height * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const padding = {
    top: 28,
    right: 24,
    bottom: 42,
    left: 54,
  };

  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const maxValue = Math.max(...history.map((item) => item.balance), 1);
  const maxMonth = Math.max(history.at(-1).month, 1);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "#dce6e5";
  ctx.lineWidth = 1;
  ctx.fillStyle = "#5f7077";
  ctx.font = "12px Segoe UI, sans-serif";

  for (let i = 0; i <= 4; i += 1) {
    const y = padding.top + (plotHeight / 4) * i;
    const value = maxValue - (maxValue / 4) * i;

    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
    ctx.fillText(compactCurrency(value), 10, y + 4);
  }

  drawLine(history, "invested", "#db6849", padding, plotWidth, plotHeight, maxValue, maxMonth);
  drawLine(history, "balance", "#0d7777", padding, plotWidth, plotHeight, maxValue, maxMonth);
  drawLine(history, "real", "#396ca8", padding, plotWidth, plotHeight, maxValue, maxMonth);

  drawLegend(width, height);
}

function drawLine(history, key, color, padding, plotWidth, plotHeight, maxValue, maxMonth) {
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;

  history.forEach((item, index) => {
    const x = padding.left + (item.month / maxMonth) * plotWidth;
    const y = padding.top + plotHeight - (item[key] / maxValue) * plotHeight;

    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });

  ctx.stroke();
}

function drawLegend(width, height) {
  const items = [
    ["#0d7777", "Valor bruto"],
    ["#db6849", "Total investido"],
    ["#396ca8", "Valor real"],
  ];

  const startX = Math.max(18, width - 390);
  const y = height - 20;

  ctx.font = "12px Segoe UI, sans-serif";
  ctx.textBaseline = "middle";

  items.forEach(([color, label], index) => {
    const x = startX + index * 126;
    ctx.fillStyle = color;
    ctx.fillRect(x, y - 5, 18, 10);
    ctx.fillStyle = "#14242b";
    ctx.fillText(label, x + 24, y);
  });
}

function compactCurrency(value) {
  if (value >= 1000000) {
    return `R$ ${(value / 1000000).toFixed(1)} mi`;
  }

  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(0)} mil`;
  }

  return currency.format(value);
}

const riskReturnCanvas = document.querySelector("#riskReturnChart");
const riskTooltip = document.querySelector("#riskChartTooltip");
const allocationCanvas = document.querySelector("#allocationChart");
const scenarioBarsCanvas = document.querySelector("#scenarioBarsChart");
const allocationList = document.querySelector("#allocationList");

const riskAssets = [
  {
    name: "Poupança",
    risk: 1.1,
    result: 1.9,
    size: 16,
    color: "#4a965b",
    category: "Menor risco",
    description: "Alta liquidez, retorno menor e pouca oscilação.",
    labelDy: 20,
  },
  {
    name: "Tesouro Selic",
    risk: 1.4,
    result: 3.0,
    size: 19,
    color: "#4a965b",
    category: "Menor risco",
    description: "Boa referência para reserva e objetivos de curto prazo.",
    labelDy: 4,
  },
  {
    name: "CDB",
    risk: 2.4,
    result: 3.8,
    size: 21,
    color: "#4a965b",
    category: "Menor risco",
    description: "Depende do emissor, liquidez e cobertura do FGC.",
    labelDy: -22,
  },
  {
    name: "LCI/LCA",
    risk: 2.8,
    result: 4.1,
    size: 18,
    color: "#f0b64d",
    category: "Intermediário",
    description: "Pode ter isenção de IR, mas costuma exigir prazo.",
    labelDy: 16,
  },
  {
    name: "IPCA+",
    risk: 4.3,
    result: 5.8,
    size: 23,
    color: "#f0b64d",
    category: "Intermediário",
    description: "Protege contra inflação quando levado ao vencimento.",
    labelDy: 0,
  },
  {
    name: "ETFs",
    risk: 6.3,
    result: 6.8,
    size: 24,
    color: "#396ca8",
    category: "ETFs",
    description: "Diversificação em cesta de ativos com oscilação de mercado.",
  },
  {
    name: "FIIs",
    risk: 7.1,
    result: 7.2,
    size: 22,
    color: "#db6849",
    category: "Maior risco",
    description: "Distribui rendimentos, mas sofre com vacância e juros.",
  },
  {
    name: "Ações",
    risk: 8.7,
    result: 8.6,
    size: 28,
    color: "#db6849",
    category: "Maior risco",
    description: "Maior potencial e maior volatilidade no curto prazo.",
  },
];

let riskChartPoints = [];
let activeRiskAsset = null;
let riskChartProgress = 1;

const allocationProfiles = {
  conservador: {
    title: "Conservador",
    items: [
      { label: "Renda fixa pós-fixada", value: 55, color: "#0d7777" },
      { label: "CDB/LCI/LCA", value: 25, color: "#4a965b" },
      { label: "Tesouro IPCA+", value: 12, color: "#f0b64d" },
      { label: "Renda variável", value: 8, color: "#db6849" },
    ],
  },
  moderado: {
    title: "Moderado",
    items: [
      { label: "Renda fixa", value: 45, color: "#0d7777" },
      { label: "Tesouro IPCA+", value: 20, color: "#f0b64d" },
      { label: "ETFs e fundos", value: 20, color: "#396ca8" },
      { label: "Ações e FIIs", value: 15, color: "#db6849" },
    ],
  },
  arrojado: {
    title: "Arrojado",
    items: [
      { label: "Renda fixa", value: 25, color: "#0d7777" },
      { label: "ETFs", value: 25, color: "#396ca8" },
      { label: "Ações", value: 30, color: "#db6849" },
      { label: "FIIs e alternativos", value: 20, color: "#f0b64d" },
    ],
  },
};

let activeAllocation = "conservador";

if (riskReturnCanvas) {
  riskReturnCanvas.addEventListener("pointermove", updateRiskChartHover);
  riskReturnCanvas.addEventListener("pointerleave", clearRiskChartHover);
  riskReturnCanvas.addEventListener("blur", clearRiskChartHover);
}

document.querySelectorAll("[data-allocation]").forEach((button) => {
  button.addEventListener("click", () => {
    activeAllocation = button.dataset.allocation;

    document.querySelectorAll("[data-allocation]").forEach((item) => {
      item.classList.toggle("active", item === button);
    });

    drawAllocationChart();
  });
});

function setupCanvas(canvas) {
  const context = canvas.getContext("2d");
  const ratio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(280, Math.floor(rect.width));
  const height = Math.max(240, Math.floor(rect.height));

  canvas.width = width * ratio;
  canvas.height = height * ratio;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);

  return { context, width, height };
}

function drawFinanceCharts() {
  drawRiskReturnChart();
  drawAllocationChart();
  drawScenarioBarsChart();
}

function drawRiskReturnChart(progress = riskChartProgress) {
  if (!riskReturnCanvas) {
    return;
  }

  riskChartProgress = progress;

  const { context, width, height } = setupCanvas(riskReturnCanvas);
  const padding = { top: 34, right: 28, bottom: 60, left: 62 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const gradient = context.createLinearGradient(0, 0, width, height);
  const easedProgress = easeOutCubic(progress);

  gradient.addColorStop(0, "#fbfffd");
  gradient.addColorStop(1, "#ecf7f5");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  context.save();
  roundedRect(context, padding.left, padding.top, plotWidth, plotHeight, 10);
  context.clip();

  [
    { start: 0, end: 3.3, color: "rgba(74, 150, 91, 0.1)" },
    { start: 3.3, end: 6.6, color: "rgba(240, 182, 77, 0.13)" },
    { start: 6.6, end: 10, color: "rgba(219, 104, 73, 0.11)" },
  ].forEach((zone) => {
    const x = padding.left + (zone.start / 10) * plotWidth;
    const zoneWidth = ((zone.end - zone.start) / 10) * plotWidth;

    context.fillStyle = zone.color;
    context.fillRect(x, padding.top, zoneWidth, plotHeight);
  });

  context.strokeStyle = "rgba(95, 112, 119, 0.16)";
  context.lineWidth = 1;

  for (let step = 0; step <= 5; step += 1) {
    const x = padding.left + (plotWidth / 5) * step;
    const y = padding.top + (plotHeight / 5) * step;

    context.beginPath();
    context.moveTo(x, padding.top);
    context.lineTo(x, height - padding.bottom);
    context.stroke();

    context.beginPath();
    context.moveTo(padding.left, y);
    context.lineTo(width - padding.right, y);
    context.stroke();
  }

  context.restore();

  context.strokeStyle = "rgba(20, 36, 43, 0.18)";
  context.lineWidth = 1.4;
  roundedRect(context, padding.left, padding.top, plotWidth, plotHeight, 10);
  context.stroke();

  context.fillStyle = "#14242b";
  context.font = "700 13px Segoe UI, sans-serif";
  context.textBaseline = "alphabetic";
  context.fillText("Retorno potencial", padding.left, 18);
  context.fillText("Risco", width - padding.right - 34, height - 16);

  context.fillStyle = "rgba(20, 36, 43, 0.48)";
  context.font = "700 11px Segoe UI, sans-serif";

  for (let step = 0; step <= 5; step += 1) {
    const value = step * 2;
    const x = padding.left + (plotWidth / 5) * step;
    const y = padding.top + plotHeight - (plotHeight / 5) * step;

    if (step > 0) {
      context.fillText(String(value), x - 4, height - 38);
      context.fillText(String(value), 36, y + 4);
    }
  }

  riskChartPoints = [];

  riskAssets.forEach((asset) => {
    const x = padding.left + (asset.risk / 10) * plotWidth;
    const y = padding.top + plotHeight - ((asset.result * easedProgress) / 10) * plotHeight;
    const isActive = activeRiskAsset?.name === asset.name;
    const radius = asset.size * (0.68 + easedProgress * 0.32) + (isActive ? 4 : 0);
    const haloRadius = radius + (isActive ? 13 : 8);
    const fillGradient = context.createRadialGradient(
      x - radius * 0.35,
      y - radius * 0.45,
      2,
      x,
      y,
      radius,
    );

    riskChartPoints.push({ asset, x, y, radius: haloRadius });

    context.save();
    context.globalAlpha = 0.72 + easedProgress * 0.28;
    context.beginPath();
    context.fillStyle = hexToRgba(asset.color, isActive ? 0.26 : 0.16);
    context.arc(x, y, haloRadius, 0, Math.PI * 2);
    context.fill();

    context.shadowColor = hexToRgba(asset.color, 0.35);
    context.shadowBlur = isActive ? 18 : 10;
    context.shadowOffsetY = isActive ? 7 : 4;

    context.beginPath();
    fillGradient.addColorStop(0, hexToRgba(asset.color, 0.82));
    fillGradient.addColorStop(1, asset.color);
    context.fillStyle = fillGradient;
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();

    context.restore();

    if (isActive) {
      context.beginPath();
      context.strokeStyle = "#ffffff";
      context.lineWidth = 4;
      context.arc(x, y, radius + 2, 0, Math.PI * 2);
      context.stroke();
      context.strokeStyle = asset.color;
      context.lineWidth = 2;
      context.stroke();
    }

    drawRiskAssetLabel(context, asset, x, y, radius, isActive, width, height);
  });

  context.textAlign = "left";
  context.textBaseline = "alphabetic";
}

function drawRiskAssetLabel(context, asset, x, y, radius, isActive, width, height) {
  const label = asset.name;
  const paddingX = 8;

  context.save();
  context.font = `${isActive ? "900" : "800"} 12px Segoe UI, sans-serif`;
  const textWidth = context.measureText(label).width;
  const textX = Math.max(72, Math.min(x + radius + 8, width - textWidth - paddingX - 18));
  const textY = Math.max(26, Math.min(y + (asset.labelDy ?? -9), height - 32));

  context.textBaseline = "middle";
  context.fillStyle = isActive ? "rgba(255, 255, 255, 0.94)" : "rgba(255, 255, 255, 0.76)";
  context.strokeStyle = "rgba(20, 36, 43, 0.08)";
  context.lineWidth = 1;
  roundedRect(context, textX - paddingX, textY - 12, textWidth + paddingX * 2, 24, 12);
  context.fill();
  context.stroke();
  context.fillStyle = "#14242b";
  context.fillText(label, textX, textY + 1);
  context.restore();
}

function easeOutCubic(value) {
  return 1 - Math.pow(1 - value, 3);
}

function hexToRgba(hex, alpha) {
  const value = hex.replace("#", "");
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function findRiskAssetAtPoint(x, y) {
  return riskChartPoints.reduce((closest, point) => {
    const distance = Math.hypot(x - point.x, y - point.y);
    const hitArea = point.radius + 8;

    if (distance > hitArea) {
      return closest;
    }

    if (!closest || distance < closest.distance) {
      return { ...point, distance };
    }

    return closest;
  }, null);
}

function updateRiskChartHover(event) {
  if (!riskReturnCanvas) {
    return;
  }

  const rect = riskReturnCanvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const point = findRiskAssetAtPoint(x, y);

  riskReturnCanvas.style.cursor = point ? "pointer" : "crosshair";

  if (!point) {
    clearRiskChartHover();
    return;
  }

  const shouldRedraw = activeRiskAsset?.name !== point.asset.name;
  activeRiskAsset = point.asset;
  showRiskTooltip(point.asset, x, y);

  if (shouldRedraw) {
    drawRiskReturnChart(1);
  }
}

function showRiskTooltip(asset, x, y) {
  if (!riskTooltip) {
    return;
  }

  const title = document.createElement("strong");
  const meta = document.createElement("small");
  const description = document.createElement("span");

  title.textContent = asset.name;
  meta.textContent = `${asset.category} | Risco ${asset.risk.toFixed(1)}/10 | Retorno ${asset.result.toFixed(1)}/10`;
  description.textContent = asset.description;
  riskTooltip.replaceChildren(title, meta, description);

  const frame = riskTooltip.parentElement;
  const frameWidth = frame?.clientWidth || riskReturnCanvas.clientWidth;
  const frameHeight = frame?.clientHeight || riskReturnCanvas.clientHeight;
  const tooltipWidth = riskTooltip.offsetWidth || 230;
  const tooltipHeight = riskTooltip.offsetHeight || 112;
  const left = Math.min(Math.max(14, x + 18), frameWidth - tooltipWidth - 14);
  const top = Math.min(Math.max(14, y + 18), frameHeight - tooltipHeight - 14);

  riskTooltip.style.setProperty("--tooltip-x", `${left}px`);
  riskTooltip.style.setProperty("--tooltip-y", `${top}px`);
  riskTooltip.classList.add("visible");
}

function clearRiskChartHover() {
  if (!activeRiskAsset && !riskTooltip?.classList.contains("visible")) {
    return;
  }

  activeRiskAsset = null;
  riskReturnCanvas.style.cursor = "crosshair";
  riskTooltip?.classList.remove("visible");
  drawRiskReturnChart(1);
}

function animateRiskReturnChart() {
  if (!riskReturnCanvas || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    drawRiskReturnChart(1);
    return;
  }

  const duration = 780;
  let startTime = null;

  function tick(timestamp) {
    if (!startTime) {
      startTime = timestamp;
    }

    const progress = Math.min(1, (timestamp - startTime) / duration);
    drawRiskReturnChart(progress);

    if (progress < 1) {
      window.requestAnimationFrame(tick);
    }
  }

  window.requestAnimationFrame(tick);
}

function drawAllocationChart() {
  if (!allocationCanvas) {
    return;
  }

  const profile = allocationProfiles[activeAllocation];
  const { context, width, height } = setupCanvas(allocationCanvas);
  const centerX = width / 2;
  const centerY = height / 2 + 4;
  const radius = Math.min(width, height) * 0.34;
  const innerRadius = radius * 0.58;
  const total = profile.items.reduce((sum, item) => sum + item.value, 0);
  let start = -Math.PI / 2;

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);

  profile.items.forEach((item) => {
    const angle = (item.value / total) * Math.PI * 2;

    context.beginPath();
    context.moveTo(centerX, centerY);
    context.fillStyle = item.color;
    context.arc(centerX, centerY, radius, start, start + angle);
    context.closePath();
    context.fill();

    start += angle;
  });

  context.beginPath();
  context.fillStyle = "#ffffff";
  context.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "#14242b";
  context.font = "900 19px Segoe UI, sans-serif";
  context.textAlign = "center";
  context.fillText(profile.title, centerX, centerY - 3);
  context.font = "700 12px Segoe UI, sans-serif";
  context.fillStyle = "#5f7077";
  context.fillText("carteira exemplo", centerX, centerY + 18);
  context.textAlign = "left";

  renderAllocationList(profile.items);
}

function renderAllocationList(items) {
  allocationList.replaceChildren();

  items.forEach((item) => {
    const row = document.createElement("div");
    const color = document.createElement("i");
    const label = document.createElement("span");
    const value = document.createElement("strong");

    color.style.background = item.color;
    label.textContent = item.label;
    value.textContent = `${item.value}%`;

    row.append(color, label, value);
    allocationList.append(row);
  });
}

function drawScenarioBarsChart() {
  if (!scenarioBarsCanvas) {
    return;
  }

  const { context, width, height } = setupCanvas(scenarioBarsCanvas);
  const scenarios = [
    { label: "6% a.a.", rate: 0.06, color: "#4a965b" },
    { label: "10% a.a.", rate: 0.1, color: "#f0b64d" },
    { label: "14% a.a.", rate: 0.14, color: "#db6849" },
  ];
  const years = [5, 10, 20];
  const values = years.map((year) =>
    scenarios.map((scenario) => ({
      ...scenario,
      year,
      value: futureValue(1000, 200, scenario.rate, year),
    })),
  );
  const flatValues = values.flat().map((item) => item.value);
  const maxValue = Math.max(...flatValues);
  const padding = { top: 34, right: 24, bottom: 66, left: 64 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const groupWidth = plotWidth / years.length;
  const barWidth = Math.max(18, Math.min(42, groupWidth / 5));

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.strokeStyle = "#dce6e5";
  context.fillStyle = "#5f7077";
  context.font = "12px Segoe UI, sans-serif";

  for (let step = 0; step <= 4; step += 1) {
    const y = padding.top + (plotHeight / 4) * step;
    const value = maxValue - (maxValue / 4) * step;

    context.beginPath();
    context.moveTo(padding.left, y);
    context.lineTo(width - padding.right, y);
    context.stroke();
    context.fillText(compactCurrency(value), 10, y + 4);
  }

  values.forEach((group, groupIndex) => {
    const baseX = padding.left + groupIndex * groupWidth + groupWidth / 2;

    group.forEach((item, scenarioIndex) => {
      const x = baseX + (scenarioIndex - 1) * (barWidth + 8) - barWidth / 2;
      const barHeight = (item.value / maxValue) * plotHeight;
      const y = padding.top + plotHeight - barHeight;

      context.fillStyle = item.color;
      roundedRect(context, x, y, barWidth, barHeight, 6);
      context.fill();
    });

    context.fillStyle = "#14242b";
    context.font = "900 13px Segoe UI, sans-serif";
    context.textAlign = "center";
    context.fillText(`${years[groupIndex]} anos`, baseX, height - 34);
  });

  context.textAlign = "left";
  drawScenarioLegend(context, scenarios, width, height);
}

function futureValue(initial, monthly, annualRate, years) {
  const months = years * 12;
  const monthlyRate = Math.pow(1 + annualRate, 1 / 12) - 1;
  let balance = initial;

  for (let month = 1; month <= months; month += 1) {
    balance = balance * (1 + monthlyRate) + monthly;
  }

  return balance;
}

function drawScenarioLegend(context, scenarios, width, height) {
  const startX = Math.max(18, width - 272);
  const y = height - 18;

  context.font = "12px Segoe UI, sans-serif";
  context.textBaseline = "middle";

  scenarios.forEach((scenario, index) => {
    const x = startX + index * 86;
    context.fillStyle = scenario.color;
    context.fillRect(x, y - 5, 16, 10);
    context.fillStyle = "#14242b";
    context.fillText(scenario.label, x + 22, y);
  });

  context.textBaseline = "alphabetic";
}

function roundedRect(context, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);

  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
}

const reserveFields = {
  expense: document.querySelector("#monthlyExpense"),
  months: document.querySelector("#reserveMonths"),
  current: document.querySelector("#currentReserve"),
};

const reserveOutput = {
  target: document.querySelector("#reserveTarget"),
  status: document.querySelector("#reserveStatus"),
  progress: document.querySelector("#reserveProgress"),
};

const goalFields = {
  target: document.querySelector("#goalTarget"),
  initial: document.querySelector("#goalInitial"),
  months: document.querySelector("#goalMonths"),
  rate: document.querySelector("#goalRate"),
};

const goalOutput = {
  monthly: document.querySelector("#goalMonthly"),
  summary: document.querySelector("#goalSummary"),
};

const inflationFields = {
  amount: document.querySelector("#inflationAmount"),
  annual: document.querySelector("#inflationAnnual"),
  years: document.querySelector("#inflationYears"),
};

const inflationOutput = {
  today: document.querySelector("#todayPower"),
  future: document.querySelector("#futurePower"),
  bar: document.querySelector("#futurePowerBar"),
  summary: document.querySelector("#inflationSummary"),
};

Object.values(reserveFields).forEach((field) => {
  field.addEventListener("input", updateReserve);
});

Object.values(goalFields).forEach((field) => {
  field.addEventListener("input", updateGoal);
});

Object.values(inflationFields).forEach((field) => {
  field.addEventListener("input", updateInflation);
});

function updateReserve() {
  const expense = readNumber(reserveFields.expense);
  const months = Math.max(1, Math.min(24, Math.round(readNumber(reserveFields.months))));
  const current = readNumber(reserveFields.current);
  const target = expense * months;
  const missing = Math.max(0, target - current);
  const progress = target > 0 ? Math.min(100, (current / target) * 100) : 100;

  reserveOutput.target.textContent = currency.format(target);
  reserveOutput.progress.style.width = `${progress}%`;

  if (missing === 0) {
    reserveOutput.status.textContent =
      "A reserva informada já cobre o objetivo. Depois disso, faz sentido estudar investimentos de prazo maior.";
    return;
  }

  reserveOutput.status.textContent = `Ainda faltam ${currency.format(missing)} para cobrir ${months} meses de gastos.`;
}

function updateGoal() {
  const target = readNumber(goalFields.target);
  const initial = readNumber(goalFields.initial);
  const months = Math.max(1, Math.min(600, Math.round(readNumber(goalFields.months))));
  const annualRate = readNumber(goalFields.rate) / 100;
  const monthlyRate = Math.pow(1 + annualRate, 1 / 12) - 1;
  const futureInitial = initial * Math.pow(1 + monthlyRate, months);
  const remaining = target - futureInitial;
  let monthly = 0;

  if (remaining > 0) {
    if (monthlyRate === 0) {
      monthly = remaining / months;
    } else {
      const annuityFactor = (Math.pow(1 + monthlyRate, months) - 1) / monthlyRate;
      monthly = remaining / annuityFactor;
    }
  }

  const totalContributed = Math.max(0, monthly * months);
  goalOutput.monthly.textContent = currency.format(monthly);

  if (monthly === 0) {
    goalOutput.summary.textContent =
      "O valor inicial, com a taxa e o prazo informados, já seria suficiente para alcançar a meta.";
    return;
  }

  goalOutput.summary.textContent =
    `Em ${months} meses, seriam aportados aproximadamente ${currency.format(totalContributed)} além do valor inicial.`;
}

function updateInflation() {
  const amount = readNumber(inflationFields.amount);
  const annualInflation = readNumber(inflationFields.annual) / 100;
  const years = Math.max(1, Math.min(50, Math.round(readNumber(inflationFields.years))));
  const futurePower = amount / Math.pow(1 + annualInflation, years);
  const loss = Math.max(0, amount - futurePower);
  const barWidth = amount > 0 ? Math.max(4, Math.min(100, (futurePower / amount) * 100)) : 0;

  inflationOutput.today.textContent = currency.format(amount);
  inflationOutput.future.textContent = currency.format(futurePower);
  inflationOutput.bar.style.setProperty("--bar-width", `${barWidth}%`);
  inflationOutput.summary.textContent =
    `Com inflação de ${(annualInflation * 100).toFixed(1)}% ao ano por ${years} anos, a perda estimada de poder de compra seria de ${currency.format(loss)}.`;
}

updateReserve();
updateGoal();
updateInflation();
drawAllocationChart();
drawScenarioBarsChart();
animateRiskReturnChart();
simulate();
