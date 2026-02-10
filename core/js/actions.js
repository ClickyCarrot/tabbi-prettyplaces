import {
	addItem,
	addMoney,
	getCurrentPet,
	logActivity,
	spendMoney,
	state,
	useItem,
} from "./variables.js";
import { showToast, updateUI } from "./ui.js";

const STAT_MIN = 0;
const STAT_MAX = 100;

let petDeathHandler = null;

function clampStat(value) {
	return Math.max(STAT_MIN, Math.min(STAT_MAX, Number(value) || 0));
}

function isPetDead(pet) {
	if (!pet) return false;
	return [pet.hunger, pet.fun, pet.energy, pet.clean].some((stat) => Number(stat) <= 0);
}

function handlePetDeathIfNeeded(pet) {
	if (!pet) return;
	if (state.petDeathTriggered) return;
	if (!isPetDead(pet)) return;

	state.petDeathTriggered = true;
	if (typeof petDeathHandler === "function") {
		petDeathHandler();
		return;
	}

	showToast("The cat died from neglect.");
}

function applyCareChange(pet, statKey, delta, itemId, itemLabel) {
	if (!pet) return false;
	if (!useItem(itemId, 1)) {
		showToast(`No ${itemLabel}. Buy some in the Shop.`);
		return false;
	}
	pet[statKey] = clampStat(pet[statKey] + delta);
	logActivity("care", `Used ${itemLabel} (+${delta} ${statKey})`, {
		statKey,
		delta,
	});
	updateUI();
	handlePetDeathIfNeeded(pet);
	return true;
}

export function setPetDeathHandler(handler) {
	petDeathHandler = handler;
}

export function resetPetDeathFlag() {
	state.petDeathTriggered = false;
}

export function feed() {
	const pet = getCurrentPet();
	applyCareChange(pet, "hunger", 10, "food", "food");
}

export function play() {
	const pet = getCurrentPet();
	applyCareChange(pet, "fun", 10, "toy", "toy");
}

export function rest() {
	const pet = getCurrentPet();
	applyCareChange(pet, "energy", 10, "bed", "bed");
}

export function cleanPet() {
	const pet = getCurrentPet();
	applyCareChange(pet, "clean", 10, "soap", "soap");
}

export function decayStats() {
	const pet = getCurrentPet();
	if (!pet) return;

	const decay = pet.decay || {};
	pet.hunger = clampStat(pet.hunger - (decay.hunger ?? 0.175));
	pet.fun = clampStat(pet.fun - (decay.fun ?? 0.2));
	pet.energy = clampStat(pet.energy - (decay.energy ?? 0.15));
	pet.clean = clampStat(pet.clean - (decay.clean ?? 0.1));

	updateUI();
	handlePetDeathIfNeeded(pet);
}

export function buyItem(itemId, cost, qty, label) {
	if (!spendMoney(cost)) {
		showToast("Not enough money");
		return false;
	}
	addItem(itemId, qty);
	logActivity("shop", `Bought ${label} (-$${cost})`, { itemId, qty, cost });
	showToast("Purchased!");
	updateUI();
	return true;
}

export function rewardMoney(amount, reason) {
	const reward = Math.max(0, Math.floor(Number(amount) || 0));
	if (reward <= 0) return;
	addMoney(reward);
	logActivity("minigame", `Earned $${reward} from ${reason}`, { reward, reason });
	showToast(`You earned $${reward}!`);
	updateUI();
}

export function initActionButtons() {
	const btnFeed = document.getElementById("btnFeed");
	if (btnFeed) btnFeed.onclick = feed;

	const btnPlay = document.getElementById("btnPlay");
	if (btnPlay) btnPlay.onclick = play;

	const btnRest = document.getElementById("btnRest");
	if (btnRest) btnRest.onclick = rest;

	const btnClean = document.getElementById("btnClean");
	if (btnClean) btnClean.onclick = cleanPet;
}
