const form = document.getElementById("strategy-form");
const laps = document.getElementById("laps");
const lapsValue = document.getElementById("laps-value");
const pitLoss = document.getElementById("pit-loss");
const pitLossValue = document.getElementById("pit-loss-value");
const runButton = document.getElementById("run-button");
const toast = document.getElementById("toast");
let lapChart = null;

laps.addEventListener("input", () => lapsValue.textContent = laps.value);
pitLoss.addEventListener("input", () => pitLossValue.textContent = Number(pitLoss.value).toFixed(1));

function showToast(message) {
  toast.textContent = message;
  toast.classList.remove("hidden");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.add("hidden"), 7000);
}
function fmtSeconds(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(3).padStart(6, "0");
  return `${mins}:${secs}`;
}
function tyreName(code) { return ({1:"Soft", 2:"Medium", 3:"Hard"})[Number(code)] || "Unknown"; }
function tyreColor(code) { return ({1:"#ed3542", 2:"#f2c14e", 3:"#b8c0ca"})[Number(code)] || "#87909d"; }
function tyreInitial(code) { return ({1:"S",2:"M",3:"H"})[Number(code)] || "?"; }

async function checkHealth() {
  const status = document.getElementById("engine-status");
  try {
    const response = await fetch("/api/health");
    const data = await response.json();
    status.textContent = data.octaveAvailable ? "Connected · Octave detected" : "Octave not detected";
    status.style.color = data.octaveAvailable ? "#57d5a0" : "#ef7a82";
  } catch (_) {
    status.textContent = "Backend unavailable";
  }
}
checkHealth();

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  runButton.disabled = true;
  runButton.querySelector("span:first-child").textContent = "RUNNING OPTIMIZER…";
  document.getElementById("result-tag").textContent = "CALCULATING";
  try {
    const response = await fetch("/api/optimize", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({
        laps: Number(laps.value),
        pitLoss: Number(pitLoss.value),
        requireTwoCompounds: document.getElementById("two-compounds").checked
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "The simulation failed.");
    renderResults(data);
    document.getElementById("result-tag").textContent = "OPTIMAL FOUND";
  } catch (error) {
    document.getElementById("result-tag").textContent = "ERROR";
    showToast(error.message || "Could not reach the simulation engine.");
  } finally {
    runButton.disabled = false;
    runButton.querySelector("span:first-child").textContent = "OPTIMIZE STRATEGY";
  }
});

function renderResults(data) {
  document.getElementById("empty-state").classList.add("hidden");
  document.getElementById("result-state").classList.remove("hidden");
  document.getElementById("total-time").textContent = fmtSeconds(data.totalTime);
  document.getElementById("average-time").textContent = `${data.averageLap.toFixed(3)} seconds average per lap`;
  document.getElementById("stop-count").textContent = data.bestStrategy.pitLaps.length;
  document.getElementById("candidate-count").textContent = `${Number(data.candidatesEvaluated).toLocaleString()} strategies evaluated`;

  const compounds = data.bestStrategy.compounds.map(Number);
  const pitLaps = (Array.isArray(data.bestStrategy.pitLaps)
  ? data.bestStrategy.pitLaps
  : [data.bestStrategy.pitLaps]).map(Number);
  const edges = [0, ...pitLaps, Number(data.nLaps)];
  const track = document.getElementById("stint-track");
  track.innerHTML = "";
  compounds.forEach((compound, index) => {
    const start = edges[index] + 1;
    const end = edges[index + 1];
    const length = end - edges[index];
    const stint = document.createElement("div");
    stint.className = "stint";
    stint.style.flex = `${length} 1 0`;
    stint.style.setProperty("--stint-color", tyreColor(compound));
    stint.innerHTML = `<b>${tyreInitial(compound)} · ${tyreName(compound)}</b><small>Laps ${start}–${end}</small>`;
    track.appendChild(stint);
  });

  const pitDetails = document.getElementById("pit-details");
  pitDetails.innerHTML = "";
  if (!pitLaps.length) {
    pitDetails.innerHTML = '<span class="pit-pill">No pit stops in this strategy</span>';
  } else {
    pitLaps.forEach((lap, index) => {
      const pill = document.createElement("span");
      pill.className = "pit-pill";
      pill.innerHTML = `PIT ${index + 1} <b>· After lap ${lap}</b>`;
      pitDetails.appendChild(pill);
    });
  }

  const tbody = document.getElementById("strategy-table");
  tbody.innerHTML = "";
  data.topStrategies.forEach((strategy, index) => {
    const tr = document.createElement("tr");
    if (index === 0) tr.className = "best-row";
    const seq = strategy.compounds.map(tyreInitial).join(" → ");
    const stops = strategy.pitLaps.length;
    const pits = strategy.pitLaps.length ? strategy.pitLaps.join(", ") : "—";
    tr.innerHTML = `<td><span class="rank">${String(strategy.rank).padStart(2,"0")}</span></td>
      <td><span class="compound-seq">${seq}</span></td>
      <td>${pits}</td><td>${stops}</td>
      <td>${fmtSeconds(Number(strategy.totalTime))}</td>
      <td class="${index === 0 ? "gap-best" : ""}">${index === 0 ? "BEST" : `+${Number(strategy.gap).toFixed(3)} s`}</td>`;
    tbody.appendChild(tr);
  });

  drawChart(data);
}
function drawChart(data) {
  const ctx = document.getElementById("lap-chart");
  const lapsArray = data.lapTimes.map((_, index) => index + 1);
  const pitLaps = (Array.isArray(data.bestStrategy.pitLaps)
  ? data.bestStrategy.pitLaps
  : [data.bestStrategy.pitLaps]).map(Number);
  const compounds = data.bestStrategy.compounds.map(Number);
  const edges = [0, ...pitLaps, Number(data.nLaps)];
  // Remove the fixed pit-loss penalty from the pit lap to show the underlying lap-time trend.
  const racingTimes = data.lapTimes.map((value, index) => pitLaps.includes(index + 1) ? value - Number(data.pitLoss) : value);
  const datasets = [1,2,3].map(code => {
    const values = racingTimes.map((value, index) => {
      let stintIndex = edges.findIndex((edge, i) => i < edges.length - 1 && index + 1 > edge && index + 1 <= edges[i+1]);
      return stintIndex >= 0 && compounds[stintIndex] === code ? value : null;
    });
    return {label:tyreName(code), data:values, borderColor:tyreColor(code), backgroundColor:tyreColor(code), pointRadius:2, pointHoverRadius:4, borderWidth:2, tension:.25, spanGaps:false};
  });
  if (lapChart) lapChart.destroy();
  lapChart = new Chart(ctx, {
    type:"line",
    data:{labels:lapsArray, datasets},
    options:{
      responsive:true, maintainAspectRatio:false, animation:{duration:250},
      plugins:{legend:{display:false}, tooltip:{backgroundColor:"#171c24",borderColor:"#303743",borderWidth:1,callbacks:{label:(item)=>`${item.dataset.label}: ${Number(item.raw).toFixed(3)} s`}}},
      scales:{
        x:{title:{display:true,text:"RACE LAP",color:"#727c88",font:{size:9}},ticks:{color:"#7e8793",maxTicksLimit:10,font:{size:9}},grid:{color:"#242a32"}},
        y:{title:{display:true,text:"SECONDS",color:"#727c88",font:{size:9}},ticks:{color:"#7e8793",font:{size:9}},grid:{color:"#242a32"}}
      }
    }
  });
}
