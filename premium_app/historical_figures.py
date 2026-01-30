"""
Historical Figure Matching for FRC 16D
Poets, philosophers, warriors, mystics across all cultures
"""
import numpy as np
from typing import List, Dict

# Historical figures with estimated 16D vectors
# Based on their life work, writings, and documented temperament
# Format: [P, E, μ, V, N, Δ, R, Φ]

HISTORICAL_FIGURES = {
    # ========== PHILOSOPHERS ==========
    "philosophers": [
        {
            "name": "Rumi",
            "era": "1207-1273",
            "culture": "Persian",
            "vector": [0.7, 0.4, 0.8, 0.95, 0.85, 0.5, 1.0, 0.95],
            "known_for": "Sufi poet, mystic, scholar of divine love",
            "quote": "What you seek is seeking you.",
            "domains": ["love", "poetry", "mysticism", "transformation"]
        },
        {
            "name": "Marcus Aurelius",
            "era": "121-180",
            "culture": "Roman",
            "vector": [0.85, 0.95, 0.9, 0.6, 0.7, 0.8, 0.5, 0.85],
            "known_for": "Stoic philosopher-emperor, author of Meditations",
            "quote": "You have power over your mind, not outside events.",
            "domains": ["stoicism", "leadership", "duty", "self-mastery"]
        },
        {
            "name": "Lao Tzu",
            "era": "6th century BCE",
            "culture": "Chinese",
            "vector": [0.6, 0.5, 0.85, 0.7, 0.9, 0.3, 0.65, 1.0],
            "known_for": "Founder of Taoism, author of Tao Te Ching",
            "quote": "The Tao that can be told is not the eternal Tao.",
            "domains": ["taoism", "naturalness", "non-action", "wisdom"]
        },
        {
            "name": "Hypatia of Alexandria",
            "era": "360-415",
            "culture": "Greco-Egyptian",
            "vector": [0.8, 0.85, 1.0, 0.7, 0.9, 0.6, 0.5, 0.75],
            "known_for": "Mathematician, astronomer, philosopher",
            "quote": "Reserve your right to think, for even to think wrongly is better than not to think at all.",
            "domains": ["mathematics", "astronomy", "teaching", "reason"]
        },
        {
            "name": "Zhuangzi",
            "era": "369-286 BCE",
            "culture": "Chinese",
            "vector": [0.65, 0.4, 0.9, 0.75, 0.95, 0.35, 0.6, 0.95],
            "known_for": "Taoist philosopher, master of paradox",
            "quote": "The fish trap exists because of the fish. Once you've gotten the fish you can forget the trap.",
            "domains": ["paradox", "freedom", "spontaneity", "transcendence"]
        },
        {
            "name": "Simone de Beauvoir",
            "era": "1908-1986",
            "culture": "French",
            "vector": [0.9, 0.7, 0.95, 0.65, 0.85, 0.8, 0.75, 0.6],
            "known_for": "Existentialist philosopher, feminist theorist",
            "quote": "One is not born, but rather becomes, a woman.",
            "domains": ["existentialism", "feminism", "freedom", "ethics"]
        },
        {
            "name": "Ibn Arabi",
            "era": "1165-1240",
            "culture": "Andalusian",
            "vector": [0.75, 0.6, 0.9, 0.85, 0.95, 0.4, 0.85, 1.0],
            "known_for": "Sufi mystic, 'Greatest Master'",
            "quote": "My heart has become capable of every form.",
            "domains": ["mysticism", "unity", "imagination", "love"]
        },
        {
            "name": "Friedrich Nietzsche",
            "era": "1844-1900",
            "culture": "German",
            "vector": [1.0, 0.5, 0.95, 0.7, 0.9, 0.85, 0.3, 0.75],
            "known_for": "Philosopher of will to power, eternal recurrence",
            "quote": "He who has a why to live can bear almost any how.",
            "domains": ["will", "overcoming", "values", "transformation"]
        },
        {
            "name": "Confucius",
            "era": "551-479 BCE",
            "culture": "Chinese",
            "vector": [0.75, 0.95, 0.85, 0.7, 0.8, 0.5, 0.9, 0.6],
            "known_for": "Philosopher of ethics and social harmony",
            "quote": "It does not matter how slowly you go as long as you do not stop.",
            "domains": ["ethics", "harmony", "learning", "relationships"]
        },
        {
            "name": "Rabia al-Adawiyya",
            "era": "717-801",
            "culture": "Iraqi",
            "vector": [0.65, 0.5, 0.7, 0.9, 0.85, 0.4, 0.95, 1.0],
            "known_for": "Sufi saint, poet of divine love",
            "quote": "I love God: I have no time left to hate the devil.",
            "domains": ["devotion", "love", "mysticism", "purity"]
        },
    ],

    # ========== POETS ==========
    "poets": [
        {
            "name": "Hafez",
            "era": "1315-1390",
            "culture": "Persian",
            "vector": [0.7, 0.45, 0.85, 1.0, 0.9, 0.4, 0.9, 0.85],
            "known_for": "Master of ghazal, poet of love and wine",
            "quote": "I wish I could show you, when you are lonely or in darkness, the astonishing light of your own being.",
            "domains": ["poetry", "love", "beauty", "divine intoxication"]
        },
        {
            "name": "Emily Dickinson",
            "era": "1830-1886",
            "culture": "American",
            "vector": [0.75, 0.6, 0.95, 0.85, 0.9, 0.35, 0.55, 0.95],
            "known_for": "Reclusive poet of death, immortality, and nature",
            "quote": "Because I could not stop for Death, He kindly stopped for me.",
            "domains": ["death", "nature", "inner life", "transcendence"]
        },
        {
            "name": "Pablo Neruda",
            "era": "1904-1973",
            "culture": "Chilean",
            "vector": [0.8, 0.55, 0.85, 0.95, 0.85, 0.7, 0.95, 0.7],
            "known_for": "Nobel laureate, poet of love and political passion",
            "quote": "I want to do with you what spring does with the cherry trees.",
            "domains": ["love", "nature", "politics", "sensuality"]
        },
        {
            "name": "Sappho",
            "era": "630-570 BCE",
            "culture": "Greek",
            "vector": [0.75, 0.5, 0.8, 1.0, 0.8, 0.5, 1.0, 0.7],
            "known_for": "'Tenth Muse', poet of love and desire",
            "quote": "He seems to me equal to the gods, that man who sits opposite you.",
            "domains": ["love", "beauty", "desire", "women's voices"]
        },
        {
            "name": "Matsuo Bashō",
            "era": "1644-1694",
            "culture": "Japanese",
            "vector": [0.6, 0.7, 0.9, 0.85, 0.8, 0.4, 0.6, 1.0],
            "known_for": "Master of haiku, wandering poet",
            "quote": "An old silent pond / A frog jumps into the pond— / Splash! Silence again.",
            "domains": ["haiku", "nature", "impermanence", "presence"]
        },
        {
            "name": "Maya Angelou",
            "era": "1928-2014",
            "culture": "American",
            "vector": [0.9, 0.75, 0.85, 0.8, 0.85, 0.75, 0.95, 0.7],
            "known_for": "Poet, memoirist, civil rights activist",
            "quote": "There is no greater agony than bearing an untold story inside you.",
            "domains": ["resilience", "identity", "justice", "voice"]
        },
        {
            "name": "Kabir",
            "era": "1440-1518",
            "culture": "Indian",
            "vector": [0.7, 0.5, 0.8, 0.75, 0.9, 0.6, 0.85, 1.0],
            "known_for": "Mystic poet, weaver, bridge between Hindu and Muslim",
            "quote": "Wherever you are is the entry point.",
            "domains": ["unity", "simplicity", "devotion", "truth"]
        },
        {
            "name": "Omar Khayyam",
            "era": "1048-1131",
            "culture": "Persian",
            "vector": [0.75, 0.65, 0.95, 0.85, 0.8, 0.55, 0.7, 0.85],
            "known_for": "Mathematician, astronomer, poet of the Rubaiyat",
            "quote": "Be happy for this moment. This moment is your life.",
            "domains": ["mathematics", "astronomy", "pleasure", "impermanence"]
        },
    ],

    # ========== WARRIORS & LEADERS ==========
    "warriors": [
        {
            "name": "Joan of Arc",
            "era": "1412-1431",
            "culture": "French",
            "vector": [1.0, 0.7, 0.6, 0.65, 0.9, 0.95, 0.7, 0.85],
            "known_for": "Warrior saint, visionary leader",
            "quote": "I am not afraid; I was born to do this.",
            "domains": ["courage", "faith", "leadership", "sacrifice"]
        },
        {
            "name": "Miyamoto Musashi",
            "era": "1584-1645",
            "culture": "Japanese",
            "vector": [0.9, 0.85, 0.9, 0.65, 0.75, 1.0, 0.4, 0.85],
            "known_for": "Legendary swordsman, author of The Book of Five Rings",
            "quote": "Think lightly of yourself and deeply of the world.",
            "domains": ["strategy", "mastery", "discipline", "art"]
        },
        {
            "name": "Boudica",
            "era": "d. 60/61 CE",
            "culture": "Celtic British",
            "vector": [0.95, 0.75, 0.65, 0.6, 0.8, 1.0, 0.85, 0.5],
            "known_for": "Queen of the Iceni, led uprising against Rome",
            "quote": "We British are used to women commanders in war.",
            "domains": ["rebellion", "justice", "motherhood", "courage"]
        },
        {
            "name": "Saladin",
            "era": "1137-1193",
            "culture": "Kurdish",
            "vector": [0.85, 0.9, 0.8, 0.7, 0.75, 0.9, 0.8, 0.7],
            "known_for": "Sultan, united Muslim world, chivalric warrior",
            "quote": "I have become so great only through generosity.",
            "domains": ["chivalry", "strategy", "mercy", "leadership"]
        },
        {
            "name": "Harriet Tubman",
            "era": "1822-1913",
            "culture": "American",
            "vector": [0.95, 0.8, 0.75, 0.6, 0.9, 0.95, 0.9, 0.75],
            "known_for": "Escaped slave, conductor of Underground Railroad",
            "quote": "I freed a thousand slaves. I could have freed a thousand more if only they knew they were slaves.",
            "domains": ["freedom", "courage", "faith", "service"]
        },
        {
            "name": "Sun Tzu",
            "era": "544-496 BCE",
            "culture": "Chinese",
            "vector": [0.8, 0.85, 1.0, 0.5, 0.85, 0.9, 0.45, 0.8],
            "known_for": "Military strategist, author of The Art of War",
            "quote": "The supreme art of war is to subdue the enemy without fighting.",
            "domains": ["strategy", "wisdom", "timing", "psychology"]
        },
        {
            "name": "Cyrus the Great",
            "era": "600-530 BCE",
            "culture": "Persian",
            "vector": [0.9, 0.85, 0.8, 0.75, 0.9, 0.85, 0.8, 0.7],
            "known_for": "Founded Persian Empire, first human rights declaration",
            "quote": "Success always calls for greater generosity.",
            "domains": ["empire", "tolerance", "justice", "greatness"]
        },
    ],

    # ========== MYSTICS & SPIRITUAL TEACHERS ==========
    "mystics": [
        {
            "name": "Meister Eckhart",
            "era": "1260-1328",
            "culture": "German",
            "vector": [0.7, 0.55, 0.9, 0.7, 0.95, 0.4, 0.7, 1.0],
            "known_for": "Christian mystic, preacher of divine union",
            "quote": "The eye through which I see God is the same eye through which God sees me.",
            "domains": ["mysticism", "detachment", "unity", "paradox"]
        },
        {
            "name": "Ramana Maharshi",
            "era": "1879-1950",
            "culture": "Indian",
            "vector": [0.65, 0.6, 0.8, 0.65, 0.85, 0.3, 0.75, 1.0],
            "known_for": "Sage of Arunachala, teacher of self-inquiry",
            "quote": "Your own Self-realization is the greatest service you can render the world.",
            "domains": ["self-inquiry", "silence", "presence", "liberation"]
        },
        {
            "name": "Teresa of Ávila",
            "era": "1515-1582",
            "culture": "Spanish",
            "vector": [0.85, 0.75, 0.8, 0.8, 0.9, 0.7, 0.85, 0.95],
            "known_for": "Carmelite mystic, doctor of the church",
            "quote": "Let nothing disturb you. Let nothing frighten you. All things pass.",
            "domains": ["prayer", "reform", "ecstasy", "practicality"]
        },
        {
            "name": "Thich Nhat Hanh",
            "era": "1926-2022",
            "culture": "Vietnamese",
            "vector": [0.7, 0.75, 0.85, 0.8, 0.85, 0.5, 0.95, 0.95],
            "known_for": "Zen master, peace activist, poet",
            "quote": "There is no way to happiness. Happiness is the way.",
            "domains": ["mindfulness", "peace", "engaged Buddhism", "poetry"]
        },
        {
            "name": "Hildegard of Bingen",
            "era": "1098-1179",
            "culture": "German",
            "vector": [0.8, 0.75, 0.85, 0.95, 0.9, 0.65, 0.7, 0.9],
            "known_for": "Abbess, composer, visionary, healer",
            "quote": "Glance at the sun. See the moon and stars. Gaze at the beauty of earth's greenings. Now, think.",
            "domains": ["visions", "music", "healing", "nature"]
        },
        {
            "name": "Shams Tabrizi",
            "era": "1185-1248",
            "culture": "Persian",
            "vector": [0.85, 0.35, 0.75, 0.8, 0.95, 0.8, 0.9, 0.95],
            "known_for": "Sufi master, spiritual teacher of Rumi",
            "quote": "The universe is not outside of you. Look inside yourself; everything that you want, you already are.",
            "domains": ["transmission", "shock", "love", "transformation"]
        },
    ],

    # ========== SCIENTISTS & INVENTORS ==========
    "scientists": [
        {
            "name": "Marie Curie",
            "era": "1867-1934",
            "culture": "Polish-French",
            "vector": [0.85, 0.9, 0.95, 0.6, 0.9, 0.8, 0.5, 0.65],
            "known_for": "Physicist, chemist, two-time Nobel laureate",
            "quote": "Nothing in life is to be feared, it is only to be understood.",
            "domains": ["discovery", "persistence", "radiation", "pioneering"]
        },
        {
            "name": "Leonardo da Vinci",
            "era": "1452-1519",
            "culture": "Italian",
            "vector": [0.9, 0.8, 1.0, 1.0, 0.95, 0.7, 0.55, 0.8],
            "known_for": "Polymath: artist, inventor, scientist",
            "quote": "Learning never exhausts the mind.",
            "domains": ["art", "science", "invention", "curiosity"]
        },
        {
            "name": "Nikola Tesla",
            "era": "1856-1943",
            "culture": "Serbian-American",
            "vector": [0.85, 0.7, 1.0, 0.7, 0.95, 0.75, 0.35, 0.85],
            "known_for": "Inventor of AC electrical system, visionary",
            "quote": "If you want to find the secrets of the universe, think in terms of energy, frequency and vibration.",
            "domains": ["electricity", "invention", "vision", "genius"]
        },
        {
            "name": "Ada Lovelace",
            "era": "1815-1852",
            "culture": "British",
            "vector": [0.8, 0.85, 1.0, 0.75, 0.9, 0.6, 0.55, 0.75],
            "known_for": "First computer programmer, visionary of computing",
            "quote": "That brain of mine is something more than merely mortal.",
            "domains": ["mathematics", "computation", "imagination", "pioneering"]
        },
        {
            "name": "Albert Einstein",
            "era": "1879-1955",
            "culture": "German-American",
            "vector": [0.85, 0.6, 1.0, 0.75, 0.95, 0.65, 0.65, 0.9],
            "known_for": "Physicist, theory of relativity",
            "quote": "Imagination is more important than knowledge.",
            "domains": ["physics", "imagination", "pacifism", "wonder"]
        },
    ],

    # ========== ARTISTS & MUSICIANS ==========
    "artists": [
        {
            "name": "Frida Kahlo",
            "era": "1907-1954",
            "culture": "Mexican",
            "vector": [0.95, 0.6, 0.75, 0.95, 0.8, 0.85, 0.85, 0.7],
            "known_for": "Painter of surreal self-portraits, icon of resilience",
            "quote": "I paint myself because I am so often alone and because I am the subject I know best.",
            "domains": ["art", "identity", "pain", "authenticity"]
        },
        {
            "name": "Johann Sebastian Bach",
            "era": "1685-1750",
            "culture": "German",
            "vector": [0.75, 0.95, 0.9, 0.95, 0.85, 0.6, 0.7, 0.9],
            "known_for": "Composer, master of counterpoint",
            "quote": "The aim and final end of all music should be none other than the glory of God.",
            "domains": ["music", "mathematics", "devotion", "mastery"]
        },
        {
            "name": "Hokusai",
            "era": "1760-1849",
            "culture": "Japanese",
            "vector": [0.8, 0.75, 0.85, 0.95, 0.9, 0.65, 0.55, 0.85],
            "known_for": "Ukiyo-e artist, The Great Wave",
            "quote": "From the age of six I had a mania for drawing.",
            "domains": ["art", "nature", "obsession", "mastery"]
        },
        {
            "name": "Nina Simone",
            "era": "1933-2003",
            "culture": "American",
            "vector": [0.9, 0.65, 0.8, 0.9, 0.85, 0.85, 0.8, 0.75],
            "known_for": "Pianist, singer, civil rights activist",
            "quote": "I'll tell you what freedom is to me: no fear.",
            "domains": ["music", "justice", "passion", "freedom"]
        },
        {
            "name": "Michelangelo",
            "era": "1475-1564",
            "culture": "Italian",
            "vector": [0.9, 0.85, 0.85, 1.0, 0.85, 0.8, 0.45, 0.8],
            "known_for": "Sculptor, painter, architect of divine forms",
            "quote": "I saw the angel in the marble and carved until I set him free.",
            "domains": ["sculpture", "painting", "divinity", "perfectionism"]
        },
    ],
}


def calculate_resonance(v1: List[float], v2: List[float]) -> float:
    """Calculate cosine similarity between two vectors."""
    a = np.array(v1)
    b = np.array(v2)
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))


def find_historical_matches(
    vector: List[float],
    top_n: int = 10,
    categories: List[str] = None
) -> List[Dict]:
    """
    Find historical figures who share similar 16D signatures.

    Args:
        vector: The 16D vector to match
        top_n: Number of matches to return
        categories: Optional filter for categories (philosophers, poets, etc.)

    Returns:
        List of matched figures with resonance scores
    """
    all_figures = []

    if categories is None:
        categories = list(HISTORICAL_FIGURES.keys())

    for category in categories:
        if category in HISTORICAL_FIGURES:
            for figure in HISTORICAL_FIGURES[category]:
                resonance = calculate_resonance(vector, figure['vector'])
                all_figures.append({
                    **figure,
                    'category': category,
                    'resonance': resonance,
                    'match_percent': f"{resonance:.1%}"
                })

    # Sort by resonance
    all_figures.sort(key=lambda x: x['resonance'], reverse=True)

    return all_figures[:top_n]


def get_figure_by_name(name: str) -> Dict:
    """Look up a specific historical figure."""
    for category, figures in HISTORICAL_FIGURES.items():
        for figure in figures:
            if figure['name'].lower() == name.lower():
                return {**figure, 'category': category}
    return None


def get_all_categories() -> List[str]:
    """Get list of all available categories."""
    return list(HISTORICAL_FIGURES.keys())


def get_figures_by_category(category: str) -> List[Dict]:
    """Get all figures in a specific category."""
    return HISTORICAL_FIGURES.get(category, [])


if __name__ == "__main__":
    # Test with Hadi's vector
    hadi_vector = [0.549, 0.411, 0.421, 0.705, 0.327, 0.760, 1.000, 0.692]

    print("Historical Matches for Hadi's 16D:")
    print("=" * 60)

    matches = find_historical_matches(hadi_vector, top_n=10)

    for i, match in enumerate(matches, 1):
        print(f"\n{i}. {match['name']} ({match['culture']}, {match['era']})")
        print(f"   Category: {match['category'].title()}")
        print(f"   Resonance: {match['match_percent']}")
        print(f"   Known for: {match['known_for']}")
        print(f"   Quote: \"{match['quote']}\"")
