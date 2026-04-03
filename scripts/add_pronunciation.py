import json
import os

def remove_diacritics(text):
    """Removes special accent characters and makes text standard ASCII."""
    if not text:
        return text

    mapping = {
        # Lowercase accents
        'ā': 'a', 'ī': 'i', 'ū': 'u',
        'ḥ': 'h', 'ṭ': 't', 'ṣ': 's', 'ḍ': 'd', 'ẓ': 'z',
        'ʿ': 'a',  # 'Ayn (often transliterated as a)
        'ʾ': '',   # Hamza (removed for easier typing)

        # Uppercase accents
        'Ā': 'A', 'Ī': 'I', 'Ū': 'U',
        'Ḥ': 'H', 'Ṭ': 'T', 'Ṣ': 'S', 'Ḍ': 'D', 'Ẓ': 'Z',

        # Hard-to-type punctuation often found in these datasets
        "'": "",   # e.g., bis'mi -> bismi
        "’": "",
        "‘": ""
    }

    for char, replacement in mapping.items():
        text = text.replace(char, replacement)

    return text

def simplify_word_transliteration(text):
    """Applies Sun/Moon letter rules and formats the word."""
    if not text:
        return text

    # 1. Strip the accents first
    text = remove_diacritics(text).lower()

    # Sun letters in simple English representation
    sun_digraphs = ['th', 'dh', 'sh']
    sun_singles = ['t', 'd', 'r', 'z', 's', 'n', 'l']

    # 2. Handle the 'l-' prefix (Al-) with Sun and Moon letters
    if text.startswith('l-'):
        base_word = text[2:] # Get the word after 'l-'

        if any(base_word.startswith(dg) for dg in sun_digraphs):
            # e.g., l-shamsi -> ashshamsi
            prefix = base_word[:2]
            text = 'a' + prefix + base_word
        elif len(base_word) > 0 and base_word[0] in sun_singles:
            # e.g., l-rahmani -> arrahmani
            prefix = base_word[0]
            text = 'a' + prefix + base_word
        else:
            # Moon letter e.g., l-qamari -> alqamari
            text = 'al' + base_word

    # 3. Remove any remaining hyphens (e.g., wa-l-kitabi -> walkitabi)
    text = text.replace('-', '')

    # 4. Capitalize the first letter for neatness
    return text.capitalize()

def process_quran_json(input_path, output_path):
    print(f"Loading data from {input_path}...")

    with open(input_path, 'r', encoding='utf-8') as f:
        quran_data = json.load(f)

    print(f"Successfully loaded {len(quran_data)} verses. Processing...")

    count = 0
    for verse_key, verse_data in quran_data.items():
        # Add the new field to the main verse
        if "transliteration" in verse_data:
            verse_data["easy_transliteration"] = remove_diacritics(verse_data["transliteration"])

        # Process every individual word and add the new field
        if "words" in verse_data:
            for word in verse_data["words"]:
                if "transliteration" in word:
                    word["easy_transliteration"] = simplify_word_transliteration(word["transliteration"])

        count += 1
        if count % 1000 == 0:
            print(f"Processed {count} verses...")

    print(f"Finished processing! Saving to {output_path}...")

    # Save the new JSON file
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(quran_data, f, ensure_ascii=False, indent=4)

    print("Done! Your new file is ready.")

# ==========================================
# RUN THE SCRIPT HERE
# ==========================================
if __name__ == "__main__":
    # Change these paths to point to where your file is saved
    INPUT_FILE = "data.json"
    OUTPUT_FILE = "data_fixed.json"

    # Make sure the input file exists before running
    if os.path.exists(INPUT_FILE):
        process_quran_json(INPUT_FILE, OUTPUT_FILE)
    else:
        print(f"Error: Could not find the file '{INPUT_FILE}'. Please check the path!")
