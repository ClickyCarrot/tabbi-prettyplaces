function createPet(id, name) {
	return {
		id: id,
		name: name,
		defaultName: name,
		type: "Cat",
		hunger: 100,
		fun: 100,
		energy: 100,
		clean: 100,

		decay: {
			hunger: 0.175, // relative decay speed: 2
			fun: 0.2,      // relative decay speed: 1
			energy: 0.15,  // relative decay speed: 3
			clean: 0.1,    // relative decay speed: 4
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

			// Idle animation
			idleSrc: `core/assets/sprites/cat${id}/idle.png`,
			idleImage: new Image(),
			idleLoaded: false,
			idleFrameCount: 10,
			idleFrameSpeed: 6,
		},
	};
}

// Add 6 all cats to templates
petTemplates.push(createPet(1, "Ginger"));
petTemplates.push(createPet(2, "Shadow"));
petTemplates.push(createPet(3, "Snowball"));
petTemplates.push(createPet(4, "Mittens"));
petTemplates.push(createPet(5, "Tiger"));
petTemplates.push(createPet(6, "Luna"));

// Initialize templates
petTemplates.forEach((p) => {
	p.sprite.image.onload = function () {
		p.sprite.loaded = true;
		p.sprite.currentFrame = 0;
	};
	p.sprite.image.src = p.sprite.src;

	p.sprite.idleImage.onload = function () {
		p.sprite.idleLoaded = true;
	};
	p.sprite.idleImage.src = p.sprite.idleSrc;
});

// Initialize runtime pets from templates
function getFreshPets() {
	return petTemplates.map((t) => {
		// Clone properties
		const p = Object.assign({}, t);
		// Clone nested objects
		p.decay = Object.assign({}, t.decay);
		p.sprite = Object.assign({}, t.sprite);

		p.sprite.image = new Image();
		p.sprite.image.src = t.sprite.src;
		p.sprite.image.onload = () => {
			p.sprite.loaded = true;
		};
		if (t.sprite.loaded) p.sprite.loaded = true;

		p.sprite.idleImage = new Image();
		p.sprite.idleImage.src = t.sprite.idleSrc;
		p.sprite.idleImage.onload = () => {
			p.sprite.idleLoaded = true;
		};
		if (t.sprite.idleLoaded) p.sprite.idleLoaded = true;

		return p;
	});
}

// Initial load
pets = getFreshPets();
pet = pets[0];

// Expose to window to ensure visibility across scripts
window.petTemplates = petTemplates;
window.getFreshPets = getFreshPets;

function getCurrentPet() {
	if (typeof petIndex === "number" && pets && pets[petIndex]) return pets[petIndex];
	return pets && pets[0] ? pets[0] : null;
}
window.getCurrentPet = getCurrentPet;
