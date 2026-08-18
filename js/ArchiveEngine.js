window.ArchiveEngine = {
  exportSessionMarkdown(seanceId) {
    const db = AppState.db;
    const seance = db.seances.find(s => s.id === seanceId);
    if (!seance) return;

    const chap = db.chapitres.find(c => c.id === seance.chapitreId);
    
    let md = `# Résumé de Séance : ${seance.titre}
**Date :** ${seance.date} | **Durée :** ${seance.duree || 'Inconnue'}
**Campagne :** ${db.campagne.titre} | **Chapitre :** ${chap ? chap.titre : 'N/A'}
**Lieu principal :** ${seance.lieu || 'Non spécifié'}
 
## Résumé Narratif
${seance.resume}

## Événements de la séance
`;

    const evts = db.evenements.filter(e => seance.evenements && seance.evenements.includes(e.id));
    if (evts.length > 0) {
      evts.forEach(e => {
        md += `* **${e.titre} :** ${e.description}\n`;
      });
    } else {
      md += `*Aucun événement majeur consigné.*\n`;
    }

    md += `\n## Affrontements & Combats\n`;
    const cmbts = db.combats.filter(c => seance.combats && seance.combats.includes(c.id));
    if (cmbts.length > 0) {
      cmbts.forEach(c => {
        md += `* **${c.titre} :** ${c.resultat} (Participants: ${c.participants.join(', ')})\n`;
      });
    } else {
      md += `*Aucun combat majeur.*\n`;
    }

    md += `\n## Secrets Révélés\n`;
    const sec = db.secrets.filter(s => seance.secretsReveles && seance.secretsReveles.includes(s.id));
    if (sec.length > 0) {
      sec.forEach(s => {
        md += `* **${s.titre} :** ${s.description}\n`;
      });
    } else {
      md += `*Aucun secret n'a été découvert durant cette séance.*\n`;
    }

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Resume_Seance_${seance.date}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotification(`Séance "${seance.titre}" exportée en Markdown !`, "success");
  }
};
