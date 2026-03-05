import {
	createPetFromTemplate,
	getCurrentPet,
	getMoney,
	logActivity,
	resetPets,
	setActivePetIndex,
	setMoney,
	state,
	STORAGE_KEYS,
	clearActivityLog,
} from "./variables.js";
import { showToast, updateUI } from "./ui.js";

// Save game data to browser storage so progress survives refreshes.
export function saveGame(silent = false) {
	const sanitizedPets = state.pets.map((pet) => ({
		id: pet.id || null,
		name: pet.name,
		type: pet.type,
		hunger: pet.hunger,
		fun: pet.fun,
		energy: pet.energy,
		clean: pet.clean,
	}));

	const saveData = {
		pets: sanitizedPets,
		petIndex: state.petIndex,
		money: getMoney(),
		inventory: state.inventory && typeof state.inventory === "object" ? state.inventory : {},
	};

	localStorage.setItem(STORAGE_KEYS.SAVE_KEY, JSON.stringify(saveData));
	logActivity("system", "Saved game");
	if (!silent) showToast("Game Saved", "save");
}

// Load game data and rebuild pets from templates.
export function loadGame(silent = false) {
	const raw = localStorage.getItem(STORAGE_KEYS.SAVE_KEY);
	if (!raw) {
		if (!silent) showToast("No save found");
		return false;
	}

	let parsed;
	try {
		parsed = JSON.parse(raw);
	} catch (error) {
		if (!silent) showToast("Save file was corrupted");
		return false;
	}

	setMoney(parsed.money || 0);
	state.inventory =
		parsed.inventory && typeof parsed.inventory === "object" ? parsed.inventory : {};
	Object.keys(state.inventory).forEach((key) => {
		state.inventory[key] = Math.max(0, Math.floor(Number(state.inventory[key]) || 0));
	});

	state.pets =
		Array.isArray(parsed.pets) ?
			parsed.pets
				.map((petData) => {
					const template = state.petTemplates.find((t) => t.id === petData.id);
					if (!template) return null;
					const pet = createPetFromTemplate(template);
					pet.name = petData.name || pet.defaultName || pet.name;
					pet.hunger = Number(petData.hunger) || 0;
					pet.fun = Number(petData.fun) || 0;
					pet.energy = Number(petData.energy) || 0;
					pet.clean = Number(petData.clean) || 0;
					return pet;
				})
				.filter(Boolean)
		:	[];

	if (!state.pets.length) resetPets();
	setActivePetIndex(Math.max(0, Number(parsed.petIndex) || 0));
	state.petDeathTriggered = false;
	updateUI();
	logActivity("system", "Loaded game", { petName: getCurrentPet()?.name });
	if (!silent) showToast("Game Loaded!");
	return true;
}

// New Game: Reset pets and clear save data for a fresh start.
export function resetGame() {
	resetPets();
	setMoney(25);
	state.inventory = {};
	state.petDeathTriggered = false;
	clearActivityLog();
	localStorage.removeItem(STORAGE_KEYS.SAVE_KEY);
	updateUI();
	logActivity("system", "Started a new game");
}
