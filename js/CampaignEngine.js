window.CampaignEngine = {
  getEmptyCampaignStructure() {
    return {
      campagne: { 
        id: "camp_new", 
        titre: "Nouvelle Campagne", 
        description: "Veuillez importer un fichier Codex pour commencer.", 
        langue: "fr-FR", 
        version: "1.0.0", 
        modules: [],
        style_visuel: "fantasy_realiste"
      },
      chapitres: [], 
      seances: [], 
      lieux: [], 
      pnjs: [], 
      joueurs: [], 
      personnages: [], 
      objets: [], 
      factions: [], 
      secrets: [], 
      evenements: [], 
      combats: [], 
      images: [], 
      relations: [], 
      theories: [], 
      notes: [],
      betes: [],
      settings: { langue: "fr-FR", assistanceIA: "discret", modules: {}, archivageSeances: 100 }
    };
  },

  initDatabase() {
    // Toujours démarrer avec une campagne vierge
    AppState.db = this.getEmptyCampaignStructure();
  },

  saveDatabase() {
    localStorage.setItem("mj_copilot_campaign", JSON.stringify(AppState.db));
    
    // Déclencher les rafraîchissements de l'UI
    if (window.WorldEngine && typeof window.WorldEngine.renderEncyclopedia === 'function') {
      window.WorldEngine.renderEncyclopedia();
    }
    if (window.CharacterEngine && typeof window.CharacterEngine.renderPlayers === 'function') {
      window.CharacterEngine.renderPlayers();
    }
    if (window.SessionEngine && typeof window.SessionEngine.updateSessionsUI === 'function') {
      window.SessionEngine.updateSessionsUI();
    }
    if (window.syncPlayerView) {
      window.syncPlayerView();
    }
  },

  importCampaignJSON(jsonText) {
    try {
      const data = JSON.parse(jsonText);
      if (!data.campagne || !data.campagne.titre) {
        throw new Error("Format de campagne Codex invalide.");
      }
      
      const arrays = ["chapitres", "seances", "lieux", "pnjs", "joueurs", "personnages", "objets", "factions", "secrets", "evenements", "combats", "images", "relations", "theories", "notes", "betes"];
      arrays.forEach(arr => {
        if (!data[arr]) data[arr] = [];
      });
      
      if (!data.settings) {
        data.settings = { langue: "fr-FR", assistanceIA: "discret", modules: {}, archivageSeances: 100 };
      }
      
      if (!data.campagne.style_visuel) {
        data.campagne.style_visuel = "fantasy_realiste";
      }

      AppState.db = data;
      this.saveDatabase();
      return true;
    } catch (e) {
      console.error(e);
      throw e;
    }
  },

  exportCampaignJSON() {
    const dataStr = JSON.stringify(AppState.db, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Codex_Campagne_${AppState.db.campagne.titre.replace(/\s+/g, "_")}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  async generateCodexFromPDF() {
    const fileInput = document.getElementById('import-file-pdf');
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
      await window.ModalEngine.alert("Veuillez sélectionner un fichier PDF.", { title: "Import PDF" });
      return;
    }
    
    // Check if Gemini API key exists
    let apiConfig = null;
    if (typeof AppState !== 'undefined') {
      apiConfig = AppState.aiConfig;
    } else if (window.AppState) {
      apiConfig = window.AppState.aiConfig;
    }

    let apiKey = (apiConfig && apiConfig.geminiKey) || "";
    if (!apiKey) {
      apiKey = localStorage.getItem('gemini_api_key') || "";
    }
    if (!apiKey) {
      await window.ModalEngine.alert("Clé API Gemini introuvable. Veuillez la configurer dans les paramètres IA (icône engrenage en haut à droite) d'abord.", { title: "Configuration IA", variant: "warning" });
      return;
    }

    const model = (apiConfig && apiConfig.geminiModel) || 'gemini-2.5-flash';

    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", apiKey);
    formData.append("model", model);

    // Show loading UI
    const loadingIndicator = document.getElementById('pdf-loading-indicator');
    if (loadingIndicator) loadingIndicator.style.display = 'block';

    try {
      const response = await fetch("http://127.0.0.1:8001/api/generate-codex", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur serveur: ${response.status} - ${errorText}`);
      }

      const codexJson = await response.json();
      
      // Valider et importer le JSON
      this.importCampaignJSON(JSON.stringify(codexJson));
      
      await window.ModalEngine.alert("Campagne générée avec succès ! Les illustrations vont être générées en arrière-plan.", { title: "Import terminé" });
      
      // Cacher la modale
      document.getElementById('import-codex-modal').classList.remove('active');
      
      // Update UI
      if (window.App && typeof window.App.initUI === 'function') {
        window.App.initUI();
      } else {
        location.reload();
      }

      // Collect entities needing pixel art
      const db = AppState.db || (typeof AppState !== 'undefined' ? AppState.db : null);
      if (db) {
        const entitiesToAutoGenerate = [];
        if (db.pnjs) {
          db.pnjs.forEach(pnj => {
            if (!pnj.image) {
              entitiesToAutoGenerate.push({
                type: 'pnj',
                entity: pnj,
                prompt: `8-bit retro pixel art character portrait of a fantasy character named ${pnj.nom} (${pnj.role || 'NPC'}), description: ${pnj.description || ''}, 8bit video game sprite, clean pixel details, dark background`
              });
            }
          });
        }
        if (db.objets) {
          db.objets.forEach(obj => {
            if (!obj.image) {
              entitiesToAutoGenerate.push({
                type: 'objet',
                entity: obj,
                prompt: `8-bit retro pixel art item icon of ${obj.nom}, description: ${obj.description || ''}, video game item sprite, clean pixel details, dark background`
              });
            }
          });
        }
        if (db.betes) {
          db.betes.forEach(b => {
            if (!b.image) {
              entitiesToAutoGenerate.push({
                type: 'bete',
                entity: b,
                prompt: `8-bit retro pixel art monster portrait of a creature named ${b.nom} (${b.role || 'Beast'}), description: ${b.description || ''}, video game enemy sprite, clean pixel details, dark background`
              });
            }
          });
        }

        if (entitiesToAutoGenerate.length > 0) {
          console.log(`Lancement de la génération automatique pour ${entitiesToAutoGenerate.length} éléments...`);
          setTimeout(() => {
            this.autoGeneratePixelArtForList(entitiesToAutoGenerate);
          }, 1500);
        }
      }

    } catch (err) {
      console.error(err);
      await window.ModalEngine.alert("Erreur lors de la génération: " + err.message, { title: "Erreur", variant: "error" });
    } finally {
      if (loadingIndicator) loadingIndicator.style.display = 'none';
    }
  },

  async generateAllPixelArt() {
    const db = AppState.db;
    if (!db) {
      await window.ModalEngine.alert("Aucune campagne active.", { title: "Pixel Art", variant: "warning" });
      return;
    }

    // Check if Gemini API key exists
    let apiConfig = null;
    if (typeof AppState !== 'undefined') {
      apiConfig = AppState.aiConfig;
    } else if (window.AppState) {
      apiConfig = window.AppState.aiConfig;
    }

    let apiKey = (apiConfig && apiConfig.geminiKey) || "";
    if (!apiKey) {
      apiKey = localStorage.getItem('gemini_api_key') || "";
    }

    const entitiesToGenerate = [];

    // Collect PNJ
    if (db.pnjs && db.pnjs.length > 0) {
      db.pnjs.forEach(pnj => {
        entitiesToGenerate.push({
          type: 'pnj',
          entity: pnj,
          prompt: `8-bit retro pixel art character portrait of a fantasy character named ${pnj.nom} (${pnj.role || 'NPC'}), description: ${pnj.description || ''}, 8bit video game sprite, clean pixel details, dark background`
        });
      });
    }

    // Collect Objets
    if (db.objets && db.objets.length > 0) {
      db.objets.forEach(obj => {
        entitiesToGenerate.push({
          type: 'objet',
          entity: obj,
          prompt: `8-bit retro pixel art item icon of ${obj.nom}, description: ${obj.description || ''}, video game item sprite, clean pixel details, dark background`
        });
      });
    }

    // Collect Bêtes
    if (db.betes && db.betes.length > 0) {
      db.betes.forEach(b => {
        entitiesToGenerate.push({
          type: 'bete',
          entity: b,
          prompt: `8-bit retro pixel art monster portrait of a creature named ${b.nom} (${b.role || 'Beast'}), description: ${b.description || ''}, video game enemy sprite, clean pixel details, dark background`
        });
      });
    }

    if (entitiesToGenerate.length === 0) {
      await window.ModalEngine.alert("Aucun PNJ, Objet ou Bête trouvé dans la campagne à illustrer.", { title: "Pixel Art", variant: "warning" });
      return;
    }

    if (!await window.ModalEngine.confirm(`Voulez-vous générer des jetons Pixel Art 8-bit pour les ${entitiesToGenerate.length} éléments de cette campagne ? Cela peut prendre une à deux minutes.`, { title: "Génération Pixel Art" })) {
      return;
    }

    const loader = document.getElementById('pixelart-loading-indicator');
    const loadingText = document.getElementById('pixelart-loading-text');
    const generateBtn = document.getElementById('btn-generate-all-pixelart');

    if (loader) loader.style.display = 'block';
    if (generateBtn) generateBtn.disabled = true;

    let successCount = 0;
    let failCount = 0;

    const getSlug = (entity) => {
      const name = (entity.nom || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const role = (entity.role || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

      // Liste des archétypes génériques connus et leurs mots-clés
      const archetypes = [
        { key: "gobelin", keywords: ["gobelin", "goblin", "kobold"] },
        { key: "guerrier", keywords: ["guerrier", "soldat", "garde", "combattant", "chevalier", "milicien", "orc", "orque"] },
        { key: "mage", keywords: ["mage", "sorcier", "magicien", "pretre", "druide", "necromancien", "arcaniste", "clerc"] },
        { key: "tavernier", keywords: ["tavernier", "aubergiste", "auberge", "barman"] },
        { key: "voleur", keywords: ["voleur", "assassin", "brigand", "bandit", "espion", "filou", "pirate"] },
        { key: "marchand", keywords: ["marchand", "vendeur", "boutiquier", "colporteur"] },
        { key: "villageois", keywords: ["paysan", "villageois", "fermier", "citoyen", "civil"] },
        { key: "mort_vivant", keywords: ["squelette", "zombie", "mort-vivant", "ghoule", "liche"] },
        { key: "automate", keywords: ["automate", "golem", "construct", "robot"] },
        { key: "bete", keywords: ["loup", "bete", "chien", "ours", "araignee", "monstre", "creature"] }
      ];

      // 1. Si le nom contient un chiffre (ex: Gobelin 1, Garde 2), c'est générique
      const containsNumber = /\d/.test(name);
      let isNameGeneric = containsNumber;
      let matchedArchetype = null;

      for (const arch of archetypes) {
        if (arch.keywords.some(kw => name.includes(kw))) {
          isNameGeneric = true;
          matchedArchetype = arch.key;
          break;
        }
      }

      // Si le nom est générique, on renvoie la clé de l'archétype correspondant
      if (isNameGeneric) {
        if (matchedArchetype) return matchedArchetype;
        const cleanName = name.replace(/\d+/g, "").trim().replace(/[^a-z0-9]/g, "_");
        return cleanName || "creature";
      }

      // 2. Si le rôle correspond à un archétype et que le nom est équivalent (ex: Nom="Guerrier", Rôle="Guerrier")
      for (const arch of archetypes) {
        if (arch.keywords.some(kw => role === kw || name === kw)) {
          return arch.key;
        }
      }

      // 3. Sinon, c'est un personnage unique (ex: Talen'Kar, Sia), on utilise son slug de nom unique
      return name
        .replace(/[^a-z0-9]/g, "_")
        .replace(/_+/g, "_")
        .replace(/(^_+|_+$)/g, "");
    };

    for (let i = 0; i < entitiesToGenerate.length; i++) {
      const item = entitiesToGenerate[i];
      if (item.entity.image) {
        continue;
      }
      const slug = getSlug(item.entity);
      
      if (loadingText) {
        loadingText.textContent = `Génération (${i + 1}/${entitiesToGenerate.length}) : ${item.entity.nom}...`;
      }

      try {
        let base64Data = null;
        let localPath = null;
        let alreadyExists = false;

        // 1. Vérifier si le fichier image existe déjà physiquement dans le dossier local du projet
        try {
          const checkResponse = await fetch(`http://127.0.0.1:8001/api/check-pixelart/${slug}`);
          if (checkResponse.ok) {
            const checkResult = await checkResponse.json();
            if (checkResult.exists) {
              localPath = checkResult.path;
              alreadyExists = true;
            }
          }
        } catch (checkErr) {
          console.warn("Impossible de vérifier l'existence locale pour:", slug, checkErr);
        }

        if (alreadyExists && localPath) {
          // Si l'image existe déjà, on utilise son chemin d'accès directement (gain de temps et pas d'appel API !)
          item.entity.image = localPath;
          successCount++;
          console.log(`Réutilisation de l'image locale existante pour ${item.entity.nom}: ${localPath}`);
          
          // ÉTAPE D'ASSIGNATION GLOBALE : assigner l'image à toutes les autres entités partageant le même slug
          if (db) {
            const listToScan = [
              ...(db.pnjs || []),
              ...(db.objets || []),
              ...(db.betes || [])
            ];
            listToScan.forEach(otherEntity => {
              if (getSlug(otherEntity) === slug && !otherEntity.image) {
                otherEntity.image = localPath;
                console.log(`Assignation automatique de l'image existante de l'archétype (${slug}) à ${otherEntity.nom}`);
              }
            });
          }

          this.saveDatabase();
          if (window.WorldEngine && typeof window.WorldEngine.renderEncyclopedia === 'function') {
            window.WorldEngine.renderEncyclopedia();
          }
          continue;
        }

        // 2. Sinon, on génère l'image
        let usedAlternative = false;

        if (apiKey) {
          try {
            const formData = new FormData();
            formData.append("prompt", item.prompt);
            formData.append("api_key", apiKey);

            const response = await fetch("http://127.0.0.1:8001/api/generate-pixelart", {
              method: "POST",
              body: formData
            });

            if (response.ok) {
              const result = await response.json();
              base64Data = result.image;
            } else {
              const errText = await response.text();
              if (errText.includes("NOT_FOUND") || errText.includes("not found") || errText.includes("404")) {
                usedAlternative = true;
              } else {
                throw new Error(errText);
              }
            }
          } catch (apiErr) {
            console.warn("Échec Google Imagen, utilisation du service alternatif gratuit Pollinations.ai:", apiErr);
            usedAlternative = true;
          }
        } else {
          usedAlternative = true;
        }

        if (usedAlternative) {
          const altPrompt = `${item.prompt}, retro 8-bit game style, pixel art, pixelated`;
          const altUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(altPrompt)}?width=256&height=256&nologo=true&seed=${Math.floor(Math.random() * 100000)}`;
          
          let altResponse;
          try {
            altResponse = await fetch(altUrl);
          } catch (fetchErr) {
            console.warn("Échec premier essai Pollinations:", fetchErr);
          }

          if (!altResponse || !altResponse.ok) {
            const statusStr = altResponse ? altResponse.status : "Network Error";
            console.log(`Pollinations a renvoyé ${statusStr}. Tentative de repli avec un prompt simplifié...`);
            
            const simplePrompt = `8-bit retro pixel art portrait of ${item.entity.nom}, retro video game style, pixel art`;
            const simpleUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(simplePrompt)}?width=256&height=256&nologo=true&seed=${Math.floor(Math.random() * 100000)}`;
            
            altResponse = await fetch(simpleUrl);
            if (!altResponse.ok) {
              throw new Error(`Le générateur alternatif Pollinations a échoué : ${altResponse.status}`);
            }
          }
          
          const blob = await altResponse.blob();
          base64Data = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        }

        if (base64Data) {
          // 3. Demander au serveur Python local de stocker l'image générée physiquement sur le disque
          try {
            const saveResponse = await fetch("http://127.0.0.1:8001/api/save-pixelart-file", {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                slug: slug,
                image_base64: base64Data
              })
            });

            if (saveResponse.ok) {
              const saveResult = await saveResponse.json();
              const newImagePath = saveResult.path;
              // On référence le chemin de fichier physique local au lieu du base64 (base de données ultra légère !)
              item.entity.image = newImagePath;
              
              // ÉTAPE D'ASSIGNATION GLOBALE : assigner l'image à toutes les autres entités partageant le même slug
              if (db) {
                const listToScan = [
                  ...(db.pnjs || []),
                  ...(db.objets || []),
                  ...(db.betes || [])
                ];
                listToScan.forEach(otherEntity => {
                  if (getSlug(otherEntity) === slug && !otherEntity.image) {
                    otherEntity.image = newImagePath;
                    console.log(`Assignation automatique de la nouvelle image de l'archétype (${slug}) à ${otherEntity.nom}`);
                  }
                });
              }
            } else {
              // En cas de souci avec la sauvegarde sur disque, on stocke en base64 en local (rétrocompatibilité)
              const newImageId = `img_pixelart_${item.entity.id}_${Date.now()}`;
              const newImage = {
                id: newImageId,
                fichier: base64Data,
                caption: `Illustration 8-bit rétro pour ${item.entity.nom}`
              };
              if (!db.images) db.images = [];
              db.images.push(newImage);
              item.entity.image = newImageId;
            }
          } catch (saveErr) {
            console.warn("Impossible d'enregistrer physiquement l'image sur disque, fallback base64:", saveErr);
            const newImageId = `img_pixelart_${item.entity.id}_${Date.now()}`;
            const newImage = {
              id: newImageId,
              fichier: base64Data,
              caption: `Illustration 8-bit rétro pour ${item.entity.nom}`
            };
            if (!db.images) db.images = [];
            db.images.push(newImage);
            item.entity.image = newImageId;
          }
          successCount++;
          // Sauvegarder et rafraîchir en temps réel !
          this.saveDatabase();
          if (window.WorldEngine && typeof window.WorldEngine.renderEncyclopedia === 'function') {
            window.WorldEngine.renderEncyclopedia();
          }
        }
      } catch (err) {
        console.error(`Erreur de génération pour ${item.entity.nom}:`, err);
        failCount++;
        showNotification(`Échec pour ${item.entity.nom} : ${err.message}`, "error");
      }
    }

    if (loader) loader.style.display = 'none';
    if (generateBtn) generateBtn.disabled = false;

    this.saveDatabase();
    await window.ModalEngine.alert(`Génération terminée !\nSuccès: ${successCount}\nÉchecs: ${failCount}`, { title: "Pixel Art terminé" });
  },

  async importBestiaryFromPDF(fileArg) {
    // Accept file passed directly (from WorldEngine button) or from legacy input
    let file = fileArg || null;
    if (!file) {
      const fileInput = document.getElementById('import-bestiary-pdf') || document.getElementById('bestiary-pdf-input');
      if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        await window.ModalEngine.alert("Veuillez sélectionner un fichier PDF de bestiaire.", { title: "Import bestiaire" });
        return;
      }
      file = fileInput.files[0];
    }

    const db = AppState.db;
    if (!db) {
      await window.ModalEngine.alert("Veuillez charger ou créer une campagne d'abord.", { title: "Import bestiaire", variant: "warning" });
      return;
    }

    let apiConfig = AppState.aiConfig || (window.AppState && window.AppState.aiConfig) || null;
    let apiKey = (apiConfig && apiConfig.geminiKey) || localStorage.getItem('gemini_api_key') || "";
    if (!apiKey) {
      await window.ModalEngine.alert("Clé API Gemini introuvable. Veuillez la configurer dans les paramètres IA d'abord.", { title: "Configuration IA", variant: "warning" });
      return;
    }

    const model = (apiConfig && apiConfig.geminiModel) || 'gemini-2.5-flash';
    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", apiKey);
    formData.append("model", model);

    const loadingIndicator = document.getElementById('bestiary-loading-indicator');
    if (loadingIndicator) loadingIndicator.style.display = 'block';

    try {
      const response = await fetch("http://127.0.0.1:8001/api/generate-bestiary", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur serveur: ${response.status} - ${errorText}`);
      }

      const parsedMonsters = await response.json();
      if (!Array.isArray(parsedMonsters)) {
        throw new Error("L'IA n'a pas retourné une liste de créatures valide.");
      }

      if (!db.betes) db.betes = [];

      let addedCount = 0;
      let overwrittenCount = 0;
      const entitiesToAutoGenerate = [];

      for (const m of parsedMonsters) {
        if (!m.nom) continue;

        const existingIdx = db.betes.findIndex(b => b.nom.toLowerCase() === m.nom.toLowerCase());
        
        const newMonster = {
          id: existingIdx !== -1 ? db.betes[existingIdx].id : `bete_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          nom: m.nom,
          role: m.role || "Créature",
          description: m.description || "",
          pointsVieMax: parseInt(m.pointsVieMax) || 10,
          pointsVie: parseInt(m.pointsVieMax) || 10,
          ca: parseInt(m.ca) || 10,
          initiative: m.initiative || "+0",
          image: existingIdx !== -1 ? db.betes[existingIdx].image : ""
        };

        if (existingIdx !== -1) {
          db.betes[existingIdx] = newMonster;
          overwrittenCount++;
        } else {
          db.betes.push(newMonster);
          addedCount++;
        }

        if (!newMonster.image) {
          entitiesToAutoGenerate.push({
            entity: newMonster,
            prompt: `8-bit retro pixel art monster portrait of a creature named ${newMonster.nom} (${newMonster.role}), description: ${newMonster.description}, video game enemy sprite, clean pixel details, dark background`
          });
        }
      }

      this.saveDatabase();
      await window.ModalEngine.alert(`Importation réussie !\nCréatures ajoutées: ${addedCount}\nCréatures mises à jour: ${overwrittenCount}`, { title: "Bestiaire importé" });

      document.getElementById('import-bestiary-modal').classList.remove('active');

      if (entitiesToAutoGenerate.length > 0) {
        console.log(`Génération automatique de jetons pour ${entitiesToAutoGenerate.length} nouvelles créatures...`);
        this.autoGeneratePixelArtForList(entitiesToAutoGenerate);
      } else {
        if (window.WorldEngine && typeof window.WorldEngine.renderEncyclopedia === 'function') {
          window.WorldEngine.renderEncyclopedia();
        }
      }

    } catch (err) {
      console.error(err);
      await window.ModalEngine.alert("Erreur lors de l'importation du bestiaire : " + err.message, { title: "Erreur", variant: "error" });
    } finally {
      if (loadingIndicator) loadingIndicator.style.display = 'none';
    }
  },

  async autoGeneratePixelArtForList(entitiesToGenerate) {
    const db = AppState.db;
    if (!db) return;

    let apiConfig = null;
    if (typeof AppState !== 'undefined') {
      apiConfig = AppState.aiConfig;
    } else if (window.AppState) {
      apiConfig = window.AppState.aiConfig;
    }

    let apiKey = (apiConfig && apiConfig.geminiKey) || "";
    if (!apiKey) {
      apiKey = localStorage.getItem('gemini_api_key') || "";
    }

    const getSlug = (entity) => {
      const name = (entity.nom || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const role = (entity.role || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const archetypes = [
        { key: "gobelin", keywords: ["gobelin", "goblin", "kobold"] },
        { key: "guerrier", keywords: ["guerrier", "soldat", "garde", "combattant", "chevalier", "milicien", "orc", "orque"] },
        { key: "mage", keywords: ["mage", "sorcier", "magicien", "pretre", "druide", "necromancien", "arcaniste", "clerc"] },
        { key: "tavernier", keywords: ["tavernier", "aubergiste", "auberge", "barman"] },
        { key: "voleur", keywords: ["voleur", "assassin", "brigand", "bandit", "espion", "filou", "pirate"] },
        { key: "marchand", keywords: ["marchand", "vendeur", "boutiquier", "colporteur"] },
        { key: "villageois", keywords: ["paysan", "villageois", "fermier", "citoyen", "civil"] },
        { key: "mort_vivant", keywords: ["squelette", "zombie", "mort-vivant", "ghoule", "liche"] },
        { key: "automate", keywords: ["automate", "golem", "construct", "robot"] },
        { key: "bete", keywords: ["loup", "bete", "chien", "ours", "araignee", "monstre", "creature"] }
      ];
      const containsNumber = /\d/.test(name);
      let isNameGeneric = containsNumber;
      let matchedArchetype = null;
      for (const arch of archetypes) {
        if (arch.keywords.some(kw => name.includes(kw))) {
          isNameGeneric = true;
          matchedArchetype = arch.key;
          break;
        }
      }
      if (isNameGeneric) {
        if (matchedArchetype) return matchedArchetype;
        const cleanName = name.replace(/\d+/g, "").trim().replace(/[^a-z0-9]/g, "_");
        return cleanName || "creature";
      }
      for (const arch of archetypes) {
        if (arch.keywords.some(kw => role === kw || name === kw)) {
          return arch.key;
        }
      }
      return name.replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_").replace(/(^_+|_+$)/g, "");
    };

    showNotification(`Génération automatique de jetons IA pour ${entitiesToGenerate.length} monstres...`, "info");

    for (let i = 0; i < entitiesToGenerate.length; i++) {
      const item = entitiesToGenerate[i];
      if (item.entity.image) {
        continue;
      }
      const slug = getSlug(item.entity);

      try {
        let base64Data = null;
        let localPath = null;
        let alreadyExists = false;

        try {
          const checkResponse = await fetch(`http://127.0.0.1:8001/api/check-pixelart/${slug}`);
          if (checkResponse.ok) {
            const checkResult = await checkResponse.json();
            if (checkResult.exists) {
              localPath = checkResult.path;
              alreadyExists = true;
            }
          }
        } catch (checkErr) {
          console.warn("Check local image failed:", checkErr);
        }

        if (alreadyExists && localPath) {
          item.entity.image = localPath;
          
          // ÉTAPE D'ASSIGNATION GLOBALE : assigner l'image à toutes les autres entités partageant le même slug
          if (db) {
            const listToScan = [
              ...(db.pnjs || []),
              ...(db.objets || []),
              ...(db.betes || [])
            ];
            listToScan.forEach(otherEntity => {
              if (getSlug(otherEntity) === slug && !otherEntity.image) {
                otherEntity.image = localPath;
                console.log(`Assignation automatique de l'image existante de l'archétype (${slug}) à ${otherEntity.nom}`);
              }
            });
          }

          this.saveDatabase();
          if (window.WorldEngine && typeof window.WorldEngine.renderEncyclopedia === 'function') {
            window.WorldEngine.renderEncyclopedia();
          }
          continue;
        }

        let usedAlternative = false;
        if (apiKey) {
          try {
            const formData = new FormData();
            formData.append("prompt", item.prompt);
            formData.append("api_key", apiKey);

            const response = await fetch("http://127.0.0.1:8001/api/generate-pixelart", {
              method: "POST",
              body: formData
            });

            if (response.ok) {
              const result = await response.json();
              base64Data = result.image;
            } else {
              usedAlternative = true;
            }
          } catch (apiErr) {
            usedAlternative = true;
          }
        } else {
          usedAlternative = true;
        }

        if (usedAlternative) {
          const altPrompt = `${item.prompt}, retro 8-bit game style, pixel art, pixelated`;
          const altUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(altPrompt)}?width=256&height=256&nologo=true&seed=${Math.floor(Math.random() * 100000)}`;
          const altResponse = await fetch(altUrl);
          if (altResponse.ok) {
            const blob = await altResponse.blob();
            base64Data = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
          }
        }

        if (base64Data) {
          try {
            const saveResponse = await fetch("http://127.0.0.1:8001/api/save-pixelart-file", {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                slug: slug,
                image_base64: base64Data
              })
            });

            if (saveResponse.ok) {
              const saveResult = await saveResponse.json();
              const newImagePath = saveResult.path;
              item.entity.image = newImagePath;
              
              // ÉTAPE D'ASSIGNATION GLOBALE : assigner l'image à toutes les autres entités partageant le même slug
              if (db) {
                const listToScan = [
                  ...(db.pnjs || []),
                  ...(db.objets || []),
                  ...(db.betes || [])
                ];
                listToScan.forEach(otherEntity => {
                  if (getSlug(otherEntity) === slug && !otherEntity.image) {
                    otherEntity.image = newImagePath;
                    console.log(`Assignation automatique de la nouvelle image de l'archétype (${slug}) à ${otherEntity.nom}`);
                  }
                });
              }
              
              // Sauvegarder et rafraîchir en temps réel !
              this.saveDatabase();
              if (window.WorldEngine && typeof window.WorldEngine.renderEncyclopedia === 'function') {
                window.WorldEngine.renderEncyclopedia();
              }
            }
          } catch (saveErr) {
            console.warn("Failed saving physical image:", saveErr);
          }
        }
      } catch (err) {
        console.error(`Auto generate failed for ${item.entity.nom}:`, err);
      }
    }

    this.saveDatabase();
    showNotification("Illustrations des bêtes finalisées !", "success");
    
    if (window.WorldEngine && typeof window.WorldEngine.renderEncyclopedia === 'function') {
      window.WorldEngine.renderEncyclopedia();
    }
  },

  async enrichActiveCampaignLore() {
    const db = AppState.db;
    if (!db || !db.campagne || db.campagne.id === 'camp_new') {
      showNotification("Veuillez charger une campagne d'abord.", "error");
      return;
    }
    
    // Check if Gemini API key exists
    let apiConfig = null;
    if (typeof AppState !== 'undefined') {
      apiConfig = AppState.aiConfig;
    } else if (window.AppState) {
      apiConfig = window.AppState.aiConfig;
    }

    let apiKey = (apiConfig && apiConfig.geminiKey) || "";
    if (!apiKey) {
      apiKey = localStorage.getItem('gemini_api_key') || "";
    }
    if (!apiKey) {
      await window.ModalEngine.alert("Clé API Gemini introuvable. Veuillez la configurer dans les paramètres IA d'abord.", { title: "Configuration IA", variant: "warning" });
      return;
    }

    const model = (apiConfig && apiConfig.geminiModel) || 'gemini-2.5-flash';

    showNotification("⌛ Enrichissement du Lore par l'IA en cours...", "info");
    
    try {
      const response = await fetch("http://127.0.0.1:8001/api/enrich-codex", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          codex_json: db,
          api_key: apiKey,
          model: model
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur serveur: ${response.status} - ${errorText}`);
      }

      const enrichedCodex = await response.json();
      
      // Merge values into AppState.db
      AppState.db = enrichedCodex;
      this.saveDatabase();
      showNotification("✨ Le Lore et l'Histoire ont été enrichis avec succès !", "success");
      
      // Auto-trigger images for any newly added PNJ, Object, or Beast
      const entitiesToAutoGenerate = [];
      if (enrichedCodex.pnjs) {
        enrichedCodex.pnjs.forEach(pnj => {
          if (!pnj.image) {
            entitiesToAutoGenerate.push({
              type: 'pnj',
              entity: pnj,
              prompt: `8-bit retro pixel art character portrait of a fantasy character named ${pnj.nom} (${pnj.role || 'NPC'}), description: ${pnj.description || ''}, 8bit video game sprite, clean pixel details, dark background`
            });
          }
        });
      }
      if (enrichedCodex.objets) {
        enrichedCodex.objets.forEach(obj => {
          if (!obj.image) {
            entitiesToAutoGenerate.push({
              type: 'objet',
              entity: obj,
              prompt: `8-bit retro pixel art item icon of ${obj.nom}, description: ${obj.description || ''}, video game item sprite, clean pixel details, dark background`
            });
          }
        });
      }
      if (enrichedCodex.betes) {
        enrichedCodex.betes.forEach(b => {
          if (!b.image) {
            entitiesToAutoGenerate.push({
              type: 'bete',
              entity: b,
              prompt: `8-bit retro pixel art monster portrait of a creature named ${b.nom} (${b.role || 'Beast'}), description: ${b.description || ''}, video game enemy sprite, clean pixel details, dark background`
            });
          }
        });
      }

      if (entitiesToAutoGenerate.length > 0) {
        console.log(`Lancement de la génération automatique pour ${entitiesToAutoGenerate.length} nouveaux éléments...`);
        if (typeof this.autoGeneratePixelArtForList === 'function') {
          setTimeout(() => {
            this.autoGeneratePixelArtForList(entitiesToAutoGenerate);
          }, 1000);
        }
      }
      
      // Re-initialize UI
      if (window.App && typeof window.App.initUI === 'function') {
        window.App.initUI();
      } else {
        location.reload();
      }
      
    } catch (err) {
      console.error(err);
      showNotification("Erreur lors de l'enrichissement : " + err.message, "error");
    }
  }
};
