from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path


SOURCE_PAGES = Path(
    "/Users/BlakeYoung/Library/Mobile Documents/com~apple~CloudDocs/5 fold life/"
    "Five Fold life Core Documents/Core Doc research /DEC 2025 final 20 Profiles/"
    "5 Fold Life Master Profiles doc Dec 16th 2025 Copyright Blake Young.pages"
)
OUTPUT_JSON = Path(__file__).resolve().parents[1] / "frontend" / "assets" / "profile-guide.json"
OUTPUT_MODULE = Path(__file__).resolve().parents[1] / "frontend" / "assets" / "profile-guide.mjs"

GIFT_KEYS = {
    "Apostolic": "apostle",
    "Prophetic": "prophet",
    "Evangelistic": "evangelist",
    "Pastoral": "pastor",
    "Teaching": "teacher",
}

HEADING_RE = re.compile(
    r"(?m)^(Apostolic|Prophetic|Evangelistic|Pastoral|Teaching)\u00a0\+\u00a0"
    r"(Apostolic|Prophetic|Evangelistic|Pastoral|Teaching)\s+[–-]\s+(.+)$"
)
LEVEL_RE = re.compile(
    r"(?ms)^Level\u00a0(\d+)\s+[–-]\s+(.+?)(?=^Level\u00a0\d+\s+[–-]\s+|\Z)"
)


def load_pages_text(path: Path) -> str:
    escaped_path = str(path).replace("\\", "\\\\").replace('"', '\\"')
    script = f"""
tell application "Pages"
  set theDoc to open POSIX file "{escaped_path}"
  delay 1
  set docText to (body text of theDoc as string)
  close theDoc saving no
  return docText
end tell
"""
    output = subprocess.check_output(["osascript", "-e", script])
    return output.decode("utf-8").replace("\r", "\n").strip()


def clean_block(text: str) -> str:
    return text.strip()


def extract_section(segment: str, start_label: str, end_labels: list[str]) -> str:
    start = segment.index(start_label) + len(start_label)
    end_positions = [segment.find(label, start) for label in end_labels]
    end_positions = [position for position in end_positions if position != -1]
    end = min(end_positions) if end_positions else len(segment)
    return clean_block(segment[start:end])


def parse_bullets(block: str) -> list[str]:
    return [item.strip() for item in block.split("• ") if item.strip()]


def parse_health_levels(block: str) -> list[dict[str, object]]:
    levels: list[dict[str, object]] = []

    for match in LEVEL_RE.finditer(block):
        levels.append(
            {
                "level": int(match.group(1)),
                "text": clean_block(match.group(2)),
            }
        )

    return levels


def first_paragraph(text: str) -> str:
    return clean_block(text.split("\n\n", 1)[0])


def parse_profile_segment(heading: str, segment: str) -> dict[str, object]:
    match = HEADING_RE.match(heading)
    if not match:
      raise ValueError(f"Could not parse heading: {heading}")

    primary_label, companion_label, profile_name = match.groups()
    section_labels = [
        "Premium extension",
        "Scripture Foundations",
        "Biblical Exemplars",
        "Flow (Healthy Expression)",
        "Fight (Unhealthy Expression)",
        "Approaching Your Conditional, Challenge and Counter Natures",
        "Seven Levels of Health",
    ]

    free_introduction = extract_section(
        segment,
        "Free introduction (included in the free version)\n",
        section_labels,
    )
    premium_extension = extract_section(
        segment,
        "Premium extension\n",
        section_labels[1:],
    )
    scripture_foundations = extract_section(
        segment,
        "Scripture Foundations\n",
        section_labels[2:],
    )
    biblical_exemplars = extract_section(
        segment,
        "Biblical Exemplars\n",
        section_labels[3:],
    )
    flow = extract_section(
        segment,
        "Flow (Healthy Expression)\n",
        section_labels[4:],
    )
    fight = extract_section(
        segment,
        "Fight (Unhealthy Expression)\n",
        section_labels[5:],
    )
    conditional_challenge_counter = extract_section(
        segment,
        "Approaching Your Conditional, Challenge and Counter Natures\n",
        section_labels[6:],
    )
    health_levels = extract_section(segment, "Seven Levels of Health\n", [])

    return {
        "name": profile_name,
        "heading": heading,
        "primaryGift": GIFT_KEYS[primary_label],
        "companionGift": GIFT_KEYS[companion_label],
        "summary": first_paragraph(free_introduction),
        "designStory": {
            "freeIntroduction": free_introduction,
            "premiumExtension": premium_extension,
        },
        "scriptureFoundations": parse_bullets(scripture_foundations),
        "biblicalExemplars": parse_bullets(biblical_exemplars),
        "fightFlow": {
            "flow": parse_bullets(flow),
            "fight": parse_bullets(fight),
        },
        "conditionalChallengeCounter": parse_bullets(conditional_challenge_counter),
        "healthLevels": parse_health_levels(health_levels),
    }


def parse_guide(text: str) -> dict[str, object]:
    matches = list(HEADING_RE.finditer(text))
    appendix_index = text.find("Seven Levels of Health for Each Fivefold Gift")
    end_of_profiles = appendix_index if appendix_index != -1 else len(text)
    profiles: dict[str, object] = {}

    for index, match in enumerate(matches):
        heading = match.group(0)
        start = match.start()
        end = matches[index + 1].start() if index + 1 < len(matches) else end_of_profiles
        segment = clean_block(text[start:end])
        profile = parse_profile_segment(heading, segment)
        profiles[profile["name"]] = profile

    return {
        "title": clean_block(text.split("\n", 1)[0]),
        "profiles": profiles,
    }


def validate_guide(guide: dict[str, object]) -> None:
    profiles = guide["profiles"]
    if len(profiles) != 20:
        raise ValueError(f"Expected 20 profiles, found {len(profiles)}")

    for name, profile in profiles.items():
        health_levels = profile["healthLevels"]
        if len(health_levels) != 7:
            raise ValueError(f"{name} should have 7 health levels, found {len(health_levels)}")

        if not profile["designStory"]["freeIntroduction"]:
            raise ValueError(f"{name} is missing free introduction text")

        if not profile["designStory"]["premiumExtension"]:
            raise ValueError(f"{name} is missing premium extension text")

        if not profile["fightFlow"]["flow"] or not profile["fightFlow"]["fight"]:
            raise ValueError(f"{name} is missing fight/flow content")


def main() -> None:
    text = load_pages_text(SOURCE_PAGES)
    guide = parse_guide(text)
    validate_guide(guide)
    serialized = json.dumps(guide, indent=2, ensure_ascii=False)
    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_JSON.write_text(serialized, encoding="utf-8")
    OUTPUT_MODULE.write_text(f"export default {serialized};\n", encoding="utf-8")
    print(f"Wrote {OUTPUT_JSON}")
    print(f"Wrote {OUTPUT_MODULE}")


if __name__ == "__main__":
    main()
