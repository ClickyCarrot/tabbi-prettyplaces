import { CONSTANTS, getCurrentPet, state } from "./variables.js";

const { EDGE_MARGIN, IDLE_MAX_MS, IDLE_MIN_MS, SPRITE_SCALE } = CONSTANTS;

// Draw the pet sprite with idle/walk animation and crisp pixel scaling.
export function drawPetSprite(ctx = state.ctx, pet = getCurrentPet()) {
	if (!ctx || !pet) return;
	const spr = pet.sprite;

	// If image not loaded yet, skip drawing to avoid flicker.
	if (!spr || !spr.image || !spr.loaded) return;

	const now = Date.now();
	const isIdle = state.petState === "idle";
	if (!spr.lastUpdate) spr.lastUpdate = now;
	if (spr.lastState !== state.petState) {
		spr.currentFrame = 0;
		spr.lastUpdate = now;
		spr.lastState = state.petState;
	}

	const frameCount = isIdle ? spr.idleFrameCount || spr.frameCount : spr.frameCount;
	const frameSpeed = isIdle ? spr.idleFrameSpeed || spr.frameSpeed : spr.frameSpeed;
	if (now - spr.lastUpdate > 1000 / frameSpeed) {
		spr.currentFrame = (spr.currentFrame + 1) % frameCount;
		spr.lastUpdate = now;
	}

	const gap = spr.frameGap || 0;
	const startX = spr.startOffsetX || 0;
	const startY = spr.startOffsetY || 0;
	const sx = startX + spr.currentFrame * (spr.frameWidth + gap);
	const sy = startY;

	const dw = Math.round(spr.frameWidth * SPRITE_SCALE);
	const dh = Math.round(spr.frameHeight * SPRITE_SCALE);
	const dx = Math.round(state.petX - dw / 2);
	const dy = Math.round(state.petY - dh / 2);

	try {
		ctx.imageSmoothingEnabled = false;
	} catch (e) {}

	let img = spr.image;
	let needsFlip = false;
	if (isIdle && spr.idleLoaded) {
		img = spr.idleImage;
	}
	if (state.petDirection === -1) needsFlip = true;

	if (needsFlip) {
		ctx.save();
		ctx.translate(dx + dw, dy);
		ctx.scale(-1, 1);
		if (spr.frameWidth > 0 && spr.frameHeight > 0) {
			ctx.drawImage(img, sx, sy, spr.frameWidth, spr.frameHeight, 0, 0, dw, dh);
		}
		ctx.restore();
		return;
	}

	if (spr.frameWidth > 0 && spr.frameHeight > 0) {
		ctx.drawImage(img, sx, sy, spr.frameWidth, spr.frameHeight, dx, dy, dw, dh);
	}
}

// Update pet position and idle behavior so movement feels natural.
export function updatePetPosition() {
	const now = Date.now();
	const canvas = state.canvas;
	if (!canvas) return;

	if (state.petState === "idle") {
		if (now >= state.idleEndTime) {
			state.petDirection = state.nextDirection;
			state.petState = "walking";
		} else {
			return;
		}
	}

	state.walkCycle += 0.05;
	state.petX += state.petSpeed * state.petDirection;

	const canvasWidth = canvas.getBoundingClientRect().width;
	const currentPet = getCurrentPet();
	const halfSprite =
		currentPet && currentPet.sprite ? (currentPet.sprite.frameWidth * SPRITE_SCALE) / 2 : 50;
	const leftBound = halfSprite + EDGE_MARGIN;
	const rightBound = canvasWidth - halfSprite - EDGE_MARGIN;

	if (state.petX > rightBound) {
		state.petX = rightBound;
		state.nextDirection = -1;
		state.petState = "idle";
		state.idleEndTime =
			now + Math.floor(Math.random() * (IDLE_MAX_MS - IDLE_MIN_MS + 1)) + IDLE_MIN_MS;
	} else if (state.petX < leftBound) {
		state.petX = leftBound;
		state.nextDirection = 1;
		state.petState = "idle";
		state.idleEndTime =
			now + Math.floor(Math.random() * (IDLE_MAX_MS - IDLE_MIN_MS + 1)) + IDLE_MIN_MS;
	}
}
