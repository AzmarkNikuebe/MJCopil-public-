import os
import sys
import json
import time
import subprocess
import urllib.request
import fitz  # PyMuPDF
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from pydantic import BaseModel
import traceback

def is_ollama_running(url="http://127.0.0.1:11434") -> bool:
    """Check if Ollama server is responding to API requests."""
    try:
        req = urllib.request.Request(f"{url}/api/tags", headers={"User-Agent": "MJ-Copilot/2.0"})
        with urllib.request.urlopen(req, timeout=1.5) as response:
            return response.status == 200
    except Exception:
        return False

def get_ollama_models(url="http://127.0.0.1:11434") -> list:
    """Get list of available models from Ollama."""
    try:
        req = urllib.request.Request(f"{url}/api/tags", headers={"User-Agent": "MJ-Copilot/2.0"})
        with urllib.request.urlopen(req, timeout=2.0) as response:
            if response.status == 200:
                data = json.loads(response.read().decode('utf-8'))
                return data.get('models', [])
    except Exception:
        pass
    return []

import shutil

def find_ollama_executable() -> str:
    """Finds the absolute path to the Ollama binary on Windows / Linux / macOS."""
    candidates = [
        shutil.which("ollama"),
        os.path.expandvars(r"%LOCALAPPDATA%\Programs\Ollama\ollama.exe"),
        os.path.expandvars(r"%PROGRAMFILES%\Ollama\ollama.exe"),
        r"C:\Users\viotv\AppData\Local\Programs\Ollama\ollama.exe"
    ]
    for cand in candidates:
        if cand and os.path.exists(cand):
            return cand
    return "ollama"

def start_ollama_daemon() -> bool:
    """Launch Ollama server in background if not already running."""
    if is_ollama_running():
        return True
    
    print("[Ollama] Démarrage automatique du serveur Ollama...")
    try:
        exe = find_ollama_executable()
        creation_flags = 0
        if sys.platform == "win32":
            creation_flags = subprocess.CREATE_NO_WINDOW
            if hasattr(subprocess, "DETACHED_PROCESS"):
                creation_flags |= subprocess.DETACHED_PROCESS
        
        subprocess.Popen(
            [exe, "serve"],
            stdin=subprocess.DEVNULL,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            close_fds=True,
            creationflags=creation_flags
        )
        
        # Wait up to 10 seconds for Ollama to become available
        for _ in range(20):
            time.sleep(0.5)
            if is_ollama_running():
                print("[Ollama] Serveur Ollama démarré avec succès !")
                return True
    except Exception as e:
        print(f"[Ollama] Erreur lors du lancement d'Ollama: {e}")
    
    return is_ollama_running()


def extract_pdf_contents(pdf_bytes) -> list:
    """
    Extracts text or renders pages as images if it's a scanned PDF.
    Returns a list of content parts for the Gemini API call.
    """
    from google.genai import types
    import fitz
    
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    text = ""
    for page in doc:
        text += page.get_text()
        
    if len(text.strip()) > 200:
        print(f"Text mode: Extracted {len(text)} characters from PDF.")
        return [text]
    else:
        print(f"Multimodal mode: Scanned PDF detected. Rendering {len(doc)} pages as PNG...")
        parts = []
        for i, page in enumerate(doc[:15]): # Limit to 15 pages to prevent tokens overflow
            print(f"Rendering page {i+1}...")
            pix = page.get_pixmap(dpi=150)
            img_bytes = pix.tobytes("png")
            parts.append(
                types.Part.from_bytes(
                    data=img_bytes,
                    mime_type="image/png"
                )
            )
        return parts

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SYSTEM_PROMPT = """Tu es un concepteur de jeux de rôle expert et un spécialiste de D&D 5E, particulièrement doué pour la narration et l'écriture de lore riche et immersif.
Ton objectif est de lire le texte d'un scénario de JDR et de le convertir en un fichier JSON strict correspondant au schéma du Codex de notre VTT, en accordant une attention extrême au développement du lore, de l'histoire, des factions, des secrets et des objets.

Voici la structure JSON attendue :
{
  "campagne": {
    "id": "ID_unique",
    "titre": "Titre de la campagne",
    "description": "Un grand résumé narratif complet et captivant de l'intrigue globale, de ses enjeux et de son atmosphère (au moins 2-3 paragraphes détaillés).",
    "univers": "Description détaillée de l'univers de jeu, de ses règles magiques, de sa cosmologie, et du contexte géopolitique ou historique (développe grandement ce champ).",
    "niveaux": "Niveaux jouables (ex: 1 à 3)",
    "themes": ["theme1", "theme2"]
  },
  "chapitres": [
    {
      "id": "chap_01",
      "titre": "Titre du chapitre",
      "description": "Récit narratif détaillé de ce chapitre : introduction de l'intrigue, défis à surmonter, rebondissements possibles, ambiance et conclusion du chapitre.",
      "objectifs": ["objectif principal 1", "objectif secondaire 2"],
      "niveau_requis": "1",
      "lieu_principal": "id_lieu",
      "pnjs_impliques": ["id_pnj"]
    }
  ],
  "lieux": [
    {
      "id": "id_lieu",
      "nom": "Nom du lieu",
      "type": "donjon/ville/taverne/etc.",
      "description": "Description sensorielle riche (visuelle, sonore, olfactive) du lieu, son histoire locale, son importance dans le scénario et l'ambiance qui y règne.",
      "regions": ["salle 1 : description ou nom", "salle 2 : description ou nom"]
    }
  ],
  "pnjs": [
    {
      "id": "id_pnj",
      "nom": "Nom du PNJ",
      "role": "Rôle / Profession",
      "description": "Portrait psychologique détaillé, apparence physique, ses motivations secrètes, sa manière de parler ou de se comporter, et son passé (backstory).",
      "faction": "id_faction",
      "localisation": "id_lieu"
    }
  ],
  "factions": [
    {
      "id": "id_faction",
      "nom": "Nom de la faction ou de l'organisation",
      "description": "Lore complet sur la faction : son histoire, son influence, ses objectifs à court et long terme, ses alliés, ses ennemis et ses méthodes d'action.",
      "alignment": "loyal bon/neutre/chaotique mauvais/etc.",
      "membres": ["id_pnj1", "id_pnj2"]
    }
  ],
  "objets": [
    {
      "id": "id_objet",
      "nom": "Nom de l'objet",
      "description": "Histoire de l'objet (origine historique ou mythique), ses propriétés magiques ou mécaniques détaillées, son apparence et ses effets secondaires ou légendes associées.",
      "type": "arme/armure/anneau/artefact/etc.",
      "possesseur": "id_pnj"
    }
  ],
  "secrets": [
    {
      "id": "id_secret",
      "nom": "Nom du mystère ou de la rumeur",
      "description": "Un secret ou une rumeur caché que les joueurs peuvent découvrir. Explique en détail la vérité cachée derrière ce mystère et comment il est lié à l'intrigue principale.",
      "decouverte": false
    }
  ],
  "evenements": [
    {
      "id": "id_evenement",
      "titre": "Nom de l'événement historique ou marquant",
      "description": "Récit complet de l'événement : ce qui s'est passé, les conséquences géopolitiques ou locales, et comment cela a façonné le présent de la campagne.",
      "date": "Date historique ou moment chronologique",
      "type": "lore/combat/quete/etc."
    }
  ]
}

Règles impératives :
1. Réponds UNIQUEMENT avec du JSON valide. N'ajoute pas de texte avant ou après.
2. Développe extrêmement le lore (l'univers, l'histoire passée, les factions, les secrets) et l'histoire narrative (descriptions complètes des chapitres et des motivations des PNJs). Les textes générés doivent être riches, longs et immersifs.
"""

BESTIARY_SYSTEM_PROMPT = """Tu es un expert du jeu de rôle D&D 5E et un assistant de maître de jeu.
Ton objectif est de lire le texte extrait d'un bestiaire ou d'un scénario de JDR et d'extraire la liste de toutes les créatures et monstres avec leurs blocs de statistiques (statblocks).
Pour chaque créature identifiée, tu dois retourner un objet JSON avec les propriétés suivantes :
- nom (string, le nom en français, ex: "Gobelin")
- role (string, le type/alignement/dangerosité, ex: "Humanoïde petit, Neutre Mauvais, FP 1/4")
- description (string, un résumé clair de ses capacités, traits de combat, attaques, dégâts et bonus pour toucher. Exemple: "Traits: Tactique de meute. Attaques: Cimeterre (+4 pour toucher, 1d6+2 tranchant), Arc court (+4 pour toucher, 1d6+2 perforant)")
- pointsVieMax (integer, la valeur numérique moyenne de ses points de vie max, ex: 7)
- ca (integer, sa classe d'armure numérique, ex: 15)
- initiative (string, son modificateur d'initiative avec son signe + ou -, ex: "+2" ou "-1")

Le résultat final doit être uniquement un tableau JSON valide (Array) contenant la liste de ces créatures, respectant exactement ce schéma. Ne rajoute aucun commentaire ou texte avant ou après le JSON.
"""

@app.get("/api/ollama/status")
async def get_ollama_status():
    """Returns Ollama status and available models."""
    running = is_ollama_running()
    models = get_ollama_models() if running else []
    return {
        "running": running,
        "models": models,
        "model_names": [m.get("name") for m in models]
    }

@app.post("/api/ollama/start")
async def start_ollama():
    """Auto-starts Ollama daemon if not running and returns models."""
    started = start_ollama_daemon()
    models = get_ollama_models() if started else []
    return {
        "running": started,
        "models": models,
        "model_names": [m.get("name") for m in models]
    }

@app.post("/api/generate-codex")
async def generate_codex(
    file: UploadFile = File(...),
    api_key: str = Form(...),
    model: str = Form("gemini-2.5-flash")
):
    if not api_key:
        raise HTTPException(status_code=400, detail="Gemini API Key is required")
    
    try:
        # Read PDF and extract content (handles text and scanned image PDFs)
        content = await file.read()
        parts = extract_pdf_contents(content)
        
        # Call Gemini with 5-minute timeout for large PDF parsing
        from google.genai import types
        client = genai.Client(
            api_key=api_key,
            http_options=types.HttpOptions(timeout=300_000)
        )
        
        # Check if we got text or images
        is_images = any(isinstance(p, types.Part) for p in parts)
        
        if is_images:
            prompt_instructions = (
                "Voici les pages de l'aventure (sous forme d'images scannées).\n\n"
                "Analyse-les attentivement et transforme cette aventure en Codex JSON selon le schéma demandé."
            )
            contents = parts + [prompt_instructions]
        else:
            prompt_instructions = (
                f"Voici le texte de l'aventure :\n\n{parts[0]}\n\n"
                "Transforme cette aventure en Codex JSON selon le schéma demandé."
            )
            contents = [prompt_instructions]
        
        # Fallback list of models to try
        models_to_try = [model]
        for m in ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-1.5-flash", "gemini-1.5-pro"]:
            if m not in models_to_try:
                models_to_try.append(m)
            
        response = None
        errors = {}
        
        for current_model in models_to_try:
            try:
                print(f"Attempting Codex generation with model: {current_model}")
                response = client.models.generate_content(
                    model=current_model,
                    contents=contents,
                    config=genai.types.GenerateContentConfig(
                        system_instruction=SYSTEM_PROMPT,
                        response_mime_type="application/json",
                        temperature=0.2
                    )
                )
                if response and response.text:
                    print(f"Codex generation succeeded with model: {current_model}")
                    break
            except Exception as e:
                err_msg = str(e)
                print(f"Model {current_model} failed: {err_msg}")
                errors[current_model] = err_msg
                continue
                
        if not response:
            raise Exception(f"All models failed. Detailed errors: {errors}")
            
        json_response = json.loads(response.text)
        return json_response
        
    except Exception as e:
        print("Error processing PDF:", traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/generate-bestiary")
async def generate_bestiary(
    file: UploadFile = File(...),
    api_key: str = Form(...),
    model: str = Form("gemini-2.5-flash")
):
    if not api_key:
        raise HTTPException(status_code=400, detail="Gemini API Key is required")
    try:
        # Read PDF and extract content (handles text and scanned image PDFs)
        pdf_bytes = await file.read()
        parts = extract_pdf_contents(pdf_bytes)
            
        # Call Gemini with 5-minute timeout
        from google.genai import types
        client = genai.Client(
            api_key=api_key,
            http_options=types.HttpOptions(timeout=300_000)
        )
        
        # Check if we got text or images
        is_images = any(isinstance(p, types.Part) for p in parts)
        
        if is_images:
            prompt_instructions = (
                "Voici les pages du bestiaire (sous forme d'images scannées).\n\n"
                "Analyse-les attentivement et extrais toutes les créatures sous forme de tableau JSON respectant le schéma demandé."
            )
            contents = parts + [prompt_instructions]
        else:
            prompt_instructions = (
                f"Voici le texte du bestiaire :\n\n{parts[0]}\n\n"
                "Extrais toutes les créatures sous forme de tableau JSON respectant le schéma demandé."
            )
            contents = [prompt_instructions]
        
        # Fallback list of models to try
        models_to_try = [model]
        for m in ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-1.5-flash", "gemini-1.5-pro"]:
            if m not in models_to_try:
                models_to_try.append(m)
            
        response = None
        errors = {}
        
        for current_model in models_to_try:
            try:
                print(f"Attempting Bestiary extraction with model: {current_model}")
                response = client.models.generate_content(
                    model=current_model,
                    contents=contents,
                    config=genai.types.GenerateContentConfig(
                        system_instruction=BESTIARY_SYSTEM_PROMPT,
                        response_mime_type="application/json",
                        temperature=0.2
                    )
                )
                if response and response.text:
                    print(f"Bestiary extraction succeeded with model: {current_model}")
                    break
            except Exception as e:
                err_msg = str(e)
                print(f"Model {current_model} failed: {err_msg}")
                errors[current_model] = err_msg
                continue
                
        if not response or not response.text:
            raise HTTPException(
                status_code=500,
                detail=f"All models failed. Detailed errors: {errors}"
            )
            
        result_json = json.loads(response.text.strip())
        return result_json
        
    except Exception as e:
        print("Error processing bestiary PDF:", traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/generate-pixelart")
async def generate_pixelart(
    prompt: str = Form(...),
    api_key: str = Form(...)
):
    if not api_key:
        raise HTTPException(status_code=400, detail="Gemini API Key is required")
    try:
        from google.genai import types
        client = genai.Client(
            api_key=api_key,
            http_options=types.HttpOptions(timeout=30_000)
        )
        print(f"Generating image with prompt: {prompt}")
        response = client.models.generate_images(
            model='imagen-3.0-generate-002',
            prompt=prompt,
            config=genai.types.GenerateImagesConfig(
                number_of_images=1,
                output_mime_type="image/png",
                aspect_ratio="1:1"
            )
        )
        if not response.generated_images:
            raise Exception("No images generated by the model.")
        
        import base64
        img_bytes = response.generated_images[0].image.image_bytes
        base64_str = base64.b64encode(img_bytes).decode('utf-8')
        return {"image": f"data:image/png;base64,{base64_str}"}
    except Exception as e:
        print("Error generating pixelart:", traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/check-pixelart/{slug}")
async def check_pixelart(slug: str):
    # Check if images/pixelart/{slug}.png exists
    file_path = os.path.join("images", "pixelart", f"{slug}.png")
    # Also check if it exists in the main images/ directory directly
    direct_path = os.path.join("images", f"{slug}_8bit.png")
    
    if os.path.exists(file_path):
        return {"exists": True, "path": f"images/pixelart/{slug}.png"}
    elif os.path.exists(direct_path):
        return {"exists": True, "path": f"images/{slug}_8bit.png"}
    return {"exists": False}

class SavePixelartRequest(BaseModel):
    slug: str
    image_base64: str

@app.post("/api/save-pixelart-file")
async def save_pixelart_file(req: SavePixelartRequest):
    try:
        dir_path = os.path.join("images", "pixelart")
        os.makedirs(dir_path, exist_ok=True)
        
        file_path = os.path.join(dir_path, f"{req.slug}.png")
        
        data = req.image_base64
        if "," in data:
            data = data.split(",")[1]
            
        import base64
        img_bytes = base64.b64decode(data)
        
        with open(file_path, "wb") as f:
            f.write(img_bytes)
            
        print(f"Saved generated image locally to: {file_path}")
        return {"path": f"images/pixelart/{req.slug}.png"}
    except Exception as e:
        print("Error saving pixelart file:", traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

class UpdatePlayerXMLRequest(BaseModel):
    filename: str
    level: int
    xp: str
    gp: int

@app.post("/api/update-player-xml")
async def update_player_xml(req: UpdatePlayerXMLRequest):
    try:
        # Resolve file path relative to server.py location
        base_dir = os.path.dirname(os.path.abspath(__file__))
        file_path = os.path.abspath(os.path.join(base_dir, "..", "samples", req.filename))
        
        if not os.path.exists(file_path):
            print(f"File {file_path} not found. Trying to find any matching XML by filename in samples...")
            samples_dir = os.path.abspath(os.path.join(base_dir, "..", "samples"))
            if os.path.exists(samples_dir):
                for f in os.listdir(samples_dir):
                    if f.lower() == req.filename.lower() or f.lower() == f"{req.filename.lower()}.xml":
                        file_path = os.path.join(samples_dir, f)
                        break
                        
        if not os.path.exists(file_path):
            print(f"Player XML file {req.filename} not found.")
            return {"status": "ignored", "message": f"File {req.filename} not found."}
            
        import xml.etree.ElementTree as ET
        
        # Parse XML
        tree = ET.parse(file_path)
        root = tree.getroot()
        
        # Update level
        level_elem = root.find(".//level")
        if level_elem is not None:
            level_elem.text = str(req.level)
            
        # Update xp
        xp_elem = root.find(".//xp")
        if xp_elem is not None:
            xp_elem.text = str(req.xp)
            
        # Update gp (gold pieces)
        gp_elem = root.find(".//gp")
        if gp_elem is not None:
            gp_elem.text = str(req.gp)
            
        # Write back to file preserving UTF-8
        tree.write(file_path, encoding="utf-8", xml_declaration=True)
        print(f"Successfully updated player XML {file_path}: level={req.level}, xp={req.xp}, gp={req.gp}")
        return {"status": "success", "message": f"Updated {req.filename} successfully."}
        
    except Exception as e:
        print(f"Error updating player XML {req.filename}:", str(e))
        raise HTTPException(status_code=500, detail=str(e))
        
class EnrichCodexRequest(BaseModel):
    codex_json: dict
    api_key: str
    model: str = "gemini-2.5-flash"

@app.post("/api/enrich-codex")
async def enrich_codex(req: EnrichCodexRequest):
    if not req.api_key:
        raise HTTPException(status_code=400, detail="Gemini API Key is required")
    
    try:
        from google.genai import types
        client = genai.Client(
            api_key=req.api_key,
            http_options=types.HttpOptions(timeout=120_000)
        )
        
        # Formulate instruction prompt
        prompt = f"""Voici le Codex JSON d'une campagne de jeu de rôle existante :
{json.dumps(req.codex_json, ensure_ascii=False, indent=2)}

Ton objectif est d'ENRICHIR et DÉVELOPPER grandement le lore, l'histoire, les factions, les secrets et les événements chronologiques de cette campagne.

Directives :
1. Analyse le synopsis existant (campagne.description, campagne.univers), les chapitres, les lieux, les PNJs, les factions et les objets existants.
2. Écris des descriptions narratives beaucoup plus longues, riches, immersives et littéraires pour :
   - la campagne (campagne.description : au moins 2-3 paragraphes captivants)
   - l'univers (campagne.univers : développe son histoire, géopolitique, cosmologie ou règles magiques)
   - chaque chapitre (description détaillée de l'ambiance, rebondissements, enjeux)
   - chaque lieu (description sensorielle riche, histoire locale, importance)
   - chaque PNJ (backstory détaillée, psychologie, apparence physique, tics de comportement).
3. Si les tableaux "factions", "objets", "secrets", ou "evenements" sont vides ou peu développés, invente ou extrais de nouveaux éléments riches basés sur les PNJs et le lore existants pour les peupler de manière cohérente :
   - Factions : nom, description complète (buts, historique), alignement, membres (ids des PNJs existants).
   - Objets : nom, description (histoire mythique, apparence, propriétés magiques), type, possesseur (id d'un PNJ existant ou vide).
   - Secrets : nom, description (un mystère à résoudre ou une rumeur locale), decouverte (false).
   - Evenements : titre, description (événement historique du passé ou marquant), date (moment historique), type (lore, combat, etc.).
4. Garde TOUS les IDs intacts (ex: chap_01, pnj_01, lieu_01, etc.) afin que la structure de la base de données reste 100% compatible. Ne supprime aucun élément existant, enrichis-les ou ajoute-en de nouveaux cohérents.

Le résultat final doit être uniquement le Codex JSON enrichi complet respectant exactement le même schéma. Ne rajoute aucun commentaire ou texte avant ou après le JSON.
"""

        # Fallback list of models to try
        models_to_try = [req.model]
        for m in ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-1.5-flash", "gemini-1.5-pro"]:
            if m not in models_to_try:
                models_to_try.append(m)
            
        response = None
        errors = {}
        
        for current_model in models_to_try:
            try:
                print(f"Attempting Codex enrichment with model: {current_model}")
                response = client.models.generate_content(
                    model=current_model,
                    contents=prompt,
                    config=genai.types.GenerateContentConfig(
                        response_mime_type="application/json",
                        temperature=0.4
                    )
                )
                if response and response.text:
                    print(f"Codex enrichment succeeded with model: {current_model}")
                    break
            except Exception as e:
                err_msg = str(e)
                print(f"Model {current_model} failed: {err_msg}")
                errors[current_model] = err_msg
                continue
                
        if not response:
            raise Exception(f"All models failed. Detailed errors: {errors}")
            
        json_response = json.loads(response.text)
        return json_response
        
    except Exception as e:
        print(f"Error enriching codex:", str(e))
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8001)
