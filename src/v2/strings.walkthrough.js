// Strings for the hands-on walkthrough (8 steps) in 6 languages.
// English is the fallback; other locales come from an explicit draft (not auto-translated).
const en = {
  s1: { title: 'Your targets, calculated.', body: "Based on what you just told us, here's what your body needs each day. Calories, protein, carbs, fat — all yours.", cta: 'Continue' },
  s2: { title: 'Try your first scan.', body: "Grab anything with a barcode — a snack, a bottle, a box. We'll show you kcal, macros, and whether it fits your diet.", cta: 'Scan a product', after: 'Nice. You scanned your first product.' },
  s3: { title: 'Snap what you ate.', body: "Point the camera at your last meal. The AI identifies every food on the plate and adds the macros to today's log.", cta: 'Take a photo', sample_cta: "Don't have food nearby? See a demo", after: 'Added to today.' },
  s4: { title: 'Your day, in real time.', body: "This is where you'll track everything you eat. The bars fill as you log, and you'll see exactly where you stand on calories and macros.", cta: 'Continue' },
  s5: { title: "Today's workout, built for you.", body: 'Series, loads, and progression — tuned to your goal, the time you have, and where you train. Tap any set to mark it done when you unlock the plan.', cta: 'Continue', locked: 'Unlock to track your sets' },
  s6: { title: "Today's meals, ready to cook.", body: 'Each meal built to hit your macros, respect your allergies, and fit your diet. Tap "I ate this" to log it instantly when you unlock the plan.', cta: 'Continue', locked: 'Unlock to log meals from your plan' },
  s7: { title: 'See yourself change.', body: "Every few weeks, come back to your profile and update your weight and measurements. That's how you'll see — in numbers — what the plan is doing for you.", cta: 'Got it' },
  s8: { title: "You're all set.", body: 'Pick the plan that fits you and start your free trial.', reassure: 'NOTHING IS CHARGED DURING THE TRIAL. CANCEL ANYTIME, NO RISK.', cta: 'Choose my plan' },
  macros: { kcal: 'kcal', protein: 'Protein', carbs: 'Carbs', fat: 'Fat' },
  mock: { breakfast: 'Breakfast', lunch: 'Lunch', snack: 'Snack', dinner: 'Dinner', sets: 'sets', reps: 'reps', min: 'min' },
};

const pt = {
  s1: { title: 'As tuas metas, calculadas.', body: 'Com o que acabaste de nos dizer, estes são os números que o teu corpo precisa por dia. Calorias, proteína, hidratos, gorduras — tudo teu.', cta: 'Continuar' },
  s2: { title: 'Experimenta o teu primeiro scan.', body: 'Agarra em algo com código de barras — um snack, uma garrafa, uma caixa. Mostramos-te kcal, macros e se encaixa na tua dieta.', cta: 'Scanear produto', after: 'Boa. Fizeste o teu primeiro scan.' },
  s3: { title: 'Fotografa o que comeste.', body: 'Aponta a câmara à tua última refeição. A IA identifica cada alimento no prato e soma os macros ao dia de hoje.', cta: 'Tirar foto', sample_cta: 'Sem comida à mão? Vê um exemplo', after: 'Adicionado ao dia.' },
  s4: { title: 'O teu dia, em tempo real.', body: 'É aqui que vais acompanhar tudo o que comes. As barras enchem à medida que registas, e vês ao certo como estás nas calorias e macros.', cta: 'Continuar' },
  s5: { title: 'O treino de hoje, feito para ti.', body: 'Séries, cargas e progressão — ajustados à tua meta, ao tempo que tens e ao sítio onde treinas. Toca em qualquer série para marcares feita quando desbloqueares o plano.', cta: 'Continuar', locked: 'Desbloqueia para marcar séries' },
  s6: { title: 'As refeições de hoje, prontas a fazer.', body: 'Cada refeição montada para bater os teus macros, respeitar as tuas alergias e caber na tua dieta. Toca em "Comi esta" para registar num toque ao desbloqueares.', cta: 'Continuar', locked: 'Desbloqueia para registar refeições' },
  s7: { title: 'Vê-te a mudar.', body: 'De duas em duas semanas, volta ao teu perfil e actualiza o peso e as medidas. É assim que vais ver — em números — o que o plano está a fazer por ti.', cta: 'Entendido' },
  s8: { title: 'Está tudo pronto.', body: 'Escolhe o plano que te encaixa e começa o teu trial gratuito.', reassure: 'NADA SERÁ COBRADO DURANTE O TRIAL. CANCELA QUANDO QUISERES, SEM RISCO.', cta: 'Escolher o meu plano' },
  macros: { kcal: 'kcal', protein: 'Proteína', carbs: 'Hidratos', fat: 'Gorduras' },
  mock: { breakfast: 'Pequeno-almoço', lunch: 'Almoço', snack: 'Lanche', dinner: 'Jantar', sets: 'séries', reps: 'reps', min: 'min' },
};

const es = {
  s1: { title: 'Tus objetivos, calculados.', body: 'Con lo que acabas de contarnos, estos son los números que tu cuerpo necesita cada día. Calorías, proteína, carbohidratos, grasas — todo tuyo.', cta: 'Continuar' },
  s2: { title: 'Prueba tu primer escaneo.', body: 'Coge algo con código de barras — un snack, una botella, una caja. Te mostramos kcal, macros y si encaja en tu dieta.', cta: 'Escanear producto', after: 'Genial. Has escaneado tu primer producto.' },
  s3: { title: 'Haz una foto de lo que comiste.', body: 'Apunta la cámara a tu última comida. La IA identifica cada alimento y suma los macros al registro de hoy.', cta: 'Hacer foto', sample_cta: '¿Sin comida cerca? Ver un ejemplo', after: 'Añadido a hoy.' },
  s4: { title: 'Tu día, en tiempo real.', body: 'Aquí seguirás todo lo que comes. Las barras se llenan según vas registrando, y verás exactamente cómo vas de calorías y macros.', cta: 'Continuar' },
  s5: { title: 'Tu entrenamiento de hoy, hecho para ti.', body: 'Series, cargas y progresión — ajustados a tu objetivo, al tiempo que tienes y a dónde entrenas. Toca una serie para marcarla al desbloquear el plan.', cta: 'Continuar', locked: 'Desbloquea para marcar series' },
  s6: { title: 'Las comidas de hoy, listas para cocinar.', body: 'Cada comida pensada para alcanzar tus macros, respetar tus alergias y encajar en tu dieta. Toca "Lo he comido" para registrarla al desbloquear el plan.', cta: 'Continuar', locked: 'Desbloquea para registrar comidas' },
  s7: { title: 'Mírate cambiar.', body: 'Cada pocas semanas, vuelve a tu perfil y actualiza tu peso y medidas. Así verás — en números — lo que el plan está haciendo por ti.', cta: 'Entendido' },
  s8: { title: 'Todo listo.', body: 'Elige el plan que mejor te encaje y empieza tu prueba gratis.', reassure: 'NO SE COBRA NADA DURANTE LA PRUEBA. CANCELA CUANDO QUIERAS, SIN RIESGO.', cta: 'Elegir mi plan' },
  macros: { kcal: 'kcal', protein: 'Proteína', carbs: 'Carbohidratos', fat: 'Grasas' },
  mock: { breakfast: 'Desayuno', lunch: 'Comida', snack: 'Merienda', dinner: 'Cena', sets: 'series', reps: 'reps', min: 'min' },
};

const fr = {
  s1: { title: 'Tes objectifs, calculés.', body: "À partir de ce que tu viens de nous dire, voici ce dont ton corps a besoin chaque jour. Calories, protéines, glucides, lipides — tout pour toi.", cta: 'Continuer' },
  s2: { title: 'Fais ton premier scan.', body: "Prends n'importe quoi avec un code-barres — un snack, une bouteille, une boîte. On te montre les kcal, les macros, et si ça colle à ton régime.", cta: 'Scanner un produit', after: 'Parfait. Tu as scanné ton premier produit.' },
  s3: { title: 'Photographie ton repas.', body: "Pointe la caméra sur ton dernier repas. L'IA identifie chaque aliment et ajoute les macros au journal du jour.", cta: 'Prendre une photo', sample_cta: "Pas de repas sous la main ? Voir un exemple", after: 'Ajouté au jour.' },
  s4: { title: 'Ta journée, en temps réel.', body: "C'est ici que tu suis tout ce que tu manges. Les barres se remplissent au fil de tes entrées, et tu vois exactement où tu en es.", cta: 'Continuer' },
  s5: { title: 'Ta séance du jour, faite pour toi.', body: "Séries, charges, progression — adaptées à ton objectif, au temps que tu as et à ton lieu d'entraînement. Appuie sur une série pour la cocher dès que tu débloques.", cta: 'Continuer', locked: 'Débloque pour cocher tes séries' },
  s6: { title: 'Tes repas du jour, prêts à cuisiner.', body: "Chaque repas conçu pour atteindre tes macros, respecter tes allergies et coller à ton régime. Touche « J'ai mangé » pour l'enregistrer dès que tu débloques.", cta: 'Continuer', locked: 'Débloque pour enregistrer les repas' },
  s7: { title: 'Regarde-toi changer.', body: "Toutes les quelques semaines, reviens dans ton profil et mets à jour ton poids et tes mesures. C'est comme ça que tu verras — chiffres à l'appui — ce que le plan fait pour toi.", cta: 'Compris' },
  s8: { title: 'Tout est prêt.', body: 'Choisis le plan qui te correspond et démarre ton essai gratuit.', reassure: "AUCUN PAIEMENT PENDANT L'ESSAI. ANNULE QUAND TU VEUX, SANS RISQUE.", cta: 'Choisir mon plan' },
  macros: { kcal: 'kcal', protein: 'Protéines', carbs: 'Glucides', fat: 'Lipides' },
  mock: { breakfast: 'Petit-déjeuner', lunch: 'Déjeuner', snack: 'Collation', dinner: 'Dîner', sets: 'séries', reps: 'reps', min: 'min' },
};

const de = {
  s1: { title: 'Deine Ziele, berechnet.', body: 'Aus dem, was du uns gerade gesagt hast, haben wir das berechnet, was dein Körper täglich braucht. Kalorien, Eiweiß, Kohlenhydrate, Fett — alles für dich.', cta: 'Weiter' },
  s2: { title: 'Dein erster Scan.', body: 'Nimm irgendwas mit Barcode — einen Snack, eine Flasche, eine Packung. Wir zeigen dir kcal, Makros und ob es zu deiner Ernährung passt.', cta: 'Produkt scannen', after: 'Super. Du hast dein erstes Produkt gescannt.' },
  s3: { title: 'Foto von dem, was du gegessen hast.', body: 'Richte die Kamera auf deine letzte Mahlzeit. Die KI erkennt jede Zutat und trägt die Makros im heutigen Protokoll ein.', cta: 'Foto aufnehmen', sample_cta: 'Nichts zum Essen da? Beispiel ansehen', after: 'Zu heute hinzugefügt.' },
  s4: { title: 'Dein Tag, in Echtzeit.', body: 'Hier verfolgst du alles, was du isst. Die Balken füllen sich mit jedem Eintrag, und du siehst sofort, wo du bei Kalorien und Makros stehst.', cta: 'Weiter' },
  s5: { title: 'Dein Training heute, auf dich zugeschnitten.', body: 'Sätze, Gewichte und Progression — passend zu deinem Ziel, deiner Zeit und deinem Trainingsort. Tippe einen Satz an, um ihn nach dem Freischalten abzuhaken.', cta: 'Weiter', locked: 'Freischalten, um Sätze abzuhaken' },
  s6: { title: 'Deine Mahlzeiten heute, bereit zum Kochen.', body: 'Jede Mahlzeit trifft deine Makros, berücksichtigt deine Allergien und passt zu deiner Ernährung. Tippe auf „Gegessen", um sie nach dem Freischalten direkt einzutragen.', cta: 'Weiter', locked: 'Freischalten, um Mahlzeiten einzutragen' },
  s7: { title: 'Beobachte deine Veränderung.', body: 'Alle paar Wochen gehst du zurück ins Profil und aktualisierst Gewicht und Maße. So siehst du — in Zahlen — was der Plan für dich tut.', cta: 'Verstanden' },
  s8: { title: 'Alles bereit.', body: 'Wähle den Plan, der zu dir passt, und starte deine kostenlose Testphase.', reassure: 'WÄHREND DER TESTPHASE WIRD NICHTS ABGEBUCHT. JEDERZEIT KÜNDIGEN, OHNE RISIKO.', cta: 'Plan auswählen' },
  macros: { kcal: 'kcal', protein: 'Eiweiß', carbs: 'Kohlenhydrate', fat: 'Fett' },
  mock: { breakfast: 'Frühstück', lunch: 'Mittagessen', snack: 'Snack', dinner: 'Abendessen', sets: 'Sätze', reps: 'Wdh.', min: 'Min.' },
};

const it = {
  s1: { title: 'I tuoi obiettivi, calcolati.', body: 'In base a quello che ci hai appena detto, ecco di cosa ha bisogno il tuo corpo ogni giorno. Calorie, proteine, carboidrati, grassi — tutto tuo.', cta: 'Continua' },
  s2: { title: 'Prova il tuo primo scan.', body: 'Prendi qualcosa con un codice a barre — uno snack, una bottiglia, una scatola. Ti mostriamo kcal, macro e se è compatibile con la tua dieta.', cta: 'Scansiona un prodotto', after: 'Ottimo. Hai scansionato il tuo primo prodotto.' },
  s3: { title: 'Fotografa quello che hai mangiato.', body: 'Punta la fotocamera sul tuo ultimo pasto. L\'IA identifica ogni alimento e aggiunge i macro al diario di oggi.', cta: 'Scatta foto', sample_cta: 'Niente cibo vicino? Vedi un esempio', after: 'Aggiunto a oggi.' },
  s4: { title: 'La tua giornata, in tempo reale.', body: 'Qui segui tutto quello che mangi. Le barre si riempiono man mano che registri, e vedi esattamente a che punto sei.', cta: 'Continua' },
  s5: { title: "L'allenamento di oggi, fatto per te.", body: 'Serie, carichi e progressione — tarati sul tuo obiettivo, sul tempo che hai e sul posto dove ti alleni. Tocca una serie per spuntarla quando sblocchi il piano.', cta: 'Continua', locked: 'Sblocca per spuntare le serie' },
  s6: { title: 'I pasti di oggi, pronti da cucinare.', body: 'Ogni pasto pensato per centrare i tuoi macro, rispettare le tue allergie e stare nella tua dieta. Tocca "L\'ho mangiato" per registrarlo subito dopo lo sblocco.', cta: 'Continua', locked: 'Sblocca per registrare i pasti' },
  s7: { title: 'Guardati cambiare.', body: 'Ogni due o tre settimane torna al profilo e aggiorna peso e misure. Così vedi — in numeri — cosa sta facendo il piano per te.', cta: 'Capito' },
  s8: { title: 'È tutto pronto.', body: 'Scegli il piano che fa per te e inizia la tua prova gratuita.', reassure: 'DURANTE LA PROVA NON SI PAGA NULLA. ANNULLA QUANDO VUOI, SENZA RISCHIO.', cta: 'Scegli il mio piano' },
  macros: { kcal: 'kcal', protein: 'Proteine', carbs: 'Carboidrati', fat: 'Grassi' },
  mock: { breakfast: 'Colazione', lunch: 'Pranzo', snack: 'Spuntino', dinner: 'Cena', sets: 'serie', reps: 'reps', min: 'min' },
};

const TABLE = { en, pt, es, fr, de, it };

export function s3(language) {
  return TABLE[language] || en;
}
