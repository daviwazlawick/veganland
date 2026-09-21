// Rotating daily "challenge" push copy — energetic personal-trainer tone.
// A new variation fires each day (picked by day-of-year) so repeat viewers
// (the never-scanned segment, and the admin who always gets one) don't see
// the exact same text every time.
export const CHALLENGE_VARIATIONS = [
  {
    pt: { title: '🔥 Quantos minutos de corrida vale esse snack?', body: 'Desafio de hoje: escaneia um produto e descobre o exercício exato pra queimar as calorias dele. 5 segundos, resposta na hora. Bora? 💪' },
    en: { title: '🔥 How many running minutes is that snack worth?', body: "Today's challenge: scan a product and find out exactly how much exercise burns off its calories. 5 seconds, instant answer. Let's go? 💪" },
    de: { title: '🔥 Wie viele Laufminuten steckt dieser Snack?', body: 'Heutige Herausforderung: scanne ein Produkt und erfahre, wie viel Sport die Kalorien verbrennt. 5 Sekunden, sofortige Antwort. Los! 💪' },
    fr: { title: '🔥 Combien de minutes de course vaut ce snack ?', body: "Défi du jour : scanne un produit et découvre combien d'exercice brûle ses calories. 5 secondes, réponse immédiate. On y va ? 💪" },
    it: { title: '🔥 Quanti minuti di corsa vale quello snack?', body: 'Sfida di oggi: scansiona un prodotto e scopri quanto esercizio serve per bruciarne le calorie. 5 secondi, risposta immediata. Si parte? 💪' },
    es: { title: '🔥 ¿Cuántos minutos de carrera vale ese snack?', body: 'Reto de hoy: escanea un producto y descubre cuánto ejercicio hace falta para quemar sus calorías. 5 segundos, respuesta al instante. ¿Vamos? 💪' },
  },
  {
    pt: { title: '👀 O que esconde o rótulo desse produto?', body: 'Desafio de hoje: escaneia qualquer produto da tua cozinha e descobre alergénios e ingredientes escondidos em letras minúsculas. 5 segundos. Bora? 💪' },
    en: { title: "👀 What's that label really hiding?", body: "Today's challenge: scan any product in your kitchen and uncover hidden allergens and fine-print ingredients. 5 seconds. Let's go? 💪" },
    de: { title: '👀 Was versteckt sich wirklich im Etikett?', body: 'Heutige Herausforderung: scanne ein Produkt in deiner Küche und entdecke versteckte Allergene und Zutaten im Kleingedruckten. 5 Sekunden. Los! 💪' },
    fr: { title: "👀 Qu'est-ce que cette étiquette cache vraiment ?", body: "Défi du jour : scanne un produit de ta cuisine et découvre les allergènes et ingrédients cachés en petits caractères. 5 secondes. On y va ? 💪" },
    it: { title: "👀 Cosa nasconde davvero quell'etichetta?", body: "Sfida di oggi: scansiona un prodotto della tua cucina e scopri allergeni e ingredienti nascosti in caratteri minuscoli. 5 secondi. Si parte? 💪" },
    es: { title: '👀 ¿Qué esconde realmente esa etiqueta?', body: 'Reto de hoy: escanea un producto de tu cocina y descubre alérgenos e ingredientes escondidos en letra pequeña. 5 segundos. ¿Vamos? 💪' },
  },
  {
    pt: { title: '⏱️ 5 segundos. Zero desculpas.', body: 'O desafio de hoje é simples: aponta a câmara a qualquer produto e vê se ele combina contigo. Leva menos tempo que ler esta mensagem. Bora? 💪' },
    en: { title: '⏱️ 5 seconds. Zero excuses.', body: "Today's challenge is simple: point your camera at any product and see if it fits you. Takes less time than reading this. Let's go? 💪" },
    de: { title: '⏱️ 5 Sekunden. Null Ausreden.', body: "Die heutige Herausforderung ist einfach: Kamera auf ein Produkt richten und schauen, ob es zu dir passt. Dauert kürzer als diese Nachricht. Los!💪" },
    fr: { title: '⏱️ 5 secondes. Zéro excuse.', body: "Le défi du jour est simple : pointe la caméra vers un produit et vois s'il te convient. Plus rapide que de lire ce message. On y va ? 💪" },
    it: { title: '⏱️ 5 secondi. Zero scuse.', body: 'La sfida di oggi è semplice: inquadra un prodotto con la fotocamera e scopri se fa per te. Più veloce di leggere questo messaggio. Si parte? 💪' },
    es: { title: '⏱️ 5 segundos. Cero excusas.', body: 'El reto de hoy es simple: apunta la cámara a cualquier producto y descubre si te conviene. Toma menos tiempo que leer esto. ¿Vamos? 💪' },
  },
  {
    pt: { title: '🎯 Aposto que não sabes o que tem nesse produto', body: 'Prova que estou errado: escaneia qualquer coisa na tua cozinha agora e descobre em 5 segundos. Aceitas o desafio? 😏💪' },
    en: { title: "🎯 Bet you don't know what's in that product", body: 'Prove me wrong: scan anything in your kitchen right now and find out in 5 seconds. Up for the challenge? 😏💪' },
    de: { title: '🎯 Wette, du weißt nicht, was drin ist', body: 'Beweise mir das Gegenteil: scanne jetzt etwas aus deiner Küche und finde es in 5 Sekunden heraus. Bereit für die Herausforderung? 😏💪' },
    fr: { title: "🎯 Je parie que tu ne sais pas ce qu'il y a dedans", body: 'Prouve-moi le contraire : scanne un produit de ta cuisine maintenant et découvre-le en 5 secondes. Prêt à relever le défi ? 😏💪' },
    it: { title: "🎯 Scommetto che non sai cosa c'è dentro", body: 'Dimostrami che ho torto: scansiona qualcosa nella tua cucina adesso e scoprilo in 5 secondi. Pronto per la sfida? 😏💪' },
    es: { title: '🎯 Apuesto a que no sabes qué contiene ese producto', body: 'Demuéstrame que me equivoco: escanea algo de tu cocina ahora y descúbrelo en 5 segundos. ¿Aceptas el reto? 😏💪' },
  },
  {
    pt: { title: '💪 Hora do teu treino diário (com a câmara)', body: 'Sou o teu coach NovaQI e hoje é dia de fazer 1 scan. Não precisa ser perfeito, só precisa começar. Vai lá! 🔥' },
    en: { title: '💪 Time for your daily workout (with your camera)', body: "I'm your NovaQI coach and today's the day for 1 scan. Doesn't need to be perfect, just needs to start. Go on! 🔥" },
    de: { title: '💪 Zeit für dein tägliches Training (mit der Kamera)', body: "Ich bin dein NovaQI-Coach und heute ist der Tag für 1 Scan. Muss nicht perfekt sein, nur anfangen. Los geht's! 🔥" },
    fr: { title: '💪 Ton entraînement du jour (avec ta caméra)', body: "Je suis ton coach NovaQI et aujourd'hui c'est le jour pour 1 scan. Pas besoin d'être parfait, juste de commencer. Vas-y ! 🔥" },
    it: { title: '💪 Il tuo allenamento di oggi (con la fotocamera)', body: 'Sono il tuo coach NovaQI e oggi è il giorno per 1 scansione. Non deve essere perfetto, deve solo iniziare. Vai! 🔥' },
    es: { title: '💪 Tu entrenamiento diario (con la cámara)', body: 'Soy tu coach de NovaQI y hoy es el día para 1 escaneo. No tiene que ser perfecto, solo tiene que empezar. ¡Vamos! 🔥' },
  },
];

export function pickChallengeVariation(dayOffset = 0) {
  const dayOfYear = Math.floor((Date.now() + dayOffset * 86400000) / 86400000);
  return CHALLENGE_VARIATIONS[dayOfYear % CHALLENGE_VARIATIONS.length];
}
