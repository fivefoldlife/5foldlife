export const GIFT_ORDER = [
  "apostle",
  "prophet",
  "evangelist",
  "pastor",
  "teacher",
];

export const LIKERT_OPTIONS = [
  { value: 1, label: "Not like me", shortLabel: "1" },
  { value: 2, label: "A little like me", shortLabel: "2" },
  { value: 3, label: "Sometimes me", shortLabel: "3" },
  { value: 4, label: "Mostly me", shortLabel: "4" },
  { value: 5, label: "Totally me", shortLabel: "5" },
];

export const GIFTS = {
  apostle: {
    key: "apostle",
    label: "Apostle",
    adjective: "Apostolic",
    trait: "Openness",
    accent: "#7B4B73",
    icon: "./assets/apostle-compass.svg",
    anthem: "Build what does not exist yet.",
    coreDrive: "to pioneer new ground and turn vision into structure",
    coreStrength: "vision, courage, systems thinking, and decisive first steps",
    flow:
      "At your best, you move with prayerful clarity, build sustainable pathways, and help people see what is possible before it is obvious.",
    fight:
      "When under pressure, you outrun people, skip foundations, and push outcomes faster than trust can hold them.",
    workStyle:
      "You thrive where strategy, freedom, and initiative matter. You naturally spot gaps, frame a path, and move ideas into motion.",
    ministryStyle:
      "You launch, organize, and send. You love seeing a fresh idea become a repeatable pathway that keeps serving people.",
    relationshipStyle:
      "You bring momentum, courage, and fresh possibility into the lives around you, but you need room to slow down and stay emotionally present.",
    watchouts:
      "Watch for overextending yourself, treating urgency like maturity, or delegating care too late.",
    bridgeRole: "strategy, courage, and scalable structure",
  },
  prophet: {
    key: "prophet",
    label: "Prophet",
    adjective: "Prophetic",
    trait: "Emotional Sensitivity",
    accent: "#800020",
    icon: "./assets/prophet-eye.svg",
    anthem: "Discern what is true and call it into the light.",
    coreDrive: "to sense alignment, protect what is holy, and respond to what feels off",
    coreStrength: "discernment, conviction, spiritual sensitivity, and moral courage",
    flow:
      "At your best, you bring holy clarity, loving conviction, and a deep awareness of what God is doing beneath the surface.",
    fight:
      "When under pressure, intensity rises, suspicion grows, and you can carry burdens alone instead of testing them in safe community.",
    workStyle:
      "You read atmospheres quickly. You tend to notice subtext, motives, and cultural drift before most people can name it.",
    ministryStyle:
      "You guard alignment, call people back to center, and create space for repentance, prayer, and revelation.",
    relationshipStyle:
      "You love honesty, depth, and authenticity. You do not want surface peace; you want real peace rooted in truth.",
    watchouts:
      "Watch for isolation, heaviness, or assuming that intensity automatically means accuracy.",
    bridgeRole: "discernment, conviction, and sensitivity to timing and alignment",
  },
  evangelist: {
    key: "evangelist",
    label: "Evangelist",
    adjective: "Evangelistic",
    trait: "Extraversion",
    accent: "#CC5500",
    icon: "./assets/evangelist-beacon.svg",
    anthem: "Invite people into life, hope, and movement.",
    coreDrive: "to connect people to transformation and create momentum around what matters",
    coreStrength: "energy, invitation, bold communication, and contagious hope",
    flow:
      "At your best, you create open doors, gather people with warmth, and help others believe that change is possible.",
    fight:
      "When under pressure, hype can replace depth, follow-through can thin out, and people can start to feel like outcomes instead of souls.",
    workStyle:
      "You flourish in visible, people-facing environments where momentum matters. You naturally bring energy, buy-in, and movement.",
    ministryStyle:
      "You invite, rally, host, and mobilize. You help people take the next step and feel welcomed into purpose.",
    relationshipStyle:
      "You bring warmth, adventure, and hope into relationships, though you need practices that protect follow-through and depth.",
    watchouts:
      "Watch for overpromising, measuring success by numbers, or moving faster than trust and discipleship can sustain.",
    bridgeRole: "invitation, momentum, and a contagious sense of hope",
  },
  pastor: {
    key: "pastor",
    label: "Pastor",
    adjective: "Pastoral",
    trait: "Agreeableness",
    accent: "#228B22",
    icon: "./assets/pastor-house.svg",
    anthem: "Create safety, peace, and steady care.",
    coreDrive: "to nurture people deeply and keep hearts safe while they grow",
    coreStrength: "empathy, presence, steadiness, and relational trust",
    flow:
      "At your best, you make people feel seen, protected, and gently strengthened. Your presence calms what is anxious and restores what is strained.",
    fight:
      "When under pressure, you can overcarry other people, avoid needed boundaries, and let peacekeeping replace honest leadership.",
    workStyle:
      "You thrive in trust-based environments where care, culture, and long-term health matter as much as performance.",
    ministryStyle:
      "You shepherd, restore, and walk closely with people through healing, belonging, and growth.",
    relationshipStyle:
      "You are loyal, attentive, and deeply nurturing. You want people around you to feel safe, known, and emotionally grounded.",
    watchouts:
      "Watch for overfunctioning, conflict avoidance, or carrying emotional weight that does not belong to you.",
    bridgeRole: "presence, safety, and relational steadiness",
  },
  teacher: {
    key: "teacher",
    label: "Teacher",
    adjective: "Teaching",
    trait: "Conscientiousness",
    accent: "#355E8A",
    icon: "./assets/teacher-lamp.svg",
    anthem: "Bring clarity that people can carry and use.",
    coreDrive: "to make truth understandable, practical, and reproducible",
    coreStrength: "clarity, wisdom, frameworks, and patient explanation",
    flow:
      "At your best, you turn complexity into clarity, help people understand what matters, and equip others with tools they can live out.",
    fight:
      "When under pressure, you can over-explain, over-control, or stay in analysis instead of moving toward embodied obedience.",
    workStyle:
      "You thrive where precision, thoughtfulness, and transferable knowledge are valued. You instinctively build frameworks and learning tools.",
    ministryStyle:
      "You equip, clarify, and establish truth in usable form. You help people move from confusion to confidence.",
    relationshipStyle:
      "You bring wisdom, consistency, and thoughtful perspective to relationships, though you need flexibility when feelings do not fit the outline.",
    watchouts:
      "Watch for perfectionism, content overload, or making clarity more important than connection.",
    bridgeRole: "clarity, structure, and practical wisdom people can carry",
  },
};

export const PROFILE_LIBRARY = {
  "apostle:prophet": {
    name: "The Trailblazer",
    summary:
      "You break new ground with discernment and move when conviction, timing, and mission line up.",
  },
  "apostle:evangelist": {
    name: "The Expansionist",
    summary:
      "You build fresh pathways and invite people into them with contagious momentum.",
  },
  "apostle:pastor": {
    name: "The Shepherd",
    summary:
      "You start new things that still feel safe, relational, and deeply grounded.",
  },
  "apostle:teacher": {
    name: "The Architect",
    summary:
      "You turn big vision into clear blueprints that others can actually follow.",
  },
  "prophet:apostle": {
    name: "The Revivalist",
    summary:
      "You sense what needs renewal and have the courage to build around it.",
  },
  "prophet:evangelist": {
    name: "The Awakener",
    summary:
      "You carry conviction with invitation and wake people up to what matters most.",
  },
  "prophet:pastor": {
    name: "The Watchman",
    summary:
      "You guard hearts with spiritual sensitivity and steady, protective care.",
  },
  "prophet:teacher": {
    name: "The Illuminator",
    summary:
      "You bring revelation into language people can understand and respond to.",
  },
  "evangelist:apostle": {
    name: "The Igniter",
    summary:
      "You spark movement, gather people quickly, and build for broad impact.",
  },
  "evangelist:prophet": {
    name: "The Herald",
    summary:
      "You carry a message with urgency, conviction, and a heart to awaken others.",
  },
  "evangelist:pastor": {
    name: "The Gatherer",
    summary:
      "You draw people in warmly and help them feel welcomed before they feel ready.",
  },
  "evangelist:teacher": {
    name: "The Storyteller",
    summary:
      "You make truth memorable, accessible, and compelling through words and moments.",
  },
  "pastor:apostle": {
    name: "The Builder",
    summary:
      "You care for people while creating the structure they need to flourish.",
  },
  "pastor:prophet": {
    name: "The Restorer",
    summary:
      "You sense wounds beneath the surface and gently call people back into wholeness.",
  },
  "pastor:evangelist": {
    name: "The Connector",
    summary:
      "You create belonging quickly and help people feel seen as they step into community.",
  },
  "pastor:teacher": {
    name: "The Discipler",
    summary:
      "You nurture growth through patient care, practical truth, and long-view consistency.",
  },
  "teacher:apostle": {
    name: "The Strategist",
    summary:
      "You use truth and structure to create plans that move vision forward with integrity.",
  },
  "teacher:prophet": {
    name: "The Revealer",
    summary:
      "You uncover deeper meaning and help people see what truth is asking of them.",
  },
  "teacher:evangelist": {
    name: "The Instructor",
    summary:
      "You teach in ways that connect, invite, and help people respond with confidence.",
  },
  "teacher:pastor": {
    name: "The Nurturer",
    summary:
      "You offer clarity with care and help people grow without feeling rushed or exposed.",
  },
};

export const QUESTIONS = [
  {
    id: 1,
    gift: "apostle",
    text: "I thrive when leading others into new ventures, ideas, or territory.",
  },
  {
    id: 2,
    gift: "prophet",
    text: "I feel a strong inner pull to speak up when something feels misaligned or unjust.",
  },
  {
    id: 3,
    gift: "evangelist",
    text: "I come alive when I get to share a message I believe in with a group.",
  },
  {
    id: 4,
    gift: "pastor",
    text: "I naturally sense when someone is hurting, even without them saying so.",
  },
  {
    id: 5,
    gift: "teacher",
    text: "I enjoy breaking down complex ideas so others can easily understand them.",
  },
  {
    id: 6,
    gift: "apostle",
    text: "I am quick to bring direction and structure when things feel chaotic.",
  },
  {
    id: 7,
    gift: "prophet",
    text: "I often intuit truths or direction before others can articulate them.",
  },
  {
    id: 8,
    gift: "evangelist",
    text: "I excel at inspiring people to take action or embrace change.",
  },
  {
    id: 9,
    gift: "pastor",
    text: "I deeply value safe, emotionally healthy relationships.",
  },
  {
    id: 10,
    gift: "teacher",
    text: "I love preparing content, lessons, or talks that help others grow.",
  },
  {
    id: 11,
    gift: "apostle",
    text: "I am energized by big-picture thinking and dreaming up what is next.",
  },
  {
    id: 12,
    gift: "prophet",
    text: "I can read the atmosphere of a room with surprising accuracy.",
  },
  {
    id: 13,
    gift: "evangelist",
    text: "My energy and passion tend to uplift and ignite groups.",
  },
  {
    id: 14,
    gift: "pastor",
    text: "I am often the one others confide in for care and emotional support.",
  },
  {
    id: 15,
    gift: "teacher",
    text: "I naturally organize thoughts or information into practical frameworks.",
  },
  {
    id: 16,
    gift: "apostle",
    text: "I am most fulfilled when I am pioneering something fresh and uncharted.",
  },
  {
    id: 17,
    gift: "prophet",
    text: "I frequently experience insight into future possibilities or unseen patterns.",
  },
  {
    id: 18,
    gift: "evangelist",
    text: "I love sharing causes or opportunities that stir my heart.",
  },
  {
    id: 19,
    gift: "pastor",
    text: "I prioritize connection and empathy over efficiency in most relationships.",
  },
  {
    id: 20,
    gift: "teacher",
    text: "I constantly refine how I communicate or teach based on who I am serving.",
  },
  {
    id: 21,
    gift: "apostle",
    text: "I enjoy crafting long-term strategies and visionary plans.",
  },
  {
    id: 22,
    gift: "prophet",
    text: "I often sense spiritual or intuitive nudges I cannot fully explain.",
  },
  {
    id: 23,
    gift: "evangelist",
    text: "I am good at stirring courage or boldness in others.",
  },
  {
    id: 24,
    gift: "pastor",
    text: "I feel responsible for the emotional or spiritual wellbeing of those around me.",
  },
  {
    id: 25,
    gift: "teacher",
    text: "I find great satisfaction in sharing well-researched truths and insights.",
  },
  {
    id: 26,
    gift: "apostle",
    text: "I feel an urgency to act when I believe something needs to change.",
  },
  {
    id: 27,
    gift: "apostle",
    text: "I often prefer to delegate relational follow-up so I can focus on vision.",
  },
  {
    id: 28,
    gift: "prophet",
    text: "I struggle to ignore things that feel spiritually or morally off.",
  },
  {
    id: 29,
    gift: "evangelist",
    text: "I feel called to reach as many people as possible with a transformational message.",
  },
  {
    id: 30,
    gift: "pastor",
    text: "I bring calm or steadiness to emotionally tense environments.",
  },
  {
    id: 31,
    gift: "apostle",
    text: "I enjoy creating systems that help people or ideas succeed over time.",
  },
  {
    id: 32,
    gift: "apostle",
    text: "I frequently generate new ideas for movements, events, or initiatives.",
  },
  {
    id: 33,
    gift: "prophet",
    text: "I have a hard time staying silent when someone is heading in a harmful direction.",
  },
  {
    id: 34,
    gift: "evangelist",
    text: "I use stories, metaphors, or analogies to help people connect with ideas.",
  },
  {
    id: 35,
    gift: "pastor",
    text: "I often feel unsettled until I know my people are emotionally okay.",
  },
  {
    id: 36,
    gift: "teacher",
    text: "I naturally outline my thoughts when preparing to communicate.",
  },
  {
    id: 37,
    gift: "apostle",
    text: "I am often the one pushing for innovation or bold decisions.",
  },
  {
    id: 38,
    gift: "prophet",
    text: "I find deeper meaning or divine messages in everyday experiences.",
  },
  {
    id: 39,
    gift: "evangelist",
    text: "I am energized when inviting people into something life-changing.",
  },
  {
    id: 40,
    gift: "pastor",
    text: "I tend to hold emotional space for others and help resolve tension.",
  },
  {
    id: 41,
    gift: "teacher",
    text: "I adapt my delivery style to connect with different kinds of learners.",
  },
  {
    id: 42,
    gift: "teacher",
    text: "I get frustrated when others cannot see the potential or vision I do.",
  },
  {
    id: 43,
    gift: "teacher",
    text: "I carry a burden for the moral or spiritual direction of those I lead.",
  },
  {
    id: 44,
    gift: "evangelist",
    text: "I love celebrating wins and sharing stories of transformation.",
  },
  {
    id: 45,
    gift: "pastor",
    text: "I am drawn to mentoring or walking closely with people through growth.",
  },
  {
    id: 46,
    gift: "teacher",
    text: "I enjoy developing tools, content, or processes that help people learn.",
  },
  {
    id: 47,
    gift: "apostle",
    text: "I often feel driven to lead at a broader or more impactful scale.",
  },
  {
    id: 48,
    gift: "prophet",
    text: "I have had moments of clarity or revelation that feel divinely inspired.",
  },
  {
    id: 49,
    gift: "evangelist",
    text: "I am naturally drawn to creating or participating in gatherings that connect people to purpose.",
  },
  {
    id: 50,
    gift: "pastor",
    text: "I feel a personal responsibility to create peace and stability wherever I am.",
  },
];
