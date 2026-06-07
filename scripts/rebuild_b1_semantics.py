import json
import re
from pathlib import Path

from nltk.corpus import wordnet as wn
from wordfreq import zipf_frequency

path = Path('assets/data/B1.json')
data = json.loads(path.read_text(encoding='utf-8'))

WORD_RE = re.compile(r'^[a-z\-]+$')


def normalize(word):
    return word.strip().lower().replace('_', ' ')


def infer_target_pos(word, meanings):
    text = ' '.join(meanings).lower()
    if any(token.endswith(('mek', 'mak')) for token in text.split()):
        return 'v'

    if any(token.endswith(('li', 'lı', 'lu', 'lü', 'si', 'sı', 'su', 'sü')) for token in text.split()):
        if wn.synsets(word, pos='a'):
            return 'a'

    if word.endswith(('ed', 'ing', 'ous', 'ive', 'ful', 'less', 'able', 'ible', 'al', 'ic', 'ish')) and wn.synsets(word, pos='a'):
        return 'a'

    if wn.synsets(word, pos='n'):
        return 'n'
    if wn.synsets(word, pos='v'):
        return 'v'
    if wn.synsets(word, pos='a'):
        return 'a'
    if wn.synsets(word, pos='r'):
        return 'r'

    synsets = wn.synsets(word)
    if synsets:
        return synsets[0].pos()
    return None


def candidate_ok(candidate, target_pos):
    candidate = candidate.strip().lower()
    if not WORD_RE.fullmatch(candidate):
        return False

    if target_pos == 'v' and candidate.endswith(('ing', 'ed', 'en')):
        return False
    if target_pos == 'a' and candidate.endswith(('ing', 'ed')):
        return False

    try:
        freq = zipf_frequency(candidate, 'en')
    except Exception:
        freq = 0
    if freq < 2.5:
        return False

    return bool(wn.synsets(candidate, pos=target_pos))


def gather(word, target_pos, ant=False):
    synsets = wn.synsets(word, pos=target_pos) or wn.synsets(word)
    if not synsets:
        return []

    collected = []
    for synset in synsets[:3]:
        if ant:
            for lemma in synset.lemmas():
                for antonym in lemma.antonyms():
                    candidate = antonym.name().replace('_', ' ').lower()
                    if candidate_ok(candidate, target_pos):
                        collected.append(candidate)
        else:
            for lemma in synset.lemmas():
                candidate = lemma.name().replace('_', ' ').lower()
                if candidate_ok(candidate, target_pos):
                    collected.append(candidate)

    seen = set()
    filtered = []
    for candidate in collected:
        if candidate not in seen:
            seen.add(candidate)
            filtered.append(candidate)
    return filtered[:3]


for entry in data['words']:
    word = normalize(entry['word'])
    target_pos = infer_target_pos(word, entry.get('meanings', []))

    if target_pos is None:
        entry['synonyms'] = ['none']
        entry['opposites'] = ['none']
        continue

    synonyms = gather(word, target_pos)
    opposites = gather(word, target_pos, ant=True)

    entry['synonyms'] = synonyms if synonyms else ['none']
    entry['opposites'] = opposites if opposites else ['none']

path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
print(json.dumps({'updated': len(data['words'])}, indent=2))
