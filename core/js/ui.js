import { getCurrentPet, getItemCount, getMoney } from "./variables.js";

const MAX_TOASTS = 3;
const TOAST_SHOW_TIME = 3000;
const activeToasts = [];

function clampStat(value) {
	return Math.max(0, Math.min(100, Number(value) || 0));
}

function createStatBar(label, value) {
	const v = clampStat(value);
	return `
		<div class="statBarRow">
			<div class="statBarOuter">
				<div class="statBarMask" style="width:${100 - v}%;"></div>
			</div>
			<div class="statRight">
				<span class="statLabel">${label}</span>
				<span class="statValue">${Math.round(v)}</span>
			</div>
		</div>
	`;
}

export function updateUI() {
	const pet = getCurrentPet();
	if (!pet) return;
	const moneyVal = getMoney();
	const foodCount = getItemCount("food");
	const toyCount = getItemCount("toy");
	const bedCount = getItemCount("bed");
	const soapCount = getItemCount("soap");

	const statsEl = document.getElementById("stats");
	if (statsEl) {
		statsEl.innerHTML = `
		<div class="statInfoRow">
			<div class="statInfoLeft"></div>
			<div class="statRight">
				<span class="statLabel">Money</span>
				<span class="statValue">$${moneyVal}</span>
			</div>
		</div>
		<div class="statInfoRow">
			<div class="statInfoLeft"></div>
			<div class="statRight">
				<span class="statLabel">Supplies</span>
				<span class="statValue statValueSmall">Food: ${foodCount} | Toy: ${toyCount} | Bed: ${bedCount} | Soap: ${soapCount}</span>
			</div>
		</div>
		${createStatBar("Hunger", pet.hunger)}
		${createStatBar("Fun", pet.fun)}
		${createStatBar("Energy", pet.energy)}
		${createStatBar("Cleanliness", pet.clean)}
		`;
	}

	const inventoryEl = document.getElementById("inventoryList");
	if (inventoryEl) {
		const hasAny = foodCount || toyCount || bedCount || soapCount;
		inventoryEl.innerHTML =
			hasAny ?
				`
			<div>Food: ${foodCount}</div>
			<div>Toy: ${toyCount}</div>
			<div>Bed: ${bedCount}</div>
			<div>Soap: ${soapCount}</div>
			`
			:	`<div style="color:#bbb">(empty)</div>`;
	}
}

export function showToast(message, type = "default") {
	const container = document.getElementById("toastContainer");
	if (!container) return;

	if (activeToasts.length >= MAX_TOASTS) {
		const oldestToast = activeToasts.shift();
		if (oldestToast && oldestToast.parentNode) {
			removeToast(oldestToast);
		}
	}

	const toast = document.createElement("div");
	toast.className = `toast toast-${type}`;
	toast.textContent = message;
	toast.dataset.type = type;

	Object.assign(toast.style, {
		position: "relative",
		opacity: "0",
		transform: "translateY(20px)",
		transition: "opacity 0.3s ease, transform 0.3s ease",
	});

	container.appendChild(toast);
	activeToasts.push(toast);
	updateToastPositions();
	void toast.offsetHeight;
	toast.style.opacity = "1";
	toast.style.transform = "translateY(0)";
	toast.classList.add("visible");

	setTimeout(() => {
		removeToast(toast);
	}, TOAST_SHOW_TIME);
}

function removeToast(toast) {
	if (!toast) return;
	toast.classList.add("fade-out");
	const index = activeToasts.indexOf(toast);
	if (index > -1) {
		activeToasts.splice(index, 1);
	}
	setTimeout(() => {
		if (toast.parentNode) {
			toast.parentNode.removeChild(toast);
		}
		updateToastPositions();
	}, 300);
}

function updateToastPositions() {
	const TOAST_HEIGHT = 60;
	activeToasts.forEach((toast, index) => {
		const offset = (activeToasts.length - 1 - index) * TOAST_HEIGHT;
		toast.style.transform = `translateY(-${offset}px)`;
	});
}
