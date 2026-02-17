/**
 * Daily Reading Content Library
 *
 * Hand-written reading templates for each dominant dimension.
 * Each dimension has multiple variants rotated by date hash,
 * plus an "action of the day" pool.
 *
 * Design notes for AI content generators:
 * - Voice: Sol mode — warm, grounded, encouraging. Like a wise friend, not a guru.
 * - Length: Each reading paragraph is 2-4 sentences. Total reading is ~150-250 words.
 * - Avoid: jargon, astrology lingo beyond basics, doom language, absolute predictions.
 * - Always: offer a concrete suggestion, acknowledge both challenge and opportunity.
 * - Dimensions: Identity (Sun), Structure (Saturn), Mind (Mercury), Heart (Venus),
 *   Growth (Jupiter), Drive (Mars), Connection (Moon), Awareness (Neptune).
 */

export interface DailyReadingTemplate {
  /** Opening paragraph — sets the scene for today's energy */
  opening: string;
  /** Body paragraph — what this means practically */
  body: string;
  /** Closing line — encouraging send-off */
  closing: string;
}

export interface DailyAction {
  /** Short action title */
  title: string;
  /** 1-2 sentence description */
  description: string;
}

/**
 * Reading templates per dimension.
 * Index 0-7 maps to: Identity, Structure, Mind, Heart, Growth, Drive, Connection, Awareness.
 * Each dimension has 4 variants, rotated by day-of-year.
 */
export const READING_TEMPLATES: DailyReadingTemplate[][] = [
  // ── Identity (Sun) ──────────────────────────────────────
  [
    {
      opening: "Today the spotlight turns inward. The energy is asking a simple but powerful question: who are you when nobody's watching? This is an Identity day — a day when your sense of self gets a little louder, a little clearer.",
      body: "You might feel a pull to express something authentic, even if it's uncomfortable. Maybe it's saying what you actually think in a meeting, wearing something that feels like you, or just noticing where you've been performing instead of living. Small acts of self-honesty have outsized impact today.",
      closing: "Trust the version of you that shows up when you stop trying so hard."
    },
    {
      opening: "There's a warmth at the center of today's energy field — a quiet confidence humming beneath the surface. Identity is in the spotlight, and with it comes the urge to step forward rather than blend in.",
      body: "This isn't about ego or attention-seeking. It's about alignment. When your outer actions match your inner truth, everything flows more easily. Pay attention to moments where you feel most alive today — they're showing you something important about who you're becoming.",
      closing: "You don't need permission to take up space. You already belong here."
    },
    {
      opening: "Today's energy is all about presence. Not the curated kind — the raw, unfiltered version of you. Identity days have a way of burning away pretense, leaving you face-to-face with what actually matters to you.",
      body: "If you've been drifting on autopilot, this energy will nudge you awake. It might come as restlessness, a sudden clarity about what you want, or even frustration with a situation that used to feel fine. These are all signals that your identity is evolving. Don't resist it.",
      closing: "The boldest thing you can do today is simply be honest about what you feel."
    },
    {
      opening: "Your core energy is running strong today. Think of it like the sun clearing the clouds — suddenly you can see yourself more clearly, and the view is better than you expected.",
      body: "Identity days are perfect for decisions that define direction. Not the small stuff — the 'who do I want to be?' kind. If there's a conversation you've been avoiding, a project you've been circling, or a version of yourself you've been hiding, today's energy supports making a move.",
      closing: "Shine without apology. The world adjusts to people who know who they are."
    },
  ],

  // ── Structure (Saturn) ──────────────────────────────────
  [
    {
      opening: "Today has a grounding quality to it. The energy favors building, organizing, and committing. If yesterday felt scattered, today brings the scaffolding.",
      body: "Structure days reward the unglamorous work: clearing your inbox, finishing what you started, setting up systems that future-you will thank you for. The key is to resist the temptation to do everything and instead pick one thing to solidify. A single finished task beats ten half-started ones.",
      closing: "The foundation you build today holds more weight than you think."
    },
    {
      opening: "There's a steadiness in the air today — a quiet invitation to get your house in order, literally or metaphorically. Structure energy doesn't rush. It builds.",
      body: "This is a great day for boundaries too. Where have you been saying yes when you mean no? Where do you need more discipline, not less? Structure isn't about rigidity — it's about creating containers that let the important things grow.",
      closing: "Discipline is just love made consistent. Build something that lasts."
    },
    {
      opening: "The energy today is practical, patient, and persistent. Think of it like the difference between dreaming about a garden and actually turning the soil. Structure days favor action over vision.",
      body: "If you've been procrastinating on something boring but necessary — taxes, health checkup, that difficult conversation about logistics — today is your day. The resistance you feel is temporary. The relief you'll feel after is real.",
      closing: "Small commitments, kept consistently, change everything."
    },
    {
      opening: "Today asks you to be an architect. Not of grand plans, but of the quiet systems that hold your life together. Structure days have a sober clarity that cuts through noise.",
      body: "Pay attention to what keeps breaking in your routine — that's where structure is needed most. It might be your morning, your finances, or how you manage your energy through the day. One good decision about structure saves a hundred future decisions.",
      closing: "Build the container. Then let life fill it."
    },
  ],

  // ── Mind (Mercury) ──────────────────────────────────────
  [
    {
      opening: "Your mind is electric today. Ideas come faster, connections appear where there were none before, and communication flows with unusual ease. This is a Mind day — use it.",
      body: "Whether it's writing that email you've been drafting in your head, having the conversation that clears the air, or simply learning something new — your mental bandwidth is expanded today. The one thing to watch: don't mistake speed for depth. Slow down enough to let the best ideas fully form.",
      closing: "Speak clearly. Listen deeply. The space between is where understanding lives."
    },
    {
      opening: "There's a sharpness to today's energy. Your perception is heightened, your curiosity is active, and your ability to articulate what you feel is stronger than usual.",
      body: "Mind days are perfect for problem-solving, brainstorming, and untangling things that felt confusing yesterday. If you've been stuck on a decision, today brings the clarity to see all the angles. Write things down — your thoughts today are worth capturing.",
      closing: "Your mind is a gift. Today it's especially well-tuned."
    },
    {
      opening: "Information flows like water today. You might find yourself drawn to books, conversations, podcasts, or rabbit holes of curiosity. Let yourself explore — Mind energy rewards the curious.",
      body: "The best use of this energy isn't consuming more but synthesizing what you already know. What patterns do you see? What connections have you missed? Sometimes the breakthrough comes not from new information but from looking at old information with fresh eyes.",
      closing: "Stay curious. The next good idea is closer than you think."
    },
    {
      opening: "Today favors the thinkers, the talkers, and the writers. Mind energy is humming, and the world feels a little more legible than usual.",
      body: "If you need to persuade someone, teach something, or simply get your point across — today is your window. But this energy also supports the quieter side of mind: journaling, reflecting, sorting through mental clutter. Give your thoughts room to breathe and they'll reward you with surprising clarity.",
      closing: "A clear mind isn't empty — it's organized around what matters."
    },
  ],

  // ── Heart (Venus) ────────────────────────────────────────
  [
    {
      opening: "Beauty is louder today. Colors seem richer, music hits differently, and you might find yourself moved by small moments that usually pass unnoticed. Heart energy is in the lead.",
      body: "This is a day for tending your relationships — not through grand gestures but through genuine presence. Tell someone what they mean to you. Cook something with care. Notice what you find beautiful and let it matter. The Heart dimension reminds you that life isn't just about doing; it's about feeling.",
      closing: "Love isn't a feeling you wait for. It's a practice you choose. Choose it today."
    },
    {
      opening: "Today carries a gentleness to it. The hard edges soften, and the energy invites you to lead with your heart rather than your head.",
      body: "Heart days are about values — what you hold dear, what you'd fight for, what makes life worth living. If you've been neglecting the things that nourish your soul (art, nature, connection, play), today is your invitation to return. Productivity can wait. Meaning can't.",
      closing: "The most productive thing you can do today might be nothing at all — just being present with someone you love."
    },
    {
      opening: "Your emotional intelligence is heightened today. You can sense what others need before they say it, and you're more attuned to the quality of your connections.",
      body: "Use this energy to repair what's frayed. A simple apology, an unexpected compliment, a moment of full attention — these small acts of heart reshape relationships in ways that last. Also: don't forget to direct some of that care inward. What do you need that you've been too busy to notice?",
      closing: "Tenderness isn't weakness. It's the bravest thing we do."
    },
    {
      opening: "There's a magnetic pull toward pleasure today — not the escapist kind, but the kind that fills you up. Good food, good company, good music. Heart energy knows what feeds the soul.",
      body: "If you've been running on empty, today is a refueling day. Surround yourself with what you love and let it work its quiet magic. This isn't indulgence; it's maintenance. You can't pour from an empty cup, and Heart days are for filling yours back up.",
      closing: "You deserve the beauty you so easily give to others."
    },
  ],

  // ── Growth (Jupiter) ────────────────────────────────────
  [
    {
      opening: "Expansion is the word of the day. Something in you wants to grow — to learn, to reach, to become more than you were yesterday. Growth energy doesn't settle for comfortable.",
      body: "This might show up as an urge to travel, explore a new idea, or question a belief you've held for years. Whatever form it takes, follow it. Growth happens at the edges of what you know. The risk today isn't doing too much — it's playing too safe.",
      closing: "Think bigger. The universe tends to meet you where your ambition is."
    },
    {
      opening: "Today feels spacious. The walls pull back, the ceiling lifts, and suddenly there's room for something larger. Growth energy is generous — it wants you to expand.",
      body: "This is a great day for long-term thinking: where do you want to be in a year? What skill, relationship, or understanding would change everything? Growth days favor the visionary over the pragmatist. Dream first, plan later.",
      closing: "The future is wider than you think. Give yourself permission to want more."
    },
    {
      opening: "Your appetite for meaning is strong today. Superficial answers won't satisfy — you want to understand why. Growth energy pushes you past the surface.",
      body: "This could mean picking up a book that's been sitting on your shelf, having a deeper conversation than usual, or finally exploring that subject that keeps calling your name. Growth isn't always dramatic. Sometimes it's just choosing curiosity over comfort, one question at a time.",
      closing: "Every master was once a beginner who refused to stop asking 'why?'"
    },
    {
      opening: "There's a restless optimism in the air today. Growth energy makes everything feel possible, which is both its gift and its trap. Channel it wisely.",
      body: "The best use of this energy is to make one meaningful move in the direction you want to grow. Not five — one. Sign up for that course. Send that message. Start that project. Growth energy without focus scatters into a dozen unfinished ideas. With focus, it becomes transformation.",
      closing: "Growth doesn't ask for perfect conditions. It asks for one brave step."
    },
  ],

  // ── Drive (Mars) ─────────────────────────────────────────
  [
    {
      opening: "You can feel it — that restless energy that wants to move, build, and conquer. Drive is today's dominant force, and it's not interested in sitting still.",
      body: "This is a doing day, not a thinking day. Start the workout. Ship the thing. Have the confrontation you've been avoiding. Drive energy rewards action and punishes hesitation. The trick is to channel it deliberately — raw Drive without direction becomes frustration. Pick your target, then go.",
      closing: "Momentum is on your side today. Use it before it moves on."
    },
    {
      opening: "Energy is high and patience is low. That's the signature of a Drive day — everything moves faster, including your temper. Use the fuel, but mind the fire.",
      body: "The best outlet for this energy is physical: exercise, building, cleaning, anything that lets your body spend what your mind can't hold. If you must channel it mentally, tackle the hard problem — the one that's been sitting there because it's intimidating. Drive days eat intimidation for breakfast.",
      closing: "You're stronger than the thing you're afraid of. Prove it today."
    },
    {
      opening: "Today feels like a starting gun. Something inside you is ready to sprint — toward a goal, away from stagnation, or simply into motion for its own sake.",
      body: "Drive energy is perfect for breaking through blocks. That project stuck at 80%? Finish it. That habit you keep meaning to start? Day one is today. The key is to match intensity with intention — don't just do more, do what matters most. When Drive is focused, it moves mountains.",
      closing: "Completion is its own reward. Cross something off the list today."
    },
    {
      opening: "Mars energy is running hot today, filling you with a raw motivation that cuts through excuse and overthinking. This is fuel — what will you spend it on?",
      body: "A word of caution: Drive days can make you impatient with others and short with yourself. Not everything responds to force. Some things need a firm hand; others need a soft touch. The art of Drive is knowing which. Compete with yesterday's version of yourself, not with the people around you.",
      closing: "The best battles are the ones you fight with yourself — and win."
    },
  ],

  // ── Connection (Moon) ────────────────────────────────────
  [
    {
      opening: "Today the energy turns relational. You'll feel the quality of your connections more acutely — who lifts you up, who drains you, and where you've been neglecting the bonds that matter.",
      body: "Connection days are for showing up. Call the friend you've been meaning to call. Ask how someone is actually doing — and wait for the real answer. These tiny acts of care don't just help others; they feed a part of you that can't be nourished by achievement alone.",
      closing: "The people in your life are your life. Tend to them today."
    },
    {
      opening: "Your emotional antenna is especially sensitive today. You might pick up on moods, undercurrents, and unspoken needs that usually fly under your radar. Connection energy makes you permeable.",
      body: "This heightened sensitivity is a superpower if you use it well. Listen between the lines. Notice who needs encouragement. But also: set boundaries where you need them. Being connected doesn't mean absorbing everyone's pain. You can care deeply and still protect your energy.",
      closing: "Being seen and being safe aren't opposites. You can have both."
    },
    {
      opening: "Home, family, roots — something pulls you toward the familiar today. Connection energy is about belonging, and belonging starts with feeling safe enough to be yourself.",
      body: "If you've been running hard, this might be the day to slow down and remember what you're running toward. Cook a meal. Share a story. Sit in comfortable silence with someone who knows you. Connection isn't always about talking — sometimes it's about being in the same room, fully present.",
      closing: "Belonging isn't something you earn. It's something you build, one honest moment at a time."
    },
    {
      opening: "The space between you and others feels thinner today. Empathy flows more easily, vulnerability feels less risky, and there's a quiet hunger for real connection — not likes and replies, but the kind that feeds your soul.",
      body: "Today is an invitation to go deeper with someone. Share what you've been holding. Ask the question you've been afraid to ask. The Connection dimension reminds us that we're not meant to carry everything alone — and that asking for help is its own kind of strength.",
      closing: "No one makes it through this life alone. Reach out. You'll be glad you did."
    },
  ],

  // ── Awareness (Neptune) ──────────────────────────────────
  [
    {
      opening: "Today has a dreamy, spacious quality — as if the usual boundaries between you and the world have thinned. Awareness energy invites you to observe rather than react.",
      body: "This is a day for noticing. What patterns keep showing up in your life? What does your intuition whisper when your mind gets quiet? Awareness days aren't about doing — they're about seeing clearly. Meditation, journaling, time in nature, or simply sitting in stillness can unlock insights that action never could.",
      closing: "The deepest answers don't come from thinking harder. They come from getting quiet enough to hear."
    },
    {
      opening: "The noise dims today. Not the outer noise — the inner kind. The constant narration, the planning, the judging. Awareness energy creates space between stimulus and response, and in that space lives something precious: choice.",
      body: "Use this energy to step back from the story you've been telling yourself. Is it true, or just familiar? Are you reacting to what's actually happening, or to a pattern from the past? Awareness days help you catch the difference. This isn't about being perfect — it's about being present.",
      closing: "You are not your thoughts. You are the one watching them."
    },
    {
      opening: "Something subtle is happening today. You might not be able to name it, but you can feel it — a shift in perspective, a widening of the lens. Awareness energy works below the surface.",
      body: "Don't force clarity today. Let it come to you. Walk without a destination. Read without a goal. Let your mind wander and see where it goes. The Awareness dimension connects you to the bigger picture, and the bigger picture reveals itself to those who stop trying to control it.",
      closing: "Trust the process. Not everything needs to be understood to be meaningful."
    },
    {
      opening: "Today invites you to be the witness. Not the actor, not the director — the one in the audience, watching the whole play of your life with compassion and curiosity.",
      body: "Awareness days are ideal for reflection: What has this week taught you? Where are you growing? Where are you stuck? The answers live in the spaces between your busy moments. Give yourself ten minutes of genuine silence and see what surfaces. You might be surprised.",
      closing: "Stillness isn't empty. It's full of answers you've been too busy to hear."
    },
  ],
];

/**
 * Actions of the day per dimension.
 * Each dimension has 6 actions, rotated independently from readings.
 */
export const DAILY_ACTIONS: DailyAction[][] = [
  // Identity
  [
    { title: "Express yourself", description: "Share an opinion, a creative idea, or a personal truth you've been keeping quiet. Authenticity builds identity." },
    { title: "Make one bold choice", description: "Choose something that feels like 'you' — even if it's small. Wear what you want. Say what you mean." },
    { title: "Notice where you perform", description: "Catch one moment today where you adjust yourself for someone else's comfort. Just notice it. That's enough." },
    { title: "Write your values", description: "List 3 things that matter most to you right now. No editing, no judging. Just truth." },
    { title: "Take the lead", description: "Volunteer to go first — in a conversation, a project, or a decision. Leading builds self-trust." },
    { title: "Celebrate a win", description: "Name one thing you did well recently. Say it out loud. You're allowed to be proud of yourself." },
  ],
  // Structure
  [
    { title: "Finish one thing", description: "Pick the task that's been sitting at 90% done. Complete it. The relief is worth more than starting something new." },
    { title: "Set one boundary", description: "Where do you need to say no? Find it and say it — kindly, clearly, firmly." },
    { title: "Organize your space", description: "Spend 15 minutes decluttering your desk, inbox, or closet. Outer order creates inner calm." },
    { title: "Build a routine", description: "Choose one small habit and commit to it for this week. Just this week. That's enough." },
    { title: "Plan your tomorrow", description: "Before bed, write down your 3 priorities for tomorrow. Waking up with a plan changes everything." },
    { title: "Fix what's broken", description: "That squeaky door, that awkward process, that thing you work around every day — fix it. Small repairs compound." },
  ],
  // Mind
  [
    { title: "Learn something new", description: "Spend 20 minutes exploring a topic that has nothing to do with your work. Cross-pollination sparks creativity." },
    { title: "Write it down", description: "Capture your thoughts in writing. Journal, note, or voice memo — externalize what's in your head." },
    { title: "Have a real conversation", description: "Talk to someone about an idea, not a task. Discussion sharpens thinking better than solo reflection." },
    { title: "Solve the puzzle", description: "Take on the problem you've been avoiding. Your mind is sharp today — use it on something worthy." },
    { title: "Read deeply", description: "Choose one article or chapter and read it slowly, with full attention. Depth beats breadth today." },
    { title: "Teach someone", description: "Explain something you know well to someone who doesn't. Teaching is the highest form of understanding." },
  ],
  // Heart
  [
    { title: "Reach out with kindness", description: "Send a message to someone you appreciate. Not because you need something — just because they matter." },
    { title: "Create something beautiful", description: "Cook a meal, arrange flowers, draw, sing, or style an outfit. Let beauty be the point." },
    { title: "Listen fully", description: "Give someone your complete attention for 5 minutes. No phone, no formulating your response. Just listen." },
    { title: "Enjoy without guilt", description: "Do something purely for pleasure. No productivity justification needed. Rest is not laziness." },
    { title: "Forgive one thing", description: "Let go of a small grudge or self-criticism. Not because they deserve it, but because you deserve peace." },
    { title: "Notice beauty", description: "Find three beautiful things today — in nature, in people, in ordinary moments. Train your eye for what's good." },
  ],
  // Growth
  [
    { title: "Think bigger", description: "Spend 10 minutes imagining your life one year from now. What would make you proud? Let yourself want it." },
    { title: "Question a belief", description: "Pick one thing you assume is true about yourself or the world. Ask: is it? Really?" },
    { title: "Explore the unfamiliar", description: "Try a new restaurant, read an opposing viewpoint, or talk to someone outside your usual circle." },
    { title: "Start before you're ready", description: "That thing you've been 'almost ready' to begin? Start it today. Imperfect action beats perfect planning." },
    { title: "Seek a mentor", description: "Identify someone who's where you want to be. Reach out. Ask one question. Growth accelerates with guidance." },
    { title: "Invest in yourself", description: "Buy the book. Take the course. Book the session. Investing in your growth isn't selfish — it's essential." },
  ],
  // Drive
  [
    { title: "Move your body", description: "Exercise, walk, stretch, dance — anything that gets your blood moving. Physical energy unlocks mental energy." },
    { title: "Do the hard thing first", description: "Start your day with the task you're most tempted to avoid. Everything after that feels easier." },
    { title: "Set a deadline", description: "Give yourself a time limit for a task and race the clock. Urgency creates focus." },
    { title: "Ship something", description: "Send the email. Publish the draft. Submit the application. Done beats perfect." },
    { title: "Compete with yesterday", description: "Do one more rep, one more page, one more minute than you did last time. Progress is the only comparison that matters." },
    { title: "Channel frustration", description: "If you're angry or restless, point that energy at something constructive. Clean, build, create, solve." },
  ],
  // Connection
  [
    { title: "Check in on someone", description: "Send a quick 'thinking of you' message to someone you haven't talked to in a while. It means more than you know." },
    { title: "Share something vulnerable", description: "Tell someone how you actually feel — not the polished version. Vulnerability deepens connection." },
    { title: "Eat with someone", description: "Share a meal, even if it's just coffee. Breaking bread is one of humanity's oldest bonding rituals." },
    { title: "Ask for help", description: "Let someone support you today. It's not weakness — it's trust. And it strengthens the bond for both of you." },
    { title: "Put the phone down", description: "For one conversation today, be fully present. No screen, no multitasking. Just two humans, connecting." },
    { title: "Express gratitude", description: "Tell someone specifically what you appreciate about them. Not generic — specific. 'I love how you always...' " },
  ],
  // Awareness
  [
    { title: "Sit in silence", description: "Give yourself 10 minutes with no input — no phone, no music, no tasks. Just breathe and observe your mind." },
    { title: "Take a mindful walk", description: "Walk for 15 minutes paying attention to your senses. What do you see, hear, smell, feel?" },
    { title: "Journal without a prompt", description: "Open a blank page and write whatever comes. Don't edit, don't judge. Let your subconscious speak." },
    { title: "Observe your patterns", description: "Notice one habit or reaction you repeat on autopilot. You don't need to change it — just see it clearly." },
    { title: "Practice non-reaction", description: "When something irritates you today, pause before responding. That pause is where your freedom lives." },
    { title: "Look at the sky", description: "Step outside and look up for 60 seconds. Let the vastness of the sky remind you of perspective." },
  ],
];

/**
 * Get a reading template for a given dimension and date.
 * Uses day-of-year to rotate through variants so each day feels fresh.
 */
export function getDailyReading(dominantIndex: number, date: Date): DailyReadingTemplate {
  const dayOfYear = getDayOfYear(date);
  const templates = READING_TEMPLATES[dominantIndex] || READING_TEMPLATES[0];
  return templates[dayOfYear % templates.length];
}

/**
 * Get an action of the day for a given dimension and date.
 * Rotates independently from readings (uses different hash).
 */
export function getDailyAction(dominantIndex: number, date: Date): DailyAction {
  const dayOfYear = getDayOfYear(date);
  const actions = DAILY_ACTIONS[dominantIndex] || DAILY_ACTIONS[0];
  // Offset by 3 so action and reading don't share the same rotation
  return actions[(dayOfYear + 3) % actions.length];
}

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}
