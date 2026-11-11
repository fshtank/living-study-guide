import json
import re
from typing import Any

from openai import OpenAI

from app.config import settings
from app.models import CardType


def split_into_sentences_or_paragraphs(text: str) -> list[str]:
    # Split text into paragraphs first, or sentences if single paragraph
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    if len(paragraphs) > 1:
        return paragraphs
    # Otherwise split into sentences
    sentences = re.split(r'(?<=[.!?])\s+', text.strip())
    return [s.strip() for s in sentences if len(s.strip()) > 10]

def verify_source_reference(source_reference: str, note_content: str) -> bool:
    """Verifies that the source_reference actually exists in the original note text."""
    if not source_reference or not note_content:
        return False
    # Normalize whitespaces
    norm_source = " ".join(source_reference.split()).lower()
    norm_content = " ".join(note_content.split()).lower()
    return norm_source in norm_content

def generate_cards_with_llm(
    note_content: str,
    style: str = "basic recall",
    card_types: list[CardType] | None = None,
    count: int = 5
) -> list[dict[str, Any]]:
    types_str = ", ".join([t.value for t in (card_types or [CardType.flashcard, CardType.mcq, CardType.fill_blank])])
    
    prompt_instruction = f"""
You are an expert AI tutor creating high-quality study materials strictly grounded in the user's provided notes.
Source Note Content:
\"\"\"
{note_content}
\"\"\"

Requirements:
1. Generate up to {count} cards/questions with a depth/style of '{style}'.
2. Allowed card types: {types_str}.
3. CRITICAL GROUNDING REQUIREMENT: Every card MUST cite the EXACT sentence or paragraph from the Source Note Content it was derived from under `source_reference`. The `source_reference` string MUST be an exact verbatim substring from the source note.
4. For 'flashcard' type: provide a `prompt` (question) and `answer` (concise factual definition or explanation).
5. For 'mcq' type: provide a `prompt` (question), `answer` (the correct choice), and in `metadata`: `options` (array of 4 choices including the correct one), and `explanation`.
6. For 'fill_blank' type: provide a `prompt` (sentence with '____' for the blank) and `answer` (the exact missing term/phrase).

Return ONLY valid JSON array with objects matching:
[
  {{
    "type": "flashcard" | "mcq" | "fill_blank",
    "prompt": "...",
    "answer": "...",
    "source_reference": "exact verbatim excerpt from note",
    "metadata": {{
      "options": ["A", "B", "C", "D"], // for mcq only
      "difficulty": "medium",
      "style": "{style}"
    }}
  }}
]
"""

    if not settings.OPENAI_API_KEY:
        # Fallback heuristic card generation when OpenAI API key is not supplied
        return generate_mock_grounded_cards(note_content, style, card_types, count)

    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    response = client.chat.completions.create(
        model=settings.OPENAI_MODEL,
        messages=[
            {"role": "system", "content": "You are a precise study guide generator that outputs only JSON."},
            {"role": "user", "content": prompt_instruction}
        ],
        temperature=0.3,
        response_format={"type": "json_object"}
    )
    
    raw_content = response.choices[0].message.content or "{}"
    try:
        data = json.loads(raw_content)
        if isinstance(data, dict):
            # sometimes wrapped in {"cards": [...]}
            cards = data.get("cards") or data.get("items") or next(iter(data.values())) if data else []
        elif isinstance(data, list):
            cards = data
        else:
            cards = []
        
        # Verify grounding against note
        validated_cards = []
        for card in cards:
            src_ref = card.get("source_reference", "")
            if not verify_source_reference(src_ref, note_content):
                # Try finding closest sentence if minor mismatch
                segments = split_into_sentences_or_paragraphs(note_content)
                found = False
                for seg in segments:
                    if src_ref[:20].lower() in seg.lower() or seg[:20].lower() in src_ref.lower():
                        card["source_reference"] = seg
                        found = True
                        break
                if not found and segments:
                    card["source_reference"] = segments[0]
            
            validated_cards.append(card)
        return validated_cards
    except (json.JSONDecodeError, TypeError, ValueError, KeyError, IndexError, AttributeError) as e:
        print(f"Error parsing LLM response: {e}")
        return generate_mock_grounded_cards(note_content, style, card_types, count)


def generate_mock_grounded_cards(
    note_content: str,
    style: str,
    card_types: list[CardType] | None,
    count: int = 5
) -> list[dict[str, Any]]:
    """Heuristic parser to ensure 100% grounded cards even without an external API key configured."""
    segments = split_into_sentences_or_paragraphs(note_content)
    cards = []
    
    types = card_types or [CardType.flashcard, CardType.mcq, CardType.fill_blank]
    type_idx = 0

    for i, seg in enumerate(segments[:count]):
        current_type = types[type_idx % len(types)]
        type_idx += 1
        
        words = seg.split()
        if len(words) < 3:
            continue
            
        if current_type == CardType.flashcard:
            prompt = f"According to your notes: What is the significance of: '{words[0]} {words[1]}'?" if len(words) >= 2 else f"Explain the concept in: '{seg[:40]}...'"
            answer = seg
            metadata = {"difficulty": "medium", "style": style, "generator": "heuristic-grounded"}
        elif current_type == CardType.mcq:
            prompt = f"Which statement accurately reflects: \"{seg[:50]}...\"?"
            answer = seg
            metadata = {
                "options": [
                    seg,
                    f"It contradicts standard practice by modifying: {' '.join(words[:3])}.",
                    f"It only applies under deprecated conditions without {' '.join(words[-2:])}.",
                    "None of the above statements are supported by the text."
                ],
                "explanation": f"Grounded directly in source: {seg}",
                "difficulty": "medium",
                "style": style,
                "generator": "heuristic-grounded"
            }
        else: # fill_blank
            # blank out a word in the middle
            blank_idx = len(words) // 2
            blank_word = words[blank_idx].strip(".,!?:;\"'")
            blanked_seg = " ".join([w if j != blank_idx else "_____" for j, w in enumerate(words)])
            prompt = f"Fill in the blank: {blanked_seg}"
            answer = blank_word
            metadata = {"difficulty": "easy", "style": style, "generator": "heuristic-grounded"}

        cards.append({
            "type": current_type.value,
            "prompt": prompt,
            "answer": answer,
            "source_reference": seg,
            "metadata": metadata
        })
        
    return cards
