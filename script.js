const CR_LABELS = {
  1: "4/5",
  2: "4/6",
  3: "4/7",
  4: "4/8",
};

function loraSx128xAirtimeMs({
  payloadBytes,
  sf,
  bwKhz,
  cr,
  preambleSymbols = 12,
  crc = true,
  explicitHeader = true,
}) {
  if (!Number.isFinite(payloadBytes) || payloadBytes < 0 || payloadBytes > 255) {
    throw new Error("Payload bytes must be between 0 and 255.");
  }

  if (!Number.isInteger(sf) || sf < 5 || sf > 12) {
    throw new Error("Spreading factor must be an integer from 5 to 12.");
  }

  if (!Number.isFinite(bwKhz) || bwKhz <= 0) {
    throw new Error("Bandwidth must be positive.");
  }

  if (!Number.isInteger(cr) || cr < 1 || cr > 4) {
    throw new Error("Coding rate must be 1, 2, 3, or 4.");
  }

  if (!Number.isFinite(preambleSymbols) || preambleSymbols < 0) {
    throw new Error("Preamble symbols must be non-negative.");
  }

  const nBitCrc = crc ? 16 : 0;
  const nSymbolHeader = explicitHeader ? 20 : 0;

  const numerator = Math.max(
    8 * payloadBytes + nBitCrc - 4 * sf + nSymbolHeader,
    0
  );

  let syncOffsetSymbols;
  let denominator;

  if (sf < 7) {
    syncOffsetSymbols = 6.25;
    denominator = 4 * sf;
  } else if (sf <= 10) {
    syncOffsetSymbols = 4.25;
    denominator = 4 * sf;
  } else {
    syncOffsetSymbols = 4.25;
    denominator = 4 * (sf - 2);
  }

  const payloadSymbols = Math.ceil(numerator / denominator) * (cr + 4);

  const totalSymbols =
    preambleSymbols + syncOffsetSymbols + 8 + payloadSymbols;

  const symbolTimeMs = Math.pow(2, sf) / bwKhz;
  const airtimeMs = symbolTimeMs * totalSymbols;

  const nominalBitrateBps =
    sf * (bwKhz * 1000.0) / Math.pow(2, sf) * (4.0 / (cr + 4));

  return {
    payloadBytes,
    sf,
    bwKhz,
    crParam: cr,
    codingRate: CR_LABELS[cr],
    preambleSymbols,
    crc,
    headerMode: explicitHeader ? "explicit" : "implicit",
    symbolTimeMs,
    payloadSymbols,
    totalSymbols,
    airtimeMs,
    airtimeS: airtimeMs / 1000.0,
    nominalBitrateBps,
  };
}

function numberFromInput(id) {
  return Number(document.getElementById(id).value);
}

function setText(id, value) {
  document.getElementById(id).textContent = value;
}

function formatNumber(value, digits = 6) {
  return Number(value).toLocaleString(undefined, {
    maximumFractionDigits: digits,
  });
}

function calculateAndRender() {
  const error = document.getElementById("error");
  error.textContent = "";

  try {
    const result = loraSx128xAirtimeMs({
      payloadBytes: numberFromInput("payload"),
      sf: numberFromInput("sf"),
      bwKhz: numberFromInput("bw"),
      cr: numberFromInput("cr"),
      preambleSymbols: numberFromInput("preamble"),
      crc: document.getElementById("crc").checked,
      explicitHeader: document.getElementById("explicit-header").checked,
    });

    setText("summary", `${result.payloadBytes} bytes, SF${result.sf}, ${result.bwKhz} kHz, CR ${result.codingRate}`);
    setText("symbol-time", `${formatNumber(result.symbolTimeMs)} ms`);
    setText("payload-symbols", `${result.payloadSymbols}`);
    setText("total-symbols", `${formatNumber(result.totalSymbols, 2)}`);
    setText("airtime-ms", `${formatNumber(result.airtimeMs)} ms`);
    setText("airtime-s", `${formatNumber(result.airtimeS)} s`);
    setText("bitrate", `${formatNumber(result.nominalBitrateBps, 2)} bps`);
    setText("header-mode", result.headerMode);
  } catch (err) {
    error.textContent = err.message;
  }
}

function resetDefaults() {
  document.getElementById("payload").value = 32;
  document.getElementById("sf").value = 7;
  document.getElementById("bw").value = 812.5;
  document.getElementById("cr").value = 1;
  document.getElementById("preamble").value = 12;
  document.getElementById("crc").checked = true;
  document.getElementById("explicit-header").checked = true;
  calculateAndRender();
}

document.getElementById("airtime-form").addEventListener("submit", (event) => {
  event.preventDefault();
  calculateAndRender();
});

document.getElementById("reset-button").addEventListener("click", resetDefaults);

for (const element of document.querySelectorAll("input, select")) {
  element.addEventListener("input", calculateAndRender);
}

calculateAndRender();
