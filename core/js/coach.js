import { getActivityLog, getCurrentPet, getLowestStat, logActivity } from "./variables.js";

const STAT_LABELS = {
	hunger: "Hunger",
	fun: "Fun",
	energy: "Energy",
	clean: "Cleanliness",
};

const CARE_ACTIONS = {
	hunger: "Feed",
	fun: "Play",
	energy: "Rest",
	clean: "Clean",
};

const TYPE_LABELS = {
	care: "Care",
	shop: "Shop",
	minigame: "Minigame",
	coach: "Coach",
	system: "System",
};

function cleanText(value) {
	return String(value ?? "")
		.replace(/\s+/g, " ")
		.trim();
}

function pickRandom(list) {
	return list[Math.floor(Math.random() * list.length)];
}

function shuffle(list) {
	const copy = list.slice();
	for (let i = copy.length - 1; i > 0; i -= 1) {
		const j = Math.floor(Math.random() * (i + 1));
		[copy[i], copy[j]] = [copy[j], copy[i]];
	}
	return copy;
}

function buildTypeOptions(correctType) {
	const types = Object.keys(TYPE_LABELS);
	const normalizedType = types.includes(correctType) ? correctType : "system";
	const choices = new Set([normalizedType]);
	while (choices.size < Math.min(4, types.length)) {
		choices.add(pickRandom(types));
	}
	return shuffle(Array.from(choices)).map((type) => ({
		label: TYPE_LABELS[type] || type,
		value: type,
		isCorrect: type === normalizedType,
	}));
}

function buildLowestStatQuestion(pet) {
	if (!pet) return null;
	const lowest = getLowestStat(pet);
	if (!lowest || !STAT_LABELS[lowest.key]) return null;
	const options = shuffle(Object.keys(STAT_LABELS))
		.slice(0, 4)
		.map((key) => ({
			label: STAT_LABELS[key],
			value: key,
			isCorrect: key === lowest.key,
		}));

	return {
		id: "lowest-stat",
		prompt: `Which stat needs the most attention for ${pet.name} right now?`,
		options,
		correctFeedback: `${STAT_LABELS[lowest.key]} is the lowest at ${Math.round(
			lowest.value,
		)}. Keep it balanced!`,
		incorrectFeedback: `Not quite. ${STAT_LABELS[lowest.key]} is the lowest, so help that one first.`,
	};
}

function buildCareActionQuestion(pet) {
	if (!pet) return null;
	const lowest = getLowestStat(pet);
	const targetKey = lowest?.key || "hunger";
	const options = shuffle(Object.keys(CARE_ACTIONS)).map((key) => ({
		label: CARE_ACTIONS[key],
		value: key,
		isCorrect: key === targetKey,
	}));

	return {
		id: "care-action",
		prompt: `If ${STAT_LABELS[targetKey]} is low, which care action helps the most?`,
		options,
		correctFeedback: `Yes! ${CARE_ACTIONS[targetKey]} raises ${STAT_LABELS[targetKey]}.`,
		incorrectFeedback: `Try ${CARE_ACTIONS[targetKey]} when ${STAT_LABELS[targetKey]} is low.`,
	};
}

function buildLastActionQuestion(activityLog) {
	const last = activityLog[activityLog.length - 1];
	if (!last) return null;
	const detail = cleanText(last.detail) || "a recent action";
	const correctType = typeof last.type === "string" ? last.type : "system";
	return {
		id: "last-action",
		prompt: `Your last logged action was "${detail}". Which category was it?`,
		options: buildTypeOptions(correctType),
		correctFeedback: `Right. That was a ${TYPE_LABELS[correctType] || correctType} action.`,
		incorrectFeedback: `That action counts as ${TYPE_LABELS[correctType] || correctType}.`,
	};
}

function buildRecentCategoryQuestion(activityLog) {
	const recent = activityLog.slice(-6);
	if (recent.length < 3) return null;
	const counts = {};
	recent.forEach((entry) => {
		if (!entry || !entry.type) return;
		counts[entry.type] = (counts[entry.type] || 0) + 1;
	});
	const types = Object.keys(counts);
	if (types.length < 2) return null;
	const topType = types.sort((a, b) => counts[b] - counts[a])[0];
	return {
		id: "recent-category",
		prompt: `In your last ${recent.length} actions, which category showed up the most?`,
		options: buildTypeOptions(topType),
		correctFeedback: `${TYPE_LABELS[topType] || topType} appeared ${counts[topType]} times recently.`,
		incorrectFeedback: `Look for the pattern: ${TYPE_LABELS[topType] || topType} showed up ${
			counts[topType]
		} times.`,
	};
}

function buildQuestion(pet, activityLog, lastQuestionId) {
	const candidates = [];
	if (activityLog.length) {
		const lastAction = buildLastActionQuestion(activityLog);
		if (lastAction) candidates.push(lastAction);
		const recentCategory = buildRecentCategoryQuestion(activityLog);
		if (recentCategory) candidates.push(recentCategory);
	}
	const lowestStat = buildLowestStatQuestion(pet);
	if (lowestStat) candidates.push(lowestStat);
	const careAction = buildCareActionQuestion(pet);
	if (careAction) candidates.push(careAction);
	if (!candidates.length) return null;
	let pick = pickRandom(candidates);
	if (candidates.length > 1 && pick.id === lastQuestionId) {
		pick = candidates.find((question) => question.id !== lastQuestionId) || pick;
	}
	return pick;
}

export function initCoach() {
	const questionEl = document.getElementById("coachQuestion");
	const optionsEl = document.getElementById("coachOptions");
	const nextBtn = document.getElementById("coachNext");
	const feedbackEl = document.getElementById("coachFeedback");
	if (!questionEl || !optionsEl || !nextBtn || !feedbackEl) return;

	let currentQuestion = null;
	let answered = false;
	let lastQuestionId = null;

	function setFeedback(message, state) {
		feedbackEl.textContent = message;
		if (state) {
			feedbackEl.dataset.state = state;
		} else {
			delete feedbackEl.dataset.state;
		}
	}

	function renderOptions(options) {
		optionsEl.innerHTML = "";
		options.forEach((option) => {
			const btn = document.createElement("button");
			btn.type = "button";
			btn.className = "coachOption";
			btn.textContent = option.label;
			btn.addEventListener("click", () => handleAnswer(option));
			optionsEl.appendChild(btn);
		});
	}

	function setQuestion(question) {
		currentQuestion = question;
		answered = false;
		lastQuestionId = question.id;
		questionEl.textContent = question.prompt;
		setFeedback("", "");
		renderOptions(question.options);
	}

	function handleAnswer(option) {
		if (!currentQuestion || answered) return;
		answered = true;
		const isCorrect = option.isCorrect === true;
		const message = isCorrect ? currentQuestion.correctFeedback : currentQuestion.incorrectFeedback;
		setFeedback(message, isCorrect ? "correct" : "incorrect");
		optionsEl.querySelectorAll("button").forEach((button) => {
			button.disabled = true;
			if (button.textContent === option.label) {
				button.classList.add(isCorrect ? "correct" : "incorrect");
			}
		});
		logActivity("coach", "Answered coach question", {
			prompt: currentQuestion.prompt,
			answer: option.label,
			correct: isCorrect,
		});
	}

	function newQuestion() {
		const pet = getCurrentPet();
		const activityLog = getActivityLog();
		const question = buildQuestion(pet, activityLog, lastQuestionId);
		if (!question) {
			questionEl.textContent = "Play with your pet to unlock coach questions.";
			optionsEl.innerHTML = "";
			setFeedback("Try feeding, playing, or shopping to build your activity log.", "");
			return;
		}
		setQuestion(question);
	}

	nextBtn.addEventListener("click", newQuestion);
}
