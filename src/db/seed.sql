-- The Realm of Patterns - Seed Data
-- Run: wrangler d1 execute therealmofpatterns-db --file=src/db/seed.sql

-- ============================================
-- Historical Figures (Sample Dataset)
-- ============================================
-- Vectors are pre-computed 8D signatures based on birth charts

INSERT INTO historical_figures (name, era, culture, domains, vector, quote, bio) VALUES

-- Mystics & Poets
('Rumi', '1207-1273', 'Persian', '["poetry","mysticism","philosophy"]',
 '[0.72, 0.45, 0.88, 0.91, 0.85, 0.33, 0.78, 0.95]',
 'What you seek is seeking you.',
 'Persian poet, mystic, and founder of the Mevlevi Order'),

('Hafez', '1315-1390', 'Persian', '["poetry","mysticism","love"]',
 '[0.68, 0.52, 0.75, 0.95, 0.72, 0.28, 0.85, 0.88]',
 'I wish I could show you the astonishing light of your own being.',
 'Persian lyric poet whose collected works are a touchstone of Persian culture'),

('William Blake', '1757-1827', 'English', '["poetry","art","mysticism"]',
 '[0.85, 0.42, 0.78, 0.82, 0.65, 0.55, 0.48, 0.92]',
 'To see a World in a Grain of Sand.',
 'English poet, painter, and printmaker, now considered a seminal figure'),

-- Scientists & Thinkers
('Nikola Tesla', '1856-1943', 'Serbian-American', '["science","invention","electricity"]',
 '[0.88, 0.75, 0.95, 0.45, 0.72, 0.85, 0.35, 0.78]',
 'If you want to find the secrets of the universe, think in terms of energy, frequency and vibration.',
 'Inventor, electrical engineer, and futurist known for AC electricity'),

('Marie Curie', '1867-1934', 'Polish-French', '["science","physics","chemistry"]',
 '[0.72, 0.92, 0.88, 0.48, 0.68, 0.75, 0.55, 0.65]',
 'Nothing in life is to be feared, it is only to be understood.',
 'Physicist and chemist, first woman to win a Nobel Prize'),

('Carl Jung', '1875-1961', 'Swiss', '["psychology","philosophy","mysticism"]',
 '[0.78, 0.65, 0.85, 0.72, 0.88, 0.45, 0.68, 0.95]',
 'Who looks outside, dreams; who looks inside, awakes.',
 'Psychiatrist and psychoanalyst who founded analytical psychology'),

-- Artists & Creators
('Leonardo da Vinci', '1452-1519', 'Italian', '["art","science","invention"]',
 '[0.92, 0.85, 0.95, 0.88, 0.78, 0.72, 0.55, 0.82]',
 'Learning never exhausts the mind.',
 'Polymath of the Renaissance, painter, sculptor, architect, scientist'),

('Frida Kahlo', '1907-1954', 'Mexican', '["art","feminism","surrealism"]',
 '[0.75, 0.58, 0.65, 0.92, 0.55, 0.88, 0.85, 0.72]',
 'I paint myself because I am so often alone and because I am the subject I know best.',
 'Mexican artist known for her portraits, self-portraits, and works inspired by Mexican folk art'),

('Mozart', '1756-1791', 'Austrian', '["music","composition","performance"]',
 '[0.82, 0.48, 0.88, 0.95, 0.85, 0.65, 0.72, 0.78]',
 'The music is not in the notes, but in the silence between.',
 'Prolific and influential composer of the Classical period'),

-- Leaders & Warriors
('Joan of Arc', '1412-1431', 'French', '["leadership","spirituality","courage"]',
 '[0.88, 0.75, 0.55, 0.62, 0.72, 0.95, 0.68, 0.85]',
 'I am not afraid. I was born to do this.',
 'French heroine and military leader, canonized as a saint'),

('Marcus Aurelius', '121-180', 'Roman', '["philosophy","leadership","stoicism"]',
 '[0.72, 0.95, 0.85, 0.55, 0.68, 0.78, 0.65, 0.82]',
 'The impediment to action advances action. What stands in the way becomes the way.',
 'Roman emperor and Stoic philosopher, author of Meditations'),

('Harriet Tubman', '1822-1913', 'American', '["liberation","courage","spirituality"]',
 '[0.85, 0.72, 0.58, 0.65, 0.78, 0.92, 0.88, 0.75]',
 'Every great dream begins with a dreamer.',
 'Abolitionist and political activist who escaped slavery'),

-- Philosophers
('Lao Tzu', '6th century BCE', 'Chinese', '["philosophy","taoism","mysticism"]',
 '[0.45, 0.72, 0.78, 0.85, 0.65, 0.28, 0.88, 0.95]',
 'The Tao that can be told is not the eternal Tao.',
 'Ancient Chinese philosopher, founder of Taoism'),

('Hypatia', '350-415', 'Greek-Egyptian', '["philosophy","mathematics","astronomy"]',
 '[0.78, 0.85, 0.92, 0.65, 0.72, 0.55, 0.48, 0.88]',
 'Reserve your right to think, for even to think wrongly is better than not to think at all.',
 'Neoplatonist philosopher, mathematician, and astronomer in Alexandria'),

('Friedrich Nietzsche', '1844-1900', 'German', '["philosophy","psychology","culture"]',
 '[0.92, 0.55, 0.88, 0.48, 0.85, 0.78, 0.42, 0.72]',
 'He who has a why to live can bear almost any how.',
 'Philosopher known for critiques of religion, morality, and contemporary culture'),

-- Spiritual Teachers
('Buddha', '563-483 BCE', 'Indian', '["spirituality","philosophy","meditation"]',
 '[0.55, 0.82, 0.75, 0.88, 0.72, 0.35, 0.95, 0.98]',
 'Peace comes from within. Do not seek it without.',
 'Spiritual teacher and founder of Buddhism'),

('Ramana Maharshi', '1879-1950', 'Indian', '["spirituality","self-inquiry","advaita"]',
 '[0.48, 0.78, 0.72, 0.82, 0.65, 0.32, 0.92, 0.98]',
 'Your own Self-realization is the greatest service you can render the world.',
 'Indian sage who recommended self-inquiry as the path to enlightenment'),

('Thich Nhat Hanh', '1926-2022', 'Vietnamese', '["buddhism","peace","mindfulness"]',
 '[0.52, 0.75, 0.68, 0.88, 0.72, 0.38, 0.95, 0.92]',
 'Walk as if you are kissing the Earth with your feet.',
 'Buddhist monk, peace activist, and founder of Plum Village'),

-- Explorers & Adventurers
('Ibn Battuta', '1304-1369', 'Moroccan', '["exploration","writing","travel"]',
 '[0.85, 0.62, 0.72, 0.65, 0.95, 0.78, 0.58, 0.68]',
 'Traveling leaves you speechless, then turns you into a storyteller.',
 'Moroccan scholar and explorer who traveled extensively across the medieval world'),

('Amelia Earhart', '1897-1937', 'American', '["aviation","exploration","courage"]',
 '[0.88, 0.68, 0.72, 0.55, 0.92, 0.85, 0.48, 0.75]',
 'The most effective way to do it, is to do it.',
 'Aviation pioneer and first woman to fly solo across the Atlantic');
