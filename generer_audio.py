#!/usr/bin/env python3
"""Génère les audios français et anglais de « Pont du terroir ».

Usage (depuis le dossier du projet) :
    python generer_audio.py          -> français puis anglais
    python generer_audio.py fr       -> français seulement
    python generer_audio.py en       -> anglais seulement

Les fichiers déjà créés sont ignorés : on peut relancer sans risque
si la connexion s'interrompt.
"""
import glob
import json
import os
import sys
import time

try:
    from gtts import gTTS
except ImportError:
    sys.exit("gTTS n'est pas installé. Tape : pip install gTTS")

DOSSIER = os.path.dirname(os.path.abspath(__file__))
LANGUES = {"fr": "fr", "en": "en"}


def nettoyer(texte):
    # « Good luck! / Stay strong! » est lu comme deux phrases
    return texte.replace(" / ", ". ").replace("/", " ou ").strip()


def generer(code):
    fichiers = sorted(glob.glob(os.path.join(DOSSIER, "data", "serie-*.json")))
    if not fichiers:
        sys.exit("Aucun fichier data/serie-XX.json trouvé. Lance le script dans le dossier du projet.")

    sortie = os.path.join(DOSSIER, "audio", code)
    os.makedirs(sortie, exist_ok=True)

    phrases = []
    for f in fichiers:
        with open(f, encoding="utf-8") as fh:
            phrases += json.load(fh)

    total, faits, ignores, echecs = len(phrases), 0, 0, []
    print(f"\n=== {code.upper()} : {total} phrases ===")

    for i, p in enumerate(phrases, 1):
        texte = nettoyer(p.get(code, ""))
        chemin = os.path.join(sortie, p["id"] + ".mp3")
        if not texte:
            continue
        if os.path.exists(chemin) and os.path.getsize(chemin) > 0:
            ignores += 1
            continue
        for essai in range(3):
            try:
                gTTS(text=texte, lang=LANGUES[code]).save(chemin)
                faits += 1
                break
            except Exception as e:
                if os.path.exists(chemin):
                    os.remove(chemin)
                if essai == 2:
                    echecs.append((p["id"], str(e)[:60]))
                else:
                    time.sleep(2)
        if i % 10 == 0 or i == total:
            print(f"  {i}/{total}", flush=True)
        time.sleep(0.4)

    print(f"{code.upper()} : {faits} créés, {ignores} déjà présents, {len(echecs)} échecs")
    for ident, erreur in echecs:
        print("   échec :", ident, erreur)
    return not echecs


if __name__ == "__main__":
    choix = sys.argv[1:] or ["fr", "en"]
    for c in choix:
        if c not in LANGUES:
            sys.exit(f"Langue inconnue : {c} (choisis fr ou en)")
    ok = all([generer(c) for c in choix])
    if not ok:
        print("\nCertains audios ont échoué : relance simplement la même commande.")
