import json
import subprocess
import xml.etree.ElementTree as ET
from pathlib import Path

ET.register_namespace("", "http://www.w3.org/2000/svg")

icons = {
    "bow": "delapouite/bow-arrow", "dart": "lorc/chemical-arrow",
    "swords": "lorc/crossed-swords", "mark": "lorc/target-shot",
    "leaf": "lorc/leaf-swirl", "skull": "lorc/skull-mask",
    "flame": "carl-olsen/flame", "slot": "lorc/crystal-bars",
    "die": "skoll/d10", "short": "lorc/campfire", "long": "delapouite/night-sleep"
}
symbols = []
for name, source in icons.items():
    raw = subprocess.check_output(["curl", "-fsS", "https://raw.githubusercontent.com/game-icons/icons/master/" + source + ".svg"])
    root = ET.fromstring(raw)
    paths = []
    for element in root:
        if element.get("fill") == "#fff":
            element.set("fill", "currentColor")
            paths.append(ET.tostring(element, encoding="unicode"))
    if not paths:
        raise ValueError(source)
    symbols.append('<symbol id="gi-' + name + '" viewBox="0 0 512 512">' + "".join(paths) + "</symbol>")
Path(__file__).with_name("icon-data.js").write_text("window.solkanIcons = " + json.dumps("".join(symbols)) + ";\n")
