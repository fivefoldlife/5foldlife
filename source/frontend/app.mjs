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
window.addEventListener("keydown", handleKeydown);
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
    const historySort = normalizeHistorySort(raw.historySort);
    const compareHistoryIds = normalizeCompareHistoryIds(raw.compareHistoryIds, resultHistory);

    return {
      answers,
      currentQuestion: complete ? QUESTIONS.length - 1 : currentQuestion,
      screen: normalizeScreen(raw.screen, answeredCount, complete, selectedProfile, selectedHistoryId),
      selectedProfile,
      resultHistory,
      selectedHistoryId,
      savedResultKey,
      historySort,
      compareHistoryIds,
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
      historySort: "newest",
      compareHistoryIds: [],
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
    historySort: state.historySort,
    compareHistoryIds: state.compareHistoryIds,
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
  state.compareHistoryIds = [];
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
  state.compareHistoryIds = [];

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
  state.compareHistoryIds = [];
  persistState();
  render();
  scrollToTop();
}

function showMyDesign() {
  clearAdvanceTimer();

  if (hasResults()) {
    showResults();
    return;
  }

  const latestEntry = getLatestHistoryEntry();

  if (latestEntry) {
    state.screen = "history-detail";
    state.selectedProfile = null;
    state.selectedHistoryId = latestEntry.id;
    persistState();
    render();
    scrollToTop();
    return;
  }

  showHistory();
}

function showLanding() {
  clearAdvanceTimer();
  state.screen = "landing";
  state.selectedProfile = null;
  state.selectedHistoryId = null;
  state.compareHistoryIds = [];
  persistState();
  render();
  scrollToTop();
}

function showResources() {
  clearAdvanceTimer();
  state.screen = "resources";
  state.selectedProfile = null;
  state.selectedHistoryId = null;
  state.compareHistoryIds = [];
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
  state.compareHistoryIds = [];
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
  }, 10);
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
    case "my-design":
      showMyDesign();
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
    case "history-sort":
      setHistorySort(button.dataset.sort);
      break;
    case "toggle-compare":
      toggleHistoryCompare(button.dataset.historyId);
      break;
    case "clear-compare":
      clearHistoryCompare();
      break;
    case "jump":
      scrollToSection(button.dataset.target);
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

function handleKeydown(event) {
  if (state.screen !== "assessment") {
    return;
  }

  const target = event.target;

  if (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target.tagName))
  ) {
    return;
  }

  if (!["1", "2", "3", "4", "5"].includes(event.key)) {
    return;
  }

  event.preventDefault();
  setAnswer(Number(event.key));
}

function setHistorySort(value) {
  state.historySort = normalizeHistorySort(value);
  persistState();
  render();
}

function toggleHistoryCompare(historyId) {
  if (!getHistoryEntryById(historyId)) {
    return;
  }

  if (state.compareHistoryIds.includes(historyId)) {
    state.compareHistoryIds = state.compareHistoryIds.filter((id) => id !== historyId);
  } else {
    state.compareHistoryIds = [...state.compareHistoryIds, historyId].slice(-2);
  }

  persistState();
  render();
}

function clearHistoryCompare() {
  if (!state.compareHistoryIds.length) {
    return;
  }

  state.compareHistoryIds = [];
  persistState();
  render();
}

function scrollToSection(targetId) {
  if (!targetId) {
    return;
  }

  const target = document.getElementById(targetId);

  if (!target) {
    return;
  }

  target.scrollIntoView({ behavior: "smooth", block: "start" });
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

  paint(`${markup}${renderSiteFooter()}`);
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

function renderSiteFooter() {
  return `
    <footer class="site-footer">
      <p class="footer-note">Copyright 2025 5Fold Life LLC</p>
      <p class="footer-note">
        For more information, head to
        <a class="footer-link" href="https://www.fivefold.life" target="_blank" rel="noreferrer">www.fivefold.life</a>
      </p>
    </footer>
  `;
}

function renderLanding(results) {
  const progress = answeredCount();
  const latestEntry = getLatestHistoryEntry();

  return `
    <section class="screen screen-landing">
      ${renderBrandHeader()}
      <section class="landing-hero-grid">
        <section class="card card-hero">
          <p class="eyebrow">Companion assessment</p>
          <h1>Take the 5 Fold Life assessment with a simpler, saved-on-this-device workflow.</h1>
          <button class="button button-accent button-hero" data-action="start" data-reset="true">Start Discovery</button>
          <p class="hero-copy">Use this companion tool to move quickly through the test, reopen your latest design, and keep previous discoveries easy to reference.</p>
          <div class="hero-meta-row">
            <span>50 questions</span>
            <span>Auto-saves progress</span>
            <span>20 full design references</span>
          </div>
        </section>
        <section class="card card-hero-side">
          <div class="section-head">
            <h3>Built for quick access</h3>
            <p>This version is tuned for people who already know the framework and just want a clean way to take the test and revisit results.</p>
          </div>
          <div class="highlight-list">
            <article class="highlight-item">
              <p class="card-kicker">Quick finish</p>
              <h3>Fast, guided test flow</h3>
              <p class="text-copy">Move through the assessment with simple 1 to 5 taps, automatic progress saving, and immediate results.</p>
            </article>
            <article class="highlight-item">
              <p class="card-kicker">Personal dashboard</p>
              <h3>Return to your design</h3>
              <p class="text-copy">Open your current result, revisit earlier discoveries, and jump back in without losing your place.</p>
            </article>
            <article class="highlight-item">
              <p class="card-kicker">Reference library</p>
              <h3>All 20 designs</h3>
              <p class="text-copy">Compare the full design set anytime so the site works like a practical companion library, not just a one-time quiz.</p>
            </article>
          </div>
        </section>
      </section>
      ${renderLandingUtilityCard({ results, progress, latestEntry })}
    </section>
  `;
}

function renderResources(results) {
  const profiles = orderedGuideProfiles();

  return `
    <section class="screen screen-resources">
      ${renderBrandHeader()}
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
      ${renderBrandHeader()}
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
  const currentResults = hasResults() ? buildResults() : null;
  const entries = getSortedHistoryEntries();
  const compareEntries = state.compareHistoryIds
    .map((historyId) => getHistoryEntryById(historyId))
    .filter(Boolean);

  return `
    <section class="screen screen-history">
      ${renderBrandHeader()}
      <div class="hero hero-resources">
        <p class="eyebrow">Saved discoveries</p>
        <h1>Previous results</h1>
        <p class="hero-copy">Review earlier assessment outcomes and reopen any design result you have already discovered.</p>
      </div>
      ${
        currentResults
          ? renderUtilityCard({
              kicker: "Current design",
              title: currentResults.profileName,
              copy: "Your latest completed assessment is still available on this device, so you can jump straight back into it or start a fresh test.",
              meta: [
                formatSavedStatus(getCurrentSavedEntry()),
                `${currentResults.primary.meta.label} core`,
                `${currentResults.secondary.meta.label} companion`,
              ],
              actions: [
                { label: "Open My Design", action: "results", variant: "button-accent" },
                { label: "Start Fresh Test", action: "start", reset: "true", variant: "button-secondary" },
              ],
            })
          : ""
      }
      <section class="card card-history-toolbar">
        <div class="section-head">
          <h3>Browse saved results</h3>
          <p>Sort your history, pick up to two results to compare, and reopen any saved design when you need it.</p>
        </div>
        <div class="button-stack-inline toolbar-actions">
          ${renderHistorySortButton("Newest first", "newest")}
          ${renderHistorySortButton("Oldest first", "oldest")}
          ${renderHistorySortButton("Profile name", "profile")}
          ${
            compareEntries.length
              ? `<button class="button button-outline" data-action="clear-compare">Clear Compare</button>`
              : ""
          }
        </div>
      </section>
      ${compareEntries.length === 2 ? renderHistoryCompare(compareEntries) : ""}
      ${
        entries.length
          ? `
            <section class="history-stack">
              ${entries.map((entry) => renderHistoryCard(entry)).join("")}
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
  const isCompareSelected = state.compareHistoryIds.includes(entry.id);

  return `
    <article class="card history-card ${isCompareSelected ? "is-compare-selected" : ""}">
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
        ${
          entry.profileSlug
            ? `<button class="button button-outline" data-action="resource-detail" data-profile="${entry.profileSlug}">Open Design Page</button>`
            : ""
        }
        <button class="button ${isCompareSelected ? "button-accent" : "button-outline"}" data-action="toggle-compare" data-history-id="${entry.id}">
          ${isCompareSelected ? "Selected for Compare" : "Compare"}
        </button>
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
  const remaining = QUESTIONS.length - (state.currentQuestion + 1);

  return `
    <section class="screen screen-assessment">
      ${renderBrandHeader()}
      <section class="card card-question">
        <p class="question-index">Spirit-led assessment</p>
        <div class="meta-row assessment-status">
          <span>Question ${question.id} of ${QUESTIONS.length}</span>
          <span>${remaining} remaining</span>
          <span>Auto-saves on this device</span>
        </div>
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
        <button class="button button-secondary" data-action="landing">Save & Exit</button>
        <span class="helper-copy">Selection saves automatically, advances immediately, and also works with number keys 1 to 5.</span>
      </div>
    </section>
  `;
}

function renderResults(results, { historic = false } = {}) {
  const currentEntry = historic ? getHistoryEntryById(state.selectedHistoryId) : getCurrentSavedEntry();
  const resultPrefix = historic ? "saved-result" : "current-result";

  return `
    <section class="screen screen-results">
      ${renderBrandHeader()}
      <div class="hero hero-results">
        <p class="eyebrow">${historic ? "Saved discovery" : "Your discovery is in"}</p>
        <h1>See Your Unique 5-Fold Design</h1>
        <p class="hero-copy">Understand the blend God placed in you and explore the full guide for how it shows up in real life.</p>
      </div>
      ${renderUtilityCard({
        kicker: historic ? "Saved result" : "Current result",
        title: historic ? "Result tools" : "What would you like to do next?",
        copy: historic
          ? "This saved result stays available for reference, comparison, or reopening alongside your current design."
          : "Your result is saved on this device. You can compare all designs, revisit your archive, or start a fresh assessment anytime.",
        meta: [
          formatSavedStatus(currentEntry),
          `${results.primary.meta.label} core`,
          `${results.secondary.meta.label} companion`,
        ],
        actions: historic
          ? [
              ...(hasResults()
                ? [{ label: "Open Current Result", action: "results", variant: "button-accent" }]
                : [{ label: "Start Discovery", action: "start", reset: "true", variant: "button-accent" }]),
              { label: RESOURCES_LABEL, action: "resources", variant: "button-secondary" },
              { label: HISTORY_LABEL, action: "history", variant: "button-outline" },
            ]
          : [
              { label: RESOURCES_LABEL, action: "resources", variant: "button-secondary" },
              { label: HISTORY_LABEL, action: "history", variant: "button-outline" },
              { label: "Retake Discovery", action: "start", reset: "true", variant: "button-accent" },
            ],
      })}
      <section class="card card-anchor-nav">
        <div class="button-stack-inline anchor-actions">
          ${renderJumpButton("Overview", `${resultPrefix}-overview`)}
          ${renderJumpButton("Score Map", `${resultPrefix}-scores`)}
          ${renderJumpButton("5C Snapshot", `${resultPrefix}-five-c`)}
          ${renderJumpButton("Full Profile", `${resultPrefix}-profile`)}
          ${renderJumpButton("Health Levels", `${resultPrefix}-health`)}
        </div>
      </section>
      <section class="result-summary-grid">
        ${renderResultSummaryCard("Primary", results.primary.meta.label, `${results.primary.percentage}% match`, results.primary.meta.accent)}
        ${renderResultSummaryCard("Companion", results.secondary.meta.label, `${results.secondary.percentage}% match`, results.secondary.meta.accent)}
        ${renderResultSummaryCard("Conditional", results.conditional.meta.label, `${results.conditional.percentage}% match`, results.conditional.meta.accent)}
        ${renderResultSummaryCard("Saved", currentEntry ? formatResultDate(currentEntry.savedAt) : "This session", historic ? "Archive result" : "Current result", "#1a1a1a")}
      </section>
      <section class="card card-spotlight" id="${resultPrefix}-overview">
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
        <section class="card" id="${resultPrefix}-scores">
          <div class="section-head">
            <h3>Score Map</h3>
            <p>Primary and secondary expressions rise to the top, but every gift still carries weight in your design.</p>
          </div>
          <div class="score-stack">
            ${results.ranking.map((entry, index) => renderScoreRow(entry, index, results)).join("")}
          </div>
        </section>
        <section class="card" id="${resultPrefix}-five-c">
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
          ? renderGuideProfileCard(results.guideProfile, { sectionPrefix: resultPrefix })
          : renderGuideStatusCard()
      }
    </section>
  `;
}

function renderBrandHeader() {
  const hasPartialProgress = answeredCount() > 0 && !hasResults();
  const progressAction = hasPartialProgress ? "resume" : "start";
  const progressReset = hasResults() ? "true" : "false";
  const progressLabel = hasPartialProgress ? "Resume Test" : "Start Test";

  return `
    <header class="brand-header">
      <div class="brand-lockup">
        <img class="brand-logo" src="./assets/fivefold-wordmark-dark.png" alt="5 Fold Life" />
        <div>
          <p class="brand-eyebrow">5 Fold Life Discovery</p>
          <p class="brand-subtitle">Assessment + results</p>
        </div>
      </div>
      <div class="brand-controls">
        <nav class="menu-buttons" aria-label="Primary navigation">
          <button class="button button-menu ${state.screen === "landing" ? "is-active" : ""}" data-action="landing">Home</button>
          <button
            class="button button-menu ${state.screen === "assessment" ? "is-active" : ""}"
            data-action="${progressAction}"
            data-reset="${progressReset}"
          >
            ${progressLabel}
          </button>
          <button class="button button-menu ${state.screen === "results" || state.screen === "history-detail" ? "is-active" : ""}" data-action="my-design">My Design</button>
          <button class="button button-menu ${state.screen === "resources" || state.screen === "resource-detail" ? "is-active" : ""}" data-action="resources">${RESOURCES_LABEL}</button>
          <button class="button button-menu ${state.screen === "history" || state.screen === "history-detail" ? "is-active" : ""}" data-action="history">${HISTORY_LABEL}</button>
        </nav>
      </div>
    </header>
  `;
}

function renderHistorySortButton(label, value) {
  const variant = state.historySort === value ? "button-accent" : "button-outline";
  return `<button class="button ${variant}" data-action="history-sort" data-sort="${value}">${escapeHtml(label)}</button>`;
}

function renderHistoryCompare(entries) {
  const [left, right] = entries;
  const leftResults = buildResultsFromAnswers(left.answers);
  const rightResults = buildResultsFromAnswers(right.answers);

  return `
    <section class="card card-history-compare">
      <div class="section-head">
        <p class="card-kicker">Compare results</p>
        <h3>${escapeHtml(left.profileName)} vs ${escapeHtml(right.profileName)}</h3>
        <p>Compare the top gifts, saved dates, and overall profile language side by side before reopening either result in full.</p>
      </div>
      <div class="compare-grid">
        ${renderCompareColumn(left, leftResults)}
        ${renderCompareColumn(right, rightResults)}
      </div>
    </section>
  `;
}

function renderCompareColumn(entry, results) {
  return `
    <section class="compare-column">
      <p class="card-kicker">${escapeHtml(formatResultDate(entry.savedAt))}</p>
      <h3>${escapeHtml(entry.profileName)}</h3>
      <p class="text-copy">${escapeHtml(entry.profileSummary)}</p>
      <div class="pill-row">
        ${renderGiftPill(entry.primaryGift, `${results.primary.meta.label} core`, true)}
        ${renderGiftPill(entry.secondaryGift, `${results.secondary.meta.label} companion`)}
      </div>
      <div class="compare-stats">
        ${renderCompareStat("Primary", results.primary.meta.label)}
        ${renderCompareStat("Companion", results.secondary.meta.label)}
        ${renderCompareStat("Conditional", results.conditional.meta.label)}
      </div>
      <div class="button-stack-inline compare-actions">
        <button class="button button-secondary" data-action="history-detail" data-history-id="${entry.id}">Open Result</button>
        ${
          entry.profileSlug
            ? `<button class="button button-outline" data-action="resource-detail" data-profile="${entry.profileSlug}">Open Design Page</button>`
            : ""
        }
      </div>
    </section>
  `;
}

function renderCompareStat(label, value) {
  return `
    <div class="compare-stat">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `;
}

function renderJumpButton(label, targetId) {
  return `<button class="button button-outline" data-action="jump" data-target="${targetId}">${escapeHtml(label)}</button>`;
}

function renderResultSummaryCard(label, value, meta, accent) {
  return `
    <article class="card result-summary-card" style="--summary-accent:${accent};">
      <p class="card-kicker">${escapeHtml(label)}</p>
      <h3>${escapeHtml(value)}</h3>
      <p class="text-copy">${escapeHtml(meta)}</p>
    </article>
  `;
}

function renderLandingUtilityCard({ results, progress, latestEntry }) {
  if (progress > 0 && !hasResults()) {
    return renderUtilityCard({
      kicker: "Continue later",
      title: `Resume from question ${state.currentQuestion + 1}`,
      copy: "Your partial assessment is already saved on this device, so you can jump back in right where you stopped.",
      meta: [`${progress} of ${QUESTIONS.length} answered`, `${QUESTIONS.length - progress} left`, "Auto-saves on this device"],
      actions: [
        { label: "Continue Test", action: "resume", variant: "button-accent" },
        { label: "Start Over", action: "reset", variant: "button-secondary" },
        ...(state.resultHistory.length ? [{ label: HISTORY_LABEL, action: "history", variant: "button-outline" }] : []),
      ],
    });
  }

  if (results) {
    return renderUtilityCard({
      kicker: "Quick access",
      title: `${results.profileName} is ready`,
      copy: "Open your current design, compare it with the full library, or review your saved results archive anytime.",
      meta: [
        formatSavedStatus(getCurrentSavedEntry()),
        `${results.primary.meta.label} core`,
        `${results.secondary.meta.label} companion`,
      ],
      actions: [
        { label: "Open My Design", action: "results", variant: "button-accent" },
        { label: RESOURCES_LABEL, action: "resources", variant: "button-secondary" },
        { label: HISTORY_LABEL, action: "history", variant: "button-outline" },
      ],
    });
  }

  if (latestEntry) {
    return renderUtilityCard({
      kicker: "Saved on this device",
      title: "Jump back into your latest design",
      copy: "Your earlier discoveries are still available here, so you do not need to retake the assessment just to review past results.",
      meta: [formatSavedStatus(latestEntry), latestEntry.profileName, "Previous results stay easy to reopen"],
      actions: [
        { label: "Open My Design", action: "my-design", variant: "button-accent" },
        { label: "Start Discovery", action: "start", reset: "true", variant: "button-secondary" },
        { label: HISTORY_LABEL, action: "history", variant: "button-outline" },
      ],
    });
  }

  return renderUtilityCard({
    kicker: "Use this companion tool",
    title: "Simple test, simple results access",
    copy: "Start the assessment, save progress on this device, and use the design library as a quick companion reference whenever you need it.",
    meta: ["50 guided questions", "Instant personal result", "20 design reference pages"],
    actions: [
      { label: "Start Discovery", action: "start", reset: "true", variant: "button-accent" },
      { label: RESOURCES_LABEL, action: "resources", variant: "button-outline" },
    ],
  });
}

function renderUtilityCard({ kicker, title, copy, meta = [], actions = [] }) {
  return `
    <section class="card card-utility">
      <div class="section-head">
        <p class="card-kicker">${escapeHtml(kicker)}</p>
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(copy)}</p>
      </div>
      ${
        meta.length
          ? `
            <div class="meta-row utility-meta-row">
              ${meta
                .map(
                  (item) => `
                    <span>${escapeHtml(item)}</span>
                  `
                )
                .join("")}
            </div>
          `
          : ""
      }
      ${
        actions.length
          ? `
            <div class="button-stack-inline utility-actions">
              ${actions.map((action) => renderUtilityAction(action)).join("")}
            </div>
          `
          : ""
      }
    </section>
  `;
}

function renderUtilityAction({ label, action, variant = "button-secondary", reset = "false", historyId = "", profile = "" }) {
  const historyAttr = historyId ? ` data-history-id="${escapeHtml(historyId)}"` : "";
  const profileAttr = profile ? ` data-profile="${escapeHtml(profile)}"` : "";

  return `
    <button class="button ${variant}" data-action="${action}" data-reset="${reset}"${historyAttr}${profileAttr}>
      ${escapeHtml(label)}
    </button>
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
  const emblemClass = iconPath ? "result-emblem result-emblem-artwork" : "result-emblem";

  if (iconPath) {
    return `
      <figure
        class="${emblemClass}"
        style="--tone-a:${primary.accent};--tone-b:${secondary.accent};--tone-a-soft:${primarySoft};--tone-b-soft:${secondarySoft};"
      >
        <div class="result-emblem-shell">
          <img class="result-emblem-image" src="${iconPath}" alt="${escapeHtml(iconAlt)}" loading="eager" decoding="async" />
        </div>
      </figure>
    `;
  }

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

function renderGuideProfileCard(profile, { standalone = false, sectionPrefix = "resource" } = {}) {
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
        <section class="guide-panel guide-panel-wide" id="${sectionPrefix}-profile">
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
        <section class="guide-panel guide-panel-wide" id="${sectionPrefix}-health">
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

function normalizeHistorySort(value) {
  return ["newest", "oldest", "profile"].includes(value) ? value : "newest";
}

function normalizeCompareHistoryIds(values, resultHistory) {
  if (!Array.isArray(values)) {
    return [];
  }

  const validIds = new Set(resultHistory.map((entry) => entry.id));
  return [...new Set(values.map(String).filter((value) => validIds.has(value)))].slice(-2);
}

function getHistoryEntryById(historyId) {
  return state.resultHistory.find((entry) => entry.id === historyId) || null;
}

function getLatestHistoryEntry() {
  return state.resultHistory[0] || null;
}

function getSortedHistoryEntries() {
  const entries = [...state.resultHistory];

  switch (state.historySort) {
    case "oldest":
      return entries.reverse();
    case "profile":
      return entries.sort((left, right) => left.profileName.localeCompare(right.profileName));
    case "newest":
    default:
      return entries;
  }
}

function getCurrentSavedEntry() {
  if (!hasResults()) {
    return null;
  }

  const key = answersKey(state.answers);
  return state.resultHistory.find((entry) => entry.answerKey === key) || null;
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
  const tone = entry.meta.accent;
  const background =
    variant === "primary"
      ? tone
      : variant === "secondary"
        ? mixHex(tone, "#FFFFFF", 0.78)
        : mixHex(tone, "#FFFFFF", 0.9);
  const labelColor = variant === "primary" ? "#FFFFFF" : tone;

  return `
    <div class="score-row">
      <div class="score-meta">
        <div class="score-label">
          <div>
            <strong>${entry.meta.label}</strong>
            <span>${entry.meta.trait}</span>
          </div>
        </div>
        <span class="score-pill" style="background:${background};color:${labelColor};--tone:${tone};">
          <span class="score-pill-icon trait-icon" style="--icon:url('${entry.meta.icon}');"></span>
          ${entry.percentage}%
        </span>
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

function formatSavedStatus(entry) {
  return entry ? `Saved ${formatResultDate(entry.savedAt)}` : "Saved on this device";
}

function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
