import { CONSTANTS, getCurrentPet, initCanvas, state } from "./variables.js";
import { decayStats, initActionButtons } from "./actions.js";
import { drawPetSprite, updatePetPosition } from "./sprite.js";
import { updateUI } from "./ui.js";
import { initOverlays } from "./overlays.js";
import { loadGame, saveGame } from "./saveLoad.js";
import { initCoach } from "./coach.js";
import { initReports } from "./reports.js";
import { setAutosaveGuard, setAutosaveHandler, startAutosave } from "./settings.js";

const { NAME_OFFSET } = CONSTANTS;

// Resize canvas for pixelated content while keeping CSS sizing intact.
function resizeCanvasForDPR() {
	const { canvas, ctx } = state;
	if (!canvas || !ctx) return;
	const dpr = window.devicePixelRatio || 1;
	// Use the canvas CSS/display size as the base
	const rect = canvas.getBoundingClientRect();
	const displayWidth = Math.max(1, Math.floor(rect.width));
	const displayHeight = Math.max(1, Math.floor(rect.height));

	canvas.width = Math.floor(displayWidth * dpr);
	canvas.height = Math.floor(displayHeight * dpr);
	// Keep CSS size the same so layout doesn't change
	canvas.style.width = displayWidth + "px";
	canvas.style.height = displayHeight + "px";

	// Scale the drawing context so drawing coordinates stay in CSS pixels
	ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

	// Disable smoothing for pixel-art / crisp sprites
	ctx.imageSmoothingEnabled = false;
	try {
		ctx.imageSmoothingQuality = "low";
	} catch (e) {}
}

// Stat decay is started when the player begins the game
function startDecay() {
	if (state.decayIntervalId) return;
	state.decayIntervalId = setInterval(() => {
		if (isOverlayVisible()) return;
		decayStats();
	}, 1000);
}

function stopDecay() {
	if (state.decayIntervalId) {
		clearInterval(state.decayIntervalId);
		state.decayIntervalId = null;
	}
}

// Start gameplay systems only after the player leaves the home overlay.
function startGame() {
	startDecay();
	startAutosave();
}

function isOverlayVisible() {
	const overlayIds = [
		"homeOverlay",
		"newGameOverlay",
		"newGameConfirmOverlay",
		"settingsOverlay",
		"deleteSaveConfirmOverlay",
		"minigameOverlay",
		"tutorialOverlay",
		"instructionsOverlay",
		"petDeathOverlay",
	];
	return overlayIds.some((id) => {
		const el = document.getElementById(id);
		if (!el) return false;
		if (el.style.display === "none") return false;
		if (el.classList.contains("hidden")) return false;
		if (el.classList.contains("visible")) return true;
		return el.id === "homeOverlay";
	});
}

function draw() {
	const { ctx, canvas } = state;
	if (!ctx || !canvas) {
		requestAnimationFrame(draw);
		return;
	}

	ctx.clearRect(0, 0, canvas.width, canvas.height);
	ctx.fillStyle = "#333";
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	updatePetPosition();
	const pet = getCurrentPet();
	drawPetSprite(ctx, pet);

	// Display pet name above the pet with a horizontal offset depending on facing
	if (pet) {
		ctx.fillStyle = "white";
		ctx.font = "22px Arial";
		ctx.textAlign = "center";
		const nameOffsetX = state.petDirection === -1 ? -NAME_OFFSET : NAME_OFFSET;
		const nameX = state.petX + nameOffsetX;
		ctx.fillText(`${pet.name}`, nameX, state.petY - 75);
	}

	// Update HTML stats
	updateUI();

	requestAnimationFrame(draw);
}

// Boot sequence
initCanvas();
initActionButtons();
initOverlays({ startGame, stopDecay });
initCoach();
initReports();
setAutosaveHandler((silent) => saveGame(silent));
setAutosaveGuard(() => isOverlayVisible());

// Initial resize and on window resize
resizeCanvasForDPR();
window.addEventListener("resize", resizeCanvasForDPR);

const topBar = document.getElementById("topBar");
const gameOverlay = document.getElementById("gameOverlay");
function updateTopBarShadow() {
	if (!topBar || !gameOverlay) return;
	if (gameOverlay.scrollTop > 0) {
		topBar.classList.add("is-scrolled");
		return;
	}
	topBar.classList.remove("is-scrolled");
}
if (gameOverlay) {
	gameOverlay.addEventListener("scroll", updateTopBarShadow, { passive: true });
}
updateTopBarShadow();

// Attempt to auto-load a save silently on startup
loadGame(true);

requestAnimationFrame(draw);
