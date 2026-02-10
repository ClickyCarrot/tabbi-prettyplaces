import { getActivityLog, getCurrentPet, getLowestStat, logActivity } from "./variables.js";

const TYPE_LABELS = {
	care: "Care",
	shop: "Shop",
	minigame: "Minigame",
	coach: "Coach",
	custom: "Custom",
};

const MIN_LIMIT = 1;
const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 10;

function formatTime(value) {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "Unknown time";
	return date.toLocaleString();
}

function clampNumber(value, min, max) {
	return Math.max(min, Math.min(max, value));
}

function setMessage(element, message, state) {
	if (!element) return;
	element.textContent = message || "";
	if (!state) {
		delete element.dataset.state;
		return;
	}
	element.dataset.state = state;
}

function getSelectedTypes(checkboxes) {
	return Object.entries(checkboxes)
		.filter(([, el]) => el && el.checked)
		.map(([key]) => key);
}

function buildSummary(entries, pet) {
	const counts = entries.reduce((acc, entry) => {
		const type = entry.type || "custom";
		acc[type] = (acc[type] || 0) + 1;
		return acc;
	}, {});
	const latest = entries[0];
	const oldest = entries[entries.length - 1];
	const lowest = getLowestStat(pet);
	const focus = lowest ? `${lowest.key} (${Math.round(lowest.value)})` : "unknown";
	const countHtml = Object.keys(counts)
		.map((type) => {
			const label = TYPE_LABELS[type] || type;
			return `<li>${label}: ${counts[type]}</li>`;
		})
		.join("");

	return `
		<div class="reportSummary">
			<div class="reportEntryTitle">Summary</div>
			<div class="reportEntryMeta">${entries.length} entries from ${
				oldest ? formatTime(oldest.time) : "unknown"
			} to ${latest ? formatTime(latest.time) : "unknown"}</div>
			<ul class="reportSummaryList">${countHtml}</ul>
			<div class="reportEntryMeta">Current care focus: ${focus}</div>
		</div>
	`;
}

function buildDetailed(entries) {
	return entries
		.map((entry) => {
			const typeLabel = TYPE_LABELS[entry.type] || entry.type || "Custom";
			const stats =
				entry.stats ?
					`H:${Math.round(entry.stats.hunger)} F:${Math.round(
						entry.stats.fun,
					)} E:${Math.round(entry.stats.energy)} C:${Math.round(entry.stats.clean)}`
				:	"Stats not recorded";
			return `
				<div class="reportEntry">
					<div class="reportEntryTitle">${typeLabel}</div>
					<div class="reportEntryMeta">${formatTime(entry.time)} • ${entry.petName || "Pet"}</div>
					<div class="reportEntryDetail">${entry.detail || "(no details)"}</div>
					<div class="reportEntryMeta">${stats}</div>
				</div>
			`;
		})
		.join("");
}

function sanitizeLimit(limitInput, messageEl) {
	const rawValue = limitInput.value;
	if (rawValue === "all") {
		setMessage(messageEl, "", "");
		return Number.POSITIVE_INFINITY;
	}
	const raw = Number(rawValue);
	if (!Number.isFinite(raw)) {
		limitInput.value = String(DEFAULT_LIMIT);
		setMessage(messageEl, "Choose a whole number for report entries.", "error");
		return DEFAULT_LIMIT;
	}
	const rounded = Math.floor(raw);
	const clamped = clampNumber(rounded, MIN_LIMIT, MAX_LIMIT);
	limitInput.value = String(clamped);
	if (rounded !== clamped) {
		setMessage(messageEl, `Entries must be between ${MIN_LIMIT}-${MAX_LIMIT}.`, "error");
	} else {
		setMessage(messageEl, "", "");
	}
	return clamped;
}

export function initReports() {
	const limitInput = document.getElementById("reportLimit");
	const careCheckbox = document.getElementById("reportCare");
	const shopCheckbox = document.getElementById("reportShop");
	const minigameCheckbox = document.getElementById("reportMinigame");
	const coachCheckbox = document.getElementById("reportCoach");
	const typeSelect = document.getElementById("reportType");
	const generateBtn = document.getElementById("generateReport");
	const messageEl = document.getElementById("reportMessage");
	const outputEl = document.getElementById("reportOutput");

	if (!limitInput || !typeSelect || !generateBtn || !messageEl || !outputEl) return;

	const checkboxes = {
		care: careCheckbox,
		shop: shopCheckbox,
		minigame: minigameCheckbox,
		coach: coachCheckbox,
	};

	function buildReport() {
		const limit = sanitizeLimit(limitInput, messageEl);
		const selectedTypes = getSelectedTypes(checkboxes);
		if (!selectedTypes.length) {
			setMessage(messageEl, "Select at least one category.", "error");
			outputEl.innerHTML = "";
			return;
		}

		const log = getActivityLog();
		const filtered = log.filter((entry) => selectedTypes.includes(entry.type));
		const sliced = Number.isFinite(limit) ? filtered.slice(-limit) : filtered.slice();
		const entries = sliced.reverse();
		if (!entries.length) {
			setMessage(messageEl, "No entries match those filters yet.", "error");
			outputEl.innerHTML = "";
			return;
		}

		const pet = getCurrentPet();
		const mode = typeSelect.value;
		const summaryHtml = buildSummary(entries, pet);
		const detailHtml = buildDetailed(entries);
		outputEl.innerHTML =
			mode === "summary" ? summaryHtml : (
				`${summaryHtml}<div class="reportEntryTitle">Detailed Log</div>${detailHtml}`
			);
		setMessage(messageEl, `Report ready: ${entries.length} entries.`, "success");
		logActivity("system", "Generated a report", {
			entries: entries.length,
			filters: selectedTypes,
			mode,
		});
	}

	limitInput.addEventListener("change", () => sanitizeLimit(limitInput, messageEl));
	generateBtn.addEventListener("click", buildReport);
}
