// Central game state lives here so every module shares the same source of truth.
// Keeping it in one place makes debugging and report generation much easier.
export const state = {
	canvas: null,
	ctx: null,
	petTemplates: [],
	pets: [],
	petIndex: 0,
	pet: null,
	decayIntervalId: null,
	money: 0,
	inventory: {},
	petX: 250,
	petY: 400,
	petSpeed: 1.5,
	petDirection: 1,
	walkCycle: 0,
	petState: "walking",
	idleEndTime: 0,
	nextDirection: 1,
	activityLog: [],
	petDeathTriggered: false,
};

export const CONSTANTS = {
	NAME_OFFSET: 10,
	IDLE_MIN_MS: 2000,
	IDLE_MAX_MS: 5000,
	EDGE_MARGIN: 60,
	SPRITE_SCALE: 7,
};

export const STORAGE_KEYS = {
	SETTINGS_KEY: "TabbiSettings",
	SAVE_KEY: "TabbiSave",
};

export const DEFAULT_SETTINGS = {
	autosaveEnabled: true,
	autosaveToasts: true,
	autosaveIntervalMs: 30000,
};

export const PET_NAME_RULES = {
	minLength: 2,
	maxLength: 12,
	pattern: /^[A-Za-z][A-Za-z\- ]+$/,
};

export function initCanvas() {
	state.canvas = document.getElementById("gameCanvas");
	state.ctx = state.canvas ? state.canvas.getContext("2d") : null;
}

export function getPetStatSnapshot(pet = getCurrentPet()) {
	if (!pet) return null;
	return {
		hunger: Number(pet.hunger) || 0,
		fun: Number(pet.fun) || 0,
		energy: Number(pet.energy) || 0,
		clean: Number(pet.clean) || 0,
	};
}

export function getLowestStat(pet = getCurrentPet()) {
	const stats = getPetStatSnapshot(pet);
	if (!stats) return null;
	return Object.entries(stats)
		.map(([key, value]) => ({ key, value }))
		.sort((a, b) => a.value - b.value)[0];
}

function createPetTemplate(id, name) {
	return {
		id,
		name,
		defaultName: name,
		type: "Cat",
		hunger: 100,
		fun: 100,
		energy: 100,
		clean: 100,
		decay: {
			hunger: 0.175,
			fun: 0.2,
			energy: 0.15,
			clean: 0.1,
		},
		sprite: {
			image: new Image(),
			src: `core/assets/sprites/cat${id}/walk.png`,
			frameWidth: 26,
			frameHeight: 16,
			startOffsetX: 12,
			startOffsetY: 16,
			frameGap: 24,
			frameCount: 8,
			frameSpeed: 6,
			currentFrame: 0,
			loaded: false,
			idleSrc: `core/assets/sprites/cat${id}/idle.png`,
			idleImage: new Image(),
			idleLoaded: false,
			idleFrameCount: 10,
			idleFrameSpeed: 6,
		},
	};
}

function initPetTemplates() {
	const baseNames = ["Ginger", "Shadow", "Snowball", "Mittens", "Tiger", "Luna"];
	state.petTemplates = baseNames.map((name, index) => createPetTemplate(index + 1, name));
	state.petTemplates.forEach((template) => {
		template.sprite.image.onload = () => {
			template.sprite.loaded = true;
			template.sprite.currentFrame = 0;
		};
		template.sprite.image.src = template.sprite.src;
		template.sprite.idleImage.onload = () => {
			template.sprite.idleLoaded = true;
		};
		template.sprite.idleImage.src = template.sprite.idleSrc;
	});
}

export function createPetFromTemplate(template) {
	const pet = {
		...template,
		decay: { ...template.decay },
		sprite: { ...template.sprite },
	};
	pet.sprite.image = new Image();
	pet.sprite.image.src = template.sprite.src;
	pet.sprite.image.onload = () => {
		pet.sprite.loaded = true;
	};
	if (template.sprite.loaded) pet.sprite.loaded = true;

	pet.sprite.idleImage = new Image();
	pet.sprite.idleImage.src = template.sprite.idleSrc;
	pet.sprite.idleImage.onload = () => {
		pet.sprite.idleLoaded = true;
	};
	if (template.sprite.idleLoaded) pet.sprite.idleLoaded = true;

	return pet;
}

export function getFreshPets() {
	return state.petTemplates.map((template) => createPetFromTemplate(template));
}

export function resetPets() {
	state.pets = getFreshPets();
	state.petIndex = 0;
	state.pet = state.pets[0] || null;
}

export function getCurrentPet() {
	return state.pets[state.petIndex] || state.pets[0] || null;
}

export function setActivePetIndex(index) {
	const nextIndex = Math.max(0, Math.min(index, state.pets.length - 1));
	state.petIndex = nextIndex;
	state.pet = state.pets[nextIndex] || null;
}

export function setActivePetById(id) {
	const idx = state.pets.findIndex((pet) => pet && pet.id === id);
	setActivePetIndex(idx >= 0 ? idx : 0);
}

export function getMoney() {
	return typeof state.money === "number" && isFinite(state.money) ? state.money : 0;
}

export function setMoney(value) {
	state.money = Math.max(0, Math.floor(Number(value) || 0));
}

export function addMoney(amount) {
	setMoney(getMoney() + Math.floor(Number(amount) || 0));
}

export function spendMoney(amount) {
	const cost = Math.floor(Number(amount) || 0);
	if (getMoney() < cost) return false;
	setMoney(getMoney() - cost);
	return true;
}

export function getItemCount(itemId) {
	if (!state.inventory || typeof state.inventory !== "object") state.inventory = {};
	return Math.max(0, Math.floor(Number(state.inventory[itemId] || 0) || 0));
}

export function addItem(itemId, qty = 1) {
	const q = Math.floor(Number(qty) || 0);
	if (q <= 0) return;
	state.inventory[itemId] = getItemCount(itemId) + q;
}

export function useItem(itemId, qty = 1) {
	const q = Math.floor(Number(qty) || 0);
	if (q <= 0) return true;
	const have = getItemCount(itemId);
	if (have < q) return false;
	state.inventory[itemId] = have - q;
	return true;
}

export function logActivity(type, detail, extra = {}) {
	const pet = getCurrentPet();
	state.activityLog.push({
		type,
		detail,
		time: new Date().toISOString(),
		petName: pet ? pet.name : "Unknown",
		stats: pet ? { hunger: pet.hunger, fun: pet.fun, energy: pet.energy, clean: pet.clean } : null,
		...extra,
	});
}

export function getActivityLog() {
	return state.activityLog.slice();
}

export function clearActivityLog() {
	state.activityLog.length = 0;
}

initPetTemplates();
resetPets();
