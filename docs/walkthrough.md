# Walkthrough - Implémentation du Prototype V1 (Option B)

Le prototype V1 interactif de l'application **MJ Copilot** a été implémenté à la racine de votre espace de travail. Il s'agit d'une application Web (Single Page App) haut de gamme, codée en HTML5/Vanilla CSS/JS, qui s'exécute entièrement côté client (Offline-First).

---

## 📂 Fichiers créés

* **[index.html](file:///c:/Users/viotv/Desktop/Alois/MJ_Copilot_Project/index.html) :** Structure de l'interface MJ (Panneaux, Sidebar gauche, volet IA droit, fenêtres de modales) et de l'interface Écran Joueurs.
* **[index.css](file:///c:/Users/viotv/Desktop/Alois/MJ_Copilot_Project/index.css) :** Design System complet avec un thème sombre élégant, des dégradés violet/indigo, des panneaux semi-transparents (effet flou de verre/glassmorphism) et des micro-animations interactives.
* **[app.js](file:///c:/Users/viotv/Desktop/Alois/MJ_Copilot_Project/app.js) :** Cerveau de l'application. Gère la simulation de base de données SQLite via `localStorage`, l'importation de fichiers Codex, la synchronisation double écran et l'intégration de Transformers.js pour l'IA locale (Option B).
* **[codex-example.json](file:///c:/Users/viotv/Desktop/Alois/MJ_Copilot_Project/codex-example.json) :** Campagne de démonstration complète (« Les Brumes de Valdras ») prête à être importée pour tester l'application.

---

## 🎮 Fonctionnalités implémentées

### 1. Base de données & Persistance locale
Les données importées ou modifiées sont stockées localement dans le `localStorage` du navigateur. Elles persistent même si vous rafraîchissez la page.

### 2. Importateur Codex
Dans l'onglet **Importer Codex**, vous pouvez charger le fichier modèle `codex-example.json`. L'importateur valide la structure et alimente instantanément l'application.

### 3. Tableau de bord & Gestion de séance
* Affiche les statistiques globales de la campagne.
* Présente une **Timeline chronologique** des séances précédentes.
* Permet de sélectionner la séance active, ce qui charge les notes de séance et synchronise l'écran des joueurs.

### 4. Codex & Monde (Dossiers de campagne)
* Vous pouvez naviguer entre les onglets : PNJ, Lieux, Factions, Secrets et Objets.
* Chaque entité s'affiche sous forme de carte premium avec arrière-plan thématique.
* Cliquer sur une carte ouvre un panneau de détails et permet de modifier les données, de **l'afficher sur l'écran joueur**, ou d'**importer une illustration personnalisée (PNG/JPG)**. Les images importées sont stockées en local (Base64) et persistent automatiquement dans votre base de données locale.

* **Glisser-Déposer (Déplacement)** :
  - Faire glisser un marqueur existant d'un endroit à un autre de la carte met à jour sa position instantanément sur l'écran MJ et sur l'Écran Joueur.

---

## 🖼️ Découpage et Intégration des Images de Campagne

### 1. Découpage des Images (Version 2 propre)
- **Traitement d'Image** : Utilisation d'un script Python Pillow optimisé ([crop_and_update_v2.py](file:///C:/Users/viotv/.gemini/antigravity/brain/b1ca33b1-82c0-4ce3-96ad-345cf322d2d8/scratch/crop_and_update_v2.py)) pour extraire les **19 images** de la nouvelle grille composite 1024x682 en ignorant les étiquettes de texte et bordures blanches inférieures.
- **Dossier de Destination** : Enregistrement au format PNG dans le dossier `images/` du projet.
- **Liste des 19 images générées** :
  - *Cartes* : `carte_roshar.png`, `carte_urithiru.png`, `carte_shadesmar.png`, `carte_plaines_brisees.png`
  - *Créatures / Boss* : `gardien_fracture.png`, `mere_des_tempetes.png`
  - *PNJs* : `naresh.png`, `nesh_ada.png`, `talen_kar.png`, `sia.png`, `leshwi.png`, `sariel.png`
  - *Objets / Événements* : `premier_serment.png`, `gemme_pure.png`, `batterie_investiture.png`, `fragment_honor.png`, `rythme_devoreur.png`, `chronologie_roshar.png`, `evolution_tempetes.png`

### 2. Intégration dans le Codex JSON
- **[codex-echos-tempetes.json](file:///c:/Users/viotv/Desktop/Alois/MJ_Copilot_Project/codex-echos-tempetes.json) :**
  - Enregistrement des 19 fiches d'images dans le tableau racine `"images"` avec leur identifiant, chemin relatif (`images/nom_image.png`) et légende.
  - Liaison des identifiants d'images sur les entités correspondantes :
    - Les PNJs (Talen'Kar, Sia, Sariel, Naresh, Leshwi)
    - Les Lieux (Urithiru, Profondeurs d'Urithiru, Shadesmar, Plaines Brisées)
    - Les Objets (Manuscrit Sacré des Hérauts → `premier_serment.png`, Gemme Pure → `gemme_pure.png`, Pointe de Dawnshard → `fragment_honor.png`)

### 3. Versioning Git
- Toutes les images finales et le codex mis à jour ont été indexés et validés dans un nouveau commit local.


### 5. Double Écran Synchronisé (sans serveur !)
* En cliquant sur le bouton **🖥️ Écran Joueurs Externe**, une fenêtre indépendante s'ouvre.
* Lorsque le MJ clique sur **👁️ Écran Joueur** ou **Afficher sur l'écran joueurs** dans les fiches de détails, l'écran externe met instantanément à jour le portrait, l'illustration de fond d'ambiance et la description visible pour les joueurs, de manière fluide et transparente.

### 6. Copilote IA Multi-Moteur (Gemini, OpenAI, Ollama, Simulation)
* **Mémoire conversationnelle (Suivi ChatGPT) :** L'IA maintient désormais un historique complet des messages échangés. Elle se souvient de ce qui a été dit auparavant et répond de façon progressive et contextualisée.
* **Système d'instructions dynamique (Codex de fond) :** À chaque requête, l'état actuel de votre campagne (PNJ, lieux visités, factions, secrets restants et événements consignés) est injecté dynamiquement dans la structure système (System Instruction). L'IA est donc parfaitement au courant de l'avancement de l'histoire.
* **4 Moteurs d'exécution configurables :**
  1. **🎲 Simulateur local :** Rapide, déterministe, sans clé API, pour tester l'application offline.
  2. **✨ Google Gemini API :** Utilise `gemini-2.5-flash` ou `gemini-2.5-pro` (clé stockée localement). Recommandé pour son faible coût et son intelligence narrative.
  3. **🤖 OpenAI ChatGPT API :** Connecté à `gpt-4o-mini` ou `gpt-4o` (clé stockée localement) pour une flexibilité maximale.
  4. **🦙 Ollama Local (100 % hors-ligne) :** Permet d'utiliser un modèle local de haute qualité comme `llama3`, `mistral` ou `qwen2.5` tournant directement sur votre PC, offrant une IA gratuite et totalement privée.

### 7. Exportation de séance
Dans l'onglet **Séances & Historique**, vous pouvez exporter le résumé d'une séance au format Markdown (`.md`) d'un seul clic.

### 8. Suivi & Évolution : Journal interactif & Conséquences IA
* **Journal de Séance :** Un onglet dédié vous permet de consigner en cours de partie des événements précis (ex: *"Les PJ ont tué Thorod"* ou *"Anya révèle la corruption du maire au forgeron"*).
* **Moteur de Conséquences IA intelligent :** En cliquant sur *Analyser*, l'IA configurée réalise une analyse sémantique des événements par rapport à l'univers et extrait de façon structurée (JSON) les mutations suggérées (ex: réputation de faction dégradée, relation altérée, secret passant à résolu).
* **Validation & Mutation active :** Le MJ peut cocher ou décocher chaque conséquence. En cliquant sur *Appliquer*, l'application **modifie réellement les données de la base locale** (LocalStorage), met à jour le Codex et inscrit définitivement les événements dans l'historique permanent.

### 9. Évolutions de la Version V1 (Mises à jour récentes)
* **Correction du flux de chat IA :** Résolution définitive du problème des coupures de phrases au milieu du flux. Le nouveau parseur Markdown (`parseMarkdownToHtml`) convertit le texte brut de l'IA en HTML propre (paragraphes, gras, italique, puces) avant de l'envoyer au flux de machine à écrire. L'effet de machine à écrire traite désormais les entités HTML (ex: `&lt;` et `&gt;`) en un seul bloc, évitant les blocages ou les balises tronquées. De plus, la limite de réponse (`maxOutputTokens`) a été augmentée à 2048 jetons.
* **Robustesse de l'analyseur de conséquences (JSON de séance) :** Résolution définitive des plantages d'analyse JSON (`SyntaxError: Unterminated string in JSON`) qui survenaient lorsque l'IA insérait des guillemets doubles non échappés (ex: `"La Machine d'Honor"`) ou des retours à la ligne bruts à l'intérieur des chaînes de caractères de descriptions de conséquences. Ajout d'une fonction d'assainissement et de parsing ultra-robuste (`cleanAndParseJSON`) caractère par caractère dans [EventEngine.js](file:///c:/Users/viotv/Desktop/Alois/MJ_Copilot_Project/js/EventEngine.js) pour nettoyer et échapper ces caractères automatiquement, couplée à des consignes plus strictes dans le prompt système de l'IA.
* **Mise en cache et Optimisation du contexte (Standard, Optimisé, Ultra-léger) :** Ajout de trois modes de traitement du contexte IA configurables par le MJ depuis les options de configuration. Le mode **Optimisé** restreint la description détaillée aux lieux et PNJ présents sur la carte active et ordonne le prompt pour supporter le *Prompt Caching* (rapidité et économie de tokens). Le mode **Ultra-léger** est conçu pour les exécutions locales légères (**Ollama**) : il supprime le formatage Markdown, réduit les descriptions au strict minimum, raccourcicit le journal à 5 événements et force l'IA à répondre brièvement (2 à 3 phrases) pour préserver le CPU local. Un outil de diagnostic interactif a été déployé à la racine : [test_context_comparison.html](file:///c:/Users/viotv/Desktop/Alois/MJ_Copilot_Project/test_context_comparison.html) (résolution d'un bug de chargement initial depuis LocalStorage qui provoquait une erreur `.find` sur les variables indéfinies).
* **Codex Complet & Cohérence Contextuelle :** L'IA reçoit désormais un contexte de jeu étendu lors de chaque appel. Les informations sur la séance active (titre, lieu actuel, chapitre en cours), les Personnages Joueurs (PJ) complets (noms, classes, PV, et joueurs réels), ainsi que les Objets & Artefacts (et leurs possesseurs respectifs) sont injectés dynamiquement dans les instructions système.
* **Cycle de vie & Contrôle de Séance :** Ajout de fonctions de création et de clôture de séance via des fenêtres modales dédiées. Le MJ peut sauvegarder des notes actives à chaud, et lors de la clôture, l'IA génère automatiquement un résumé narratif des exploits des joueurs sur la base des événements consignés.
* **Saisie Rapide & Brouillon IA (Copi-Log) :** Un outil de saisie rapide permet au MJ de taper des notes sténographiques brutes (ex: *"pj tuent thorod à la taverne"*). L'IA reformule cela instantanément en un paragraphe littéraire fluide. Le MJ peut réviser ce texte et l'ajouter en un clic au journal de la séance.
* **Journalisation temporaire sécurisée :** Les événements de la séance en cours restent temporairement dans un journal local (persisté dans `localStorage`) et ne sont fusionnés dans les archives permanentes qu'à la clôture officielle de la séance, éliminant les pertes accidentelles de données.

### 10. Évolutions de la Version V2 (Refonte Ergonomique & Modulaire)
Dans cette mise à jour majeure V2, l'interface a été entièrement repensée pour servir de **second cerveau** au Maître du Jeu (réduisant sa charge mentale sans prendre de décisions à sa place) :
* **Architecture Ergonomique à 3 Colonnes :**
  * **📚 Colonne Gauche (Encyclopédie) :** Regroupe de manière unifiée et filtrable par onglets les fiches du monde (PNJ, Lieux, Factions, Objets, Secrets, Chronologie). Permet de rechercher et de modifier instantanément n'importe quelle entité du Codex.
  * **✏️ Colonne Centrale (Partie & IA) :** Affiche le contrôle de la séance en cours, le journal interactif horodaté, le moteur de conséquences IA, et l'assistant IA rétractable.
  * **🧙 Colonne Droite (Personnages Joueurs) :** Permet de suivre en direct l'état de santé (PV, CA, Initiative), les états actifs (ex: Blessé, Endormi), et d'épingler des raccourcis Favoris (`PlayerFavorites`) pour chaque PJ.
* **Découpage Technique Modulaire (Engines) :**
  L'application a été découpée en 10 modules Javascript spécialisés sous le dossier `js/` (`CampaignEngine.js`, `SessionEngine.js`, `EventEngine.js`, `WorldEngine.js`, `CharacterEngine.js`, `MediaEngine.js`, `AIAssistantEngine.js`, `ContextMapEngine.js`, `ArchiveEngine.js`, `SettingsEngine.js`) afin de simplifier la maintenance, tout en conservant une compatibilité stricte avec une exécution locale sans serveur (`file://`).
* **Importateur de Fiches Personnages XML D&D :**
  Un bouton d'importation XML permet de charger instantanément des fiches issues de générateurs externes (les exemples `Caladin.xml` et `Zozmark.xml` ont été intégrés avec succès). Le module extrait le nom, le niveau, la race, la classe, calcule les points de vie max cumulés, extrait les compétences, la liste des sorts connus, et convertit les caractéristiques (`str`, `dex`, etc.) en un modèle d'attributs dynamiques universel.
* **Dictée Vocale Intégrée (Speech-to-Text) :**
  Ajout d'un bouton micro (🎙️) dans la barre de saisie rapide. En l'activant, le MJ peut dicter ses notes à haute voix, le texte est écrit automatiquement en direct grâce à l'API de reconnaissance vocale du navigateur.
* **Sélecteur de Thèmes (Sombre, Clair, Parchemin) :**
  Un menu déroulant dans le header permet de changer de thème instantanément. Le thème **Parchemin** applique des polices Serif de style grimoire médiéval et des arrière-plans en texture papier vieilli pour une immersion JDR maximale.
* **Carte Tactique Interactive & Placement de Marqueurs :**
  La carte contextuelle au bas de l'écran permet au MJ de visualiser la carte du lieu actif. En cliquant directement sur la carte, le MJ peut y déposer des marqueurs (coffres, monstres, portails, pièges, PNJ, rumeurs) qui se **synchronisent instantanément sur l'écran des joueurs** en double écran en temps réel.

### 11. Prochaine étape : Carte Interactive Évolutive (Vision Joueur)
Nous avons rédigé une étude d'architecture complète détaillant comment intégrer une carte vectorielle SVG réactive (avec brouillard de guerre progressif, marqueurs dynamiques et zones d'influence de factions) sur l'écran joueur :
👉 **[study_evolving_map.md](study_evolving_map.md)**

---

## 🚀 Comment lancer le prototype

### Double-cliquez simplement sur le fichier **[index.html](file:///c:/Users/viotv/Desktop/Alois/MJ_Copilot_Project/index.html)**
L'application s'exécute directement dans votre navigateur web sans aucun serveur à installer.
* Pour utiliser les fonctionnalités d'IA intelligente (Gemini, OpenAI), il vous suffit de renseigner vos clés d'API respectives dans le volet configuration IA de droite (sauvegardées localement dans votre propre navigateur via LocalStorage, sans transiter par un serveur tiers).
* Pour utiliser Ollama localement, assurez-vous qu'Ollama est démarré sur votre machine et que le modèle correspondant (ex: Llama3) est téléchargé localement (`ollama run llama3`).

