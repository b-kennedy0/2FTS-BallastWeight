(function (global) {
  "use strict";

  const LOCAL_AIRCRAFT_DATA_URL = "assets/aircraft_weights.csv";
  const DEFAULT_PASSENGER_COUNT = 10;
  const MAX_PASSENGERS = 50;
  const MIN_PASSENGERS = 1;
  const MAX_WEIGHT = 120;
  const OVERWEIGHT_LIMIT = 110;
  const MAX_AUM = 625;
  const APPROACH_SPEED_THRESHOLD = 580;
  const BALLAST_OPTIONS = [
    { value: "0", label: "None", mass: 0 },
    { value: "1", label: "One", mass: 7 },
    { value: "2", label: "Two", mass: 15 }
  ];

  const api = {
    helpers: {
      parseCsv,
      normaliseAircraftRows,
      buildBallastSummary,
      calculateSingleModel,
      resolveAircraftAllocation,
      getValidAircraftConfigs,
      formatWeight,
      getBallastMass
    }
  };

  global.BallastWeightApp = api;

  if (!global.document) {
    return;
  }

  const state = {
    aircraftData: [],
    mode: "single",
    single: {
      aircraft: "",
      commander: "0",
      passenger: "0",
      ballastCount: "0"
    },
    multi: {
      passengerCount: DEFAULT_PASSENGER_COUNT,
      passengers: buildPassengerList(DEFAULT_PASSENGER_COUNT),
      allocationEnabled: false,
      selectedAircraft: [],
      aircraftConfigs: {}
    }
  };

  api.state = state;

  const elements = {};

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  function init() {
    cacheElements();
    bindEvents();
    setMode("single");
    renderPassengerInputs();
    loadAircraftData();
  }

  function cacheElements() {
    elements.loadOverlay = document.getElementById("loadOverlay");
    elements.loadEyebrow = document.getElementById("loadEyebrow");
    elements.loadTitle = document.getElementById("loadTitle");
    elements.loadMessage = document.getElementById("loadMessage");
    elements.retryLoadButton = document.getElementById("retryLoadButton");
    elements.statusBanner = document.getElementById("statusBanner");
    elements.modeSingleButton = document.getElementById("modeSingleButton");
    elements.modeMultiButton = document.getElementById("modeMultiButton");
    elements.singleModePanel = document.getElementById("singleModePanel");
    elements.multiModePanel = document.getElementById("multiModePanel");
    elements.singleAircraftSelect = document.getElementById("singleAircraftSelect");
    elements.singleCommanderInput = document.getElementById("singleCommanderInput");
    elements.singlePassengerInput = document.getElementById("singlePassengerInput");
    elements.singleBallastSelect = document.getElementById("singleBallastSelect");
    elements.singleCalculations = document.getElementById("singleCalculations");
    elements.singleOutput = document.getElementById("singleOutput");
    elements.altAircraftTable = document.getElementById("altAircraftTable");
    elements.passengerCountInput = document.getElementById("passengerCountInput");
    elements.multiAircraftToggle = document.getElementById("multiAircraftToggle");
    elements.multiAircraftPickerField = document.getElementById("multiAircraftPickerField");
    elements.multiAircraftSelectionCount = document.getElementById("multiAircraftSelectionCount");
    elements.multiAircraftPickerList = document.getElementById("multiAircraftPickerList");
    elements.saveSummaryButton = document.getElementById("saveSummaryButton");
    elements.resetMultiButton = document.getElementById("resetMultiButton");
    elements.passengerInputs = document.getElementById("passengerInputs");
    elements.aircraftConfigCard = document.getElementById("aircraftConfigCard");
    elements.aircraftConfigList = document.getElementById("aircraftConfigList");
    elements.multiSummaryTable = document.getElementById("multiSummaryTable");
  }

  function bindEvents() {
    elements.retryLoadButton.addEventListener("click", loadAircraftData);
    elements.modeSingleButton.addEventListener("click", () => setMode("single"));
    elements.modeMultiButton.addEventListener("click", () => setMode("multi"));

    elements.singleAircraftSelect.addEventListener("change", (event) => {
      state.single.aircraft = event.target.value;
      renderSingleOutputs();
    });

    elements.singleCommanderInput.addEventListener("input", (event) => {
      syncBoundedNumberInput(event.target, 0, MAX_WEIGHT);
      state.single.commander = event.target.value;
      renderSingleOutputs();
    });

    elements.singlePassengerInput.addEventListener("input", (event) => {
      syncBoundedNumberInput(event.target, 0, MAX_WEIGHT);
      state.single.passenger = event.target.value;
      renderSingleOutputs();
    });

    elements.singleBallastSelect.addEventListener("change", (event) => {
      state.single.ballastCount = event.target.value;
      renderSingleOutputs();
    });

    elements.passengerCountInput.addEventListener("input", (event) => {
      const target = event.target;
      target.value = target.value.replace(/[^\d]/g, "");
    });

    elements.passengerCountInput.addEventListener("change", commitPassengerCountInput);
    elements.passengerCountInput.addEventListener("blur", commitPassengerCountInput);
    elements.passengerCountInput.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") {
        return;
      }

      commitPassengerCountInput(event);
    });

    elements.multiAircraftToggle.addEventListener("change", (event) => {
      state.multi.allocationEnabled = event.target.checked;
      renderAircraftPicker();
      renderAircraftConfigSection();
      renderMultiSummary();
    });

    elements.passengerInputs.addEventListener("input", (event) => {
      const target = event.target;
      const row = target.closest("[data-passenger-index]");

      if (!row) {
        return;
      }

      const index = Number(row.dataset.passengerIndex);
      const passenger = state.multi.passengers[index];

      if (!passenger) {
        return;
      }

      if (target.dataset.field === "name") {
        passenger.name = target.value;
      }

      if (target.dataset.field === "weight") {
        syncBoundedNumberInput(target, 0, MAX_WEIGHT);
        passenger.weight = target.value;
      }

      renderMultiSummary();
    });

    elements.multiAircraftPickerList.addEventListener("change", handleAircraftPickerChange);
    elements.aircraftConfigList.addEventListener("input", handleAircraftConfigInteraction);
    elements.aircraftConfigList.addEventListener("change", handleAircraftConfigInteraction);
    elements.saveSummaryButton.addEventListener("click", saveSummaryPdf);
    elements.resetMultiButton.addEventListener("click", resetMultiMode);
  }

  async function loadAircraftData() {
    showLoadState({
      eyebrow: "Loading aircraft data",
      title: "Preparing the ballast calculator",
      message: "Please wait while the aircraft data file is loaded.",
      canRetry: false
    });

    try {
      const aircraftData = await fetchAircraftData(`${LOCAL_AIRCRAFT_DATA_URL}?v=${Date.now()}`);
      state.aircraftData = aircraftData;
      seedSingleAircraftSelection();
      seedAircraftConfigs();
      renderSingleAircraftOptions();
      renderAircraftPicker();
      renderAircraftConfigSection();
      renderAll();
      hideLoadState();
      clearBanner();
      console.info(`Loaded ${aircraftData.length} aircraft from assets/aircraft_weights.csv.`);
    } catch (error) {
      showLoadState({
        eyebrow: "Aircraft data unavailable",
        title: "The calculator could not load the aircraft list",
        message: `${error.message} Please retry. If the error persists, check the deployed CSV file or network access.`,
        canRetry: true
      });
      setBanner("Aircraft data could not be loaded. Retry is required before calculations can run.", "danger");
    }
  }

  async function fetchAircraftData(url) {
    const response = await fetch(url, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`Aircraft data request failed with status ${response.status}.`);
    }

    const csvText = await response.text();
    const aircraftData = normaliseAircraftRows(parseCsv(csvText));

    if (!aircraftData.length) {
      throw new Error("No aircraft were found in the aircraft data source.");
    }

    return aircraftData;
  }

  function setMode(mode) {
    state.mode = mode;
    const singleActive = mode === "single";

    elements.modeSingleButton.classList.toggle("is-active", singleActive);
    elements.modeSingleButton.setAttribute("aria-selected", String(singleActive));
    elements.modeMultiButton.classList.toggle("is-active", !singleActive);
    elements.modeMultiButton.setAttribute("aria-selected", String(!singleActive));
    elements.singleModePanel.hidden = !singleActive;
    elements.multiModePanel.hidden = singleActive;
  }

  function renderAll() {
    renderSingleOutputs();
    renderPassengerInputs();
    renderAircraftPicker();
    renderAircraftConfigSection();
    renderMultiSummary();
  }

  function renderSingleAircraftOptions() {
    const optionsHtml = state.aircraftData
      .map((aircraft) => {
        const selected = aircraft.aircraft === state.single.aircraft ? " selected" : "";
        return `<option value="${escapeHtml(aircraft.aircraft)}"${selected}>${escapeHtml(aircraft.aircraft)}</option>`;
      })
      .join("");

    elements.singleAircraftSelect.innerHTML = optionsHtml;
    elements.singleBallastSelect.value = state.single.ballastCount;
    elements.singleCommanderInput.value = state.single.commander;
    elements.singlePassengerInput.value = state.single.passenger;
  }

  function renderSingleOutputs() {
    const model = calculateSingleModel(state.single, state.aircraftData);

    elements.singleCalculations.innerHTML = [
      renderMetric("Aircraft Commander (with para)", `${formatWeight(model.commander)} kg`, model.commander > OVERWEIGHT_LIMIT ? `Overweight for flight at ${formatWeight(model.commander)} kg.` : "", model.commander > OVERWEIGHT_LIMIT),
      renderMetric("Passenger (with para)", `${formatWeight(model.passenger)} kg`, model.passenger > OVERWEIGHT_LIMIT ? `Overweight for flight at ${formatWeight(model.passenger)} kg.` : "", model.passenger > OVERWEIGHT_LIMIT),
      renderMetric("Ballast weight", `${formatWeight(model.ballastMass)} kg`),
      renderMetric("Total Payload", `${formatWeight(model.payload)} kg`),
      renderMetric("Aircraft weight", model.aircraft ? `${formatWeight(model.aircraft.weight)} kg` : "N/A"),
      renderMetric("Aircraft All-Up-Mass", model.aircraft ? `${formatWeight(model.aum)} kg` : "N/A")
    ].join("");

    elements.singleOutput.innerHTML = [
      renderStatusItem("AUM limit", model.aumStatus.text, model.aumStatus.tone),
      renderStatusItem("Front seat", model.frontSeatStatus.text, model.frontSeatStatus.tone),
      renderStatusItem("Ballast", model.ballastStatus.text, model.ballastStatus.tone),
      renderStatusItem("Approach speed", `Approach speed ${model.approachSpeed}kts`, "info")
    ].join("");

    renderAlternativeAircraftTable(model.payload);
  }

  function renderAlternativeAircraftTable(payload) {
    if (!state.aircraftData.length) {
      elements.altAircraftTable.innerHTML = `<div class="empty-state">Aircraft data is not available.</div>`;
      return;
    }

    const rows = state.aircraftData
      .map((aircraft) => {
        const overweight = payload > aircraft.maxPayload;
        return `
          <tr>
            <td>${escapeHtml(aircraft.aircraft)}</td>
            <td>${formatWeight(aircraft.weight)} kg</td>
            <td>${formatWeight(aircraft.maxPayload)} kg</td>
            <td><span class="pill ${overweight ? "pill--alert" : "pill--ok"}">${overweight ? "TRUE" : "FALSE"}</span></td>
          </tr>
        `;
      })
      .join("");

    elements.altAircraftTable.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Tail No</th>
            <th>A/C Weight</th>
            <th>Max Payload</th>
            <th>Overweight?</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  function renderPassengerInputs() {
    elements.passengerCountInput.value = String(state.multi.passengerCount);
    elements.passengerInputs.innerHTML = state.multi.passengers
      .map((passenger, index) => {
        return `
          <div class="passenger-row" data-passenger-index="${index}">
            <input
              type="text"
              data-field="name"
              value="${escapeAttribute(passenger.name)}"
              aria-label="Passenger ${index + 1} name"
            >
            <input
              type="number"
              min="0"
              max="120"
              step="1"
              inputmode="decimal"
              data-field="weight"
              value="${escapeAttribute(passenger.weight)}"
              aria-label="Passenger ${index + 1} weight with parachute"
            >
          </div>
        `;
      })
      .join("");
  }

  function renderAircraftConfigSection() {
    elements.multiAircraftToggle.checked = state.multi.allocationEnabled;
    elements.multiAircraftPickerField.hidden = !state.multi.allocationEnabled;
    elements.aircraftConfigCard.hidden = !state.multi.allocationEnabled;

    if (!state.multi.allocationEnabled) {
      return;
    }

    const selectedAircraft = getSelectedAircraftNames(state.multi);

    if (!selectedAircraft.length) {
      elements.aircraftConfigList.innerHTML = `<div class="empty-state">Select one or more aircraft above to configure them here.</div>`;
      return;
    }

    const cards = state.aircraftData
      .filter((aircraft) => selectedAircraft.includes(aircraft.aircraft))
      .map((aircraft) => {
        const config = state.multi.aircraftConfigs[aircraft.aircraft] || createAircraftConfig();
        const validation = getAircraftConfigValidation(config);
        const classes = [
          "aircraft-config-card",
          validation.valid ? "is-valid" : "is-invalid"
        ]
          .filter(Boolean)
          .join(" ");

        return `
          <div class="${classes}" data-aircraft="${escapeAttribute(aircraft.aircraft)}">
            <div class="aircraft-config-card__top">
              <div>
                <p class="aircraft-config-card__name">${escapeHtml(aircraft.aircraft)}</p>
                <p class="aircraft-config-card__weight">Aircraft weight: ${formatWeight(aircraft.weight)} kg</p>
              </div>
            </div>
            <div class="aircraft-config-card__fields">
              <label class="field">
                <span>Aircraft Commander <u>(WITH parachute)</u></span>
                <input
                  type="number"
                  min="0"
                  max="120"
                  step="1"
                  inputmode="decimal"
                  data-field="commanderWeight"
                  value="${escapeAttribute(config.commanderWeight)}"
                  placeholder="0"
                >
              </label>
              <label class="field">
                <span>Ballast Weights</span>
                <select data-field="ballastCount" aria-label="${escapeAttribute(aircraft.aircraft)} ballast weights">
                  <option value="" ${config.ballastCount === "" ? "selected" : ""}>Select ballast</option>
                  ${BALLAST_OPTIONS.map((option) => {
                    const selected = config.ballastCount === option.value ? "selected" : "";
                    return `<option value="${option.value}" ${selected}>${option.label}</option>`;
                  }).join("")}
                </select>
              </label>
              <div class="field">
                <span>Ballast weight</span>
                <input
                  type="text"
                  data-display="ballastMass"
                  value="${config.ballastCount === "" ? "Not set" : `${formatWeight(getBallastMass(config.ballastCount))} kg`}"
                  disabled
                >
              </div>
            </div>
            <p class="validation-note ${validation.className}">${escapeHtml(validation.message)}</p>
          </div>
        `;
      })
      .join("");

    elements.aircraftConfigList.innerHTML = cards;
  }

  function renderAircraftPicker() {
    elements.multiAircraftToggle.checked = state.multi.allocationEnabled;
    elements.multiAircraftPickerField.hidden = !state.multi.allocationEnabled;

    if (!state.multi.allocationEnabled) {
      elements.multiAircraftSelectionCount.textContent = "0 aircraft selected";
      elements.multiAircraftPickerList.innerHTML = "";
      return;
    }

    const selectedAircraft = getSelectedAircraftNames(state.multi);
    elements.multiAircraftPickerList.innerHTML = state.aircraftData
      .map((aircraft) => {
        const checked = selectedAircraft.includes(aircraft.aircraft) ? "checked" : "";

        return `
          <label class="aircraft-picker__option">
            <input
              type="checkbox"
              value="${escapeAttribute(aircraft.aircraft)}"
              ${checked}
            >
            <span class="aircraft-picker__name">${escapeHtml(aircraft.aircraft)}</span>
            <span class="aircraft-picker__meta">${formatWeight(aircraft.weight)} kg</span>
          </label>
        `;
      })
      .join("");

    elements.multiAircraftSelectionCount.textContent = `${selectedAircraft.length} aircraft selected`;
  }

  function renderMultiSummary() {
    const summary = buildMultiSummaryTableModel(state.multi, state.aircraftData);

    if (!summary.rows.length) {
      elements.multiSummaryTable.innerHTML = `<div class="empty-state">No passenger data to show.</div>`;
      return;
    }

    const headerHtml = summary.columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("");
    const rowHtml = summary.rows
      .map((row) => {
        const cells = summary.columns
          .map((column) => `<td>${escapeHtml(row[column.key])}</td>`)
          .join("");
        return `<tr>${cells}</tr>`;
      })
      .join("");

    elements.multiSummaryTable.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>${headerHtml}</tr>
        </thead>
        <tbody>${rowHtml}</tbody>
      </table>
    `;
  }

  function handleAircraftConfigInteraction(event) {
    const target = event.target;
    const card = target.closest("[data-aircraft]");

    if (!card) {
      return;
    }

    const aircraft = card.dataset.aircraft;
    const config = state.multi.aircraftConfigs[aircraft];

    if (!config) {
      return;
    }

    if (target.dataset.field === "commanderWeight") {
      syncBoundedNumberInput(target, 0, MAX_WEIGHT);
      config.commanderWeight = target.value;
    }

    if (target.dataset.field === "ballastCount") {
      config.ballastCount = target.value;
    }

    refreshAircraftConfigCard(card, aircraft);
    renderMultiSummary();
  }

  function handleAircraftPickerChange() {
    state.multi.selectedAircraft = Array.from(
      elements.multiAircraftPickerList.querySelectorAll("input[type='checkbox']:checked")
    ).map((input) => input.value);

    renderAircraftPicker();
    renderAircraftConfigSection();
    renderMultiSummary();
  }

  function resetMultiMode() {
    state.multi.passengerCount = DEFAULT_PASSENGER_COUNT;
    state.multi.passengers = buildPassengerList(DEFAULT_PASSENGER_COUNT);
    state.multi.allocationEnabled = false;
    state.multi.selectedAircraft = [];
    seedAircraftConfigs(true);
    renderPassengerInputs();
    renderAircraftPicker();
    renderAircraftConfigSection();
    renderMultiSummary();
  }

  function updatePassengerCount(nextCount) {
    const boundedCount = Math.min(MAX_PASSENGERS, Math.max(MIN_PASSENGERS, Math.round(nextCount)));

    state.multi.passengerCount = boundedCount;
    state.multi.passengers = resizePassengerList(state.multi.passengers, state.multi.passengerCount);
    renderPassengerInputs();
    renderMultiSummary();
  }

  function commitPassengerCountInput(event) {
    const target = event.target;

    if (target.value === "") {
      target.value = String(state.multi.passengerCount);
      return;
    }

    syncIntegerInput(target, MIN_PASSENGERS, MAX_PASSENGERS);
    updatePassengerCount(parseInteger(target.value, state.multi.passengerCount));
  }

  function saveSummaryPdf() {
    const jsPdfNamespace = global.jspdf;

    if (!jsPdfNamespace || typeof jsPdfNamespace.jsPDF !== "function") {
      setBanner("PDF export is not available because the local PDF library did not load.", "danger");
      return;
    }

    const summary = buildMultiSummaryTableModel(state.multi, state.aircraftData);
    const { validConfigs, showAllocation } = summary;
    const doc = new jsPdfNamespace.jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4"
    });

    if (typeof doc.autoTable !== "function") {
      setBanner("PDF export is not available because the AutoTable plugin did not load.", "danger");
      return;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(`Passenger Ballast Summary - ${formatPdfDate(new Date())}`, 14, 16);

    let startY = 24;

    if (showAllocation && validConfigs.length) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text("Aircraft settings used for allocation", 14, startY);
      startY += 4;
      doc.autoTable({
        startY,
        head: [["Tail No", "Aircraft Commander (kg)", "Ballast Weights", "Ballast Weight (kg)"]],
        body: validConfigs.map((config) => [
          config.aircraft,
          formatWeight(config.commanderWeight),
          getBallastLabel(config.ballastCount),
          formatWeight(config.ballastMass)
        ]),
        theme: "grid",
        styles: {
          fontSize: 8,
          cellPadding: 2.2
        },
        headStyles: {
          fillColor: [15, 76, 92]
        },
        margin: { left: 14, right: 14 }
      });
      startY = doc.lastAutoTable.finalY + 8;
    }

    doc.autoTable({
      startY,
      head: [summary.columns.map((column) => column.label)],
      body: summary.rows.map((row) => summary.columns.map((column) => row[column.key])),
      theme: "grid",
      styles: {
        fontSize: 8,
        cellPadding: 2.2,
        overflow: "linebreak",
        valign: "top"
      },
      headStyles: {
        fillColor: [15, 76, 92]
      },
      margin: { left: 14, right: 14 },
      columnStyles: showAllocation
        ? {
            5: { cellWidth: 80 }
          }
        : {}
    });

    doc.save(`ballast_summary_${formatIsoDate(new Date())}.pdf`);
  }

  function buildMultiSummaryTableModel(multiState, aircraftData) {
    const validConfigs = multiState.allocationEnabled
      ? getValidAircraftConfigs(aircraftData, multiState.aircraftConfigs, multiState.selectedAircraft)
      : [];
    const showAllocation = multiState.allocationEnabled && validConfigs.length > 0;
    const columns = [
      { key: "passenger", label: "Passenger" },
      { key: "weight", label: "Weight with Para (KG)" },
      { key: "requiredBallast", label: "Required Ballast" },
      { key: "permittedBallast", label: "Permitted Ballast" },
      { key: "notes", label: "Notes" }
    ];

    if (showAllocation) {
      columns.push({ key: "aircraftAllocation", label: "Aircraft Allocation" });
    }

    const rows = multiState.passengers.map((passenger, index) => {
      const name = passenger.name.trim() || `Pax${index + 1}`;
      const weightValue = getNumericValue(passenger.weight);
      const summary = buildBallastSummary(weightValue);
      const row = {
        passenger: name,
        weight: passenger.weight === "" ? "" : formatWeight(weightValue),
        requiredBallast: summary.required,
        permittedBallast: summary.permitted,
        notes: summary.status
      };

      if (showAllocation) {
        row.aircraftAllocation = resolveAircraftAllocation(summary, weightValue, validConfigs);
      }

      return row;
    });

    return {
      columns,
      rows,
      showAllocation,
      validConfigs
    };
  }

  function calculateSingleModel(singleState, aircraftData) {
    const commander = getNumericValue(singleState.commander);
    const passenger = getNumericValue(singleState.passenger);
    const ballastCount = singleState.ballastCount || "0";
    const ballastMass = getBallastMass(ballastCount);
    const payload = commander + passenger + ballastMass;
    const aircraft = aircraftData.find((item) => item.aircraft === singleState.aircraft) || aircraftData[0] || null;
    const aum = aircraft ? aircraft.weight + payload : 0;

    return {
      commander,
      passenger,
      ballastCount,
      ballastMass,
      payload,
      aircraft,
      aum,
      aumStatus: getSingleAumStatus(aum),
      frontSeatStatus: getFrontSeatStatus(passenger),
      ballastStatus: getSingleBallastStatus(passenger),
      approachSpeed: getApproachSpeed(aum)
    };
  }

  function getSingleAumStatus(aum) {
    if (aum <= MAX_AUM) {
      return {
        tone: "success",
        text: "Aircraft All-Up-Mass Limits OK"
      };
    }

    return {
      tone: "danger",
      text: "Aircraft All-Up-Mass Limits EXCEEDED"
    };
  }

  function getFrontSeatStatus(passengerWeight) {
    if (passengerWeight < 55) {
      return {
        tone: "danger",
        text: "Front seat minimum weight NOT met"
      };
    }

    return {
      tone: "success",
      text: "Front seat minimum weight OK"
    };
  }

  function getSingleBallastStatus(passengerWeight) {
    if (passengerWeight < 42) {
      return { tone: "danger", text: "PASSENGER TOO LIGHT TO FLY" };
    }
    if (passengerWeight < 55) {
      return { tone: "warning", text: "PASSENGER IN REAR SEAT ONLY" };
    }
    if (passengerWeight < 64) {
      return { tone: "warning", text: "TWO Ballast weights MUST be fitted" };
    }
    if (passengerWeight < 70) {
      return { tone: "warning", text: "at least ONE Ballast weight MUST be fitted" };
    }
    if (passengerWeight < 96) {
      return { tone: "success", text: "Ballast not required, but 1 or 2 may be fitted" };
    }
    if (passengerWeight < 104) {
      return { tone: "success", text: "Ballast not required, but 1 may be fitted" };
    }
    if (passengerWeight < 111) {
      return { tone: "danger", text: "Ballast weights are NOT PERMITTED" };
    }
    return { tone: "danger", text: "PASSENGER TOO HEAVY TO FLY" };
  }

  function buildBallastSummary(weight) {
    if (!Number.isFinite(weight) || weight <= 0) {
      return {
        required: "",
        permitted: "",
        status: "No weight entered",
        code: "no-weight",
        allowedBallastCounts: []
      };
    }

    if (weight < 42) {
      return {
        required: "N/A",
        permitted: "0",
        status: "Passenger too light to fly",
        code: "too-light",
        allowedBallastCounts: []
      };
    }

    if (weight < 55) {
      return {
        required: "N/A",
        permitted: "N/A",
        status: "Rear seat only",
        code: "rear-only",
        allowedBallastCounts: []
      };
    }

    if (weight < 64) {
      return {
        required: "2",
        permitted: "2",
        status: "Two ballast weights must be fitted",
        code: "must-use-two",
        allowedBallastCounts: [2]
      };
    }

    if (weight < 70) {
      return {
        required: "At least 1",
        permitted: "1 or 2",
        status: "At least one ballast weight must be fitted",
        code: "must-use-one-or-two",
        allowedBallastCounts: [1, 2]
      };
    }

    if (weight < 96) {
      return {
        required: "0",
        permitted: "0, 1, or 2",
        status: "Ballast not required",
        code: "ballast-optional-all",
        allowedBallastCounts: [0, 1, 2]
      };
    }

    if (weight < 104) {
      return {
        required: "0",
        permitted: "0 or 1",
        status: "Ballast not required",
        code: "ballast-optional-zero-or-one",
        allowedBallastCounts: [0, 1]
      };
    }

    if (weight < 111) {
      return {
        required: "0",
        permitted: "0",
        status: "Ballast not permitted",
        code: "ballast-not-permitted",
        allowedBallastCounts: [0]
      };
    }

    return {
      required: "N/A",
      permitted: "0",
      status: "Passenger too heavy to fly",
      code: "too-heavy",
      allowedBallastCounts: []
    };
  }

  function getValidAircraftConfigs(aircraftData, configsByAircraft, selectedAircraftNames) {
    const selectedAircraftSet = new Set(selectedAircraftNames || []);

    return aircraftData
      .map((aircraft) => {
        if (!selectedAircraftSet.has(aircraft.aircraft)) {
          return null;
        }

        const config = configsByAircraft[aircraft.aircraft];
        const validation = getAircraftConfigValidation(config);

        if (!config || !validation.valid) {
          return null;
        }

        return {
          aircraft: aircraft.aircraft,
          weight: aircraft.weight,
          commanderWeight: getNumericValue(config.commanderWeight),
          ballastCount: Number(config.ballastCount),
          ballastMass: getBallastMass(config.ballastCount)
        };
      })
      .filter(Boolean);
  }

  function resolveAircraftAllocation(summary, passengerWeight, validConfigs) {
    if (summary.code === "rear-only") {
      return "Rear seat only";
    }

    if (summary.code === "no-weight" || summary.code === "too-light" || summary.code === "too-heavy") {
      return "Not Allocatable";
    }

    const matches = validConfigs.filter((config) => {
      const ballastAllowed = summary.allowedBallastCounts.includes(config.ballastCount);
      const withinMassLimit = config.weight + config.commanderWeight + passengerWeight + config.ballastMass <= MAX_AUM;
      return ballastAllowed && withinMassLimit;
    });

    return matches.length ? matches.map((config) => config.aircraft).join(", ") : "Not Allocatable";
  }

  function getAircraftConfigValidation(config) {
    if (!config) {
      return {
        valid: false,
        message: "Select this aircraft above to configure it.",
        className: "validation-note--warning"
      };
    }

    const commanderWeight = getNumericValue(config.commanderWeight);
    const hasCommanderWeight = config.commanderWeight !== "";
    const hasBallastCount = config.ballastCount !== "";

    if (!hasCommanderWeight || commanderWeight <= 0) {
      return {
        valid: false,
        message: "Enter Aircraft Commander weight above 0 kg.",
        className: "validation-note--warning"
      };
    }

    if (commanderWeight > OVERWEIGHT_LIMIT) {
      return {
        valid: false,
        message: "Aircraft Commander exceeds 110 kg and cannot be allocated.",
        className: "validation-note--warning"
      };
    }

    if (!hasBallastCount) {
      return {
        valid: false,
        message: "Choose a ballast setting before allocation can use this aircraft.",
        className: "validation-note--warning"
      };
    }

    return {
      valid: true,
      message: "This aircraft is valid for allocation.",
      className: "validation-note--success"
    };
  }

  function refreshAircraftConfigCard(card, aircraftName) {
    const config = state.multi.aircraftConfigs[aircraftName];

    if (!config) {
      return;
    }

    const validation = getAircraftConfigValidation(config);
    card.classList.toggle("is-valid", validation.valid);
    card.classList.toggle("is-invalid", !validation.valid);

    const ballastMassField = card.querySelector("[data-display='ballastMass']");
    if (ballastMassField) {
      ballastMassField.value = config.ballastCount === "" ? "Not set" : `${formatWeight(getBallastMass(config.ballastCount))} kg`;
    }

    const validationNote = card.querySelector(".validation-note");
    if (validationNote) {
      validationNote.className = `validation-note ${validation.className}`.trim();
      validationNote.textContent = validation.message;
    }
  }

  function buildPassengerList(count) {
    return Array.from({ length: count }, (_, index) => ({
      name: `Pax${index + 1}`,
      weight: "0"
    }));
  }

  function resizePassengerList(existing, count) {
    const resized = [];

    for (let index = 0; index < count; index += 1) {
      if (existing[index]) {
        resized.push(existing[index]);
      } else {
        resized.push({
          name: `Pax${index + 1}`,
          weight: "0"
        });
      }
    }

    return resized;
  }

  function seedSingleAircraftSelection() {
    if (!state.aircraftData.length) {
      state.single.aircraft = "";
      return;
    }

    const existing = state.aircraftData.find((aircraft) => aircraft.aircraft === state.single.aircraft);
    state.single.aircraft = existing ? existing.aircraft : state.aircraftData[0].aircraft;
  }

  function seedAircraftConfigs(reset) {
    const nextConfigs = {};

    state.aircraftData.forEach((aircraft) => {
      const previous = reset ? null : state.multi.aircraftConfigs[aircraft.aircraft];
      nextConfigs[aircraft.aircraft] = previous
        ? { ...previous }
        : createAircraftConfig();
    });

    state.multi.aircraftConfigs = nextConfigs;
  }

  function createAircraftConfig() {
    return {
      commanderWeight: "",
      ballastCount: ""
    };
  }

  function getSelectedAircraftNames(multiState) {
    return Array.isArray(multiState.selectedAircraft) ? multiState.selectedAircraft : [];
  }

  function showLoadState({ eyebrow, title, message, canRetry }) {
    elements.loadEyebrow.textContent = eyebrow;
    elements.loadTitle.textContent = title;
    elements.loadMessage.textContent = message;
    elements.retryLoadButton.hidden = !canRetry;
    elements.loadOverlay.classList.add("is-active");
  }

  function hideLoadState() {
    elements.loadOverlay.classList.remove("is-active");
  }

  function setBanner(message, tone) {
    elements.statusBanner.className = `status-banner status-banner--${tone}`;
    elements.statusBanner.textContent = message;
  }

  function clearBanner() {
    elements.statusBanner.className = "status-banner is-hidden";
    elements.statusBanner.textContent = "";
  }

  function renderMetric(label, value, note, danger) {
    const className = danger ? "metric metric--danger" : "metric";
    return `
      <div class="${className}">
        <span class="metric__label">${escapeHtml(label)}</span>
        <span class="metric__value">${escapeHtml(value)}</span>
        ${note ? `<span class="metric__note">${escapeHtml(note)}</span>` : ""}
      </div>
    `;
  }

  function renderStatusItem(title, text, tone) {
    return `
      <div class="status-item status-item--${tone}">
        <span class="status-item__dot" aria-hidden="true"></span>
        <div class="status-item__content">
          <span class="status-item__title">${escapeHtml(title)}</span>
          <span class="status-item__text">${escapeHtml(text)}</span>
        </div>
      </div>
    `;
  }

  function syncBoundedNumberInput(input, min, max) {
    if (input.value === "") {
      return;
    }

    const number = Number(input.value);

    if (!Number.isFinite(number)) {
      input.value = "";
      return;
    }

    const bounded = Math.min(max, Math.max(min, number));
    input.value = Number.isInteger(bounded) ? String(bounded) : String(Number(bounded.toFixed(2)));
  }

  function syncIntegerInput(input, min, max) {
    if (input.value === "") {
      input.value = String(min);
      return;
    }

    const number = Number(input.value);

    if (!Number.isFinite(number)) {
      input.value = String(min);
      return;
    }

    const bounded = Math.min(max, Math.max(min, Math.round(number)));
    input.value = String(bounded);
  }

  function getNumericValue(value) {
    if (value === "" || value === null || value === undefined) {
      return 0;
    }

    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  function parseInteger(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.round(number) : fallback;
  }

  function getBallastMass(ballastCount) {
    const option = BALLAST_OPTIONS.find((item) => item.value === String(ballastCount));
    return option ? option.mass : 0;
  }

  function getBallastLabel(ballastCount) {
    const option = BALLAST_OPTIONS.find((item) => item.value === String(ballastCount));
    return option ? option.label : "";
  }

  function getApproachSpeed(aum) {
    return aum < APPROACH_SPEED_THRESHOLD ? 55 : 60;
  }

  function formatWeight(value) {
    if (!Number.isFinite(value)) {
      return "";
    }

    return Number(value.toFixed(2)).toString();
  }

  function formatPdfDate(date) {
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  }

  function formatIsoDate(date) {
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")
    ].join("-");
  }

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let value = "";
    let index = 0;
    let insideQuotes = false;

    while (index < text.length) {
      const char = text[index];
      const nextChar = text[index + 1];

      if (char === "\"") {
        if (insideQuotes && nextChar === "\"") {
          value += "\"";
          index += 2;
          continue;
        }

        insideQuotes = !insideQuotes;
        index += 1;
        continue;
      }

      if (char === "," && !insideQuotes) {
        row.push(value);
        value = "";
        index += 1;
        continue;
      }

      if ((char === "\n" || char === "\r") && !insideQuotes) {
        if (char === "\r" && nextChar === "\n") {
          index += 1;
        }

        row.push(value);
        if (row.some((cell) => cell !== "")) {
          rows.push(row);
        }
        row = [];
        value = "";
        index += 1;
        continue;
      }

      value += char;
      index += 1;
    }

    if (value !== "" || row.length) {
      row.push(value);
      if (row.some((cell) => cell !== "")) {
        rows.push(row);
      }
    }

    if (!rows.length) {
      return [];
    }

    const headers = rows[0].map((header) => header.trim());

    return rows.slice(1).map((cells) => {
      const record = {};
      headers.forEach((header, position) => {
        record[header] = (cells[position] || "").trim();
      });
      return record;
    });
  }

  function normaliseAircraftRows(rows) {
    return rows
      .map((row) => {
        const aircraft = (row.aircraft || "").trim();
        const weight = Number(row.weight);

        if (!aircraft || !Number.isFinite(weight)) {
          return null;
        }

        return {
          aircraft,
          weight,
          maxPayload: Number((MAX_AUM - weight).toFixed(2))
        };
      })
      .filter(Boolean)
      .sort((left, right) => left.aircraft.localeCompare(right.aircraft, undefined, { numeric: true, sensitivity: "base" }));
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replace(/`/g, "&#96;");
  }
})(typeof window !== "undefined" ? window : globalThis);
