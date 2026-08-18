window.normalizeString = function(str) {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Enlève les accents
    .replace(/[^a-z0-9]/g, "")       // Enlève espaces, tirets, apostrophes
    .trim();
};

window.isStringMatch = function(str1, str2) {
  const norm1 = window.normalizeString(str1);
  const norm2 = window.normalizeString(str2);
  if (!norm1 || !norm2) return false;
  
  if (norm1.includes(norm2) || norm2.includes(norm1)) return true;
  
  // Gérer le pluriel simple (ex: dagues vs dague)
  const sing1 = norm1.length > 3 && norm1.endsWith('s') ? norm1.slice(0, -1) : norm1;
  const sing2 = norm2.length > 3 && norm2.endsWith('s') ? norm2.slice(0, -1) : norm2;
  
  if (sing1.includes(sing2) || sing2.includes(sing1)) return true;
  
  return false;
};

window.RulesEngine = {
  combatActions: [
    {
      id: "action_attack",
      nom: "Attaquer (Attack)",
      description: "L'action la plus courante. Vous effectuez une attaque au corps à corps ou à distance avec une arme. Si vous disposez de capacités comme Attaque supplémentaire, cette action vous permet de faire plusieurs attaques."
    },
    {
      id: "action_cast",
      nom: "Lancer un sort (Cast a Spell)",
      description: "Vous incantez un sort de votre liste. Le temps d'incantation du sort doit être de 1 action. Chaque sort dicte si son effet nécessite un jet d'attaque ou un jet de sauvegarde de la part de la cible."
    },
    {
      id: "action_dash",
      nom: "Foncer (Dash)",
      description: "Vous gagnez un mouvement supplémentaire pour le tour en cours. L'augmentation est égale à votre vitesse après application de tous les modificateurs. Par exemple, si vous avez une vitesse de 9m, vous pouvez vous déplacer de 18m au total durant votre tour."
    },
    {
      id: "action_disengage",
      nom: "Se désengager (Disengage)",
      description: "Votre mouvement ne provoque pas d'attaques d'opportunité pour le reste du tour en cours. Idéal pour fuir le corps à corps d'un ennemi redoutable."
    },
    {
      id: "action_dodge",
      nom: "Esquiver (Dodge)",
      description: "Vous vous concentrez sur l'esquive. Jusqu'au début de votre prochain tour, tout jet d'attaque dirigé contre vous est effectué avec un désavantage si vous pouvez voir l'attaquant. De plus, vous bénéficiez d'un avantage aux jets de sauvegarde de Dextérité."
    },
    {
      id: "action_help",
      nom: "Aider (Help)",
      description: "Vous prêtez assistance à une créature. La créature que vous aidez bénéficie d'un avantage au prochain test de caractéristique qu'elle effectue avant le début de votre prochain tour. En combat, vous pouvez distraire un ennemi à moins de 1.50m, offrant un avantage à l'attaque du prochain allié."
    },
    {
      id: "action_hide",
      nom: "Se cacher (Hide)",
      description: "Vous effectuez un test de Dextérité (Discrétion) pour tenter de vous dissimuler. Si vous réussissez le test contre la Sagesse (Perception) passive des ennemis, vous êtes considéré comme caché (avantage aux attaques, désavantage aux attaques contre vous)."
    },
    {
      id: "action_ready",
      nom: "Se tenir prêt (Ready)",
      description: "Vous attendez un déclencheur spécifique pour agir. Vous définissez une condition perceptible (ex: 'Si le gobelin passe la porte') et l'action ou le mouvement que vous ferez en réaction dès qu'elle se réalise."
    }
  ],

  movementRules: [
    {
      id: "mv_difficult_terrain",
      nom: "Terrain difficile (Difficult Terrain)",
      description: "Chaque mètre parcouru dans un terrain difficile (broussailles, décombres, escaliers abrupts, glace) coûte 1 mètre supplémentaire de déplacement. Ramper ou nager dans un terrain difficile coûte 2 mètres de plus par mètre."
    },
    {
      id: "mv_prone",
      nom: "À terre & Ramper (Prone & Crawling)",
      description: "Vous pouvez volontairement vous jeter à terre sans dépenser de vitesse. Vous relever de la position à terre consomme la moitié de votre vitesse totale pour le tour. Ramper au sol coûte 1 mètre supplémentaire par mètre parcouru (2m pour 1m)."
    },
    {
      id: "mv_climb",
      nom: "Escalader (Climbing)",
      description: "Chaque mètre d'escalade coûte 1 mètre supplémentaire (2m pour 1m), sauf si vous possédez une vitesse d'escalade innée. Un test de Force (Athlétisme) peut être demandé par le MJ pour les surfaces difficiles ou glissantes."
    },
    {
      id: "mv_swim",
      nom: "Nager (Swimming)",
      description: "Chaque mètre de nage coûte 1 mètre supplémentaire (2m pour 1m), sauf si vous possédez une vitesse de nage innée. Le courant ou les eaux agitées peuvent nécessiter un test de Force (Athlétisme) réussi."
    },
    {
      id: "mv_jump_long",
      nom: "Saut en longueur (Long Jump)",
      description: "Avec un élan de 3m à pied, vous sautez d'une distance égale à votre valeur de Force (en pieds / diviser par 3 pour obtenir les mètres). Sans élan, la distance est divisée par deux."
    },
    {
      id: "mv_jump_high",
      nom: "Saut en hauteur (High Jump)",
      description: "Avec un élan de 3m, vous sautez d'une hauteur égale à 3 + votre modificateur de Force (en pieds). Sans élan, cette hauteur est divisée par deux."
    },
    {
      id: "mv_fly",
      nom: "Voler (Flying)",
      description: "Les créatures disposant d'une vitesse de vol peuvent se déplacer dans les airs. Si une créature volante est jetée à terre, voit sa vitesse réduite à 0, ou est paralysée, elle tombe immédiatement au sol sauf si elle peut planer magiquement."
    }
  ],

  conditions: [
    {
      id: "cond_aveugle",
      nom: "Aveuglé (Blinded)",
      description: "Une créature aveuglée ne voit rien et rate automatiquement tout test de caractéristique qui nécessite la vue. Les jets d'attaque contre elle ont l'avantage, et ses propres jets d'attaque ont un désavantage."
    },
    {
      id: "cond_charme",
      nom: "Charmé (Charmed)",
      description: "Une créature charmée ne peut pas attaquer le charmeur, ni le cibler avec des capacités ou des effets magiques nuisibles. Le charmeur a l'avantage à tous les tests de caractéristique sociale (Charisme) pour interagir avec la créature charmée."
    },
    {
      id: "cond_effraye",
      nom: "Effrayé (Frightened)",
      description: "Une créature effrayée a un désavantage aux tests de caractéristique et aux jets d'attaque tant que la source de sa peur est dans sa ligne de vue. De plus, elle ne peut pas s'approcher volontairement de la source de sa peur."
    },
    {
      id: "cond_sourd",
      nom: "Sourd (Deafened)",
      description: "Une créature sourde n'entend rien et échoue automatiquement à tout test de caractéristique qui nécessite l'ouïe."
    },
    {
      id: "cond_invisible",
      nom: "Invisible (Invisible)",
      description: "Une créature invisible ne peut pas être vue sans l'aide de la magie ou d'un sens particulier. Elle est considérée comme lourdement dissimulée pour se cacher. Les jets d'attaque contre elle ont un désavantage, et ses propres jets d'attaque ont l'avantage."
    },
    {
      id: "cond_a_terre",
      nom: "À terre (Prone)",
      description: "La seule option de mouvement de la créature est de ramper, sauf si elle se relève. Elle a un désavantage à ses jets d'attaque. Les jets d'attaque contre elle ont l'avantage si l'attaquant est à 1.50m ou moins, sinon ils ont un désavantage."
    },
    {
      id: "cond_empoisonne",
      nom: "Empoisonné (Poisoned)",
      description: "Une créature empoisonnée a un désavantage à tous ses jets d'attaque et à tous ses tests de caractéristique."
    },
    {
      id: "cond_inconscient",
      nom: "Inconscient (Unconscious)",
      description: "La créature est incapable d'agir, de se déplacer ou de parler, et n'est pas consciente de son environnement. Elle lâche ce qu'elle tient et tombe à terre. Elle rate automatiquement ses jets de sauvegarde de Force et de Dextérité. Les jets d'attaque contre elle ont l'avantage, et toute attaque réussie est un coup critique si l'attaquant est à moins de 1.50m."
    },
    {
      id: "cond_paralyse",
      nom: "Paralysé (Paralyzed)",
      description: "La créature est incapable d'agir, de se déplacer ou de parler (elle est également neutralisée). Elle rate automatiquement ses jets de sauvegarde de Force et de Dextérité. Les jets d'attaque contre elle ont l'avantage, et toute attaque réussie est un coup critique si l'attaquant est à moins de 1.50m."
    },
    {
      id: "cond_petrifie",
      nom: "Pétrifié (Petrified)",
      description: "La créature est transformée, avec tous ses objets portés, en une substance solide inanimée (généralement de la pierre). Son poids est multiplié par dix et elle cesse de vieillir. Elle est neutralisée, incapable de se déplacer ou de parler. Les jets d'attaque contre elle ont l'avantage. Elle rate automatiquement ses jets de sauvegarde de Force et de Dextérité. Elle a une résistance à tous les types de dégâts et est immunisée contre le poison."
    },
    {
      id: "cond_entrave",
      nom: "Entravé (Restrained)",
      description: "La vitesse de la créature devient 0, et elle ne peut bénéficier d'aucun bonus de vitesse. Ses jets d'attaque ont un désavantage, et les jets d'attaque contre elle ont l'avantage. Elle a également un désavantage aux jets de sauvegarde de Dextérité."
    },
    {
      id: "cond_neutralise",
      nom: "Neutralisé (Incapacitated)",
      description: "Une créature neutralisée ne peut pas effectuer d'actions ou de réactions."
    },
    {
      id: "cond_fatigue",
      nom: "Épuisement (Exhaustion)",
      description: "Cet état se cumule sur 6 niveaux. Niveau 1 : Désavantage aux tests de caractéristique. Niveau 2 : Vitesse divisée par deux. Niveau 3 : Désavantage aux jets d'attaque et de sauvegarde. Niveau 4 : Points de vie max divisés par deux. Niveau 5 : Vitesse réduite à 0. Niveau 6 : Mort immédiate. Un repos long diminue le niveau d'épuisement de 1."
    }
  ],

  skills: [
    { id: "sk_athletisme", nom: "Athlétisme (Force)", description: "Gouverne les efforts physiques exceptionnels comme escalader une falaise abrupte, sauter une crevasse, ou retenir une porte qui se referme." },
    { id: "sk_acrobaties", nom: "Acrobaties (Dextérité)", description: "Permet de garder l'équilibre sur une surface instable ou glacée, ou de réaliser des pirouettes et esquives artistiques." },
    { id: "sk_escamotage", nom: "Escamotage (Dextérité)", description: "Utilisé pour faire des tours de passe-passe, voler des bourses, ou dissimuler un petit objet sur soi." },
    { id: "sk_discretion", nom: "Discrétion (Dextérité)", description: "Permet de se déplacer sans faire de bruit, de se cacher des regards ennemis, ou de tendre une embuscade." },
    { id: "sk_arcanes", nom: "Arcanes (Intelligence)", description: "Connaissance des mystères de la magie, des plans d'existence, des glyphes runiques et des objets magiques." },
    { id: "sk_histoire", nom: "Histoire (Intelligence)", description: "Mesure la mémoire des événements passés, des figures historiques, des guerres anciennes, et des anciennes dynasties." },
    { id: "sk_investigation", nom: "Investigation (Intelligence)", description: "Permet de déduire des indices en examinant une scène, de déceler des passages secrets ou de comprendre le fonctionnement d'un piège complexe." },
    { id: "sk_nature", nom: "Nature (Intelligence)", description: "Connaissance du climat, de la flore locale, de la faune sauvage, et des cycles de la nature." },
    { id: "sk_religion", nom: "Religion (Intelligence)", description: "Mesure vos connaissances sur les divinités, les rites sacrés, les cultes secrets et les symboles sacrés." },
    { id: "sk_dressage", nom: "Dressage (Sagesse)", description: "Permet de calmer un animal sauvage, de monter une monture rétive, ou de comprendre les intentions d'une bête." },
    { id: "sk_intuition", nom: "Intuition (Sagesse)", description: "Sert à déceler le mensonge, à deviner les intentions secrètes d'un interlocuteur ou à lire son langage corporel." },
    { id: "sk_medecine", nom: "Médecine (Sagesse)", description: "Permet de stabiliser un compagnon mourant (test DD 10) ou de diagnostiquer une maladie ou un poison." },
    { id: "sk_perception", nom: "Perception (Sagesse)", description: "Gouverne votre attention sensorielle générale : entendre un murmure derrière une porte, repérer un piège caché ou apercevoir des ombres dans la nuit." },
    { id: "sk_survie", nom: "Survie (Sagesse)", description: "Utilisé pour suivre des pistes, chasser du gibier, s'orienter en milieu sauvage et éviter les dangers naturels." },
    { id: "sk_tromperie", nom: "Tromperie (Charisme)", description: "Permet de mentir de manière convaincante, de se déguiser, ou de bluffer lors de négociations." },
    { id: "sk_intimidation", nom: "Intimidation (Charisme)", description: "Permet d'influencer autrui par la menace physique, le chantage ou une présence verbale dominante." },
    { id: "sk_representation", nom: "Représentation (Charisme)", description: "Mesure le talent à amuser un public en chantant, jouant d'un instrument, racontant des histoires ou en jouant la comédie." },
    { id: "sk_persuasion", nom: "Persuasion (Charisme)", description: "Permet de convaincre de bonne foi, d'établir des alliances diplomatiques, ou de négocier pacifiquement." }
  ],

  spells: [
    { nom: "Message", ecole: "Transmutation", niveau: 0, incantation: "1 action", portee: "36 m", duree: "1 minute", condition: "", description: "Vous pointez votre doigt vers une créature à portée et murmurez un message. La cible entend le message et peut y répondre par un murmure que vous seul pouvez entendre. Le sort peut traverser les obstacles s'il y a un chemin dégagé." },
    { nom: "Moquerie cruelle (Vicious Mockery)", ecole: "Enchantement", niveau: 0, incantation: "1 action", portee: "18 m", duree: "Instantanée", condition: "", description: "Vous lancez des insultes magiques à une créature. Si elle vous entend, elle doit réussir un jet de sauvegarde de Sagesse ou subir 1d4 dégâts psychiques et avoir un désavantage au prochain jet d'attaque qu'elle effectue avant la fin de son prochain tour." },
    { nom: "Prestidigitation", ecole: "Transmutation", niveau: 0, incantation: "1 action", portee: "3 m", duree: "Jusqu'à 1 heure", condition: "", description: "Vous effectuez un tour de magie mineur. Vous pouvez créer un effet sensoriel inoffensif, allumer ou éteindre une bougie/torche, nettoyer ou salir un petit objet, ou chauffer/refroidir/aromatiser une petite quantité de nourriture." },
    { nom: "Fou rire de Tasha (Tasha's Hideous Laughter)", ecole: "Enchantement", niveau: 1, incantation: "1 action", portee: "9 m", duree: "Concentration, jusqu'à 1 minute", condition: "Neutralisé", description: "Une créature visible à portée doit réussir un jet de sauvegarde de Sagesse ou être prise d'un fou rire hystérique. Elle tombe à terre, devient neutralisée et incapable de se relever pour la durée du sort. Elle effectue une sauvegarde à la fin de chacun de ses tours ou lorsqu'elle subit des dégâts." },
    { nom: "Murmures dissonants (Dissonant Whispers)", ecole: "Enchantement", niveau: 1, incantation: "1 action", portee: "18 m", duree: "Instantanée", condition: "", description: "Vous murmurez une mélodie discordante. Une cible à portée doit réussir un jet de sauvegarde de Sagesse ou subir 3d6 dégâts psychiques et utiliser immédiatement sa réaction pour s'éloigner de vous au maximum de sa vitesse." },
    { nom: "Druidisme (Druidcraft)", ecole: "Transmutation", niveau: 0, incantation: "1 action", portee: "9 m", duree: "Instantanée", condition: "", description: "Vous murmurez aux esprits de la nature pour créer un effet naturel mineur (faire éclore une fleur, prédire le temps de demain, allumer ou éteindre une petite flamme, ou faire souffler une brise légère)." },
    { nom: "Amitié avec les animaux (Animal Friendship)", ecole: "Enchantement", niveau: 1, incantation: "1 action", portee: "9 m", duree: "24 heures", condition: "Charmé", description: "Ce sort vous permet de convaincre une bête que vous ne lui voulez aucun mal. La cible doit réussir un jet de sauvegarde de Sagesse ou être charmée pour la durée du sort." },
    { nom: "Lien avec une bête (Beast Bond)", ecole: "Divination", niveau: 1, incantation: "1 action", portee: "Contact", duree: "Concentration, jusqu'à 10 minutes", condition: "", description: "Vous établissez un lien télépathique avec une bête consentante que vous pouvez voir. Tant que le lien est actif, la bête bénéficie d'un avantage à ses jets d'attaque contre toute créature à moins de 1.50m de vous." },
    { nom: "Communication avec les animaux (Speak with Animals)", ecole: "Divination", niveau: 1, incantation: "1 action", portee: "Personnelle", duree: "10 minutes", condition: "", description: "Vous gagnez la capacité de communiquer verbalement avec les bêtes pour la durée du sort. Vous pouvez comprendre leurs réponses et leur poser des questions simples." },
    { nom: "Trait de feu (Fire Bolt)", ecole: "Évocation", niveau: 0, incantation: "1 action", portee: "36 m", duree: "Instantanée", condition: "", description: "Vous lancez un projectile de feu sur une cible à portée. Effectuez une attaque de sort à distance. En cas de réussite, la cible subit 1d10 dégâts de feu. Un objet inflammable touché par ce sort s'enflamme s'il n'est pas porté ou transporté." },
    { nom: "Lumière (Light)", ecole: "Évocation", niveau: 0, incantation: "1 action", portee: "Contact", duree: "1 heure", condition: "", description: "Vous touchez un objet de taille M ou inférieure. L'objet brille d'une lumière vive dans un rayon de 6m et d'une lumière faible sur 6m supplémentaires. La couleur de la lumière est au choix du lanceur." },
    { nom: "Illusion mineure (Minor Illusion)", ecole: "Illusion", niveau: 0, incantation: "1 action", portee: "9 m", duree: "1 minute", condition: "", description: "Vous créez un son ou l'image d'un objet à portée. Le son peut aller d'un murmure à un rugissement. L'image ne peut pas faire plus de 1.50m de côté et ne produce aucun effet sensoriel physique." },
    { nom: "Sommeil (Sleep)", ecole: "Enchantement", niveau: 1, incantation: "1 action", portee: "27 m", duree: "1 minute", condition: "Inconscient", description: "Ce sort plonge les créatures dans un sommeil magique. Lancez 5d8. Le total représente le nombre de points de vie de créatures que le sort affecte. Les créatures dans un rayon de 6m de la cible sont affectées par ordre croissant de leurs PV actuels. Les cibles affectées tombent inconscientes." },
    { nom: "Charme-personne (Charm Person)", ecole: "Enchantement", niveau: 1, incantation: "1 action", portee: "9 m", duree: "1 heure", condition: "Charmé", description: "Vous tentez de charmer un humanoïde à portée. La cible doit réussir un jet de sauvegarde de Sagesse ou être charmée par vous. Si elle est en combat avec vous, elle bénéficie d'un avantage à sa sauvegarde." },
    { nom: "Soin des blessures (Cure Wounds)", ecole: "Évocation", niveau: 1, incantation: "1 action", portee: "Contact", duree: "Instantanée", condition: "", description: "Une créature que vous touchez récupère un nombre de points de vie égal à 1d8 + votre modificateur de caractéristique d'incantation. Ce sort n'a aucun effet sur les morts-vivants ou les constructs." },
    { nom: "Mot de guérison (Healing Word)", ecole: "Évocation", niveau: 1, incantation: "1 action bonus", portee: "18 m", duree: "Instantanée", condition: "", description: "Une créature de votre choix dans votre champ de vision récupère un nombre de points de vie égal à 1d4 + votre modificateur de caractéristique d'incantation. Très pratique car il s'incante en action bonus." },
    { nom: "Mains brûlantes (Burning Hands)", ecole: "Évocation", niveau: 1, incantation: "1 action", portee: "Personnelle (cône de 4.50 m)", duree: "Instantanée", condition: "", description: "De minces jets de flammes jaillissent de vos mains. Chaque créature dans un cône de 4.50 mètres doit faire un jet de sauvegarde de Dextérité. Elle subit 3d6 dégâts de feu en cas d'échec, ou la moitié en cas de réussite." },
    { nom: "Projectiles magiques (Magic Missile)", ecole: "Évocation", niveau: 1, incantation: "1 action", portee: "36 m", duree: "Instantanée", condition: "", description: "Vous créez trois fléchettes brillantes de force magique. Chaque fléchette frappe une créature de votre choix visible à portée. Une fléchette inflige 1d4 + 1 dégâts de force. Les fléchettes frappent simultanément et ne peuvent pas rater leur cible." },
    { nom: "Armure de mage (Mage Armor)", ecole: "Abjuration", niveau: 1, incantation: "1 action", portee: "Contact", duree: "8 heures", condition: "", description: "Vous touchez une créature consentante qui ne porte pas d'armure. Une force magique protectrice l'enveloppe. Sa CA de base devient 13 + son modificateur de Dextérité. Le sort prend fin si la cible enfile une armure ou si vous dissipez le sort." },
    { nom: "Bouclier (Shield)", ecole: "Abjuration", niveau: 1, incantation: "1 réaction", portee: "Personnelle", duree: "1 tour", condition: "", description: "Une barrière invisible apparaît pour vous protéger. Jusqu'au début de votre prochain tour, vous obtenez un bonus de +5 à votre CA (y compris contre l'attaque déclencheuse). Vous ne subissez aucun dégât du sort Projectiles magiques." },
    { nom: "Poison d'en-bas (Ray of Sickness)", ecole: "Nécromancie", niveau: 1, incantation: "1 action", portee: "18 m", duree: "Instantanée", condition: "Empoisonné", description: "Un rayon de bile verdâtre jaillit vers une cible. Effectuez une attaque de sort à distance. En cas de réussite, la cible subit 2d8 dégâts de poison et doit faire un jet de sauvegarde de Constitution. En cas d'échec, elle est également empoisonnée jusqu'à la fin de votre prochain tour." },
    { nom: "Cécité / Surdité (Blindness/Deafness)", ecole: "Nécromancie", niveau: 2, incantation: "1 action", portee: "9 m", duree: "1 minute", condition: "Aveuglé", description: "Vous harcelez une cible avec une maladie magique. Elle doit réussir un jet de sauvegarde de Constitution ou être aveuglée ou sourde (au choix du lanceur). Elle peut refaire une sauvegarde à la fin de chacun de ses tours." },
    { nom: "Blocage de personne (Hold Person)", ecole: "Enchantement", niveau: 2, incantation: "1 action", portee: "18 m", duree: "Concentration, jusqu'à 1 minute", condition: "Paralysé", description: "Vous ciblez un humanoïde visible à portée. La cible doit réussir un jet de sauvegarde de Sagesse ou être paralysée pour la durée du sort. Elle effectue un nouveau jet de sauvegarde à la fin de chacun de ses tours." },
    { nom: "Invisibilité (Invisibility)", ecole: "Illusion", niveau: 2, incantation: "1 action", portee: "Contact", duree: "Concentration, jusqu'à 1 heure", condition: "Invisible", description: "Une créature que vous touchez devient invisible. Tout ce qu'elle porte devient également invisible. Le sort prend fin immédiatement si la cible attaque ou lance un sort." },
    { nom: "Suggestion (Suggestion)", ecole: "Enchantement", niveau: 2, condition: "Charmé", incantation: "1 action", portee: "9 m", duree: "Concentration, jusqu'à 8 heures", description: "Vous suggérez une activité à un humanoïde à portée. La cible doit faire un jet de sauvegarde de Sagesse ou suivre votre suggestion. La suggestion doit être formulée de manière à paraître raisonnable." },
    { nom: "Couronne du Chaos (Crown of Madness)", ecole: "Enchantement", niveau: 2, incantation: "1 action", portee: "36 m", duree: "Concentration, jusqu'à 1 minute", condition: "Charmé", description: "Un humanoïde de votre choix doit réussir un jet de sauvegarde de Sagesse sous peine d'être charmé. Une couronne de fer déchiqueté apparaît sur sa tête. La cible doit utiliser son action pour faire une attaque au corps à corps contre une cible choisie par le lanceur." },
    { nom: "Toile d'araignée (Web)", ecole: "Conjuration", niveau: 2, incantation: "1 action", portee: "18 m", duree: "Concentration, jusqu'à 1 heure", condition: "Entravé", description: "Vous créez une masse de toiles épaisses et collantes. La zone devient un terrain difficile. Toute créature qui commence son tour dans les toiles ou y pénètre doit réussir un jet de sauvegarde de Dextérité ou être entravée." },
    { nom: "Ténèbres (Darkness)", ecole: "Évocation", niveau: 2, incantation: "1 action", portee: "18 m", duree: "Concentration, jusqu'à 10 minutes", condition: "", description: "Une obscurité magique se répand depuis un point à portée, remplissant une sphère de 4.50m de rayon. La vision dans le noir ne permet pas de voir à travers cette obscurité magique, et la lumière non magique ne peut pas l'éclairer." },
    { nom: "Pas brumeux (Misty Step)", ecole: "Transmutation", niveau: 2, incantation: "1 action bonus", portee: "Personnelle", duree: "Instantanée", condition: "", description: "Entouré d'une brume argentée éphémère, vous vous téléportez instantanément jusqu'à 9 mètres dans un espace vide que vous pouvez voir." },
    { nom: "Lame de feu (Flame Blade)", ecole: "Évocation", niveau: 2, incantation: "1 action bonus", portee: "Personnelle", duree: "Concentration, jusqu'à 10 minutes", condition: "", description: "Vous faites jaillir de votre main libre une épée de feu qui émet une lumière vive sur 3m. Vous pouvez effectuer une attaque de sort au corps à corps avec cette lame, infligeant 3d6 dégâts de feu." },
    { nom: "Passage sans trace (Pass without Trace)", ecole: "Abjuration", niveau: 2, incantation: "1 action", portee: "Personnelle", duree: "Concentration, jusqu'à 1 heure", condition: "", description: "Un voile d'ombres et de silence enveloppe les cibles choisies dans un rayon de 9m. Chaque cible bénéficie d'un bonus de +10 à ses tests de Dextérité (Discrétion) et ne peut pas être pistée par des moyens non magiques." },
    { nom: "Croissance d'épines (Spike Growth)", ecole: "Transmutation", niveau: 2, incantation: "1 action", portee: "45 m", duree: "Concentration, jusqu'à 10 minutes", condition: "", description: "Le sol dans un rayon de 6m devient hérissé d'épines et de ronces. La zone est un terrain difficile. Lorsqu'une créature s'y déplace, elle subit 2d4 dégâts perforants pour chaque tranche de 1.50m parcourue." },
    { nom: "Nuage puant (Stinking Cloud)", ecole: "Conjuration", niveau: 3, incantation: "1 action", portee: "27 m", duree: "Concentration, jusqu'à 1 minute", condition: "Empoisonné", description: "Vous créez une sphère de gaz jaune et nauséabond de 6m de rayon. Toute créature qui y commence son tour doit réussir un jet de sauvegarde de Constitution ou être empoisonnée et perdre son action pour ce tour en raison de violentes nausées." },
    { nom: "Regard hypnotique (Hypnotic Pattern)", ecole: "Illusion", niveau: 3, incantation: "1 action", portee: "36 m", duree: "Concentration, jusqu'à 1 minute", condition: "Neutralisé", description: "Vous créez une spirale de couleurs chatoyantes dans une zone de 9m de côté. Les créatures dans la zone qui ratent un jet de sauvegarde de Sagesse sont charmées, neutralisées et ont leur vitesse réduite à 0." },
    { nom: "Boule de feu (Fireball)", ecole: "Évocation", niveau: 3, incantation: "1 action", portee: "45 m", duree: "Instantanée", condition: "", description: "Une boule de feu jaillit de votre doigt et explose dans une sphère de 6m de rayon. Chaque créature dans la zone doit faire un jet de sauvegarde de Dextérité. Elle subit 8d6 dégâts de feu en cas d'échec, ou la moitié en cas de réussite." },
    { nom: "Éclair (Lightning Bolt)", ecole: "Évocation", niveau: 3, incantation: "1 action", portee: "Personnelle (ligne de 30 m)", duree: "Instantanée", condition: "", description: "Un éclair de foudre de 30 mètres de long et 1.50 mètre de large jaillit de vous. Chaque créature dans la ligne doit réussir un jet de sauvegarde de Dextérité sous peine de subir 8d6 dégâts de foudre." },
    { nom: "Peur (Fear)", ecole: "Illusion", niveau: 3, incantation: "1 action", portee: "Personnelle (cône de 9 m)", duree: "Concentration, jusqu'à 1 minute", condition: "Effrayé", description: "Vous projetez une image terrifiante. Chaque créature dans un cône de 9m doit réussir un jet de sauvegarde de Sagesse sous peine d'être effrayée, de lâcher ses objets et de devoir fuir par le chemin le plus sûr." },
    { nom: "Hâte (Haste)", ecole: "Transmutation", niveau: 3, incantation: "1 action", portee: "9 m", duree: "Concentration, jusqu'à 1 minute", condition: "", description: "Vous choisissez une créature consentante à portée. Jusqu'à la fin du sort, sa CA augmente de +2, elle a l'avantage aux sauvegardes de Dex, sa vitesse est doublée, et elle obtient une action supplémentaire par tour (Attaquer, Foncer, Se désengager, Se cacher, utiliser un objet)." },
    { nom: "Appel de la foudre (Call Lightning)", ecole: "Conjuration", niveau: 3, incantation: "1 action", portee: "36 m", duree: "Concentration, jusqu'à 10 minutes", condition: "", description: "Un nuage d'orage apparaît au-dessus de vous. À chaque tour, vous pouvez utiliser votre action pour faire s'abattre un éclair sur un point sous le nuage, infligeant 3d10 dégâts de foudre dans un rayon de 1.50m (sauvegarde de Dex)." },
    { nom: "Dissipation de la magie (Dispel Magic)", ecole: "Abjuration", niveau: 3, incantation: "1 action", portee: "36 m", duree: "Instantanée", condition: "", description: "Vous choisissez une créature, un objet ou un effet magique à portée. Tout sort de niveau 3 ou inférieur actif sur la cible prend fin." },
    { nom: "Contre-sort (Counterspell)", ecole: "Abjuration", niveau: 3, incantation: "1 réaction", portee: "18 m", duree: "Instantanée", condition: "", description: "Vous tentez d'interrompre l'incantation d'un sort par une autre créature. Si le sort est de niveau 3 ou inférieur, il échoue automatiquement." },
    { nom: "Silence (Silence)", ecole: "Illusion", niveau: 2, incantation: "1 action", portee: "36 m", duree: "Concentration, jusqu'à 10 minutes", condition: "", description: "Un silence total remplit une sphère de 6 mètres de rayon à portée. Aucun son ne peut traverser ou être émis dans la zone. Les créatures y sont immunisées contre les dégâts de tonnerre, et il y est impossible d'incanter des sorts à composante verbale." },
    { nom: "Vol (Fly)", ecole: "Transmutation", niveau: 3, incantation: "1 action", portee: "Contact", duree: "Concentration, jusqu'à 10 minutes", condition: "", description: "Vous touchez une créature consentante. Elle obtient une vitesse de vol de 18 mètres pour la durée du sort. Si le sort prend fin alors qu'elle est en l'air, elle tombe si elle n'a pas d'autre moyen de voler." },
    { nom: "Porte dimensionnelle (Dimension Door)", ecole: "Invocation", niveau: 4, incantation: "1 action", portee: "150 m", duree: "Instantanée", condition: "", description: "Vous vous téléportez de votre emplacement actuel vers un autre emplacement dans la limite de la portée. Vous pouvez être accompagné d'une créature consentante de votre taille ou plus petite." },
    { nom: "Mur de feu (Wall of Fire)", ecole: "Évocation", niveau: 4, incantation: "1 action", portee: "36 m", duree: "Concentration, jusqu'à 1 minute", condition: "", description: "Vous créez un mur de feu de 18m de long ou un anneau de feu de 6m de diamètre. Le mur inflige 5d8 dégâts de feu à toute créature qui y pénètre ou y termine son tour." }
  ],

  renderRulesCategory(category) {
    let items = [];
    let title = "";
    
    if (category === "actions") {
      title = "⚔️ Actions en Combat";
      items = this.combatActions;
    } else if (category === "movements") {
      title = "🏃 Déplacements & Mouvements";
      items = this.movementRules;
    } else if (category === "conditions") {
      title = "🤢 Altérations & États";
      items = this.conditions;
    } else if (category === "skills") {
      title = "📊 Compétences D&D 5E";
      items = this.skills;
    } else if (category === "spells") {
      title = "🔮 Grimoire de Sorts (AideDD)";
      items = this.spells.map(s => ({
        id: "spell_" + s.nom.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase(),
        nom: s.nom,
        description: `<strong>École :</strong> ${s.ecole} | <strong>Niveau :</strong> ${s.niveau}<br><strong>Incantation :</strong> ${s.incantation} | <strong>Portée :</strong> ${s.portee}<br><strong>Durée :</strong> ${s.duree}<br>${s.condition ? `<strong>État associé :</strong> ${s.condition}<br>` : ""}<br>${s.description}`
      }));
    } else if (category === "items") {
      title = "🎒 Équipement & Objets de Base";
      items = this.items.map(i => ({
        id: "item_" + i.nom.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase(),
        nom: i.nom,
        description: `<strong>Type :</strong> ${i.type} ${i.degats ? `| <strong>Dégâts :</strong> ${i.degats}` : ''} ${i.ca ? `| <strong>CA :</strong> ${i.ca}` : ''}<br>${i.proprietes ? `<strong>Propriétés :</strong> ${i.proprietes}<br>` : ''}<br>${i.description}`
      }));
    }
    
    if (items.length === 0) return `<div class="empty-state">Aucune règle disponible.</div>`;
    
    let html = `
      <div style="padding:10px;">
        <h3 style="font-family:var(--font-title); font-size:1.1rem; color:#ffd166; margin-bottom:12px; border-bottom:1px solid var(--glass-border); padding-bottom:5px;">${title}</h3>
        <div style="display:flex; flex-direction:column; gap:8px;">
    `;
    
    items.forEach(item => {
      html += `
        <div class="glass-panel card" style="padding:12px; cursor:pointer;" onclick="window.RulesEngine.showRuleDetail('${category}', '${item.id || item.nom}')">
          <strong style="color:#fff; font-size:0.85rem; display:block; margin-bottom:4px;">${item.nom}</strong>
          <p style="font-size:0.72rem; color:var(--text-dim); margin:0; line-height:1.4;">
            ${item.description.length > 130 ? item.description.replace(/<[^>]*>/g, '').substring(0, 130) + "..." : item.description.replace(/<[^>]*>/g, '')}
          </p>
        </div>
      `;
    });
    
    html += `
        </div>
      </div>
    `;
    
    return html;
  },

  showRuleDetail(category, itemId) {
    let item = null;
    if (category === "actions") {
      item = this.combatActions.find(i => i.id === itemId);
    } else if (category === "movements") {
      item = this.movementRules.find(i => i.id === itemId);
    } else if (category === "conditions") {
      item = this.conditions.find(i => i.id === itemId);
    } else if (category === "skills") {
      item = this.skills.find(i => i.id === itemId);
    } else if (category === "spells") {
      item = this.spells.find(s => s.nom === itemId || ("spell_" + s.nom.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase()) === itemId);
      if (item) {
        item = {
          nom: item.nom,
          description: `
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:12px; font-size:0.75rem; background:rgba(0,0,0,0.25); padding:8px; border-radius:4px; border:1px solid var(--glass-border);">
              <div><strong>École :</strong> ${item.ecole}</div>
              <div><strong>Niveau :</strong> ${item.niveau}</div>
              <div><strong>Incantation :</strong> ${item.incantation}</div>
              <div><strong>Portée :</strong> ${item.portee}</div>
              <div><strong>Durée :</strong> ${item.duree}</div>
              <div><strong>État :</strong> ${item.condition || "Aucun"}</div>
            </div>
            <p style="font-size:0.8rem; line-height:1.5; color:#fff;">${item.description}</p>
          `
        };
      }
    } else if (category === "items") {
      item = this.items.find(i => i.nom === itemId || ("item_" + i.nom.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase()) === itemId);
      if (item) {
        item = {
          nom: item.nom,
          description: `
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:12px; font-size:0.75rem; background:rgba(0,0,0,0.25); padding:8px; border-radius:4px; border:1px solid var(--glass-border);">
              <div><strong>Type :</strong> ${item.type}</div>
              ${item.degats ? `<div><strong>Dégâts :</strong> ${item.degats}</div>` : ''}
              ${item.ca ? `<div><strong>Classe d'Armure :</strong> ${item.ca}</div>` : ''}
              ${item.proprietes ? `<div style="grid-column: span 2;"><strong>Propriétés :</strong> ${item.proprietes}</div>` : ''}
            </div>
            <p style="font-size:0.8rem; line-height:1.5; color:#fff;">${item.description}</p>
          `
        };
      }
    }

    if (!item) return;

    // Show in the standard Detail Modal
    const modal = document.getElementById('detail-modal');
    if (!modal) return;

    const titleEl = document.getElementById('modal-entity-title');
    const detailsEl = document.getElementById('modal-entity-details');

    titleEl.textContent = item.nom;
    detailsEl.innerHTML = `
      <div style="color:var(--text-main); font-size:0.85rem; line-height:1.5; padding:10px 0;">
        ${item.description.includes("<p") || item.description.includes("<div") ? item.description : `<p>${item.description}</p>`}
      </div>
    `;

    modal.classList.add('active');
  },

  items: [
    // Armes Courantes
    { nom: "Dague (Dagger)", degats: "1d4", type: "Arme courante", proprietes: "Finesse, léger, lancer (portée 6/18)", description: "Une petite arme tranchante et perforante, facile à dissimuler." },
    { nom: "Épée courte (Shortsword)", degats: "1d6", type: "Arme courante", proprietes: "Finesse, léger", description: "Une épée courte et maniable, idéale pour le combat rapproché." },
    { nom: "Épée longue (Longsword)", degats: "1d8", type: "Arme de guerre", proprietes: "Polyvalente (1d10)", description: "Une épée classique à double tranchant, utilisable à une ou deux mains." },
    { nom: "Rapière (Rapier)", degats: "1d8", type: "Arme de guerre", proprietes: "Finesse", description: "Une épée fine et légère privilégiant les attaques de précision." },
    { nom: "Gourdin (Club)", degats: "1d4", type: "Arme courante", proprietes: "Léger", description: "Un simple morceau de bois lourd utilisé comme matraque." },
    { nom: "Bâton (Quarterstaff)", degats: "1d6", type: "Arme courante", proprietes: "Polyvalent (1d8)", description: "Un long bâton de marche renforcé, utilisable à une ou deux mains." },
    { nom: "Hachette (Handaxe)", degats: "1d6", type: "Arme courante", proprietes: "Léger, lancer (portée 6/18)", description: "Une petite hache conçue pour le combat rapproché ou le lancer." },
    { nom: "Masse d'armes (Mace)", degats: "1d6", type: "Arme courante", proprietes: "", description: "Une arme de contact dotée d'une tête en métal lourd pour briser les armures." },
    { nom: "Grande épée (Greatsword)", degats: "2d6", type: "Arme de guerre", proprietes: "Lourd, à deux mains", description: "Une immense épée nécessitant l'usage des deux mains pour infliger de lourds dégâts." },
    { nom: "Arc court (Shortbow)", degats: "1d6", type: "Arme courante", proprietes: "Munitions, portée (24m/96m), à deux mains", description: "Un arc compact et léger pour le tir à distance." },
    { nom: "Arc long (Longbow)", degats: "1d8", type: "Arme de guerre", proprietes: "Munitions, portée (45m/180m), lourd, à deux mains", description: "Un grand arc en bois robuste offrant une excellente portée." },
    { nom: "Arbalète légère (Light Crossbow)", degats: "1d8", type: "Arme courante", proprietes: "Munitions, portée (24m/96m), chargement, à deux mains", description: "Une arbalète compacte facile à armer." },

    // Armures
    { nom: "Armure de cuir (Leather)", ca: "11 + mod DEX", type: "Armure légère", description: "Une armure faite de cuir souple bouilli pour offrir une protection minimale sans entraver les mouvements." },
    { nom: "Armure de cuir clouté (Studded Leather)", ca: "12 + mod DEX", type: "Armure légère", description: "Armure de cuir renforcée par des rivets métalliques serrés." },
    { nom: "Chemise de mailles (Chain Shirt)", ca: "13 + mod DEX (max +2)", type: "Armure intermédiaire", description: "Une chemise faite d'anneaux métalliques entrelacés portée entre des couches de vêtements." },
    { nom: "Cuirasse (Breastplate)", ca: "14 + mod DEX (max +2)", type: "Armure intermédiaire", description: "Une plaque de métal protégeant le torse, laissant les bras libres." },
    { nom: "Cotte de mailles (Chain Mail)", ca: "16", type: "Armure lourde", description: "Une armure complète d'anneaux métalliques. Nécessite une Force de 13 et impose un désavantage en discrétion." },
    { nom: "Harnois (Plate)", ca: "18", type: "Armure lourde", description: "Une armure de plaques articulées couvrant tout le corps. Nécessite une Force de 15 et impose un désavantage en discrétion." },
    { nom: "Bouclier (Shield)", ca: "+2 CA", type: "Bouclier", description: "Un bouclier de bois ou de métal porté à la main pour parer les coups." },

    // Outils & Objets divers
    { nom: "Potion de soins (Potion of Healing)", type: "Consommable magique", description: "Un flacon contenant un liquide rougeoyant. Boire cette potion (ou l'administrer) redonne 2d4 + 2 points de vie." },
    { nom: "Outils de voleur (Thieves' Tools)", type: "Outils", description: "Un ensemble de rossignols, pinces, limes et miroirs utilisé pour crocheter les serrures et désamorcer les pièges." },
    { nom: "Kit d'herboriste (Herbalism Kit)", type: "Outils", description: "Ustensiles nécessaires pour identifier, cueillir et préparer les plantes médicinales et créer des potions de soins." },
    { nom: "Kit de contrefaçon (Forgery Kit)", type: "Outils", description: "Plumes, encres spéciales et cires pour reproduire des documents officiels ou des sceaux." },
    { nom: "Kit de déguisement (Disguise Kit)", type: "Outils", description: "Produits de maquillage, postiches et teintures pour changer d'apparence." }
  ]
};
