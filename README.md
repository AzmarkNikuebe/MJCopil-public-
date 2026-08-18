# 🎲 MJ Copilot V2 — Assistant Virtuel de Table & VTT D&D 5E

**MJ Copilot** est une application tout-en-un conçue pour les Maîtres du Jeu (MJ) de Donjons & Dragons 5e Édition et de jeux de rôle sur table. Elle combine un **Virtual Tabletop (VTT)** interactif, la gestion de fiches de personnages, le suivi de combat et d'initiative en temps réel, un journal de séance dynamique, un écran joueur déporté, et un **Copilote IA hybride** (fonctionnant **100% en local hors-ligne avec Ollama** ou via API Cloud avec Google Gemini / OpenAI).

---

## 📑 Table des Matières
1. [Fonctionnalités Principales](#-fonctionnalités-principales)
2. [Prérequis Système](#-prérequis-système)
3. [Guide d'Installation Rapide](#-guide-dinstallation-rapide)
   - [Option A : Exécutable Standalone (.exe)](#option-a--utilisation-directe-sans-installation-exécutable-recommandé)
   - [Option B : Lancement depuis les Sources Python](#option-b--lancement-depuis-les-sources-python)
4. [Configuration de l'IA (Local vs Cloud)](#-configuration-de-lia)
   - [Moteur Local (Ollama - 100% Gratuit & Hors-ligne)](#1-moteur-ia-local-ollama--recommandé)
   - [Moteur Cloud (Google Gemini API - Gratuit)](#2-moteur-ia-cloud-google-gemini)
5. [Prise en main & Utilisation](#-prise-en-main--utilisation)
6. [Dépannage & FAQ](#-dépannage--faq)
7. [Structure du Projet](#-structure-du-projet)

---

## 🌟 Fonctionnalités Principales

* 🤖 **Copilote IA & Console d'Improvisation** :
  - Génération de répliques de PNJ, descriptions sensorielles de lieux, tactiques de combat et calculs de DD D&D 5E à la volée.
  - **Routage automatique de compétences (Skills)** : l'IA sélectionne automatiquement la compétence appropriée (`🎭 PNJ`, `⚔️ Combat`, `🏰 Ambiance`, `🛡️ Règles`, `💰 Trésors`).
  - **Auto-démarrage transparent d'Ollama** en tâche de fond (aucun terminal nécessaire).
* 📜 **Journal de Séance & Analyse Sémantique** :
  - Prise de notes rapides avec **reformulation narrative instantanée** (~1.5s).
  - Détection automatique et application des conséquences de la séance dans le Codex (relations PNJ, secrets découverts, chronologie).
* ⚔️ **Gestion de Combat & Fiches de Personnages D&D 5E** :
  - Fiches complètes avec modificateurs automatiques, bonus de maîtrise, compétences AideDD et inventaire.
  - **Jets de dés physiques ou intégrés** sans boîtes de dialogue natives intrusives.
  - Trackers de PV, CA, Initiative et États de combat (Empoisonné, Terrorisé, etc.).
* 🐾 **Bestiaire & Import PDF Automatisé** :
  - Importation automatique de monstres et créatures depuis vos manuels PDF via extraction et vision multimodale.
* 🖥️ **Écran Joueur Double-Fenêtre** :
  - Fenêtre dédiée projetable sur second écran ou téléviseur pour afficher les cartes, portraits et ambiances sans dévoiler les notes du MJ.
* 🎨 **Compatibilité Multi-Thèmes** :
  - Thèmes **Sombre (Néon)**, **Clair (Épuré)** et **Parchemin (JDR)** avec contrastes optimisés.

---

## 💻 Prérequis Système

* **Système d'exploitation** : Windows 10 / Windows 11 (64 bits), Linux ou macOS.
* **Processeur** : Tout processeur multi-cœur récent (Intel Core i3/i5/i7 ou AMD Ryzen).
* **Mémoire RAM** :
  - 4 Go minimum pour le logiciel seul ou en mode Cloud (Gemini/OpenAI).
  - 6 à 8 Go recommandés pour l'exécution d'un modèle IA local (Ollama).
* **Espace disque** : ~50 Mo pour l'application (~1.5 Go supplémentaires si Ollama et un modèle local sont installés).

---

## 🚀 Guide d'Installation Rapide

### Option A : Utilisation Directe sans installation (Exécutable Recommandé)

1. Téléchargez ou clonez le dépôt :
   ```bash
   git clone https://github.com/AzmarkNikuebe/MJCopil.git
   cd MJCopil
   ```
2. Double-cliquez directement sur **`MJ_Copilot.exe`** situé à la racine.
3. L'application démarre automatiquement le serveur backend local et ouvre l'interface graphique native.

---

### Option B : Lancement depuis les Sources Python

Si vous souhaitez exécuter ou modifier le code source :

1. **Installer Python** : Assurez-vous que [Python 3.10+](https://www.python.org/downloads/) est installé avec l'option *"Add Python to PATH"* cochée.
2. **Cloner le projet** :
   ```bash
   git clone https://github.com/AzmarkNikuebe/MJCopil.git
   cd MJCopil
   ```
3. **Installer les dépendances requises** :
   ```bash
   pip install -r requirements.txt
   ```
4. **Lancer l'application** :
   ```bash
   python launcher.py
   ```

---

## 🧠 Configuration de l'IA

MJ Copilot prend en charge deux modes d'intelligence artificielle :

### 1. Moteur IA Local : Ollama (⭐ Recommandé — 100% Gratuit & Hors-ligne)

Le mode local vous permet de faire tourner l'IA directement sur votre machine sans dépendre d'Internet ni d'un abonnement.

1. **Installer Ollama** :
   - Téléchargez et installez Ollama depuis le site officiel : **[ollama.com](https://ollama.com/download)**.
2. **Télécharger un modèle léger et rapide** :
   - Ouvrez un terminal (PowerShell ou Invite de commandes) et lancez :
     ```bash
     ollama pull qwen2.5:1.5b
     ```
     *(Ce modèle pèse ~980 Mo, est très performant en français et répond en ~1.5 seconde).*
   - *Modèle alternatif léger :* `ollama pull llama3.2:1b` (~1.3 Go).
3. **Activer dans MJ Copilot** :
   - Ouvrez MJ Copilot et cliquez sur **`⚙️ Config IA`** dans l'en-tête en haut à droite.
   - Sélectionnez le moteur **`Ollama Local`**.
   - Choisissez **`qwen2.5:1.5b`** dans la liste déroulante des modèles détectés.
   - Cliquez sur **`Sauvegarder Configuration`**.
   - *Note :* Dès que vous utilisez l'application, le serveur Ollama est démarré automatiquement en arrière-plan sans action manuelle.

---

### 2. Moteur IA Cloud : Google Gemini

Si vous préférez une intelligence très poussée pour générer des campagnes entières depuis de gros PDF :

1. Obtenez une clé API gratuite sur **[Google AI Studio](https://aistudio.google.com/)**.
2. Dans MJ Copilot, cliquez sur **`⚙️ Config IA`**.
3. Sélectionnez le moteur **`Google Gemini`**.
4. Collez votre clé API et sélectionnez le modèle recommandé (`gemini-2.5-flash` ou `gemini-1.5-flash`).
5. Cliquez sur **`Sauvegarder Configuration`**.

---

## 🎮 Prise en main & Utilisation

1. **Démarrer une Nouvelle Campagne** :
   - Cliquez sur **`📥 Import`** pour charger un fichier de campagne existant (`.json`) ou démarrez directement sur une table vierge.
   - Vous pouvez également importer un scénario PDF pour que l'IA génère le Codex complet (Chapitres, Lieux, PNJ, Secrets, Factions).
2. **Gérer les Héros & les Créatures** :
   - Dans le panneau latéral droit, cliquez sur **`+ Nouveau`** ou **`📄 XML`** pour créer ou importer vos PJ.
   - Cliquez sur **`⚙️ Fiche`** pour ouvrir la fiche de personnage détaillée (Stats, Compétences AideDD, Inventaire, Grimoire, Lore).
   - Cliquez sur n'importe quel bouton **`🎲 Jet`** pour lancer un dé physique ou virtuel.
3. **Pendant la Partie (Journal & Improvisation)** :
   - Notez rapidement les actions dans **`Journal & Événements`** et cliquez sur **`Reformuler`** pour générer une phrase de compte-rendu instantanée.
   - En bas, la console **Assistant Copilote** vous propose des boutons rapides (*Résumé, Réaction, Bloqué, Rencontre*) ou répond directement à vos questions d'arbitrage.
4. **Fin de Séance** :
   - Cliquez sur **`🤖 Analyser Séance`** dans la section *Conséquences Projetées* pour mettre à jour les relations et secrets du Codex.
   - Cliquez sur **`📤 Export Base`** en haut pour sauvegarder votre fichier de campagne `.json`.

---

## 🔧 Dépannage & FAQ

#### Q : Ollama affiche "Ollama en veille" ou ne répond pas.
> **Solution** : Cliquez sur le bouton **`🔄 Actualiser`** dans la fenêtre `⚙️ Config IA`. Le backend se charge de réveiller automatiquement le démon `ollama serve`. Vérifiez également que vous avez bien exécuté `ollama pull qwen2.5:1.5b`.

#### Q : L'exécutable `MJ_Copilot.exe` est bloqué par l'antivirus Windows SmartScreen.
> **Solution** : Comme le fichier vient d'être compilé localement et n'a pas de certificat commercial payant, cliquez sur **"Informations complémentaires"** puis sur **"Exécuter quand même"**.

#### Q : Comment recompiler l'exécutable après une modification ?
> **Solution** : Lancez simplement la commande suivante dans votre terminal :
> ```powershell
> python -m PyInstaller --onefile --noconsole --name MJ_Copilot launcher.py
> Move-Item -Path dist\MJ_Copilot.exe -Destination .\MJ_Copilot.exe -Force
> ```

---

## 📂 Structure du Projet

```
MJ_Copilot_Project/
├── MJ_Copilot.exe              # Exécutable Standalone prêt à l'emploi
├── launcher.py                 # Lanceur d'application (PyWebView + FastAPI)
├── index.html                  # Interface utilisateur principale
├── index.css                   # Feuilles de styles et thèmes (Sombre, Clair, Parchemin)
├── app.js                      # Initialisation globale de l'application
├── requirements.txt            # Liste des dépendances Python
│
├── backend/
│   └── server.py               # Serveur FastAPI local (Ollama, PDF Parser, Gemini)
│
├── js/
│   ├── AIAssistantEngine.js    # Moteur d'IA (Ollama, Gemini, OpenAI, Chat)
│   ├── CampaignEngine.js      # Gestion de base de données Codex & Imports/Exports
│   ├── CharacterEngine.js     # Fiches de personnages, stats & jets de dés
│   ├── CombatEngine.js        # Gestionnaire de combat, initiative et PV
│   ├── ContextMapEngine.js    # VTT, cartes interactives et brouillard de guerre
│   ├── EventEngine.js         # Journal de séance & analyse de conséquences
│   ├── ModalEngine.js         # Modales UI personnalisées (remplacement prompt/alert)
│   ├── SkillsEngine.js        # Routage et compétences D&D 5E spécialisées
│   └── WorldEngine.js         # Gestion du Codex (PNJ, Lieux, Factions, Bêtes)
│
└── skills/                     # Définitions des Skills D&D 5E au format standard
    ├── npc_improviser/         # Compétence Dialogue & RP de PNJ
    ├── combat_tactician/       # Compétence Tactique & Ciblage de Combat
    ├── room_describer/         # Compétence Ambiance & Description Sensorielle
    ├── dnd5e_rules_arbiter/    # Compétence Arbitre de Règles & DD D&D 5E
    └── loot_generator/         # Compétence Générateur de Trésors & Butin
```

---

## 📜 Licence & Crédits
Projet développé pour la communauté des Maîtres de Jeu Donjons & Dragons. Libre d'utilisation et d'adaptation.
