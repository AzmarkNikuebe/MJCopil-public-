# Règles du Projet MJ Copilot V2

Ces règles guident le développement de l'application MJ Copilot pour s'assurer que toutes les générations de code, d'interfaces et de fichiers de données (Codex) restent cohérentes, fiables et respectent les standards du projet.

---

## 1. Structure et Format des Fichiers Codex (JSON)

Lors de la génération, modification ou enrichissement de fichiers JSON de campagne (Codex) :
- **Respect du Schéma de Base** : Le fichier JSON doit toujours respecter la structure de base contenant les clés suivantes :
  `campagne`, `chapitres`, `seances`, `lieux`, `pnjs`, `joueurs`, `personnages`, `objets`, `factions`, `secrets`, `evenements`, `combats`, `images`, `relations`, `theories`, `notes`, `betes` (liste des monstres/créatures), `settings`.
- **Intégrité des Types** : Les valeurs numériques (comme le niveau, la CA, les points de vie max) doivent être stockées sous forme d'entiers (`number`), et non de chaînes de caractères.
- **Robustesse du format** : Ne jamais inclure de caractères de contrôle non échappés ou de sauts de ligne bruts à l'intérieur des chaînes JSON. Toutes les descriptions d'objets, de sorts ou d'événements doivent utiliser des guillemets correctement échappés.
- **Champs obligatoires pour les créatures (Monstres/PNJ/Bêtes)** :
  - `hp` et `hpMax` (ou `pointsVie` et `pointsVieMax` pour les bêtes).
  - `ca` (Classe d'Armure).
  - `initiative` (Modificateur d'initiative sous forme de chaîne "+X" ou "-X").

---

## 2. Remplacement des Interactions Natives (Target Picker Modal)

- **Aucun Dialogue Natif** : Ne jamais utiliser `prompt()`, `alert()` ou `confirm()` pour le ciblage ou l'application des effets en combat.
- **Flux de Combat Unifié (D&D 5e)** :
  1. Jet d'attaque (d20 physique ou virtuel) → Saisie.
  2. Vérification des critiques (Nat 1 = Échec Auto, Nat 20 = Coup Critique).
  3. Sélection de la cible via la modale `window.CharacterEngine.openTargetPicker()`.
  4. Comparaison automatique du score d'attaque avec la CA de la cible.
  5. Si touché : saisie des dégâts (avec dés doublés automatiques en cas de Nat 20).
  6. Application des dégâts et mise à jour automatique des PV dans la base de données.

---

## 3. Compatibilité Multithème (Sombre, Clair, Parchemin)

Toutes les modifications ou ajouts d'éléments dans le DOM (HTML/JS) doivent s'intégrer parfaitement aux thèmes disponibles :
- **Pas de couleurs textuelles claires codées en dur** sur des éléments sans fond opaque, car elles deviennent invisibles en thème Clair/Parchemin.
- **Utiliser les variables CSS** pour les couleurs principales :
  - `--bg-primary` / `--bg-secondary` / `--bg-tertiary`
  - `--text-main` / `--text-muted` / `--text-dim`
  - `--color-primary` (pour les accents) / `--glass-border`
- **Surcharges Thématiques** : Si des éléments générés dynamiquement en JS possèdent des styles en dur, ajouter systématiquement des surcharges avec `!important` dans `index.css` sous les sélecteurs `body.theme-parchemin` et `body.theme-clair`.
- **Options de Selects lisibles** : Les balises `<option>` et `<optgroup>` doivent toujours avoir un fond contrastant spécifié (`background-color` opaque et `color` appropriée) pour contrer le comportement par défaut de certains navigateurs.
