import { DEFAULT_SETTINGS, STORAGE_KEYS } from "./variables.js";
import { showToast } from "./ui.js";

let autosaveIntervalId = null;
let settings = loadSettings();
let autosaveGuard = () => false;
let autosaveHandler = null;

// Settings persist independently from save file so players can keep preferences.
export function loadSettings() {
	try {
		const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS_KEY);
		if (!raw) return { ...DEFAULT_SETTINGS };
		const parsed = JSON.parse(raw);
		return Object.assign({}, DEFAULT_SETTINGS, parsed);
	} catch (e) {
		return { ...DEFAULT_SETTINGS };
	}
}

export function saveSettings(nextSettings) {
	try {
		localStorage.setItem(STORAGE_KEYS.SETTINGS_KEY, JSON.stringify(nextSettings));
	} catch (e) {}
}

export function setAutosaveGuard(guardFn) {
	autosaveGuard = typeof guardFn === "function" ? guardFn : () => false;
}

export function setAutosaveHandler(handler) {
	autosaveHandler = typeof handler === "function" ? handler : null;
}

export function startAutosave() {
	if (!settings.autosaveEnabled) return;
	if (autosaveIntervalId) return;

	const interval = Math.max(1000, Number(settings.autosaveIntervalMs) || 30000);
	autosaveIntervalId = setInterval(() => {
		try {
			if (autosaveGuard()) return;
			if (autosaveHandler) autosaveHandler(true);
			if (settings.autosaveToasts) showToast("Game autosaved", "autosave");
		} catch (e) {
			console.error("Autosave error:", e);
		}
	}, interval);
}

export function stopAutosave() {
	if (!autosaveIntervalId) return;
	clearInterval(autosaveIntervalId);
	autosaveIntervalId = null;
}

export function setAutosaveEnabled(enabled) {
	settings.autosaveEnabled = !!enabled;
	saveSettings(settings);
	if (settings.autosaveEnabled) startAutosave();
	else stopAutosave();
}

export function setAutosaveInterval(ms) {
	const v = Math.max(1000, Number(ms) || DEFAULT_SETTINGS.autosaveIntervalMs);
	settings.autosaveIntervalMs = v;
	saveSettings(settings);
	if (autosaveIntervalId) {
		stopAutosave();
		startAutosave();
	}
}

export function setAutosaveToasts(enabled) {
	settings.autosaveToasts = !!enabled;
	saveSettings(settings);
}

export function getSettings() {
	return Object.assign({}, settings);
}

export function resetSettings() {
	settings = { ...DEFAULT_SETTINGS };
	saveSettings(settings);
	stopAutosave();
	if (settings.autosaveEnabled) startAutosave();
}
