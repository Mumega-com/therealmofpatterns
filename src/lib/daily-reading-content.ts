/**
 * Daily Reading Content Library
 *
 * Hand-written reading templates for each dominant dimension.
 * Each dimension has 4 variants rotated by date hash,
 * plus a reflection prompt pool.
 *
 * Voice: Sol — depth psychological, Jungian/Liz Greene in sensibility.
 * The chart as map of the psyche. Planets as psychological forces.
 * Transits as moments when something unconscious seeks to become conscious.
 * No prescriptions. No affirmations. Literary prose that trusts the reader.
 *
 * Dimensions: Identity (Sun), Structure (Saturn), Mind (Mercury), Heart (Venus),
 *   Growth (Jupiter), Drive (Mars), Connection (Moon), Awareness (Uranus/Neptune).
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
      opening: "Something at the center of you wants to be known today — not displayed, but genuinely recognised. The Sun principle, when it moves strongly, illuminates the gap between the person you present to the world and the one who waits quietly underneath. This is not a comfortable gap to look at clearly.",
      body: "The psyche's movement toward authentic identity is rarely a triumphant march. More often it arrives as restlessness — a vague dissatisfaction with things that used to feel fine, a sense that a mask that once fit has grown too tight. This is not a sign that something is wrong. It is the Self insisting on being consulted. Where today are you speaking in a voice that is almost but not quite yours?",
      closing: "The Self is not something you become. It is something you gradually stop hiding."
    },
    {
      opening: "Today has a quality of illumination — not the warm kind, but the precise kind, the kind that shows you what is actually there rather than what you hoped was. The Sun, as a psychological principle, has no interest in flattery. It simply shows.",
      body: "You may notice a small but significant discomfort in situations where you have been performing rather than living — where your outer behaviour has drifted from your actual values without your full consent. The psyche registers these discrepancies before the conscious mind does, usually as a muted restlessness or a feeling that something is slightly off. This signal is worth following rather than suppressing.",
      closing: "Courage, in its most ordinary form, is choosing the honest response over the convenient one."
    },
    {
      opening: "The Hero's journey is not an adventure story. It is the interior process of becoming more fully oneself — which is slow, unglamorous, and entirely necessary. On days like today, that process quietly accelerates.",
      body: "What you have borrowed from other people's ideas of who you should be — their ambitions, their definitions of success, their sense of what is worthy — tends to chafe more acutely when the Sun principle is dominant. Not because those ideas are wrong, but because they are not yours. The friction is diagnostic. Notice where today the performance costs you more than it returns.",
      closing: "The person you are becoming is already present. They simply need room."
    },
    {
      opening: "There is a solar quality to today's energy: it asks for presence — not the managed kind, but the kind where your actual face shows. The persona, Jung observed, is a necessary adaptation to life. It is also the thing the Self most consistently tries to see through.",
      body: "Identity days often feel like a quiet pressure from within — as though something is testing the seams of the version of yourself you've been presenting. Where have you been saying things you don't mean, agreeing to things that diminish you, going along with something that quietly costs you your self-respect? These are not small questions. The psyche is never tired of asking them.",
      closing: "What is most authentically you does not need permission. It needs acknowledgment."
    },
  ],

  // ── Structure (Saturn) ──────────────────────────────────
  [
    {
      opening: "Saturn is the great realist. When its principle moves strongly through the day, it tends to strip away what is convenient and reveal what is necessary. Something quietly demanding is in the air — not punishing, but exacting.",
      body: "The question Saturn always poses is not what you want but what you are prepared to build, and at what cost. Where have you been substituting wishes for commitment? Where has the avoidance of difficulty become its own kind of suffering? The psyche does not grow without edges, and Saturn is the force that insists on their existence.",
      closing: "Limitation is not the enemy of the soul. It is the form the soul must take to become real."
    },
    {
      opening: "There is a Saturnian quality to today that calls for honesty rather than inspiration. The energy favors what endures over what dazzles — structure, completion, the satisfaction of a thing done properly rather than impressively.",
      body: "Saturn represents the encounter with necessity: the moment when the ego discovers that the world will not simply accommodate its wishes. This is not a defeat — it is the beginning of maturity. What would it look like today to work honestly within the limits you actually have, rather than the ones you wish you had?",
      closing: "Reality is not an obstacle to your life. It is the material from which your life is made."
    },
    {
      opening: "The Saturn principle teaches through friction. When something feels heavy, slow, or resistant today, the instinct is to push harder or to retreat. The third option — to listen to what the resistance is saying — is usually the one the psyche actually needs.",
      body: "Somewhere in your life there is a structure that needs to be built or a boundary that needs to be held. You likely already know what it is. There is a kind of integrity in following through with what is yours to do — not because it feels good, but because you have recognized it as necessary.",
      closing: "What you build on honest ground holds. What you build on evasion eventually asks to be rebuilt."
    },
    {
      opening: "Saturn was traditionally the Lord of Time — not because it makes things slow, but because it asks you to take time seriously. What is committed to today is not a cage. It is a container in which something real can grow.",
      body: "The shadow of Saturn is not discipline — it is the refusal to accept limitation, which paradoxically produces the most rigid and joyless existence. The gift is the discovery that within appropriate constraint, the true self is not diminished but clarified. What limits are you currently fighting that might, if accepted, become a kind of freedom?",
      closing: "The soul does not grow in all directions at once. Let today have edges."
    },
  ],

  // ── Mind (Mercury) ──────────────────────────────────────
  [
    {
      opening: "Mercury is the psyche's messenger — the function that moves between worlds, connects disparate things, makes visible what was previously only sensed. On days when this energy is strong, the mind becomes an instrument rather than an obstacle.",
      body: "Pay attention to the connections you make today, the associations that arrive unbidden, the ideas that seem to come from elsewhere. The unconscious communicates through symbol and coincidence, and Mercury days are when that signal comes through most clearly. Something wants to be thought — a recognition you have been circling, a question finally ready to be asked.",
      closing: "The mind that notices everything teaches itself, in time, to see."
    },
    {
      opening: "There is a quickening in the air today — a quality of attention that sharpens and seeks. When the Mind dimension is dominant, something in the psyche moves toward clarity, toward naming what has been formless.",
      body: "Words have particular weight on days like this. The right question can reframe everything; the honest observation can land like a key in a lock. Watch what captures your attention without effort. The psyche's interest is never random — it points toward what matters, whether or not the conscious mind has caught up yet.",
      closing: "To name something clearly is to meet it honestly. What has been waiting to be named?"
    },
    {
      opening: "Mercury rules the threshold — the in-between spaces where things are neither one thing nor another and yet full of possibility. Today has something of that quality: a readiness to think differently, to release the conclusion you arrived at yesterday.",
      body: "The danger on Mercury days is over-analysis — mistaking the map for the territory, or believing that naming something is the same as understanding it. What the mind most usefully does today is not to solve but to receive: to sit with the incomplete thought long enough to discover what it is actually about.",
      closing: "Understanding arrives when we stop forcing it. Some things need to remain unresolved a little longer."
    },
    {
      opening: "The trickster quality of Mercury is this: what the mind thinks it is looking for is rarely what it actually finds. Today's energy invites a looser kind of attention — following the thread of curiosity rather than the predetermined plan.",
      body: "In psychological terms, Mercury mediates between opposites — the capacity to hold two contradictory things without collapsing them into one. You may find yourself today in exactly that position. This is not confusion. It is the beginning of a more complex and more accurate understanding.",
      closing: "The mind that can hold contradiction without panic is the mind that genuinely learns."
    },
  ],

  // ── Heart (Venus) ────────────────────────────────────────
  [
    {
      opening: "Venus represents not romantic love as it is popularly imagined, but Eros — the soul's capacity to be moved, to be drawn toward what it values. On days when this energy is prominent, something in the psyche wants to feel its way toward what is genuinely meaningful.",
      body: "What you love reveals who you are. This sounds simple and is one of the most difficult things to know clearly. We project our need for beauty, belonging, and meaning onto people and things, and then wonder why satisfaction does not last. The question today is not what you want but what you value when you are most honestly yourself.",
      closing: "What you love is not separate from you. It is a dimension of yourself, waiting to be recognised."
    },
    {
      opening: "There is a quality of longing in today's energy — not lack, but attunement, the heart moving toward what resonates. When the Heart dimension is dominant, the psyche becomes more sensitive to beauty, to resonance, to the quality of being genuinely in the right place.",
      body: "The shadow of Venus is idealisation that prevents real contact: loving the image of a person rather than the person, pursuing beauty that keeps you at a safe emotional distance from the actual. Notice today where you are drawn to the idea of something rather than its reality. The genuine article is usually messier and considerably more alive.",
      closing: "To love what is actually in front of you — that is the harder and more valuable practice."
    },
    {
      opening: "The Venusian principle in depth psychology is not merely aesthetic — it is the capacity for relationship as a form of self-knowledge. We discover who we are through what and whom we love, and even more revealingly through what we project onto them.",
      body: "On days like today the psyche tends to be more permeable, more available to being touched. This is also when projection is most active — seeing in another what we have not yet recognised in ourselves. If someone or something arrests your attention with unusual force today, it is worth asking: what is this showing me about my own unlived life?",
      closing: "Projection is not a failure of perception. It is an invitation to own what you see."
    },
    {
      opening: "Venus asks: can you receive? Not take, not earn — but allow. This is more difficult than it sounds for those who have learned to manage their own needs by becoming indispensable to others.",
      body: "The energy today has a yielding quality. Something in you may be asking to be met — to be seen, appreciated, held with genuine care. The work is to let that need be real without converting it into performance or demand. What would it mean to ask for what you need today, simply and without theatre?",
      closing: "The heart that does not ask eventually forgets how to receive. Today, ask."
    },
  ],

  // ── Growth (Jupiter) ────────────────────────────────────
  [
    {
      opening: "Jupiter is the principle of meaning — the force in the psyche that refuses to accept that life is merely what it appears to be at its most mechanical. When this energy is strong, something in you expands beyond the usual boundaries of what you believe yourself to be.",
      body: "The question Jupiter always poses is: what do you believe? Not in any doctrinal sense but at the level of the organising myth that gives your life its shape. The shadow of Jupiter is inflation — the grandiosity that substitutes a sense of limitless possibility for the harder work of becoming specifically, concretely real. The gift is genuine: the capacity to hold a larger view, to find meaning even in what resists it.",
      closing: "What you are reaching for today is real. Let it also be grounded."
    },
    {
      opening: "There is an expansive quality to today — a sense of possibility that the mind tends to outrun. When Growth is the dominant dimension, the psyche is genuinely seeking something larger than itself: a vision, a meaning, a horizon that justifies the difficulty of being alive.",
      body: "The danger is not ambition but disconnection — becoming so absorbed in what might be that contact with what is is lost. Jupiter's gifts require Saturn's ground. Something today is asking you to dream with your feet on the earth. What would it look like to take your vision seriously enough to make one concrete, irreversible move toward it?",
      closing: "The future becomes real only when you act as though it already matters."
    },
    {
      opening: "Jupiter in Jungian terms is associated with the puer aeternus — the eternal youth who lives in possibility but flees commitment. On days when this energy is dominant, this quality is available as gift or shadow, and the difference lies in what you do with it.",
      body: "If you feel restless, dissatisfied, hungry for something you cannot name — this is Jupiter moving. The question is not whether the hunger is valid but what it is actually hungry for. The soul wants meaning. The ego wants comfort. These are not always the same thing, and today they may be in useful tension.",
      closing: "Meaning is not found. It is made — out of the material of an honestly lived life."
    },
    {
      opening: "Growth days bring an unusual quality of faith — the sense that things can be different, that the story is not yet written, that there is genuine room for something new. This is not delusion. It is one of the psyche's most important capacities.",
      body: "Faith without form evaporates. The psyche's largest movements require containers. A vision without structure is merely mood. What would it take today to take one of your larger intuitions and give it something to stand on — a decision, a conversation, a commitment? Not the whole edifice. One stone.",
      closing: "Begin where you are, with what is yours. The rest follows from that."
    },
  ],

  // ── Drive (Mars) ─────────────────────────────────────────
  [
    {
      opening: "Mars is the principle of desire in its most direct form — not what you think you should want, but what you actually want, the way hunger is not a preference but a fact. On days when Drive is dominant, this force moves closer to the surface.",
      body: "The shadow of Mars is not aggression — it is the denial of desire, the long suppression of genuine will that eventually expresses itself as bitterness, passive hostility, or a resentment with no clear object. What have you been pretending not to want? What are you afraid to fight for because naming it would make it real, and real things can be lost?",
      closing: "Your desire is not a problem to be managed. It is a signal worth following honestly."
    },
    {
      opening: "There is a particular quality to Mars energy: it demands honesty about what you actually want, not what you believe you should want. This is harder than it sounds in a life shaped by others' expectations about which desires are acceptable.",
      body: "When Drive is strong, the psyche clarifies — the compromises that were tolerable yesterday begin to chafe. This is not regression or selfishness. It is the soul insisting on being consulted. Notice today where your energy rises without effort and where it drains without apparent reason. Energy is a kind of moral compass — it tells you what is and is not yours.",
      closing: "What you are drawn toward without permission — that is worth examining closely."
    },
    {
      opening: "The warrior principle in depth psychology is not about combat but about the capacity to assert — to take up the space that is genuinely yours, to name what belongs to you, to decline what diminishes you.",
      body: "Where have you been accommodating something that costs more than it returns? Where have you been saying yes in a voice that means no? This energy is not an invitation to aggression. It is an invitation to honesty about your own needs — and to act from that honesty rather than around it, which is the harder and more dignified path.",
      closing: "Standing for something is not selfishness. It is the beginning of integrity."
    },
    {
      opening: "Mars rules what we go after and what we defend. On days when this principle is dominant, both capacities are available: the force to pursue what is genuinely desired and the courage to protect what genuinely matters.",
      body: "The unconscious often stores frustrated desire as physical tension, restlessness, or urgency without a clear target. If you feel this today — a bottled energy that doesn't know where to go — it is worth asking what legitimate action it wants to become. The psyche will express itself one way or another. The question is whether you will choose the form.",
      closing: "The force in you wants to serve something real. Give it something worthy."
    },
  ],

  // ── Connection (Moon) ────────────────────────────────────
  [
    {
      opening: "The Moon in Jungian psychology represents the realm of the mother — not the personal mother, but the archetypal source of feeling, instinct, belonging, and the rhythmic pulse of the body. On days when Connection is dominant, this layer of the psyche rises toward the surface.",
      body: "You may find yourself more permeable than usual — more affected by the mood of a room, more aware of what is unspoken in a conversation, more attuned to what others carry without saying. This is not weakness. It is the lunar quality: the capacity to feel what is actually present rather than what is supposed to be present. The question is whether you will honour that capacity or override it.",
      closing: "What you feel today is information. Let it matter before you explain it away."
    },
    {
      opening: "The Moon's domain is not emotion as something that happens to us. It is the felt sense of life, the body's intelligence, the relational instinct that knows things before the mind arrives to name them.",
      body: "Today's energy tends toward connection — to other people, to the body, to memory and the past. The psyche on lunar days is more receptive: the usual separations between self and other soften. This brings richness, and also vulnerability. What relationships are asking for your real attention today — not managed attention, but genuine presence?",
      closing: "To be genuinely present with another person is one of the rarest things we offer. You have it in you."
    },
    {
      opening: "When the Moon principle is strong, what the psyche wants is not achievement but belonging — the fundamental comfort of being known and accepted not for what you produce but for what you are. This need is not regressive. It is primary.",
      body: "The mother complex, in all its forms, tends to become active on lunar days. What do you need from the people in your life that you have been too self-sufficient or too proud to ask for? Where have you been managing your need for connection by making yourself the one who manages, who gives, who does not need? The genuine need is allowed.",
      closing: "To need is not to be weak. It is to be honestly human."
    },
    {
      opening: "The lunar quality of today brings something that resists linear description — a knowing that arrives through feeling, through the body, through what resonates rather than through what makes rational sense.",
      body: "Trust your instincts today more than your analysis. Not because analysis is wrong, but because what the Moon illuminates is the portion of experience that analysis tends to flatten or miss entirely. If something feels off — in a relationship, in a direction, in yourself — that feeling is worth taking seriously even before you can explain it.",
      closing: "The body knows before the mind does. Listen early."
    },
  ],

  // ── Awareness (Uranus/Neptune) ────────────────────────────
  [
    {
      opening: "The outer planets point toward something larger than the personal — the transpersonal dimension of experience, where individual fate meets the deeper patterns of the collective. When Awareness is prominent, the psyche is reaching toward the edge of what is known.",
      body: "Today's energy has a quality of dissolving — of boundaries becoming more permeable, of the usual certainties feeling slightly less solid than yesterday. This can be disorienting if you resist it, or profoundly clarifying if you allow it. Something is asking to be seen from a vantage point you do not ordinarily occupy. What would it mean to step back far enough to look?",
      closing: "What is on the edge of your awareness is usually more significant than what is at its centre."
    },
    {
      opening: "Neptune in psychological terms is related to the dissolution of ego boundaries — the experience of something larger than personal identity. This can manifest as inspiration, compassion, and genuine spiritual opening, or as confusion and loss of direction if the ego is not ready.",
      body: "Today you may find that the usual separation between yourself and others, between your inner life and the outer world, feels thinner than usual. Pay attention to what arrives in this thinness: intuitions, images, unexpected sympathies. The psyche at its edges communicates in symbols and resonance rather than clear propositions. What image returns? What feeling persists without explanation?",
      closing: "What dissolves is always the container. What it was containing remains."
    },
    {
      opening: "Uranus is the principle of individuation at its most sudden — the moment when the pattern you have been living stops fitting and something new must emerge, wanted or not. These moments are rarely comfortable and are never entirely chosen.",
      body: "If something feels ready to break open today — a belief, a habit, a way you have understood yourself — this is not necessarily a crisis. It may be the psyche doing exactly what it does at the right moment: forcing the expansion that the comfortable self would never voluntarily choose. What has been stable for too long? What is quietly insisting on being reconsidered?",
      closing: "What breaks is always something that needed to break. Trust the emergence, even before you understand it."
    },
    {
      opening: "On days when Awareness is the dominant frequency, the psyche reaches beyond the personal — toward the archetypal, the collective, the layer of experience that belongs to everyone because it belongs to the deepest human nature.",
      body: "Neptune's longing is for the experience of union — the dissolution of the isolated ego into something larger than itself. This longing is real, and it cannot ultimately be satisfied by substances, relationships, or spiritual practice, though all will be tried. What it wants is a genuine opening: to be the particular person you are, and simultaneously to be part of something that makes that particularity meaningful.",
      closing: "You are both the individual story and the pattern beneath all stories. Neither cancels the other."
    },
  ],
];

/**
 * Reflection prompts per dimension.
 * Each dimension has 6 prompts, rotated independently from readings.
 * Voice: psychological depth, not instruction. Questions that open rather than direct.
 */
export const DAILY_ACTIONS: DailyAction[][] = [
  // Identity
  [
    { title: "Notice the mask", description: "Observe one moment today where you adjusted yourself for someone else's comfort. No judgment — just notice what it cost you." },
    { title: "One honest thing", description: "Say or write something true that you have been keeping carefully vague. The precision matters more than the size." },
    { title: "What feels most like you?", description: "Pay attention today to the moments when you feel most genuinely yourself. These are not random. They are pointing at something." },
    { title: "Where did the persona come from?", description: "Trace one habitual self-presentation back to its origin. Whose idea of you are you still carrying?" },
    { title: "The unlived version", description: "Consider a version of yourself you abandoned for good reasons. Is any part of it still worth retrieving?" },
    { title: "Speak in your own voice", description: "In one conversation today, resist the urge to soften, qualify, or perform. Say what you actually mean." },
  ],
  // Structure
  [
    { title: "What is the resistance saying?", description: "When you feel resistance to a necessary task today, pause before overriding it. What is it trying to tell you?" },
    { title: "One real commitment", description: "Make one commitment today that you actually intend to keep — not because you should, but because it is genuinely yours to do." },
    { title: "Where is the container needed?", description: "Identify one area of your life where the absence of structure is costing you more than the discomfort of creating it." },
    { title: "Finish something", description: "Complete one thing you have been circling. The psyche accumulates unfinished business as a kind of static." },
    { title: "The necessary no", description: "Find one place today where saying no is honest. Say it without elaborate justification." },
    { title: "Sit with limitation", description: "Choose one constraint in your life that you have been fighting and sit with it for five minutes without trying to solve it." },
  ],
  // Mind
  [
    { title: "Follow the thread", description: "Notice what your attention is drawn to today without effort. That interest is not random — follow it and see where it leads." },
    { title: "Name what is formless", description: "There is something you know but have not yet put into words. Spend ten minutes trying to name it precisely." },
    { title: "Hold the contradiction", description: "Identify two things you believe that are in tension with each other. Sit with both without resolving them." },
    { title: "Slow down one thought", description: "Choose one idea you have been moving past quickly and spend real time with it. Depth is not the same as accumulation." },
    { title: "What is the question?", description: "Before seeking an answer today, spend time with the question itself. Premature answers close things that should stay open." },
    { title: "Write the unsorted thought", description: "Set a timer for ten minutes and write whatever is in your mind without editing. The unguarded thought often contains the real one." },
  ],
  // Heart
  [
    { title: "What do you love?", description: "Name three things you love without justification or utility. Not what you should love — what you actually do." },
    { title: "Where is the projection?", description: "If someone or something arrested your attention today with unusual intensity, ask what it is showing you about yourself." },
    { title: "Ask for what you need", description: "Identify one genuine need and make it known to someone — simply, without the theatre of apology or self-sufficiency." },
    { title: "Let something move you", description: "Allow yourself to be affected today by something beautiful, sad, or true. Do not manage the feeling before it has arrived." },
    { title: "What do you value?", description: "Beneath what you pursue, what do you actually value? Spend a few minutes with the gap between the two." },
    { title: "Genuine reception", description: "When something good arrives today — a compliment, an offer, a moment of connection — let it in rather than deflecting it." },
  ],
  // Growth
  [
    { title: "Question the organising myth", description: "What story do you tell yourself about where you are going and why? Is it still true, or has it outlived its usefulness?" },
    { title: "What does the hunger want?", description: "If you feel restless or dissatisfied today, sit with the feeling long enough to ask what it is actually hungry for." },
    { title: "One step toward the vision", description: "Identify one concrete action that would move you toward something you genuinely believe in. Not the whole edifice — one stone." },
    { title: "Where is the inflation?", description: "Notice any place today where your sense of possibility has outrun your willingness to do the specific, unglamorous work." },
    { title: "The unlived life", description: "What have you not yet become that still calls to you? Is it still genuinely calling, or have you been carrying an old dream out of loyalty?" },
    { title: "What do you believe?", description: "Not what you profess — what you actually believe, demonstrated by how you spend your time and where you place your attention." },
  ],
  // Drive
  [
    { title: "What do you actually want?", description: "Beneath what you think you should want, beneath the performance of desire, what do you actually want today?" },
    { title: "The suppressed will", description: "Where have you been containing your will to accommodate others? Is the containment still appropriate, or has it become a habit?" },
    { title: "Name the desire", description: "Write down one thing you genuinely desire but have been reluctant to name, as though naming it would make its absence more painful." },
    { title: "Channel the energy", description: "If you feel restless, impatient, or charged today, ask what legitimate action that energy wants to become." },
    { title: "What are you defending?", description: "Notice where you feel the impulse to defend or protect something today. What is it, and is it actually worth defending?" },
    { title: "One direct move", description: "Choose one thing you have been approaching indirectly and approach it directly instead. The directness is the point." },
  ],
  // Connection
  [
    { title: "What do you need?", description: "Name one thing you genuinely need from someone in your life that you have been managing around rather than asking for." },
    { title: "Presence, not performance", description: "In one conversation today, resist the urge to be useful, insightful, or impressive. Simply be present with what is actually happening." },
    { title: "Notice the projection", description: "If someone evokes a strong response today — positive or negative — sit with the question: what am I seeing that is actually mine?" },
    { title: "The unlived belonging", description: "Where in your life have you been substituting independence for the belonging you actually need? Name it, at least to yourself." },
    { title: "Ask the real question", description: "In one relationship today, ask how someone is — and wait for the real answer, without rushing to fill the silence or solve anything." },
    { title: "Receive without deflecting", description: "When something is offered to you today — care, recognition, help — let it actually land rather than redirecting it back outward." },
  ],
  // Awareness
  [
    { title: "What is on the edge?", description: "Spend five minutes attending to what is at the periphery of your awareness today — the thing you keep almost thinking." },
    { title: "Sit with the unknown", description: "Identify one area of your life that is genuinely unresolved and resist the urge to resolve it today. Let it be unfinished." },
    { title: "Follow the image", description: "If a recurring image, dream fragment, or symbolic coincidence surfaces today, write it down and sit with it rather than explaining it." },
    { title: "Notice the pattern", description: "Step back from one recurring situation in your life and observe it as a pattern rather than an event. What is it consistently trying to show you?" },
    { title: "The witness position", description: "For ten minutes today, observe your own thoughts and feelings as though you were watching someone else — with interest rather than judgment." },
    { title: "What dissolves?", description: "Notice what feels less certain today than it did a week ago. Something is dissolving. Before you rebuild it, ask whether it needed to dissolve." },
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
