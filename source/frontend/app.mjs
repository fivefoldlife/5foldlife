import {
  GIFT_ORDER,
  GIFTS,
  LIKERT_OPTIONS,
  QUESTIONS,
} from "./data.mjs";
import profileGuideData from "./assets/profile-guide.mjs";

const STORAGE_KEY = "fivefold-life-discovery/v1";
const RESOURCES_LABEL = "See All Designs";
const HISTORY_LABEL = "Previous Results";
const root = document.querySelector("#app");
let advanceTimerId = 0;
let profileGuide = profileGuideData;
let profileGuideIndex = buildProfileGuideIndex(profileGuide);
let guideLoadError = "";

const state = loadState();

root.addEventListener("click", handleClick);
render();

function loadState() {
  const emptyAnswers = Array(QUESTIONS.length).fill(null);

  try {
    const raw = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
    const answers = emptyAnswers.map((_, index) => {
      const value = Number(raw.answers?.[index]);
      return LIKERT_OPTIONS.some((option) => option.value === value) ? value : null;
    });
    const answeredCount = answers.filter((value) => value !== null).length;
    const complete = answeredCount === QUESTIONS.length;
    const currentQuestion = clamp(
      Number.isFinite(Number(raw.currentQuestion)) ? Number(raw.currentQuestion) : firstOpenQuestion(answers),
      0,
      QUESTIONS.length - 1
    );
    const selectedProfile = normalizeSelectedProfile(raw.selectedProfile);
    const resultHistory = normalizeResultHistory(raw.resultHistory);
    const selectedHistoryId = normalizeSelectedHistoryId(raw.selectedHistoryId, resultHistory);
    const savedResultKey = typeof raw.savedResultKey === "string" ? raw.savedResultKey : null;

    return {
      answers,
      currentQuestion: complete ? QUESTIONS.length - 1 : currentQuestion,
      screen: normalizeScreen(raw.screen, answeredCount, complete, selectedProfile, selectedHistoryId),
      selectedProfile,
      resultHistory,
      selectedHistoryId,
      savedResultKey,
    };
  } catch (error) {
    console.warn("Unable to restore saved discovery state.", error);
    return {
      answers: emptyAnswers,
      currentQuestion: 0,
      screen: "landing",
      selectedProfile: null,
      resultHistory: [],
      selectedHistoryId: null,
      savedResultKey: null,
    };
  }
}

function normalizeScreen(screen, answeredCount, complete, selectedProfile, selectedHistoryId) {
  if (screen === "resource-detail" && selectedProfile) {
    return "resource-detail";
  }

  if (screen === "history") {
    return "history";
  }

  if (screen === "history-detail" && selectedHistoryId) {
    return "history-detail";
  }

  if (screen === "resources") {
    return "resources";
  }

  if (complete) {
    return screen === "landing" ? "landing" : "results";
  }

  if (screen === "assessment" && answeredCount > 0) {
    return "assessment";
  }

  return "landing";
}

function persistState() {
  const payload = {
    answers: state.answers,
    currentQuestion: state.currentQuestion,
    screen: state.screen,
    selectedProfile: state.selectedProfile,
    resultHistory: state.resultHistory,
    selectedHistoryId: state.selectedHistoryId,
    savedResultKey: state.savedResultKey,
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function buildProfileGuideIndex(guide) {
  return Object.values(guide?.profiles || {}).reduce((index, entry) => {
    index[`${entry.primaryGift}:${entry.companionGift}`] = entry;
    return index;
  }, {});
}

function clearAssessment() {
  clearAdvanceTimer();
  state.answers = Array(QUESTIONS.length).fill(null);
  state.currentQuestion = 0;
  state.screen = "landing";
  state.selectedProfile = null;
  state.selectedHistoryId = null;
  state.savedResultKey = null;
  persistState();
  render();
  scrollToTop();
}

function firstOpenQuestion(answers = state.answers) {
  const index = answers.findIndex((value) => value === null);
  return index === -1 ? QUESTIONS.length - 1 : index;
}

function answeredCount() {
  return state.answers.filter((value) => value !== null).length;
}

function hasResults() {
  return answeredCount() === QUESTIONS.length;
}

function startDiscovery({ reset = false } = {}) {
  clearAdvanceTimer();

  if (reset) {
    state.answers = Array(QUESTIONS.length).fill(null);
    state.currentQuestion = 0;
  } else {
    state.currentQuestion = hasResults() ? 0 : firstOpenQuestion();
  }

  state.screen = "assessment";
  state.selectedProfile = null;
  state.selectedHistoryId = null;

  if (reset) {
    state.savedResultKey = null;
  }

  persistState();
  render();
  scrollToTop();
}

function showResults() {
  if (!hasResults()) {
    startDiscovery();
    return;
  }

  clearAdvanceTimer();
  ensureCurrentResultSaved();
  state.screen = "results";
  state.selectedProfile = null;
  state.selectedHistoryId = null;
  persistState();
  render();
  scrollToTop();
}

function showLanding() {
  clearAdvanceTimer();
  state.screen = "landing";
  state.selectedProfile = null;
  state.selectedHistoryId = null;
  persistState();
  render();
  scrollToTop();
}

function showResources() {
  clearAdvanceTimer();
  state.screen = "resources";
  state.selectedProfile = null;
  state.selectedHistoryId = null;
  persistState();
  render();
  scrollToTop();
}

function showHistory() {
  clearAdvanceTimer();

  if (hasResults()) {
    ensureCurrentResultSaved();
  }

  state.screen = "history";
  state.selectedProfile = null;
  state.selectedHistoryId = null;
  persistState();
  render();
  scrollToTop();
}

function showResourceDetail(profileSlug) {
  clearAdvanceTimer();

  if (!getProfileBySlug(profileSlug)) {
    showResources();
    return;
  }

  state.screen = "resource-detail";
  state.selectedProfile = profileSlug;
  state.selectedHistoryId = null;
  persistState();
  render();
  scrollToTop();
}

function showHistoryDetail(historyId) {
  clearAdvanceTimer();

  if (!getHistoryEntryById(historyId)) {
    showHistory();
    return;
  }

  state.screen = "history-detail";
  state.selectedProfile = null;
  state.selectedHistoryId = historyId;
  persistState();
  render();
  scrollToTop();
}

function goBack() {
  clearAdvanceTimer();

  if (state.currentQuestion === 0) {
    showLanding();
    return;
  }

  state.currentQuestion -= 1;
  persistState();
  render();
  scrollToTop();
}

function setAnswer(value) {
  clearAdvanceTimer();

  state.answers[state.currentQuestion] = value;
  persistState();
  render();

  const questionIndex = state.currentQuestion;
  advanceTimerId = window.setTimeout(() => {
    if (state.currentQuestion !== questionIndex) {
      return;
    }

    if (questionIndex >= QUESTIONS.length - 1) {
      ensureCurrentResultSaved();
      state.screen = "results";
    } else {
      state.currentQuestion = questionIndex + 1;
      state.screen = "assessment";
    }

    persistState();
    render();
  }, 35);
}

function clearAdvanceTimer() {
  if (advanceTimerId) {
    window.clearTimeout(advanceTimerId);
    advanceTimerId = 0;
  }
}

function scrollToTop() {
  window.requestAnimationFrame(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

function handleClick(event) {
  const button = event.target.closest("[data-action]");

  if (!button) {
    return;
  }

  const { action } = button.dataset;

  switch (action) {
    case "start":
      startDiscovery({ reset: button.dataset.reset === "true" });
      break;
    case "resume":
      startDiscovery();
      break;
    case "results":
      showResults();
      break;
    case "landing":
      showLanding();
      break;
    case "resources":
      showResources();
      break;
    case "history":
      showHistory();
      break;
    case "resource-detail":
      showResourceDetail(button.dataset.profile);
      break;
    case "history-detail":
      showHistoryDetail(button.dataset.historyId);
      break;
    case "reset":
      clearAssessment();
      break;
    case "back":
      goBack();
      break;
    case "answer":
      setAnswer(Number(button.dataset.value));
      break;
    default:
      break;
  }
}

function buildResults() {
  return buildResultsFromAnswers(state.answers);
}

function buildResultsFromAnswers(answers) {
  const totals = Object.fromEntries(GIFT_ORDER.map((gift) => [gift, 0]));
  const maxPerGift = QUESTIONS.filter((question) => question.gift === "apostle").length * 5;

  answers.forEach((value, index) => {
    if (value === null) {
      return;
    }

    totals[QUESTIONS[index].gift] += value;
  });

  const ranking = GIFT_ORDER.map((gift, order) => {
    const score = totals[gift];
    return {
      gift,
      score,
      percentage: Math.round((score / maxPerGift) * 100),
      order,
      meta: GIFTS[gift],
    };
  }).sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }

    return left.order - right.order;
  });

  const primary = ranking[0];
  const secondary = ranking[1];
  const conditional = ranking[2];
  const challenge = ranking[3];
  const counter = ranking[4];
  const profileKey = `${primary.gift}:${secondary.gift}`;
  const guideProfile = profileGuideIndex[profileKey] || null;
  const primaryMeta = GIFTS[primary.gift];

  return {
    profileName: guideProfile?.name || "Your 5 Fold Design",
    profileSummary:
      guideProfile?.summary ||
      `You carry a ${primaryMeta.adjective.toLowerCase()} core with a strong secondary expression that shapes how you lead, relate, and serve.`,
    primary,
    secondary,
    conditional,
    challenge,
    counter,
    ranking,
    guideProfile,
    answerKey: answersKey(answers),
  };
}

function ensureCurrentResultSaved() {
  if (!hasResults()) {
    return;
  }

  const results = buildResultsFromAnswers(state.answers);

  if (state.savedResultKey === results.answerKey) {
    return;
  }

  const entry = {
    id: `result-${Date.now()}`,
    savedAt: new Date().toISOString(),
    answerKey: results.answerKey,
    answers: [...state.answers],
    profileName: results.profileName,
    profileSummary: results.profileSummary,
    profileSlug: results.guideProfile ? slugify(results.guideProfile.name) : null,
    primaryGift: results.primary.gift,
    secondaryGift: results.secondary.gift,
  };

  state.resultHistory = [entry, ...state.resultHistory].slice(0, 24);
  state.savedResultKey = results.answerKey;
}

function render() {
  const results = hasResults() ? buildResults() : null;
  const markup = (() => {
    switch (state.screen) {
      case "assessment":
        return renderAssessment();
      case "history":
        return renderHistory();
      case "history-detail":
        return renderHistoryDetail(state.selectedHistoryId);
      case "resource-detail":
        return renderResourceDetail(state.selectedProfile, results);
      case "resources":
        return renderResources(results);
      case "results":
        return results ? renderResults(results) : renderLanding();
      case "landing":
      default:
        return renderLanding(results);
    }
  })();

  paint(markup);
}

function paint(markup) {
  const update = () => {
    root.innerHTML = markup;
  };

  if (
    typeof document.startViewTransition === "function" &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    document.startViewTransition(update);
    return;
  }

  update();
}

function renderLanding(results) {
  const progress = answeredCount();
  const hasProgress = progress > 0 && !hasResults();
  const ctaLabel = hasResults()
    ? "See Your Results"
    : hasProgress
      ? "Continue Discovery"
      : "Start Discovery";
  const ctaAction = hasResults() ? "results" : hasProgress ? "resume" : "start";

  return `
    <section class="screen screen-landing">
      ${renderBrandHeader({
        eyebrow: "5 Fold Life Discovery",
        actionLabel: hasProgress || hasResults() ? "Start Over" : "",
        action: hasProgress || hasResults() ? "reset" : "",
      })}
      <section class="landing-hero-grid">
        <section class="card card-hero">
          <p class="eyebrow">Spirit-led discovery</p>
          <h1>Discover the five-fold design that shapes how you build, discern, invite, nurture, and equip.</h1>
          <p class="hero-copy">Take a guided assessment, uncover your strongest expression, and explore a polished library of all 20 designs in one place.</p>
          <div class="hero-meta-row">
            <span>50 questions</span>
            <span>10-15 minutes</span>
            <span>20 full design references</span>
          </div>
          <div class="button-stack button-stack-inline">
            <button class="button button-accent" data-action="${ctaAction}">${ctaLabel}</button>
            <button class="button button-secondary" data-action="start" data-reset="true">Test Again</button>
          </div>
        </section>
        <section class="card card-hero-side">
          <div class="section-head">
            <h3>What you'll walk away with</h3>
            <p>A cleaner, more useful experience for learning how your design works in real life.</p>
          </div>
          <div class="highlight-list">
            <article class="highlight-item">
              <p class="card-kicker">Personal result</p>
              <h3>Your design in focus</h3>
              <p class="text-copy">See your top expression, your five-gift ordering, and the language that best names how you naturally show up.</p>
            </article>
            <article class="highlight-item">
              <p class="card-kicker">Healthy range</p>
              <h3>Fight, flow, and maturity</h3>
              <p class="text-copy">Review the contrast between unhealthy drift and Spirit-led expression, plus the seven levels of health.</p>
            </article>
            <article class="highlight-item">
              <p class="card-kicker">Reference library</p>
              <h3>All 20 designs</h3>
              <p class="text-copy">Jump straight into the full content library whenever you want to compare profiles or study the complete guide.</p>
            </article>
          </div>
        </section>
      </section>
      <section class="card card-traits">
        <div class="section-head">
          <h3>How the assessment reads your design</h3>
          <p>Each score is normalized into a percentage and mapped to your primary and secondary expression.</p>
        </div>
        <div class="trait-grid">
          ${GIFT_ORDER.map((gift) => renderTraitCard(gift)).join("")}
        </div>
      </section>
      ${
        results
          ? `
            <section class="card card-preview">
              <div class="section-head">
                <h3>Latest discovery</h3>
                <p>${escapeHtml(results.profileSummary)}</p>
              </div>
              <div class="pill-row">
                ${renderGiftPill(results.primary.gift, `${results.primary.meta.adjective} (Foundational)`, true)}
                ${renderGiftPill(results.secondary.gift, `${results.secondary.meta.adjective} (Secondary)`)}
              </div>
              ${renderMiniScores(results.ranking)}
              <button class="button button-secondary" data-action="results">View latest results</button>
            </section>
          `
          : ""
      }
    </section>
  `;
}

function renderResources(results) {
  const profiles = orderedGuideProfiles();

  return `
    <section class="screen screen-resources">
      ${renderBrandHeader({
        eyebrow: "5 Fold Life Resources",
        actionLabel: "Back Home",
        action: "landing",
      })}
      <div class="hero hero-resources">
        <p class="eyebrow">Reference library</p>
        <h1>Explore all 20 designs</h1>
        <p class="hero-copy">Use the full guide to compare profiles, review the seven levels of health, and study each design in one place.</p>
      </div>
      ${
        profileGuide
          ? `
            <section class="card card-resource-nav">
              <div class="section-head">
                <h3>Choose a design</h3>
                <p>Select any of the 20 designs to open its own dedicated page sourced from the updated master profiles document.</p>
              </div>
              <div class="jump-grid">
                ${profiles
                  .map(
                    (profile) => `
                      <button class="jump-link" data-action="resource-detail" data-profile="${slugify(profile.name)}">
                        <span class="jump-link-media">
                          <img src="${profileIconPath(profile)}" alt="" loading="lazy" decoding="async" />
                        </span>
                        <span class="jump-link-copy">
                          <span>${escapeHtml(profile.name)}</span>
                          <small>${escapeHtml(GIFTS[profile.primaryGift].label)} + ${escapeHtml(GIFTS[profile.companionGift].label)}</small>
                        </span>
                      </button>
                    `
                  )
                  .join("")}
              </div>
            </section>
          `
          : renderGuideStatusCard()
      }
    </section>
  `;
}

function renderResourceDetail(profileSlug, results) {
  const profile = getProfileBySlug(profileSlug);

  if (!profile) {
    return renderResources(results);
  }

  return `
    <section class="screen screen-resource-detail">
      ${renderBrandHeader({
        eyebrow: "5 Fold Life Design Library",
        actionLabel: RESOURCES_LABEL,
        action: "resources",
      })}
      <section class="hero hero-resources hero-detail-layout">
        <div class="hero-detail-copy">
          <p class="eyebrow">Design profile</p>
          <h1>${escapeHtml(profile.name)}</h1>
          <p class="hero-copy">${escapeHtml(profile.summary)}</p>
          <p class="hero-insight">${escapeHtml(buildBigFiveInsight(profile))}</p>
        </div>
        <figure class="detail-hero-art">
          <div class="detail-hero-art-shell">
            <img src="${profileIconPath(profile)}" alt="${escapeHtml(profile.name)} icon" loading="eager" decoding="async" />
          </div>
        </figure>
      </section>
      ${renderGuideProfileCard(profile, { standalone: true })}
      <div class="action-row">
        <button class="button button-secondary" data-action="resources">${RESOURCES_LABEL}</button>
        <button class="button button-secondary" data-action="landing">Back Home</button>
      </div>
    </section>
  `;
}

function renderHistory() {
  return `
    <section class="screen screen-history">
      ${renderBrandHeader({
        eyebrow: "5 Fold Life Results Archive",
        actionLabel: "Back Home",
        action: "landing",
      })}
      <div class="hero hero-resources">
        <p class="eyebrow">Saved discoveries</p>
        <h1>Previous results</h1>
        <p class="hero-copy">Review earlier assessment outcomes and reopen any design result you have already discovered.</p>
      </div>
      ${
        state.resultHistory.length
          ? `
            <section class="history-stack">
              ${state.resultHistory.map((entry) => renderHistoryCard(entry)).join("")}
            </section>
          `
          : `
            <section class="card">
              <div class="section-head">
                <h3>No saved results yet</h3>
                <p>Once someone completes the discovery, their result will appear here so they can revisit past outcomes anytime.</p>
              </div>
            </section>
          `
      }
    </section>
  `;
}

function renderHistoryCard(entry) {
  const primary = GIFTS[entry.primaryGift];
  const secondary = GIFTS[entry.secondaryGift];

  return `
    <article class="card history-card">
      <div class="history-card-top">
        <div class="section-head">
          <p class="card-kicker">${escapeHtml(formatResultDate(entry.savedAt))}</p>
          <h3>${escapeHtml(entry.profileName)}</h3>
          <p>${escapeHtml(entry.profileSummary)}</p>
        </div>
        ${
          entry.profileSlug
            ? `
              <span class="history-card-art">
                <img src="./assets/profile-icons/${profileIconFilename(entry.profileName)}" alt="${escapeHtml(entry.profileName)} icon" loading="lazy" decoding="async" />
              </span>
            `
            : ""
        }
      </div>
      <div class="pill-row">
        ${renderGiftPill(entry.primaryGift, `${primary.label} Core`, true)}
        ${renderGiftPill(entry.secondaryGift, `${secondary.label} Companion`)}
      </div>
      <div class="action-row">
        <button class="button button-secondary" data-action="history-detail" data-history-id="${entry.id}">Open Result</button>
      </div>
    </article>
  `;
}

function renderHistoryDetail(historyId) {
  const entry = getHistoryEntryById(historyId);

  if (!entry) {
    return renderHistory();
  }

  const results = buildResultsFromAnswers(entry.answers);
  return renderResults(results, { historic: true });
}

function renderAssessment() {
  const question = QUESTIONS[state.currentQuestion];
  const selected = state.answers[state.currentQuestion];
  const percent = Math.round(((state.currentQuestion + 1) / QUESTIONS.length) * 100);

  return `
    <section class="screen screen-assessment">
      ${renderBrandHeader({
        eyebrow: "5 Fold Life Discovery",
        actionLabel: "Save & Exit",
        action: "landing",
      })}
      <section class="card card-question">
        <p class="question-index">Spirit-led assessment</p>
        <h1>${escapeHtml(question.text)}</h1>
        <p class="question-copy">Choose the response that feels most natural to you right now.</p>
        <div class="choice-scale" aria-hidden="true">
          <span>1 · Not like me</span>
          <span>5 · Totally me</span>
        </div>
        <div class="choice-list" role="list">
          ${LIKERT_OPTIONS.map((option) => {
            const active = selected === option.value;
            return `
              <button
                class="choice-button ${active ? "is-selected" : ""}"
                data-action="answer"
                data-value="${option.value}"
                aria-label="${escapeHtml(`${option.value} - ${option.label}`)}"
                aria-pressed="${active ? "true" : "false"}"
              >
                <span class="choice-value">${option.shortLabel}</span>
              </button>
            `;
          }).join("")}
        </div>
        <div class="card-question-progress">
          <div class="progress-topline">
            <span>Question ${question.id} of ${QUESTIONS.length}</span>
            <span>${percent}%</span>
          </div>
          <div class="progress-track" aria-hidden="true">
            <div class="progress-fill" style="width:${percent}%"></div>
          </div>
        </div>
      </section>
      <div class="action-row">
        <button class="button button-secondary" data-action="back">Back</button>
        <span class="helper-copy">Selection saves automatically and advances to the next question.</span>
      </div>
    </section>
  `;
}

function renderResults(results, { historic = false } = {}) {
  return `
    <section class="screen screen-results">
      ${renderBrandHeader({
        eyebrow: historic ? "5 Fold Life Saved Result" : "5 Fold Life Results",
        actionLabel: historic ? HISTORY_LABEL : "Retake",
        action: historic ? "history" : "start",
        actionReset: historic ? "false" : "true",
      })}
      <div class="hero hero-results">
        <p class="eyebrow">${historic ? "Saved discovery" : "Your discovery is in"}</p>
        <h1>See Your Unique 5-Fold Design</h1>
        <p class="hero-copy">Understand the blend God placed in you and explore the full guide for how it shows up in real life.</p>
      </div>
      <section class="card card-spotlight">
        <div class="result-header">
          <div>
            <p class="card-kicker">Profile Name</p>
            <h2>${escapeHtml(results.profileName)}</h2>
            <p class="card-copy">${escapeHtml(results.profileSummary)}</p>
          </div>
          ${renderProfileEmblem(results)}
        </div>
        <div class="result-meta-row">
          <div class="pill-row">
            ${renderGiftPill(results.primary.gift, `${results.primary.meta.adjective} (Foundational)`, true)}
            ${renderGiftPill(results.secondary.gift, `${results.secondary.meta.adjective} (Secondary)`)}
          </div>
        </div>
        <div class="five-c-row">
          ${renderFiveC(results)}
        </div>
      </section>
      <section class="results-grid">
        <section class="card">
          <div class="section-head">
            <h3>Score Map</h3>
            <p>Primary and secondary expressions rise to the top, but every gift still carries weight in your design.</p>
          </div>
          <div class="score-stack">
            ${results.ranking.map((entry, index) => renderScoreRow(entry, index, results)).join("")}
          </div>
        </section>
        <section class="card">
          <div class="section-head">
            <h3>5C Snapshot</h3>
            <p>Your result orders all five natures by strength so you can see both your natural lane and your growth edges.</p>
          </div>
          <div class="five-c-row">
            ${renderFiveC(results)}
          </div>
        </section>
      </section>
      ${
        results.guideProfile
          ? renderGuideProfileCard(results.guideProfile)
          : renderGuideStatusCard()
      }
      <div class="action-row">
        <button class="button button-secondary" data-action="${historic ? "history" : "landing"}">${historic ? HISTORY_LABEL : "Back Home"}</button>
        <button class="button button-secondary" data-action="resources">${RESOURCES_LABEL}</button>
        ${
          historic
            ? hasResults()
              ? `<button class="button button-accent" data-action="results">Open Current Result</button>`
              : `<button class="button button-accent" data-action="start" data-reset="true">Start Discovery</button>`
            : `<button class="button button-accent" data-action="start" data-reset="true">Retake Discovery</button>`
        }
      </div>
    </section>
  `;
}

function renderBrandHeader({ eyebrow, actionLabel, action, actionReset = "false" }) {
  const progressAction = hasResults() ? "results" : answeredCount() > 0 ? "resume" : "start";
  const progressLabel = hasResults() ? "My Design" : answeredCount() > 0 ? "Continue" : "Discover";

  return `
    <header class="brand-header">
      <div class="brand-lockup">
        <img class="brand-logo" src="./assets/fivefold-wordmark-dark.png" alt="5 Fold Life" />
        <div>
          <p class="brand-eyebrow">${escapeHtml(eyebrow)}</p>
          <p class="brand-subtitle">Assessment + results</p>
        </div>
      </div>
      <div class="brand-controls">
        <nav class="menu-buttons" aria-label="Primary navigation">
          <button class="button button-menu ${state.screen === "landing" ? "is-active" : ""}" data-action="landing">Home</button>
          <button
            class="button button-menu ${state.screen === "assessment" || state.screen === "results" ? "is-active" : ""}"
            data-action="${progressAction}"
          >
            ${progressLabel}
          </button>
          <button class="button button-menu ${state.screen === "results" ? "is-active" : ""}" data-action="results">My Design</button>
          <button class="button button-menu ${state.screen === "resources" || state.screen === "resource-detail" ? "is-active" : ""}" data-action="resources">${RESOURCES_LABEL}</button>
          <button class="button button-menu ${state.screen === "history" || state.screen === "history-detail" ? "is-active" : ""}" data-action="history">${HISTORY_LABEL}</button>
        </nav>
        ${
          actionLabel
            ? `<button class="button button-ghost button-small" data-action="${action}" data-reset="${actionReset}">${actionLabel}</button>`
            : ""
        }
      </div>
    </header>
  `;
}

function renderTraitCard(gift) {
  const meta = GIFTS[gift];

  return `
    <article class="trait-card" style="--tone:${meta.accent}">
      <div class="trait-icon" style="--icon:url('${meta.icon}')"></div>
      <div>
        <p class="trait-label">${meta.label}</p>
        <p class="trait-copy">${meta.trait}</p>
      </div>
    </article>
  `;
}

function renderMiniScores(ranking) {
  return `
    <div class="mini-score-stack">
      ${ranking.map((entry, index) => {
        const tone =
          index === 0
            ? entry.meta.accent
            : index === 1
              ? mixHex(entry.meta.accent, "#FFFFFF", 0.22)
              : "#3D3D3D";
        return `
          <div class="mini-score-row">
            <span>${entry.meta.label}</span>
            <div class="mini-track">
              <div class="mini-fill" style="width:${entry.percentage}%;background:${tone};"></div>
            </div>
            <strong>${entry.percentage}%</strong>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderGiftPill(gift, label, solid = false) {
  const tone = GIFTS[gift].accent;
  const background = solid ? tone : mixHex(tone, "#FFFFFF", 0.82);
  const color = solid ? "#FFFFFF" : tone;

  return `
    <span class="gift-pill" style="background:${background};color:${color};">
      ${escapeHtml(label)}
    </span>
  `;
}

function renderProfileEmblem(results) {
  const primary = results.primary.meta;
  const secondary = results.secondary.meta;
  const initials = `${primary.label.charAt(0)}${secondary.label.charAt(0)}`;
  const primarySoft = mixHex(primary.accent, "#FFFFFF", 0.78);
  const secondarySoft = mixHex(secondary.accent, "#FFFFFF", 0.82);
  const iconPath = results.guideProfile ? profileIconPath(results.guideProfile) : "";
  const iconAlt = results.guideProfile ? `${results.guideProfile.name} icon` : "";
  const emblemClass = iconPath ? "result-emblem has-artwork" : "result-emblem";

  return `
    <figure
      class="${emblemClass}"
      style="--tone-a:${primary.accent};--tone-b:${secondary.accent};--tone-a-soft:${primarySoft};--tone-b-soft:${secondarySoft};"
    >
      <div class="result-emblem-shell">
        <div class="result-emblem-halo" aria-hidden="true"></div>
        <div class="result-emblem-center">
          ${
            iconPath
              ? `
                <img class="result-emblem-image" src="${iconPath}" alt="${escapeHtml(iconAlt)}" loading="eager" decoding="async" />
                <span class="result-emblem-kicker">${escapeHtml(results.guideProfile.name)}</span>
                <p>${escapeHtml(primary.label)} + ${escapeHtml(secondary.label)}</p>
              `
              : `
                <span class="result-emblem-kicker">Profile blend</span>
                <strong>${escapeHtml(initials)}</strong>
                <p>${escapeHtml(primary.label)} + ${escapeHtml(secondary.label)}</p>
              `
          }
        </div>
        <div class="result-emblem-orbit result-emblem-orbit-primary" aria-hidden="true">
          <span class="trait-icon" style="--tone:${primary.accent};--icon:url('${primary.icon}')"></span>
        </div>
        <div class="result-emblem-orbit result-emblem-orbit-secondary" aria-hidden="true">
          <span class="trait-icon" style="--tone:${secondary.accent};--icon:url('${secondary.icon}')"></span>
        </div>
      </div>
    </figure>
  `;
}

function renderGuideStatusCard() {
  const body = guideLoadError
    ? guideLoadError
    : "Loading the full design guide so each profile can display its complete description and seven health levels.";

  return `
    <section class="card">
      <div class="section-head">
        <h3>Full Design Guide</h3>
        <p>${escapeHtml(body)}</p>
      </div>
    </section>
  `;
}

function renderGuideProfileCard(profile, { standalone = false } = {}) {
  const primary = GIFTS[profile.primaryGift];
  const companion = GIFTS[profile.companionGift];
  const title = standalone ? profile.name : "Full Design Profile";
  const fullDesignProfile = [profile.designStory.freeIntroduction, profile.designStory.premiumExtension]
    .filter(Boolean)
    .join("\n\n");

  return `
    <article class="card card-guide" id="resource-${slugify(profile.name)}">
      <div class="section-head">
        <p class="card-kicker">${escapeHtml(profile.heading)}</p>
        <h3>${escapeHtml(title)}</h3>
      </div>
      <div class="pill-row">
        ${renderGiftPill(profile.primaryGift, `${primary.label} Core`, true)}
        ${renderGiftPill(profile.companionGift, `${companion.label} Companion`)}
      </div>
      <div class="guide-grid">
        <section class="guide-panel guide-panel-wide">
          <h4>Full Design Profile</h4>
          ${renderCopyParagraphs(fullDesignProfile)}
          ${renderGuideBulletBlock("Scripture foundations", profile.scriptureFoundations)}
          ${renderGuideBulletBlock("Biblical exemplars", profile.biblicalExemplars)}
          ${renderGuideBulletBlock("Conditional, challenge, and counter natures", profile.conditionalChallengeCounter)}
        </section>
        <section class="guide-panel guide-panel-wide">
          <h4>Fight & Flow</h4>
          <div class="guide-dual-grid">
            ${renderGuideBulletBlock("Flow", profile.fightFlow.flow)}
            ${renderGuideBulletBlock("Fight", profile.fightFlow.fight)}
          </div>
        </section>
        <section class="guide-panel guide-panel-wide">
          <h4>Seven Levels of Health</h4>
          <ol class="health-list">
            ${profile.healthLevels
              .map(
                (level) => `
                  <li>
                    <strong>Level ${level.level}</strong>
                    <p>${escapeHtml(normalizeCopy(level.text))}</p>
                  </li>
                `
              )
              .join("")}
          </ol>
        </section>
      </div>
    </article>
  `;
}

function renderGuideBulletBlock(label, items) {
  return `
    <div class="text-block">
      <p class="text-label">${escapeHtml(label)}</p>
      <ul class="guide-list">
        ${items
          .map(
            (item) => `
              <li>${escapeHtml(normalizeCopy(item))}</li>
            `
          )
          .join("")}
      </ul>
    </div>
  `;
}

function renderCopyParagraphs(text, className = "text-copy") {
  return paragraphsFromText(text)
    .map(
      (paragraph) => `
        <p class="${className}">${escapeHtml(paragraph)}</p>
      `
    )
    .join("");
}

function orderedGuideProfiles() {
  if (!profileGuide?.profiles) {
    return [];
  }

  return Object.values(profileGuide.profiles).sort((left, right) => {
    const primaryDelta = GIFT_ORDER.indexOf(left.primaryGift) - GIFT_ORDER.indexOf(right.primaryGift);

    if (primaryDelta !== 0) {
      return primaryDelta;
    }

    return GIFT_ORDER.indexOf(left.companionGift) - GIFT_ORDER.indexOf(right.companionGift);
  });
}

function getProfileBySlug(profileSlug) {
  return orderedGuideProfiles().find((profile) => slugify(profile.name) === profileSlug) || null;
}

function normalizeSelectedProfile(value) {
  const normalized = slugify(value || "");
  return normalized && getProfileBySlug(normalized) ? normalized : null;
}

function normalizeResultHistory(entries) {
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries
    .map((entry) => {
      const answers = Array.isArray(entry?.answers)
        ? entry.answers.map((value) => {
            const numeric = Number(value);
            return LIKERT_OPTIONS.some((option) => option.value === numeric) ? numeric : null;
          })
        : [];

      if (answers.length !== QUESTIONS.length || answers.some((value) => value === null)) {
        return null;
      }

      return {
        id: String(entry.id || `result-${Date.now()}`),
        savedAt: String(entry.savedAt || new Date().toISOString()),
        answerKey: String(entry.answerKey || answersKey(answers)),
        answers,
        profileName: String(entry.profileName || "Saved Result"),
        profileSummary: String(entry.profileSummary || ""),
        profileSlug: entry.profileSlug ? slugify(entry.profileSlug) : null,
        primaryGift: GIFTS[entry.primaryGift] ? entry.primaryGift : null,
        secondaryGift: GIFTS[entry.secondaryGift] ? entry.secondaryGift : null,
      };
    })
    .filter((entry) => entry && entry.primaryGift && entry.secondaryGift);
}

function normalizeSelectedHistoryId(value, resultHistory) {
  return resultHistory.some((entry) => entry.id === value) ? value : null;
}

function getHistoryEntryById(historyId) {
  return state.resultHistory.find((entry) => entry.id === historyId) || null;
}

function renderFiveC(results) {
  const map = [
    { label: "Core", entry: results.primary },
    { label: "Companion", entry: results.secondary },
    { label: "Conditional", entry: results.conditional },
    { label: "Challenge", entry: results.challenge },
    { label: "Counter", entry: results.counter },
  ];

  return map
    .map(
      ({ label, entry }) => `
        <div class="five-c-chip">
          <span>${label}</span>
          <strong style="color:${entry.meta.accent}">${entry.meta.label}</strong>
        </div>
      `
    )
    .join("");
}

function renderScoreRow(entry, index, results) {
  const variant =
    index === 0 ? "primary" : index === 1 ? "secondary" : "neutral";
  const tone =
    variant === "neutral"
      ? "#3D3D3D"
      : entry.meta.accent;
  const background =
    variant === "primary"
      ? tone
      : variant === "secondary"
        ? mixHex(tone, "#FFFFFF", 0.78)
        : "#E6E6E6";
  const labelColor = variant === "primary" ? "#FFFFFF" : tone;

  return `
    <div class="score-row">
      <div class="score-meta">
        <div class="score-label">
          <div class="trait-icon" style="--icon:url('${entry.meta.icon}');color:${tone}"></div>
          <div>
            <strong>${entry.meta.label}</strong>
            <span>${entry.meta.trait}</span>
          </div>
        </div>
        <span class="score-pill" style="background:${background};color:${labelColor};">${entry.percentage}%</span>
      </div>
      <div class="score-track ${variant}">
        <div class="score-fill" style="width:${entry.percentage}%;background:${tone};"></div>
      </div>
    </div>
  `;
}

function renderTextBlock(label, body) {
  return `
    <div class="text-block">
      <p class="text-label">${escapeHtml(label)}</p>
      ${renderCopyParagraphs(body)}
    </div>
  `;
}

function profileIconPath(profile) {
  return `./assets/profile-icons/${profileIconFilename(profile.name)}`;
}

function profileIconFilename(name) {
  const normalized = String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return `${normalized}_512.svg`;
}

function buildBigFiveInsight(profile) {
  const bridge = {
    apostle: {
      fivefold: "apostolic direction-setting",
      bigFive: "assertive Extraversion and Conscientiousness",
    },
    prophet: {
      fivefold: "prophetic discernment",
      bigFive: "high Openness with stronger emotional sensitivity",
    },
    evangelist: {
      fivefold: "evangelistic momentum",
      bigFive: "social Extraversion and outward energy",
    },
    pastor: {
      fivefold: "pastoral care",
      bigFive: "Agreeableness, warmth, and relational steadiness",
    },
    teacher: {
      fivefold: "teaching clarity",
      bigFive: "Intellect-driven Openness and structured Conscientiousness",
    },
  };

  const primary = bridge[profile.primaryGift];
  const companion = bridge[profile.companionGift];

  if (!primary || !companion) {
    return "Fivefold x Big Five insight: this design blends spiritual expression with a recognizable personality pattern that shapes how people think, relate, and respond.";
  }

  return `Fivefold x Big Five insight: this design leads with ${primary.fivefold}, so it often reads like ${primary.bigFive}; the ${companion.fivefold} companion adds ${companion.bigFive.toLowerCase()}.`;
}

function mixHex(colorA, colorB, amount) {
  const start = hexToRgb(colorA);
  const end = hexToRgb(colorB);

  const mix = {
    red: Math.round(start.red + (end.red - start.red) * amount),
    green: Math.round(start.green + (end.green - start.green) * amount),
    blue: Math.round(start.blue + (end.blue - start.blue) * amount),
  };

  return rgbToHex(mix.red, mix.green, mix.blue);
}

function hexToRgb(hex) {
  const normalized = hex.replace("#", "");
  const safe = normalized.length === 3
    ? normalized.split("").map((char) => `${char}${char}`).join("")
    : normalized;

  return {
    red: parseInt(safe.slice(0, 2), 16),
    green: parseInt(safe.slice(2, 4), 16),
    blue: parseInt(safe.slice(4, 6), 16),
  };
}

function rgbToHex(red, green, blue) {
  return `#${[red, green, blue]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")}`;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function paragraphsFromText(value) {
  return String(value || "")
    .split(/\n{2,}/)
    .map((paragraph) => normalizeCopy(paragraph))
    .filter(Boolean);
}

function normalizeCopy(value) {
  return String(value || "")
    .replace(/\s*\n\s*/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function answersKey(answers) {
  return answers.join("-");
}

function formatResultDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Saved result";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
