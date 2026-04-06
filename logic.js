// Keep scoring distribution aligned with getpoints.py
  const EVENTS = {
    "GBM": 5,
    "Community Service": 8,
    "Fundraising": 6,
    "Chapter Events": 7
  };

  const eventSelect = document.getElementById("eventType");
  for (const [k, v] of Object.entries(EVENTS)) {
    const opt = document.createElement("option");
    opt.value = k;
    opt.textContent = `${k} (+${v})`;
    eventSelect.appendChild(opt);
  }

  const statusEl = document.getElementById("status");
  const errEl = document.getElementById("err");
  const previewEl = document.getElementById("preview");
  const notFoundEl = document.getElementById("notFound");
  const downloadBtn = document.getElementById("downloadBtn");

  let updatedCountedRows = null;

  function normalizeName(name) {
    return String(name ?? "")
      .toLowerCase()
      .replace(/[\s\W_]+/g, "");
  }

  function cleanFullName(value) {
    return String(value ?? "")
      .trim()
      .replace(/\t/g, " ");
  }

function findColumnName(row, candidates) {
    if (!row) return null;
    const keys = Object.keys(row);
    const lowered = new Map(keys.map((k) => [k.toLowerCase(), k]));
    for (const c of candidates) {
      const hit = lowered.get(c.toLowerCase());
      if (hit) return hit;
    }
    return null;
  }

  async function parseCsvFile(file) {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        delimiter: ",",
        skipEmptyLines: true,
        complete: (results) => {
          // Single-column CSVs can trigger an undetectable delimiter warning even when data is valid.
          const fatalErrors = (results.errors || []).filter(
            (err) => err?.code !== "UndetectableDelimiter"
          );

          if (fatalErrors.length) {
            reject(new Error(fatalErrors[0].message));
          } else {
            resolve(results.data);
          }
        }
      });
    });
  }

  function toCsv(rows) {
    return Papa.unparse(rows, { quotes: false });
  }

  function downloadTextFile(filename, text) {
    const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function renderPreview(rows) {
    const show = rows.slice(0, 25);
    if (!show.length) {
      previewEl.textContent = "—";
      return;
    }
    const cols = Object.keys(show[0]);
    let html = "<table><thead><tr>";
    for (const c of cols) html += `<th>${c}</th>`;
    html += "</tr></thead><tbody>";
    for (const r of show) {
      html += "<tr>";
      for (const c of cols) html += `<td>${(r[c] ?? "").toString()}</td>`;
      html += "</tr>";
    }
    html += "</tbody></table>";
    previewEl.innerHTML = html;
  }

  document.getElementById("calcBtn").addEventListener("click", async () => {
    errEl.textContent = "";
    statusEl.textContent = "Reading files…";
    notFoundEl.textContent = "—";
    downloadBtn.disabled = true;
    updatedCountedRows = null;

    const countedFile = document.getElementById("countedFile").files[0];
    const addFile = document.getElementById("addFile").files[0];
    const eventType = eventSelect.value;

    if (!countedFile || !addFile) {
      statusEl.textContent = "";
      errEl.textContent = "Please upload both CSV files.";
      return;
    }

    const addPoints = EVENTS[eventType] ?? 0;

    try {
      const countedRows = await parseCsvFile(countedFile);
      const addRows = await parseCsvFile(addFile);

      const pointsNameCol = findColumnName(countedRows[0], ["FullName", "Name"]);
      const pointsValueCol = findColumnName(countedRows[0], ["Points"]);
      const attendanceNameCol = findColumnName(addRows[0], ["FullName", "Name"]);

      if (!pointsNameCol || !pointsValueCol) {
        throw new Error("Points file must have columns: FullName (or Name) and Points.");
      }
      if (!attendanceNameCol) {
        throw new Error("Attendance file must have a FullName (or Name) column.");
      }

      for (const row of countedRows) {
        row[pointsNameCol] = cleanFullName(row[pointsNameCol]);
        const parsed = Number(row[pointsValueCol]);
        row[pointsValueCol] = Number.isFinite(parsed) ? parsed : 0;
      }

      for (const row of addRows) {
        row[attendanceNameCol] = cleanFullName(row[attendanceNameCol]);
      }

      const attendees = new Set(
        addRows
          .map((r) => normalizeName(r[attendanceNameCol]))
          .filter(Boolean)
      );

      let matched = 0;
      const notFound = new Set(attendees);

      for (const row of countedRows) {
        const normalized = normalizeName(row[pointsNameCol]);
        if (!normalized) continue;

        if (attendees.has(normalized)) {
          row[pointsValueCol] = Number(row[pointsValueCol]) + addPoints;
          matched++;
          notFound.delete(normalized);
        }
      }

      updatedCountedRows = countedRows;

      // UI updates
      statusEl.textContent = `Done. Event "${eventType}" adds +${addPoints} per attendance.`;
      notFoundEl.textContent = notFound.size ? Array.from(notFound).slice(0, 200).join(", ") : "—";
      renderPreview(countedRows);
      downloadBtn.disabled = false;

    } catch (e) {
      statusEl.textContent = "";
      errEl.textContent = e.message || String(e);
      previewEl.textContent = "—";
    }
  });

  downloadBtn.addEventListener("click", () => {
    if (!updatedCountedRows) return;
    const csv = toCsv(updatedCountedRows);
    downloadTextFile("counted_points_updated.csv", csv);
  });