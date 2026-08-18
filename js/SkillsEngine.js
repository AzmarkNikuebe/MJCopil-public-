/**
 * SkillsEngine.js
 * Gestionnaire des compétences (Skills) spécialisées pour le Copilote MJ
 */

window.SkillsEngine = {
  skills: [
    {
      id: "auto",
      title: "✨ Auto (IA)",
      icon: "✨",
      description: "L'IA sélectionne automatiquement la compétence selon votre question.",
      systemPrompt: ""
    },
    {
      id: "npc_improviser",
      title: "🎭 PNJ & Dialogue",
      icon: "🎭",
      description: "Génère des répliques et réactions instantanées pour les PNJ.",
      systemPrompt: `### SKILL : ROLEPLAY & DIALOGUE PNJ
1. Incarne directement le PNJ concerné ou présent dans le lieu actif.
2. Structure : 1 phrase d'attitude/gestuelle + 1 réplique directe marquante entre guillemets ("...").
3. Fais subtilement écho aux secrets et rumeurs de la campagne sans tout dévoiler.`
    },
    {
      id: "combat_tactician",
      title: "⚔️ Tactique Combat",
      icon: "⚔️",
      description: "Conseils tactiques et ciblage pour les créatures.",
      systemPrompt: `### SKILL : TACTIQUE DE COMBAT D&D 5E
1. Adapte l'intelligence de la créature : bête sauvage (focus cible proche/faible), soldat (focus mages/couvert), boss (sorts/retraite).
2. Propose pour le tour : Action + Déplacement/Couvert + Cri d'intimidation.`
    },
    {
      id: "room_describer",
      title: "🏰 Ambiance Lieu",
      icon: "🏰",
      description: "Descriptions immersives sensorielles du lieu.",
      systemPrompt: `### SKILL : AMBIANCE & LIEU (REGLE DES 3 SENS)
1. Décris le lieu actif en stimulant 3 sens (visuel/lumière, sons, odeurs).
2. Donne 2 détails interactifs concrets que les joueurs peuvent inspecter.`
    },
    {
      id: "dnd5e_rules_arbiter",
      title: "🛡️ Règle & DD",
      icon: "🛡️",
      description: "Arbitrage strict D&D 5e et calculs de DD.",
      systemPrompt: `### SKILL : ARBITRE DE REGLES D&D 5E
1. Indique la caractéristique ou compétence exacte + le DD (Facile 10, Moyen 15, Difficile 20).
2. Précise les conditions d'Avantage/Désavantage et l'impact immédiat de l'échec.`
    },
    {
      id: "loot_generator",
      title: "💰 Trésor & Butin",
      icon: "💰",
      description: "Génération de butin équilibré par niveau de danger.",
      systemPrompt: `### SKILL : GENERATEUR DE TRESORS
1. Donne un butin équilibré (pièces, babioles et 1 objet remarquable).
2. Chaque objet a un détail visuel ou une histoire liée à l'univers.`
    }
  ],

  activeSkillId: "auto",

  detectSkill(query = "") {
    const q = (query || "").toLowerCase();
    if (!q) return this.skills.find(s => s.id === 'npc_improviser');

    if (q.includes("combat") || q.includes("attaque") || q.includes("cible") || q.includes("tactique") || q.includes("monstre") || q.includes("bête") || q.includes("round") || q.includes("initiative")) {
      return this.skills.find(s => s.id === 'combat_tactician');
    }
    if (q.includes("lieu") || q.includes("pièce") || q.includes("salle") || q.includes("odeur") || q.includes("bruit") || q.includes("lumière") || q.includes("ambiance") || q.includes("décris") || q.includes("voir") || q.includes("taverne") || q.includes("manoir") || q.includes("château")) {
      return this.skills.find(s => s.id === 'room_describer');
    }
    if (q.includes("règle") || q.includes("regle") || q.includes("dd") || q.includes("jet") || q.includes("sauvegarde") || q.includes("maîtrise") || q.includes("avantage") || q.includes("désavantage") || q.includes("sort")) {
      return this.skills.find(s => s.id === 'dnd5e_rules_arbiter');
    }
    if (q.includes("trésor") || q.includes("butin") || q.includes("loot") || q.includes("or") || q.includes("pièce") || q.includes("coffre") || q.includes("fouille") || q.includes("récompense")) {
      return this.skills.find(s => s.id === 'loot_generator');
    }
    if (q.includes("pnj") || q.includes("parle") || q.includes("dit") || q.includes("dialogue") || q.includes("réplique") || q.includes("réaction") || q.includes("maire") || q.includes("aubergiste") || q.includes("attitude")) {
      return this.skills.find(s => s.id === 'npc_improviser');
    }

    return null;
  },

  getActiveSkill(userQuery = "") {
    if (this.activeSkillId === "auto") {
      return this.detectSkill(userQuery);
    }
    return this.skills.find(s => s.id === this.activeSkillId) || null;
  },

  setActiveSkill(skillId) {
    this.activeSkillId = skillId;
    this.renderSkillSelector();
    console.log(`[SkillsEngine] Mode Skill : ${skillId}`);
  },

  getSkillSystemPrompt(userQuery = "") {
    const skill = this.getActiveSkill(userQuery);
    return skill && skill.systemPrompt ? `\n\n${skill.systemPrompt}\n` : "";
  },

  renderSkillSelector() {
    const container = document.getElementById('ai-skills-shelf');
    if (!container) return;

    container.innerHTML = this.skills.map(s => {
      const isActive = s.id === this.activeSkillId;
      return `
        <button class="btn ${isActive ? 'btn-primary' : 'btn-secondary'}" 
                onclick="window.SkillsEngine.setActiveSkill('${s.id}')"
                title="${s.description}"
                style="padding:2px 8px; font-size:0.68rem; display:flex; align-items:center; gap:4px; ${isActive ? 'box-shadow:0 0 8px var(--color-primary); font-weight:bold;' : 'opacity:0.75;'}">
          ${s.icon} ${s.title.split(' ')[1] || s.title}
        </button>
      `;
    }).join('');
  }
};
