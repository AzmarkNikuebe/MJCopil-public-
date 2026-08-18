window.SettingsEngine = {
  activeTheme: localStorage.getItem("mj_copilot_theme") || "sombre",

  setTheme(themeName) {
    this.activeTheme = themeName;
    localStorage.setItem("mj_copilot_theme", themeName);
    
    document.body.classList.remove('theme-sombre', 'theme-clair', 'theme-parchemin');
    document.body.classList.add(`theme-${themeName}`);

    const select = document.getElementById('theme-select');
    if (select) select.value = themeName;
  },

  initTheme() {
    this.setTheme(this.activeTheme);
  },

  saveAIConfig(config) {
    AppState.aiConfig = config;
    localStorage.setItem("mj_copilot_ai_config", JSON.stringify(config));
    showNotification("Configuration IA sauvegardée !", "success");
  }
};
