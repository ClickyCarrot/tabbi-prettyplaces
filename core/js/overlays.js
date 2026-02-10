import {
	PET_NAME_RULES,
	STORAGE_KEYS,
	getCurrentPet,
	setActivePetById,
	state,
} from "./variables.js";
import { buyItem, rewardMoney, resetPetDeathFlag, setPetDeathHandler } from "./actions.js";
import { loadGame, resetGame, saveGame } from "./saveLoad.js";
import {
	getSettings,
	resetSettings,
	setAutosaveEnabled,
	setAutosaveInterval,
	setAutosaveToasts,
	stopAutosave,
} from "./settings.js";
import { showToast, updateUI } from "./ui.js";

const { SAVE_KEY } = STORAGE_KEYS;

// Overlay + menu behavior
export function initOverlays({ startGame, stopDecay }) {
	function $(sel) {
		return document.querySelector(sel);
	}

	const overlay = $("#homeOverlay");
	const btnNewGame = $("#homeNewGame");
	const btnContinue = $("#homeContinue");
	const btnSettings = $("#homeSettings");
	const btnInstructions = $("#homeInstructions");
	const btnHelp = $("#btnHelp");
	const instructionsOverlay = $("#instructionsOverlay");
	const instructionsClose = $("#instructionsClose");
	const btnHome = document.getElementById("btnHome");
	const tutorialEnabledInput = document.getElementById("tutorialEnabled");
	const tutorialOverlay = document.getElementById("tutorialOverlay");
	const tutorialTitleEl = document.getElementById("tutorialTitle");
	const tutorialTextEl = document.getElementById("tutorialText");
	const tutorialHintEl = document.getElementById("tutorialHint");
	const tutorialBackBtn = document.getElementById("tutorialBack");
	const tutorialNextBtn = document.getElementById("tutorialNext");
	const tutorialSkipBtn = document.getElementById("tutorialSkip");

	let petDeathOverlay = document.getElementById("petDeathOverlay");
	if (!petDeathOverlay) {
		petDeathOverlay = document.createElement("div");
		petDeathOverlay.id = "petDeathOverlay";
		petDeathOverlay.className = "hidden";
		petDeathOverlay.style.display = "none";
		petDeathOverlay.innerHTML = `
			<div class="settingsCard" style="max-width: 420px; text-align: center">
				<h2>Game Over</h2>
				<p style="margin: 20px 0; color: #ddd">
					The cat died from neglect.
				</p>
				<div class="settingsActions" style="justify-content: center; gap: 15px">
					<button id="petDeathReturnBtn" style="background-color: #d9534f; color: white">
						Return to Menu
					</button>
				</div>
			</div>
		`;
		document.body.appendChild(petDeathOverlay);
	}

	function showHomeOverlay({ animate = false } = {}) {
		const home = document.getElementById("homeOverlay");
		if (!home) return;
		home.style.display = "flex";
		if (!animate) {
			home.classList.remove("hidden");
			return;
		}
		home.classList.add("hidden");
		requestAnimationFrame(() => home.classList.remove("hidden"));
	}

	function disableContinueButton() {
		const c = document.getElementById("homeContinue");
		if (c) {
			c.disabled = true;
			c.style.opacity = "0.5";
			c.style.cursor = "not-allowed";
			c.title = "No saved game found";
		}
	}

	function closeAllOverlaysExceptHome() {
		const ids = [
			"newGameOverlay",
			"newGameConfirmOverlay",
			"settingsOverlay",
			"deleteSaveConfirmOverlay",
			"minigameOverlay",
			"tutorialOverlay",
			"instructionsOverlay",
		];
		ids.forEach((id) => {
			const el = document.getElementById(id);
			if (!el) return;
			el.classList.remove("visible");
			el.style.display = "none";
		});
		clearTutorialFocus();
		tutorialActive = false;
	}

	const bottomPanelCards = document.querySelectorAll(".bottomPanelCard");
	const bottomPanelButtons = document.querySelectorAll(".bottomPanelTitle");

	function closeBottomPanels(exceptCard = null) {
		bottomPanelCards.forEach((card) => {
			if (card.closest(".settingsCard")) return;
			if (card === exceptCard) return;
			card.classList.remove("is-open");
			const button = card.querySelector(".bottomPanelTitle");
			if (button) button.setAttribute("aria-expanded", "false");
		});
	}

	bottomPanelButtons.forEach((button) => {
		button.addEventListener("click", (e) => {
			e.preventDefault();
			const card = button.closest(".bottomPanelCard");
			if (!card) return;
			const isSettingsCard = !!card.closest(".settingsCard");
			const isOpen = card.classList.contains("is-open");
			if (isOpen) {
				card.classList.remove("is-open");
				button.setAttribute("aria-expanded", "false");
				return;
			}
			if (!isSettingsCard) {
				closeBottomPanels(card);
			}
			card.classList.add("is-open");
			button.setAttribute("aria-expanded", "true");
		});
	});

	if (btnHome) {
		btnHome.addEventListener("click", (e) => {
			e.preventDefault();
			e.stopPropagation();
			closeAllOverlaysExceptHome();
			showHomeOverlay({ animate: true });
			if (btnContinue) {
				btnContinue.disabled = false;
				btnContinue.style.opacity = "";
				btnContinue.style.cursor = "";
				btnContinue.title = "";
			}
		});
	}

	const tutorialSteps = [
		{
			title: "Welcome to Tabbi",
			text: "Meet your pet! Keep them happy, healthy, and entertained as time passes.",
			hint: "Watch them wander across the room.",
			focusSelectors: "#canvasContainer",
		},
		{
			title: "Pet Stats",
			text: "Track Hunger, Fun, Energy, and Cleanliness on the left panel.",
			hint: "Lower stats need care actions soon.",
			focusSelectors: "#leftPanel",
		},
		{
			title: "Care Actions",
			text: "Feed, play, rest, and clean to keep your pet thriving.",
			hint: "Use these buttons often to avoid neglect.",
			focusSelectors: ['.bottomPanelTitle[data-panel="care"]', '[data-panel="care"]'],
			openPanel: "care",
		},
		{
			title: "Shop",
			text: "Buy food, toys, beds, and soap to keep supplies stocked.",
			hint: "Shopping costs money, so earn cash first.",
			focusSelectors: ['.bottomPanelTitle[data-panel="shop"]', '[data-panel="shop"]'],
			openPanel: "shop",
		},
		{
			title: "Inventory",
			text: "Check your current supplies before you shop again.",
			hint: "Empty? Time to earn and buy.",
			focusSelectors: ['.bottomPanelTitle[data-panel="inventory"]', '[data-panel="inventory"]'],
			openPanel: "inventory",
		},
		{
			title: "Minigames",
			text: "Play minigames to earn money quickly.",
			hint: "Try Click Challenge, Target Practice, Coin Catch, Flappy Flight, or Snake Sprint.",
			focusSelectors: ['.bottomPanelTitle[data-panel="minigames"]', '[data-panel="minigames"]'],
			openPanel: "minigames",
		},
		{
			title: "Menu & Settings",
			text: "Use the Menu button to return to the home screen and open Settings.",
			hint: "Settings lets you control autosave and reports.",
			focusSelectors: "#btnHome",
		},
		{
			title: "You're Ready!",
			text: "Keep an eye on stats, stock supplies, and play often.",
			hint: "Your pet depends on you.",
			focusSelectors: "#canvasContainer",
		},
	];

	let tutorialIndex = 0;
	let tutorialActive = false;

	function clearTutorialFocus() {
		document.querySelectorAll(".tutorialFocus").forEach((el) => {
			el.classList.remove("tutorialFocus");
		});
	}

	function applyTutorialFocus(selectors) {
		if (!selectors) return;
		const list = Array.isArray(selectors) ? selectors : [selectors];
		list.forEach((selector) => {
			const el = document.querySelector(selector);
			if (el) el.classList.add("tutorialFocus");
		});
	}

	function openBottomPanel(panelName) {
		if (!panelName) {
			closeBottomPanels();
			return;
		}
		const button = document.querySelector(`.bottomPanelTitle[data-panel="${panelName}"]`);
		const card = button ? button.closest(".bottomPanelCard") : null;
		if (!card || !button) return;
		closeBottomPanels(card);
		card.classList.add("is-open");
		button.setAttribute("aria-expanded", "true");
	}

	function showTutorialOverlay() {
		if (!tutorialOverlay) return;
		tutorialOverlay.style.display = "flex";
		requestAnimationFrame(() => tutorialOverlay.classList.add("visible"));
	}

	function hideTutorialOverlay() {
		if (!tutorialOverlay) return;
		tutorialOverlay.classList.remove("visible");
		setTimeout(() => {
			tutorialOverlay.style.display = "none";
		}, 320);
		clearTutorialFocus();
		closeBottomPanels();
		tutorialActive = false;
	}

	function applyTutorialStep(index) {
		const step = tutorialSteps[index];
		if (!step) {
			hideTutorialOverlay();
			return;
		}
		tutorialIndex = index;
		if (tutorialTitleEl) tutorialTitleEl.textContent = step.title;
		if (tutorialTextEl) tutorialTextEl.textContent = step.text;
		if (tutorialHintEl) tutorialHintEl.textContent = step.hint || "";
		if (tutorialBackBtn) {
			tutorialBackBtn.disabled = index === 0;
			tutorialBackBtn.dataset.clickable = index === 0 ? "false" : "true";
		}
		if (tutorialNextBtn) {
			tutorialNextBtn.textContent = index >= tutorialSteps.length - 1 ? "Finish" : "Next";
		}
		clearTutorialFocus();
		applyTutorialFocus(step.focusSelectors);
		if (step.openPanel) {
			openBottomPanel(step.openPanel);
		} else {
			closeBottomPanels();
		}
	}

	function startTutorial() {
		if (!tutorialOverlay || tutorialActive) return;
		tutorialActive = true;
		showTutorialOverlay();
		applyTutorialStep(0);
	}

	if (tutorialBackBtn) {
		tutorialBackBtn.onclick = function (e) {
			e.preventDefault();
			if (!tutorialActive) return;
			applyTutorialStep(Math.max(0, tutorialIndex - 1));
		};
	}

	if (tutorialNextBtn) {
		tutorialNextBtn.onclick = function (e) {
			e.preventDefault();
			if (!tutorialActive) return;
			if (tutorialIndex >= tutorialSteps.length - 1) {
				hideTutorialOverlay();
				return;
			}
			applyTutorialStep(tutorialIndex + 1);
		};
	}

	if (tutorialSkipBtn) {
		tutorialSkipBtn.onclick = function (e) {
			e.preventDefault();
			hideTutorialOverlay();
		};
	}

	function showInstructionsOverlay() {
		if (!instructionsOverlay) return;
		instructionsOverlay.style.display = "flex";
		requestAnimationFrame(() => instructionsOverlay.classList.add("visible"));
	}

	function hideInstructionsOverlay() {
		if (!instructionsOverlay) return;
		instructionsOverlay.classList.remove("visible");
		setTimeout(() => {
			instructionsOverlay.style.display = "none";
		}, 300);
	}

	if (btnInstructions) btnInstructions.onclick = showInstructionsOverlay;
	if (btnHelp) btnHelp.onclick = showInstructionsOverlay;
	if (instructionsClose) instructionsClose.onclick = hideInstructionsOverlay;

	function completeDeathAndReturnToMenu() {
		try {
			if (typeof stopDecay === "function") stopDecay();
		} catch (e) {}
		try {
			stopAutosave();
		} catch (e) {}

		try {
			if (petDeathOverlay) {
				petDeathOverlay.classList.remove("visible");
				setTimeout(() => {
					petDeathOverlay.style.display = "none";
				}, 300);
			}
		} catch (e) {}

		try {
			resetGame();
			resetPetDeathFlag();
		} catch (e) {}

		closeAllOverlaysExceptHome();
		showHomeOverlay();
		disableContinueButton();
	}

	function showPetDeathOverlay() {
		try {
			if (typeof stopDecay === "function") stopDecay();
		} catch (e) {}
		try {
			stopAutosave();
		} catch (e) {}

		const mg = document.getElementById("minigameOverlay");
		if (mg && mg.classList.contains("visible")) {
			try {
				const close = document.getElementById("closeMinigame");
				if (close) close.click();
			} catch (e) {}
		}

		if (!petDeathOverlay) return;
		petDeathOverlay.style.display = "flex";
		requestAnimationFrame(() => petDeathOverlay.classList.add("visible"));
	}

	setPetDeathHandler(showPetDeathOverlay);

	// Create new game confirmation overlay
	let newGameOverlay = document.getElementById("newGameConfirmOverlay");
	if (!newGameOverlay) {
		newGameOverlay = document.createElement("div");
		newGameOverlay.id = "newGameConfirmOverlay";
		newGameOverlay.className = "overlay";
		newGameOverlay.innerHTML = `
			<div class="modal">
				<h3>Start New Game?</h3>
				<p>This will delete your current progress. Are you sure?</p>
				<div class="button-group">
					<button id="confirmNewGameNo">Cancel</button>
					<button id="confirmNewGameYes" class="danger">New Game</button>
				</div>
			</div>
		`;
		document.body.appendChild(newGameOverlay);
	}

	// Show settings button (it always appears) — we'll open the Pet Management folder
	const newGamePetOverlay = document.getElementById("newGameOverlay");
	const previewCanvas = document.getElementById("previewCanvas");
	const newPetNameInput = document.getElementById("newPetName");
	const newPetNameError = document.getElementById("newPetNameError");
	const startGameBtn = document.getElementById("startGameBtn");
	const cancelNewGameBtn = document.getElementById("cancelNewGameBtn");
	const prevPetBtn = document.getElementById("prevPet");
	const nextPetBtn = document.getElementById("nextPet");

	let newGamePetIndex = 0;
	let newGamePreviewFrame = 0;
	let newGamePreviewLastUpdate = 0;
	let newGamePreviewRaf = 0;
	let newGamePetOverlayOpen = false;
	const newGameNameByPetId = {};
	const blockedPetNames = ["cat", "pet", "tabbi", "none", "null", "undefined"];

	function getTemplateAtIndex(index = newGamePetIndex) {
		return state.petTemplates[index] || null;
	}

	function sanitizePetName(raw) {
		return (raw || "").trim().replace(/\s+/g, " ");
	}

	// Syntactical checks use regex + length rules, semantic checks avoid duplicates and vague names.
	function validatePetName(name, currentId) {
		if (!name) {
			return { valid: false, message: "Name is required." };
		}
		if (name.length < PET_NAME_RULES.minLength) {
			return {
				valid: false,
				message: `Name must be at least ${PET_NAME_RULES.minLength} characters.`,
			};
		}
		if (name.length > PET_NAME_RULES.maxLength) {
			return {
				valid: false,
				message: `Name must be ${PET_NAME_RULES.maxLength} characters or less.`,
			};
		}
		if (!PET_NAME_RULES.pattern.test(name)) {
			return { valid: false, message: "Use letters, spaces, or hyphens only." };
		}
		const normalized = name.toLowerCase();
		if (blockedPetNames.includes(normalized)) {
			return { valid: false, message: "Choose a more specific name than that." };
		}
		const hasDuplicate = state.petTemplates.some((template) => {
			if (template.id === currentId) return false;
			const otherName =
				newGameNameByPetId[template.id] || template.defaultName || template.name || "";
			return otherName.toLowerCase() === normalized;
		});
		if (hasDuplicate) {
			return { valid: false, message: "Each pet needs a unique name." };
		}
		return { valid: true, message: "" };
	}

	function updateNameValidation() {
		if (!newPetNameInput) return { valid: false, name: "" };
		const template = getTemplateAtIndex();
		const name = sanitizePetName(newPetNameInput.value);
		if (newPetNameInput.value !== name) {
			newPetNameInput.value = name;
		}
		const result = validatePetName(name, template ? template.id : null);
		if (newPetNameError) {
			newPetNameError.textContent = result.message;
		}
		if (startGameBtn) {
			startGameBtn.disabled = !result.valid;
			startGameBtn.title = result.valid ? "" : result.message;
		}
		return { ...result, name };
	}

	function commitNewGamePetName({ allowInvalid = true } = {}) {
		if (!newPetNameInput) return { valid: false, name: "" };
		const template = getTemplateAtIndex();
		if (!template) return { valid: false, name: "" };
		const result = updateNameValidation();
		if (!result.valid && !allowInvalid) return result;
		newGameNameByPetId[template.id] = result.name || template.defaultName || template.name;
		return result;
	}

	function syncNewGamePetUI() {
		if (!newPetNameInput) return;
		if (!state.petTemplates.length) return;
		const t = getTemplateAtIndex();
		if (!t) return;
		if (newGameNameByPetId[t.id] == null) {
			newGameNameByPetId[t.id] = t.defaultName || t.name || "";
		}
		newPetNameInput.value = newGameNameByPetId[t.id] || "";
		newPetNameInput.placeholder = t.defaultName || "Pet Name";
		newGamePreviewFrame = 0;
		newGamePreviewLastUpdate = 0;
		updateNameValidation();
	}

	function drawNewGamePreviewFrame() {
		if (!newGamePetOverlayOpen) return;
		if (!previewCanvas) return;
		if (!state.petTemplates.length) return;
		const t = getTemplateAtIndex();
		if (!t || !t.sprite) return;

		const ctx2 = previewCanvas.getContext("2d");
		if (!ctx2) return;

		const spr = t.sprite;
		let img = null;
		let frameCount = 1;
		let frameSpeed = 6;
		if (spr.idleImage && (spr.idleLoaded || spr.idleImage.complete)) {
			img = spr.idleImage;
			frameCount = spr.idleFrameCount || spr.frameCount || 1;
			frameSpeed = spr.idleFrameSpeed || spr.frameSpeed || 6;
		} else {
			img = spr.image;
			frameCount = spr.frameCount || 1;
			frameSpeed = spr.frameSpeed || 6;
		}

		ctx2.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
		try {
			ctx2.imageSmoothingEnabled = false;
		} catch (e) {}

		if (!img || !img.complete) return;
		const now = Date.now();
		if (!newGamePreviewLastUpdate) newGamePreviewLastUpdate = now;
		if (now - newGamePreviewLastUpdate > 1000 / frameSpeed) {
			newGamePreviewFrame = (newGamePreviewFrame + 1) % frameCount;
			newGamePreviewLastUpdate = now;
		}

		const gap = spr.frameGap || 0;
		const startX = spr.startOffsetX || 0;
		const startY = spr.startOffsetY || 0;
		const sx = startX + newGamePreviewFrame * (spr.frameWidth + gap);
		const sy = startY;

		const scale = 4;
		const dw = Math.round(spr.frameWidth * scale);
		const dh = Math.round(spr.frameHeight * scale);
		const dx = Math.round((previewCanvas.width - dw) / 2);
		const dy = Math.round((previewCanvas.height - dh) / 2);

		try {
			ctx2.drawImage(img, sx, sy, spr.frameWidth, spr.frameHeight, dx, dy, dw, dh);
		} catch (e) {}
	}

	function startNewGamePreviewLoop() {
		if (newGamePreviewRaf) return;
		const loop = () => {
			if (!newGamePetOverlayOpen) {
				newGamePreviewRaf = 0;
				return;
			}
			drawNewGamePreviewFrame();
			newGamePreviewRaf = requestAnimationFrame(loop);
		};
		newGamePreviewRaf = requestAnimationFrame(loop);
	}

	function stopNewGamePreviewLoop() {
		if (newGamePreviewRaf) cancelAnimationFrame(newGamePreviewRaf);
		newGamePreviewRaf = 0;
	}

	function showNewGamePetOverlay() {
		if (!newGamePetOverlay) return;
		if (!state.petTemplates.length) return;
		newGamePetIndex = 0;
		newGamePetOverlayOpen = true;
		newGamePetOverlay.style.display = "flex";
		requestAnimationFrame(() => newGamePetOverlay.classList.add("visible"));
		syncNewGamePetUI();
		startNewGamePreviewLoop();
	}

	function hideNewGamePetOverlay() {
		if (!newGamePetOverlay) return;
		newGamePetOverlay.classList.remove("visible");
		newGamePetOverlayOpen = false;
		stopNewGamePreviewLoop();
		setTimeout(() => {
			newGamePetOverlay.style.display = "none";
		}, 300);
	}

	if (prevPetBtn) {
		prevPetBtn.onclick = function (e) {
			e.preventDefault();
			e.stopPropagation();
			if (!state.petTemplates.length) return;
			commitNewGamePetName();
			newGamePetIndex =
				(newGamePetIndex - 1 + state.petTemplates.length) % state.petTemplates.length;
			syncNewGamePetUI();
		};
	}

	if (nextPetBtn) {
		nextPetBtn.onclick = function (e) {
			e.preventDefault();
			e.stopPropagation();
			if (!state.petTemplates.length) return;
			commitNewGamePetName();
			newGamePetIndex = (newGamePetIndex + 1) % state.petTemplates.length;
			syncNewGamePetUI();
		};
	}

	if (newPetNameInput) {
		newPetNameInput.oninput = function () {
			commitNewGamePetName();
		};
	}

	if (cancelNewGameBtn) {
		cancelNewGameBtn.onclick = function (e) {
			e.preventDefault();
			e.stopPropagation();
			hideNewGamePetOverlay();
		};
	}

	if (startGameBtn) {
		startGameBtn.onclick = function (e) {
			e.preventDefault();
			e.stopPropagation();
			if (!state.petTemplates.length) return;
			const validation = commitNewGamePetName({ allowInvalid: false });
			if (!validation.valid) {
				showToast(validation.message || "Please enter a valid name.");
				return;
			}
			const shouldStartTutorial = Boolean(tutorialEnabledInput && tutorialEnabledInput.checked);
			resetGame();

			const t = getTemplateAtIndex();
			if (t) {
				setActivePetById(t.id);
				const activePet = getCurrentPet();
				if (activePet && validation.name) {
					activePet.name = validation.name;
				}
			}

			updateUI();
			hideNewGamePetOverlay();
			hideOverlayAndStart({
				onStart: () => {
					if (shouldStartTutorial) {
						startTutorial();
					}
				},
			});
		};
	}

	function hideOverlayAndStart({ onStart } = {}) {
		if (!overlay) return;
		overlay.classList.add("hidden");
		let started = false;
		const startOnce = function () {
			if (started) return;
			started = true;
			try {
				overlay.style.display = "none";
			} catch (e) {}
			try {
				if (typeof startGame === "function") startGame();
			} catch (e) {}
			if (typeof onStart === "function") {
				onStart();
			}
		};
		const onTransitionEnd = function (ev) {
			if (ev.propertyName !== "opacity") return;
			overlay.removeEventListener("transitionend", onTransitionEnd);
			startOnce();
		};
		overlay.addEventListener("transitionend", onTransitionEnd);
		setTimeout(startOnce, 650);
	}

	// Shop + Minigame UI
	const buyFoodBtn = document.getElementById("buyFood");
	const buyToyBtn = document.getElementById("buyToy");
	const buyBedBtn = document.getElementById("buyBed");
	const buySoapBtn = document.getElementById("buySoap");

	if (buyFoodBtn) buyFoodBtn.onclick = () => buyItem("food", 5, 1, "food");
	if (buyToyBtn) buyToyBtn.onclick = () => buyItem("toy", 10, 1, "toy");
	if (buyBedBtn) buyBedBtn.onclick = () => buyItem("bed", 15, 1, "bed");
	if (buySoapBtn) buySoapBtn.onclick = () => buyItem("soap", 8, 1, "soap");

	const minigameOverlay = document.getElementById("minigameOverlay");
	const openClickMinigameBtn = document.getElementById("btnClickMinigame");
	const openTargetMinigameBtn = document.getElementById("btnTargetMinigame");
	const openCatchMinigameBtn = document.getElementById("btnCatchMinigame");
	const openFlappyMinigameBtn = document.getElementById("btnFlappyMinigame");
	const openSnakeMinigameBtn = document.getElementById("btnSnakeMinigame");
	const startMinigameBtn = document.getElementById("startMinigame");
	const closeMinigameBtn = document.getElementById("closeMinigame");
	const minigameTitleEl = document.getElementById("minigameTitle");
	const minigameInfoEl = document.getElementById("minigameInfo");
	const hudLeftLabelEl = document.getElementById("minigameHudLeftLabel");
	const hudLeftValueEl = document.getElementById("minigameHudLeftValue");
	const hudRightLabelEl = document.getElementById("minigameHudRightLabel");
	const hudRightValueEl = document.getElementById("minigameHudRightValue");
	const minigameTargetBtn = document.getElementById("minigameTarget");
	const minigameCanvas = document.getElementById("minigameCanvas");

	let activeMinigame = null;
	let minigameTimer = null;
	let minigameRaf = 0;
	let minigameRunning = false;

	// Click Challenge
	let clickClicks = 0;
	let clickSeconds = 15;

	// Target Practice
	let targetHits = 0;
	let targetSeconds = 20;
	let targetX = 0;
	let targetY = 0;
	let targetR = 18;

	// Coin Catch
	let catchScore = 0;
	let catchSeconds = 20;
	let catchPlayerX = 0;
	let catchLeft = false;
	let catchRight = false;
	let catchCoins = [];
	let catchSpawnMs = 0;

	// Flappy Flight
	let flappyScore = 0;
	let flappySeconds = 60;
	let flappyBirdY = 0;
	let flappyBirdVelocity = 0;
	let flappyPipes = [];
	let flappySpawnMs = 0;

	// Snake Sprint
	let snakeScore = 0;
	let snakeSeconds = 60;
	let snakeSegments = [];
	let snakeDir = { x: 1, y: 0 };
	let snakeNextDir = { x: 1, y: 0 };
	let snakeFood = { x: 0, y: 0 };
	let snakeMoveMs = 150;
	let snakeAccumulator = 0;
	let snakeTurnQueued = false;

	function isMinigameVisible() {
		if (!minigameOverlay) return false;
		return (
			minigameOverlay.classList.contains("visible") && minigameOverlay.style.display !== "none"
		);
	}

	function setHud(leftLabel, leftValue, rightLabel, rightValue) {
		if (hudLeftLabelEl) hudLeftLabelEl.textContent = String(leftLabel || "");
		if (hudLeftValueEl) hudLeftValueEl.textContent = String(leftValue);
		if (hudRightLabelEl) hudRightLabelEl.textContent = String(rightLabel || "");
		if (hudRightValueEl) hudRightValueEl.textContent = String(rightValue);
	}

	function clearCanvas() {
		if (!minigameCanvas) return;
		const ctx = minigameCanvas.getContext("2d");
		if (!ctx) return;
		ctx.clearRect(0, 0, minigameCanvas.width, minigameCanvas.height);
	}

	function stopMinigame() {
		minigameRunning = false;
		if (minigameTimer) clearInterval(minigameTimer);
		minigameTimer = null;
		if (minigameRaf) cancelAnimationFrame(minigameRaf);
		minigameRaf = 0;
		catchLeft = false;
		catchRight = false;
	}

	function saveAfterMinigame() {
		try {
			saveGame(true);
		} catch (e) {}
	}

	function showMinigameOverlay(mode) {
		if (!minigameOverlay) return;
		setActiveMinigame(mode);
		minigameOverlay.style.display = "flex";
		requestAnimationFrame(() => minigameOverlay.classList.add("visible"));
	}

	function hideMinigameOverlay() {
		if (!minigameOverlay) return;
		minigameOverlay.classList.remove("visible");
		stopMinigame();
		activeMinigame = null;
		setTimeout(() => {
			minigameOverlay.style.display = "none";
		}, 320);
	}

	function randomRange(min, max) {
		return min + Math.random() * (max - min);
	}

	function resetFlappyState() {
		const height = minigameCanvas ? minigameCanvas.height : 360;
		flappyScore = 0;
		flappySeconds = 60;
		flappyBirdY = height * 0.45;
		flappyBirdVelocity = 0;
		flappyPipes = [];
		flappySpawnMs = 0;
		drawFlappyFrame.lastTs = 0;
	}

	function getSnakeGrid() {
		if (!minigameCanvas) {
			return { cell: 24, cols: 20, rows: 12, offsetX: 0, offsetY: 0 };
		}
		const cols = 24;
		const rows = 14;
		const cell = Math.max(
			18,
			Math.floor(Math.min(minigameCanvas.width / cols, minigameCanvas.height / rows)),
		);
		const gridWidth = cols * cell;
		const gridHeight = rows * cell;
		const offsetX = Math.floor((minigameCanvas.width - gridWidth) / 2);
		const offsetY = Math.floor((minigameCanvas.height - gridHeight) / 2);
		return { cell, cols, rows, offsetX, offsetY };
	}

	function spawnSnakeFood(grid = getSnakeGrid()) {
		const { cols, rows } = grid;
		let attempt = 0;
		let candidate = { x: 0, y: 0 };
		do {
			candidate = {
				x: Math.floor(Math.random() * cols),
				y: Math.floor(Math.random() * rows),
			};
			attempt += 1;
		} while (
			attempt < 120 &&
			snakeSegments.some((seg) => seg.x === candidate.x && seg.y === candidate.y)
		);
		snakeFood = candidate;
	}

	function resetSnakeState() {
		const grid = getSnakeGrid();
		const startX = Math.floor(grid.cols / 2);
		const startY = Math.floor(grid.rows / 2);
		snakeSegments = [
			{ x: startX, y: startY },
			{ x: startX - 1, y: startY },
			{ x: startX - 2, y: startY },
		];
		snakeDir = { x: 1, y: 0 };
		snakeNextDir = { x: 1, y: 0 };
		snakeAccumulator = 0;
		spawnSnakeFood(grid);
		drawSnakeFrame.lastTs = 0;
	}

	function queueSnakeDirection(x, y) {
		if (!minigameRunning || activeMinigame !== "snake") return;
		if (snakeTurnQueued) return;

		if (snakeDir.x === -x && snakeDir.y === -y) return;

		snakeNextDir = { x, y };
		snakeTurnQueued = true;
	}


	function flappyFlap() {
		if (!minigameRunning || activeMinigame !== "flappy") return;
		flappyBirdVelocity = -550;
	}

	function setActiveMinigame(mode) {
		stopMinigame();
		activeMinigame = mode;
		clearCanvas();
		if (minigameTargetBtn) minigameTargetBtn.style.display = "none";
		if (minigameCanvas) minigameCanvas.style.display = "none";

		if (mode === "click") {
			clickClicks = 0;
			clickSeconds = 15;
			if (minigameTitleEl) minigameTitleEl.textContent = "Click Challenge";
			if (minigameInfoEl)
				minigameInfoEl.textContent = "Click as fast as you can for 15 seconds. Earn $1 per click.";
			setHud("Time", clickSeconds + "s", "Clicks", clickClicks);
			if (minigameTargetBtn) minigameTargetBtn.style.display = "inline-flex";
			return;
		}

		if (mode === "target") {
			targetHits = 0;
			targetSeconds = 20;
			if (minigameTitleEl) minigameTitleEl.textContent = "Target Practice";
			if (minigameInfoEl)
				minigameInfoEl.textContent = "Click the target on the canvas. Earn $2 per hit.";
			setHud("Time", targetSeconds + "s", "Hits", targetHits);
			if (minigameCanvas) minigameCanvas.style.display = "block";
			spawnTarget();
			drawTargetFrame();
			return;
		}

		if (mode === "catch") {
			catchScore = 0;
			catchSeconds = 20;
			catchCoins = [];
			catchSpawnMs = 0;
			catchPlayerX = minigameCanvas ? minigameCanvas.width / 2 : 190;
			if (minigameTitleEl) minigameTitleEl.textContent = "Coin Catch";
			if (minigameInfoEl)
				minigameInfoEl.textContent =
					"Use A/D or Arrow Keys to move and catch coins. Earn $2 per coin.";
			setHud("Time", catchSeconds + "s", "Coins", catchScore);
			if (minigameCanvas) minigameCanvas.style.display = "block";
			drawCatchFrame.lastTs = 0;
			drawCatchFrame(0);
			return;
		}

		if (mode === "flappy") {
			resetFlappyState();
			if (minigameTitleEl) minigameTitleEl.textContent = "Flappy Flight";
			if (minigameInfoEl)
				minigameInfoEl.textContent =
					"Tap or press Space to fly. Dodge the pipes and earn $2 per gate.";
			setHud("Time", flappySeconds + "s", "Score", flappyScore);
			if (minigameCanvas) minigameCanvas.style.display = "block";
			drawFlappyFrame(0);
			return;
		}

		if (mode === "snake") {
			resetSnakeState();
			snakeScore = 0;
			snakeSeconds = 30;
			if (minigameTitleEl) minigameTitleEl.textContent = "Snake Sprint";
			if (minigameInfoEl)
				minigameInfoEl.textContent = "Use Arrow Keys or WASD to eat treats. Earn $2 per apple.";
			setHud("Time", snakeSeconds + "s", "Score", snakeScore);
			if (minigameCanvas) minigameCanvas.style.display = "block";
			drawSnakeFrame(0);
			return;
		}
	}

	function startActiveMinigame() {
		if (activeMinigame === "click") return startClickChallenge();
		if (activeMinigame === "target") return startTargetPractice();
		if (activeMinigame === "catch") return startCoinCatch();
		if (activeMinigame === "flappy") return startFlappyFlight();
		if (activeMinigame === "snake") return startSnakeSprint();
	}

	function startClickChallenge() {
		stopMinigame();
		clickClicks = 0;
		clickSeconds = 15;
		minigameRunning = true;
		setHud("Time", clickSeconds + "s", "Clicks", clickClicks);
		minigameTimer = setInterval(() => {
			clickSeconds -= 1;
			setHud("Time", Math.max(0, clickSeconds) + "s", "Clicks", clickClicks);
			if (clickSeconds <= 0) {
				stopMinigame();
				const reward = Math.max(0, Math.floor(clickClicks));
				rewardMoney(reward, "Click Challenge");
				saveAfterMinigame();
			}
		}, 1000);
	}

	function endFlappyFlight() {
		stopMinigame();
		const reward = Math.max(0, Math.floor(flappyScore * 2));
		rewardMoney(reward, "Flappy Flight");
		saveAfterMinigame();
	}

	function drawFlappyFrame(ts) {
		if (!minigameCanvas) return;
		const ctx = minigameCanvas.getContext("2d");
		if (!ctx) return;
		if (!drawFlappyFrame.lastTs) drawFlappyFrame.lastTs = ts;
		const dt = Math.min(50, ts - drawFlappyFrame.lastTs);
		drawFlappyFrame.lastTs = ts;
		const dtSec = dt / 1000;
		const w = minigameCanvas.width;
		const h = minigameCanvas.height;
		const birdX = w * 0.25;
		const birdR = Math.max(12, w * 0.02);
		const pipeWidth = Math.max(48, w * 0.07);
		const pipeGap = Math.max(160, h * 0.3);
		const speed = 210;
		const gravity = 1500;

		if (minigameRunning && activeMinigame === "flappy") {
			flappyBirdVelocity = Math.min(flappyBirdVelocity + gravity * dtSec, 620);
			flappyBirdY += flappyBirdVelocity * dtSec;
			flappySpawnMs += dt;
			if (flappySpawnMs > 1300) {
				flappySpawnMs = 0;
				const gapY = randomRange(70, Math.max(80, h - pipeGap - 70));
				flappyPipes.push({ x: w + pipeWidth, gapY, passed: false });
			}

			flappyPipes.forEach((pipe) => {
				pipe.x -= speed * dtSec;
			});
			flappyPipes = flappyPipes.filter((pipe) => pipe.x + pipeWidth > -20);

			for (let i = 0; i < flappyPipes.length; i += 1) {
				const pipe = flappyPipes[i];
				if (!pipe.passed && pipe.x + pipeWidth < birdX - birdR) {
					pipe.passed = true;
					flappyScore += 1;
					setHud("Time", Math.max(0, flappySeconds) + "s", "Score", flappyScore);
				}
				const inPipeRange = birdX + birdR > pipe.x && birdX - birdR < pipe.x + pipeWidth;
				const hitPipe =
					inPipeRange &&
					(flappyBirdY - birdR < pipe.gapY || flappyBirdY + birdR > pipe.gapY + pipeGap);
				if (hitPipe) {
					endFlappyFlight();
					break;
				}
			}

			if (minigameRunning) {
				if (flappyBirdY - birdR <= 0 || flappyBirdY + birdR >= h) {
					endFlappyFlight();
				}
			}
		}

		ctx.clearRect(0, 0, w, h);
		ctx.fillStyle = "rgba(0,0,0,0.15)";
		ctx.fillRect(0, 0, w, h);

		const capHeight = 16;
		const capInset = 4;

		flappyPipes.forEach((pipe) => {
			ctx.fillStyle = "rgba(70, 160, 90, 0.85)";
			ctx.fillRect(pipe.x, 0, pipeWidth, pipe.gapY);
			ctx.fillRect(pipe.x, pipe.gapY + pipeGap, pipeWidth, h - pipe.gapY - pipeGap);

			ctx.fillStyle = "rgba(29, 112, 51, 1)";
			ctx.fillRect(pipe.x - capInset, pipe.gapY + pipeGap, pipeWidth + capInset * 2, capHeight);
			ctx.fillRect(pipe.x - capInset, pipe.gapY - capHeight, pipeWidth + capInset * 2, capHeight);
		});

		ctx.fillStyle = "#f7c948";
		ctx.beginPath();
		ctx.arc(birdX, flappyBirdY, birdR, 0, Math.PI * 2);
		ctx.fill();
		ctx.strokeStyle = "rgba(0,0,0,0.35)";
		ctx.lineWidth = 2;
		ctx.stroke();

		if (activeMinigame === "flappy" && isMinigameVisible() && minigameRunning) {
			minigameRaf = requestAnimationFrame(drawFlappyFrame);
		}
	}

	function startFlappyFlight() {
		stopMinigame();
		resetFlappyState();
		minigameRunning = true;
		setHud("Time", flappySeconds + "s", "Score", flappyScore);
		minigameRaf = requestAnimationFrame(drawFlappyFrame);
		minigameTimer = setInterval(() => {
			flappySeconds -= 1;
			setHud("Time", Math.max(0, flappySeconds) + "s", "Score", flappyScore);
			if (flappySeconds <= 0) {
				endFlappyFlight();
			}
		}, 1000);
	}

	function endSnakeSprint() {
		stopMinigame();
		const reward = Math.max(0, Math.floor(snakeScore * 2));
		rewardMoney(reward, "Snake Sprint");
		saveAfterMinigame();
	}

	function advanceSnake(grid) {
		snakeDir = snakeNextDir;
		snakeTurnQueued = false;
		const head = snakeSegments[0];
		const next = { x: head.x + snakeDir.x, y: head.y + snakeDir.y };
		if (next.x < 0 || next.y < 0 || next.x >= grid.cols || next.y >= grid.rows) {
			return false;
		}
		if (snakeSegments.some((seg) => seg.x === next.x && seg.y === next.y)) {
			return false;
		}
		snakeSegments.unshift(next);
		if (next.x === snakeFood.x && next.y === snakeFood.y) {
			snakeScore += 1;
			spawnSnakeFood(grid);
		} else {
			snakeSegments.pop();
		}
		return true;
	}

	function drawSnakeFrame(ts) {
		if (!minigameCanvas) return;
		const ctx = minigameCanvas.getContext("2d");
		if (!ctx) return;
		if (!drawSnakeFrame.lastTs) drawSnakeFrame.lastTs = ts;
		const dt = Math.min(60, ts - drawSnakeFrame.lastTs);
		drawSnakeFrame.lastTs = ts;
		const grid = getSnakeGrid();
		const w = minigameCanvas.width;
		const h = minigameCanvas.height;

		if (minigameRunning && activeMinigame === "snake") {
			snakeAccumulator += dt;
			while (snakeAccumulator >= snakeMoveMs) {
				snakeAccumulator -= snakeMoveMs;
				if (!advanceSnake(grid)) {
					endSnakeSprint();
					break;
				}
				setHud("Time", Math.max(0, snakeSeconds) + "s", "Score", snakeScore);
			}
		}

		ctx.clearRect(0, 0, w, h);
		ctx.fillStyle = "rgba(0,0,0,0.15)";
		ctx.fillRect(0, 0, w, h);
		ctx.fillStyle = "rgba(0,0,0,0.25)";
		ctx.fillRect(grid.offsetX, grid.offsetY, grid.cols * grid.cell, grid.rows * grid.cell);

		const foodX = grid.offsetX + snakeFood.x * grid.cell + grid.cell / 2;
		const foodY = grid.offsetY + snakeFood.y * grid.cell + grid.cell / 2;
		ctx.fillStyle = "#f6c48b";
		ctx.beginPath();
		ctx.arc(foodX, foodY, grid.cell * 0.35, 0, Math.PI * 2);
		ctx.fill();
		ctx.lineWidth = 2;
		ctx.strokeStyle = "rgba(0,0,0,0.35)";
		ctx.stroke();

		snakeSegments.forEach((seg, index) => {
			const x = grid.offsetX + seg.x * grid.cell;
			const y = grid.offsetY + seg.y * grid.cell;
			ctx.fillStyle = index === 0 ? "#7ef28c" : "rgba(126, 242, 140, 0.85)";
			ctx.fillRect(x + 2, y + 2, grid.cell - 4, grid.cell - 4);
		});

		if (activeMinigame === "snake" && isMinigameVisible() && minigameRunning) {
			minigameRaf = requestAnimationFrame(drawSnakeFrame);
		}
	}

	function startSnakeSprint() {
		stopMinigame();
		snakeScore = 0;
		snakeSeconds = 60;
		resetSnakeState();
		minigameRunning = true;
		setHud("Time", snakeSeconds + "s", "Score", snakeScore);
		minigameRaf = requestAnimationFrame(drawSnakeFrame);
		minigameTimer = setInterval(() => {
			snakeSeconds -= 1;
			setHud("Time", Math.max(0, snakeSeconds) + "s", "Score", snakeScore);
			if (snakeSeconds <= 0) {
				endSnakeSprint();
			}
		}, 1000);
	}

	function spawnTarget() {
		if (!minigameCanvas) return;
		targetR = 18;
		targetX = randomRange(targetR + 8, minigameCanvas.width - targetR - 8);
		targetY = randomRange(targetR + 8, minigameCanvas.height - targetR - 8);
	}

	function drawTargetFrame() {
		if (!minigameCanvas) return;
		const ctx = minigameCanvas.getContext("2d");
		if (!ctx) return;
		ctx.clearRect(0, 0, minigameCanvas.width, minigameCanvas.height);
		ctx.fillStyle = "rgba(0,0,0,0.15)";
		ctx.fillRect(0, 0, minigameCanvas.width, minigameCanvas.height);

		ctx.beginPath();
		ctx.arc(targetX, targetY, targetR, 0, Math.PI * 2);
		ctx.fillStyle = "#ffa500";
		ctx.fill();
		ctx.lineWidth = 3;
		ctx.strokeStyle = "rgba(0,0,0,0.55)";
		ctx.stroke();

		ctx.beginPath();
		ctx.arc(targetX, targetY, Math.max(2, targetR - 8), 0, Math.PI * 2);
		ctx.fillStyle = "rgba(255,255,255,0.35)";
		ctx.fill();
		ctx.strokeStyle = "rgba(0,0,0,0.35)";
		ctx.stroke();

		if (activeMinigame === "target" && isMinigameVisible()) {
			minigameRaf = requestAnimationFrame(drawTargetFrame);
		}
	}

	function startTargetPractice() {
		stopMinigame();
		targetHits = 0;
		targetSeconds = 20;
		spawnTarget();
		minigameRunning = true;
		setHud("Time", targetSeconds + "s", "Hits", targetHits);
		drawTargetFrame();
		minigameTimer = setInterval(() => {
			targetSeconds -= 1;
			setHud("Time", Math.max(0, targetSeconds) + "s", "Hits", targetHits);
			if (targetSeconds <= 0) {
				stopMinigame();
				const reward = Math.max(0, Math.floor(targetHits * 2));
				rewardMoney(reward, "Target Practice");
				saveAfterMinigame();
			}
		}, 1000);
	}

	function drawCatchFrame(ts) {
		if (!minigameCanvas) return;
		const ctx = minigameCanvas.getContext("2d");
		if (!ctx) return;
		if (!drawCatchFrame.lastTs) drawCatchFrame.lastTs = ts;
		const dt = Math.min(50, ts - drawCatchFrame.lastTs);
		drawCatchFrame.lastTs = ts;

		ctx.clearRect(0, 0, minigameCanvas.width, minigameCanvas.height);
		ctx.fillStyle = "rgba(0,0,0,0.15)";
		ctx.fillRect(0, 0, minigameCanvas.width, minigameCanvas.height);

		const w = minigameCanvas.width;
		const h = minigameCanvas.height;
		const speed = 0.28 * dt;
		const playerW = 56;
		const playerH = 14;
		if (minigameRunning && activeMinigame === "catch") {
			if (catchLeft) catchPlayerX -= speed;
			if (catchRight) catchPlayerX += speed;
			catchPlayerX = Math.max(playerW / 2, Math.min(w - playerW / 2, catchPlayerX));

			catchSpawnMs += dt;
			if (catchSpawnMs > 520) {
				catchSpawnMs = 0;
				catchCoins.push({
					x: randomRange(12, w - 12),
					y: -10,
					vy: randomRange(0.07, 0.12) * h,
					r: 8,
				});
			}

			for (let i = catchCoins.length - 1; i >= 0; i -= 1) {
				const c = catchCoins[i];
				c.y += (c.vy * dt) / 1000;
				const basketTop = h - 24;
				const basketLeft = catchPlayerX - playerW / 2;
				const basketRight = catchPlayerX + playerW / 2;
				const caught =
					c.y + c.r >= basketTop &&
					c.y - c.r <= basketTop + playerH &&
					c.x >= basketLeft &&
					c.x <= basketRight;
				if (caught) {
					catchCoins.splice(i, 1);
					catchScore += 1;
					setHud("Time", Math.max(0, catchSeconds) + "s", "Coins", catchScore);
					continue;
				}
				if (c.y - c.r > h + 10) {
					catchCoins.splice(i, 1);
				}
			}
		}

		// Draw basket
		ctx.fillStyle = "rgba(255,255,255,0.65)";
		ctx.fillRect(catchPlayerX - playerW / 2, h - 24, playerW, playerH);
		ctx.fillStyle = "rgba(0,0,0,0.35)";
		ctx.fillRect(catchPlayerX - playerW / 2, h - 24 + playerH - 3, playerW, 3);

		// Draw coins
		for (let i = 0; i < catchCoins.length; i += 1) {
			const c = catchCoins[i];
			ctx.beginPath();
			ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
			ctx.fillStyle = "#ffa500";
			ctx.fill();
			ctx.lineWidth = 2;
			ctx.strokeStyle = "rgba(0,0,0,0.4)";
			ctx.stroke();
		}

		if (activeMinigame === "catch" && isMinigameVisible()) {
			minigameRaf = requestAnimationFrame(drawCatchFrame);
		}
	}

	function startCoinCatch() {
		stopMinigame();
		catchScore = 0;
		catchSeconds = 20;
		catchCoins = [];
		catchSpawnMs = 0;
		catchPlayerX = minigameCanvas ? minigameCanvas.width / 2 : 190;
		minigameRunning = true;
		setHud("Time", catchSeconds + "s", "Coins", catchScore);
		drawCatchFrame.lastTs = 0;
		minigameRaf = requestAnimationFrame(drawCatchFrame);
		minigameTimer = setInterval(() => {
			catchSeconds -= 1;
			setHud("Time", Math.max(0, catchSeconds) + "s", "Coins", catchScore);
			if (catchSeconds <= 0) {
				stopMinigame();
				const reward = Math.max(0, Math.floor(catchScore * 2));
				rewardMoney(reward, "Coin Catch");
				saveAfterMinigame();
			}
		}, 1000);
	}

	if (minigameTargetBtn)
		minigameTargetBtn.onclick = function () {
			if (!minigameRunning || activeMinigame !== "click") return;
			clickClicks += 1;
			setHud("Time", Math.max(0, clickSeconds) + "s", "Clicks", clickClicks);
		};

	if (minigameCanvas)
		minigameCanvas.addEventListener("pointerdown", function (ev) {
			if (!minigameRunning) return;
			if (activeMinigame === "flappy") {
				flappyFlap();
				return;
			}
			if (activeMinigame !== "target") return;
			const rect = minigameCanvas.getBoundingClientRect();
			const x = ((ev.clientX - rect.left) / rect.width) * minigameCanvas.width;
			const y = ((ev.clientY - rect.top) / rect.height) * minigameCanvas.height;
			const dx = x - targetX;
			const dy = y - targetY;
			if (dx * dx + dy * dy <= targetR * targetR) {
				targetHits += 1;
				spawnTarget();
				setHud("Time", Math.max(0, targetSeconds) + "s", "Hits", targetHits);
			}
		});

	window.addEventListener("keydown", function (ev) {
		if (!minigameRunning) return;
		if (!isMinigameVisible()) return;
		if (activeMinigame === "catch") {
			if (ev.key === "ArrowLeft" || ev.key === "a" || ev.key === "A") {
				catchLeft = true;
				ev.preventDefault();
			}
			if (ev.key === "ArrowRight" || ev.key === "d" || ev.key === "D") {
				catchRight = true;
				ev.preventDefault();
			}
			return;
		}
		if (activeMinigame === "flappy") {
			if (ev.repeat) return;

			if (
				ev.code === "Space" ||
				ev.key === " " ||
				ev.key === "ArrowUp" ||
				ev.key === "w" ||
				ev.key === "W"
			) {
				flappyFlap();
				ev.preventDefault();
			}
			return;
		}

		if (activeMinigame === "snake") {
			if (ev.key === "ArrowUp" || ev.key === "w" || ev.key === "W") {
				queueSnakeDirection(0, -1);
				ev.preventDefault();
			}
			if (ev.key === "ArrowDown" || ev.key === "s" || ev.key === "S") {
				queueSnakeDirection(0, 1);
				ev.preventDefault();
			}
			if (ev.key === "ArrowLeft" || ev.key === "a" || ev.key === "A") {
				queueSnakeDirection(-1, 0);
				ev.preventDefault();
			}
			if (ev.key === "ArrowRight" || ev.key === "d" || ev.key === "D") {
				queueSnakeDirection(1, 0);
				ev.preventDefault();
			}
		}
	});

	window.addEventListener("keyup", function (ev) {
		if (activeMinigame !== "catch") return;
		if (!isMinigameVisible()) return;
		if (ev.key === "ArrowLeft" || ev.key === "a" || ev.key === "A") {
			catchLeft = false;
			ev.preventDefault();
		}
		if (ev.key === "ArrowRight" || ev.key === "d" || ev.key === "D") {
			catchRight = false;
			ev.preventDefault();
		}
	});

	if (openClickMinigameBtn) openClickMinigameBtn.onclick = () => showMinigameOverlay("click");
	if (openTargetMinigameBtn) openTargetMinigameBtn.onclick = () => showMinigameOverlay("target");
	if (openCatchMinigameBtn) openCatchMinigameBtn.onclick = () => showMinigameOverlay("catch");
	if (openFlappyMinigameBtn) openFlappyMinigameBtn.onclick = () => showMinigameOverlay("flappy");
	if (openSnakeMinigameBtn) openSnakeMinigameBtn.onclick = () => showMinigameOverlay("snake");
	if (closeMinigameBtn) closeMinigameBtn.onclick = hideMinigameOverlay;
	if (startMinigameBtn) startMinigameBtn.onclick = startActiveMinigame;

	if (btnNewGame) {
		btnNewGame.onclick = function (e) {
			e.preventDefault();
			e.stopPropagation();

			const hasSave = localStorage.getItem(SAVE_KEY);
			if (hasSave) {
				// Show custom overlay
				const newGameOverlay = document.getElementById("newGameConfirmOverlay");
				if (newGameOverlay) {
					newGameOverlay.style.display = "flex";
					requestAnimationFrame(() => newGameOverlay.classList.add("visible"));
				}
			} else {
				// If no save file, start new game
				showNewGamePetOverlay();
			}
		};

		// Handle new game confirmation
		const confirmNewGameYes = $("#confirmNewGameYes");
		if (confirmNewGameYes) {
			confirmNewGameYes.onclick = function (e) {
				e.preventDefault();
				e.stopPropagation();

				// Hide the confirmation overlay with animation
				const overlay = document.getElementById("newGameConfirmOverlay");
				if (overlay) {
					overlay.classList.remove("visible");
					setTimeout(() => {
						overlay.style.display = "none";
						// Then reset game and start
						showNewGamePetOverlay();
					}, 300);
				}
			};
		}

		// Handle new game cancellation
		const confirmNewGameNo = $("#confirmNewGameNo");
		if (confirmNewGameNo) {
			confirmNewGameNo.onclick = function (e) {
				e.preventDefault();
				e.stopPropagation();

				// Hide the confirmation overlay with animation
				const overlay = document.getElementById("newGameConfirmOverlay");
				if (overlay) {
					overlay.classList.remove("visible");
					setTimeout(() => {
						overlay.style.display = "none";
					}, 300);
				}
			};
		}
	}

	if (btnContinue) {
		const hasSave = localStorage.getItem(SAVE_KEY);
		if (!hasSave) {
			btnContinue.disabled = true;
			btnContinue.style.opacity = "0.5";
			btnContinue.style.cursor = "not-allowed";
			btnContinue.title = "No saved game found";
		}

		btnContinue.addEventListener("click", function () {
			if (btnContinue.disabled) return;
			hideOverlayAndStart();
		});
	}

	window.addEventListener("keydown", function (ev) {
		if (ev.key !== "Escape") return;

		if (petDeathOverlay && petDeathOverlay.classList.contains("visible")) {
			ev.preventDefault();
			completeDeathAndReturnToMenu();
			return;
		}

		const deleteOverlay = document.getElementById("deleteSaveConfirmOverlay");
		if (deleteOverlay && deleteOverlay.classList.contains("visible")) {
			ev.preventDefault();
			deleteOverlay.classList.remove("visible");
			setTimeout(() => {
				deleteOverlay.style.display = "none";
			}, 300);
			return;
		}

		const newGameConfirmOverlay = document.getElementById("newGameConfirmOverlay");
		if (newGameConfirmOverlay && newGameConfirmOverlay.classList.contains("visible")) {
			ev.preventDefault();
			newGameConfirmOverlay.classList.remove("visible");
			setTimeout(() => {
				newGameConfirmOverlay.style.display = "none";
			}, 300);
			return;
		}

		if (minigameOverlay && minigameOverlay.classList.contains("visible")) {
			ev.preventDefault();
			hideMinigameOverlay();
			return;
		}

		if (tutorialOverlay && tutorialOverlay.classList.contains("visible")) {
			ev.preventDefault();
			hideTutorialOverlay();
			return;
		}

		if (instructionsOverlay && instructionsOverlay.classList.contains("visible")) {
			ev.preventDefault();
			hideInstructionsOverlay();
			return;
		}

		const settingsOverlay = document.getElementById("settingsOverlay");
		if (settingsOverlay && settingsOverlay.classList.contains("visible")) {
			ev.preventDefault();
			settingsOverlay.classList.remove("visible");
			setTimeout(() => {
				settingsOverlay.style.display = "none";
			}, 320);
			return;
		}

		if (newGamePetOverlay && newGamePetOverlay.classList.contains("visible")) {
			ev.preventDefault();
			hideNewGamePetOverlay();
			return;
		}

		if (overlay && !overlay.classList.contains("hidden") && overlay.style.display !== "none") {
			const hasSave = localStorage.getItem(SAVE_KEY);
			if (hasSave) {
				ev.preventDefault();
				hideOverlayAndStart();
			}
			return;
		}

		ev.preventDefault();
		closeAllOverlaysExceptHome();
		showHomeOverlay({ animate: true });
	});

	const petDeathReturnBtn = document.getElementById("petDeathReturnBtn");
	if (petDeathReturnBtn) {
		petDeathReturnBtn.onclick = function (e) {
			e.preventDefault();
			e.stopPropagation();
			completeDeathAndReturnToMenu();
		};
	}

	if (btnSettings)
		btnSettings.addEventListener("click", function () {
			// Show the settings overlay on top of the home overlay
			const settings = $("#settingsOverlay");
			if (!settings) return;
			settings.style.display = "flex";
			requestAnimationFrame(() => settings.classList.add("visible"));

			// Get all settings controls
			const settingsControls = {
				autosaveEnabled: $("#autosaveEnabled"),
				autosaveIntervalMs: $("#autosaveIntervalSeconds"),
				autosaveToasts: $("#autosaveToasts"),
			};

			// Settings configuration
			const settingsConfig = {
				autosaveEnabled: {
					element: settingsControls.autosaveEnabled,
					type: "checkbox",
					updateHandler: (value) => {
						setAutosaveEnabled(value);
					},
				},
				autosaveIntervalMs: {
					element: settingsControls.autosaveIntervalMs,
					type: "number",
					// Convert seconds to ms for storage
					preProcess: (value) => {
						const val = Math.max(1, Number(value) || 30);
						return Math.round(val * 1000);
					},
					// Convert ms to seconds for display
					formatForDisplay: (ms) => Math.round(ms / 1000),
					updateHandler: (value) => {
						setAutosaveInterval(value);
					},
				},
				autosaveToasts: {
					element: settingsControls.autosaveToasts,
					type: "checkbox",
					updateHandler: (value) => {
						setAutosaveToasts(value);
					},
				},
			};

			// Initialize settings when settings overlay is opened
			function initSettings() {
				const currentSettings = getSettings();

				Object.entries(settingsConfig).forEach(([key, config]) => {
					const element = config.element;
					if (!element) return;

					// Set initial value
					if (config.type === "checkbox") {
						element.checked = currentSettings[key] !== false;
					} else {
						const value =
							config.formatForDisplay ?
								config.formatForDisplay(currentSettings[key])
							:	currentSettings[key];
						element.value = value || "";
					}

					// Add change handler
					element.onchange = function () {
						let value = config.type === "checkbox" ? this.checked : this.value;
						if (config.preProcess) {
							value = config.preProcess(value);
						}
						config.updateHandler(value);
					};
				});
			}

			initSettings();

			// Wire the Reset button
			const resetBtn = $("#settingsReset");
			if (resetBtn) {
				resetBtn.onclick = function () {
					resetSettings();
					initSettings();
					showToast("Settings reset to defaults");
				};
			}

			// Wire the Export Save button
			const exportSaveBtn = $("#exportSaveBtn");
			if (exportSaveBtn) {
				exportSaveBtn.onclick = function () {
					const rawSave = localStorage.getItem(SAVE_KEY);
					if (!rawSave) {
						showToast("No save file found");
						return;
					}
					const now = new Date();
					const stamp = now.toISOString().replace(/T/, "_").replace(/:/g, "-").replace(/\..+/, "");
					const filename = `save_${stamp}.tabbi`;
					const blob = new Blob([rawSave], { type: "application/json" });
					const url = URL.createObjectURL(blob);
					const link = document.createElement("a");
					link.href = url;
					link.download = filename;
					document.body.appendChild(link);
					link.click();
					link.remove();
					setTimeout(() => URL.revokeObjectURL(url), 0);
					showToast("Save exported");
				};
			}

			// Wire the Import Save button
			const importSaveBtn = $("#importSaveBtn");
			const importSaveInput = $("#importSaveInput");
			if (importSaveBtn && importSaveInput) {
				importSaveBtn.onclick = function () {
					importSaveInput.click();
				};
				importSaveInput.onchange = function () {
					const file = importSaveInput.files ? importSaveInput.files[0] : null;
					if (!file) return;
					const reader = new FileReader();
					reader.onload = function () {
						const raw = typeof reader.result === "string" ? reader.result : "";
						let parsed;
						try {
							parsed = JSON.parse(raw);
						} catch (error) {
							showToast("Invalid save file");
							return;
						}
						if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.pets)) {
							showToast("Invalid save file");
							return;
						}
						localStorage.setItem(SAVE_KEY, JSON.stringify(parsed));
						const loaded = loadGame(true);
						if (!loaded) {
							showToast("Save import failed");
							return;
						}
						if (btnContinue) {
							btnContinue.disabled = false;
							btnContinue.style.opacity = "";
							btnContinue.style.cursor = "";
							btnContinue.title = "";
						}
						showToast("Save imported");
					};
					reader.onerror = function () {
						showToast("Failed to read save file");
					};
					reader.readAsText(file);
					importSaveInput.value = "";
				};
			}

			// Wire the Delete Save button
			const deleteSaveBtn = $("#deleteSaveBtn");
			if (deleteSaveBtn) {
				deleteSaveBtn.onclick = function () {
					// Check if there's a save to delete
					if (!localStorage.getItem(SAVE_KEY)) {
						showToast("No save file found");
						return;
					}

					const deleteOverlay = document.getElementById("deleteSaveConfirmOverlay");
					if (!deleteOverlay) return;

					// Show the delete confirmation overlay
					deleteOverlay.style.display = "flex";
					requestAnimationFrame(() => deleteOverlay.classList.add("visible"));
				};
			}

			// Wire the Delete Save Confirmation buttons
			const confirmDeleteYes = $("#confirmDeleteYes");
			if (confirmDeleteYes) {
				confirmDeleteYes.onclick = function () {
					// Clear the save data
					localStorage.removeItem(SAVE_KEY);

					// Reset the game state
					resetGame();

					// Hide the delete confirmation overlay and settings overlay
					const deleteOverlay = document.getElementById("deleteSaveConfirmOverlay");
					const settingsOverlay = document.getElementById("settingsOverlay");

					if (deleteOverlay) {
						deleteOverlay.classList.remove("visible");
						setTimeout(() => {
							deleteOverlay.style.display = "none";
						}, 300);
					}

					// Close settings overlay
					if (settingsOverlay) {
						settingsOverlay.classList.remove("visible");
						setTimeout(() => {
							settingsOverlay.style.display = "none";
						}, 300);
					}

					// Disable continue button
					disableContinueButton();

					// Show a confirmation message
					showToast("Save data deleted");
				};
			}

			const confirmDeleteNo = $("#confirmDeleteNo");
			if (confirmDeleteNo) {
				confirmDeleteNo.onclick = function () {
					const deleteOverlay = document.getElementById("deleteSaveConfirmOverlay");
					if (!deleteOverlay) return;

					deleteOverlay.classList.remove("visible");
					setTimeout(() => {
						deleteOverlay.style.display = "none";
					}, 300);
				};
			}

			// Wire the Back button inside settings to hide it
			const back = $("#settingsBack");
			if (back) {
				back.onclick = function () {
					settings.classList.remove("visible");
					const onEnd = function (ev) {
						if (ev.propertyName !== "opacity") return;
						settings.style.display = "none";
						settings.removeEventListener("transitionend", onEnd);
					};
					settings.addEventListener("transitionend", onEnd);
				};
			}
		});
}
