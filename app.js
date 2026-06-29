/* Blackjack Trainer — app.js
 * Konfiguration: S17 (Dealer steht auf weicher 17), 4–8 Decks,
 * Double After Split (DAS) erlaubt, Late Surrender verfügbar.
 *
 * Aufbau: Erst die reine Strategie-Engine (für Node-Tests exportierbar),
 * danach der DOM-/App-Code (läuft nur im Browser).
 */
(function (global) {
  "use strict";

  /* =========================================================
   *  STRATEGIE-ENGINE  (reine Funktionen, keine DOM-Zugriffe)
   *  Dealer-Spaltenreihenfolge der Charts: 2,3,4,5,6,7,8,9,10,A
   *  Dealer-Wert intern: 2..10 = Zahl, A = 11
   *  Rückgabecodes:
   *    'H'  = Hit
   *    'S'  = Stand
   *    'D'  = Double (bei uns immer erlaubt -> echtes Double)
   *    'P'  = Split
   *    'R'  = Surrender (Late Surrender immer verfügbar)
   * =======================================================*/

  // Kartenwert einer Rangkarte: A=11, 10/J/Q/K=10, sonst Zahlwert.
  function cardValue(rank) {
    if (rank === "A") return 11;
    if (rank === "K" || rank === "Q" || rank === "J" || rank === "10") return 10;
    return parseInt(rank, 10);
  }

  // HARTE Summen (5–21), kein als 11 zählendes Ass.
  // Dealer d: 2..11 (11 = Ass)
  function hardAction(total, d) {
    if (total <= 8) return "H";
    if (total === 9) return d >= 3 && d <= 6 ? "D" : "H";
    if (total === 10) return d >= 2 && d <= 9 ? "D" : "H";
    if (total === 11) return "D"; // gegen 2..A doublen (S17)
    if (total === 12) return d >= 4 && d <= 6 ? "S" : "H";
    if (total === 13 || total === 14) return d >= 2 && d <= 6 ? "S" : "H";
    if (total === 15) {
      if (d >= 2 && d <= 6) return "S";
      if (d === 10) return "R"; // Surrender nur gegen 10
      return "H";
    }
    if (total === 16) {
      if (d >= 2 && d <= 6) return "S";
      if (d === 9 || d === 10 || d === 11) return "R"; // Surrender gegen 9/10/A
      return "H";
    }
    return "S"; // 17–21
  }

  // WEICHE Summen (Ass als 11). total = voller weicher Wert (13 = A,2 ... 20 = A,9, 21 = A,10).
  function softAction(total, d) {
    if (total <= 12) return "H"; // A,A wird als Paar behandelt
    if (total === 13 || total === 14) return d === 5 || d === 6 ? "D" : "H"; // A,2 / A,3
    if (total === 15 || total === 16) return d >= 4 && d <= 6 ? "D" : "H"; // A,4 / A,5
    if (total === 17) return d >= 3 && d <= 6 ? "D" : "H"; // A,6
    if (total === 18) {
      // A,7 unter S17: Double 3–6, Stand gegen 2/7/8, sonst Hit (9/10/A)
      if (d >= 3 && d <= 6) return "D";
      if (d === 2 || d === 7 || d === 8) return "S";
      return "H";
    }
    return "S"; // A,8 / A,9 (19/20) und 21
  }

  // PAARE. rank = Rang der Karte ('2'..'10','J','Q','K','A'). d = Dealerwert 2..11.
  function pairAction(rank, d) {
    if (rank === "A") return "P"; // Asse immer splitten
    if (rank === "10" || rank === "J" || rank === "Q" || rank === "K") return "S"; // 10er nie splitten
    if (rank === "9") return d === 7 || d === 10 || d === 11 ? "S" : "P"; // split 2-6,8,9
    if (rank === "8") return "P"; // 8er immer splitten
    if (rank === "7") return d <= 7 ? "P" : "H"; // split 2-7
    if (rank === "6") return d <= 6 ? "P" : "H"; // split 2-6
    if (rank === "5") return hardAction(10, d); // wie harte 10
    if (rank === "4") return d === 5 || d === 6 ? "P" : "H"; // split nur 5-6
    // 3er und 2er: split gegen 2-7
    return d <= 7 ? "P" : "H";
  }

  // Bewertet eine 2-Karten-Spielerhand gegen die Dealer-Upcard.
  // playerRanks: ['9','7'], dealerRank: '10'  ->  Aktionscode.
  function bestAction(playerRanks, dealerRank) {
    var d = cardValue(dealerRank);
    // Paar?
    if (playerRanks.length === 2) {
      var a = cardValue(playerRanks[0]);
      var b = cardValue(playerRanks[1]);
      // Gleiche Rangwertigkeit zählt als Paar (z. B. 10 & K).
      if (a === b && playerRanks[0] === playerRanks[1]) {
        return pairAction(playerRanks[0], d);
      }
      // 10er-Mischpaare (10,J,Q,K) als Zehnerpaar behandeln
      if (a === 10 && b === 10) return pairAction("10", d);
    }
    // Summe + Ass-Erkennung
    var total = 0;
    var aces = 0;
    for (var i = 0; i < playerRanks.length; i++) {
      var v = cardValue(playerRanks[i]);
      total += v;
      if (v === 11) aces++;
    }
    var soft = aces > 0;
    while (total > 21 && aces > 0) {
      total -= 10;
      aces--;
    }
    soft = aces > 0; // bleibt ein Ass als 11 übrig?
    return soft ? softAction(total, d) : hardAction(total, d);
  }

  // Aktionscode -> Menü-ID
  var CODE_TO_ID = { H: "hit", S: "stand", D: "double", P: "split", R: "surrender" };
  var ID_TO_LABEL = { hit: "Hit", stand: "Stand", double: "Double", split: "Split", surrender: "Surrender" };

  // Hi-Lo Kartenwert
  function hiLo(rank) {
    var v = cardValue(rank);
    if (rank === "A") return -1;
    if (v >= 2 && v <= 6) return 1;
    if (v >= 7 && v <= 9) return 0;
    return -1; // 10/J/Q/K
  }

  var Strategy = {
    cardValue: cardValue,
    hardAction: hardAction,
    softAction: softAction,
    pairAction: pairAction,
    bestAction: bestAction,
    hiLo: hiLo,
    CODE_TO_ID: CODE_TO_ID,
    ID_TO_LABEL: ID_TO_LABEL,
  };

  // In Node: nur Engine exportieren, DOM-Code überspringen.
  if (typeof module !== "undefined" && module.exports) {
    module.exports = Strategy;
    return;
  }

  /* =========================================================
   *  APP / DOM
   * =======================================================*/

  var RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
  var SUITS = ["spade", "heart", "diamond", "club"];
  var PIP = {
    spade: "M12 3C9 7 4 9 4 13.5 4 16 6 17.5 8 17.5c1 0 1.8-.4 2.4-1-.2 1.6-.8 2.6-2 3.5h7c-1.2-.9-1.8-1.9-2-3.5.6.6 1.4 1 2.4 1 2 0 4-1.5 4-4C20 9 15 7 12 3z",
    heart: "M12 21s-7-4.6-9.3-8.5C1 9 2.6 5.5 6 5.5c2 0 3.2 1.2 4 2.4.8-1.2 2-2.4 4-2.4 3.4 0 5 3.5 3.3 7C19 16.4 12 21 12 21z",
    diamond: "M12 2 21 12 12 22 3 12z",
    club: "M12 2a3.2 3.2 0 0 0-2.6 5.1A3.2 3.2 0 1 0 9 13.2c.7 0 1.4-.2 2-.6-.1 1.6-.7 2.7-2 3.9h6c-1.3-1.2-1.9-2.3-2-3.9.6.4 1.3.6 2 .6a3.2 3.2 0 1 0-2.4-6.1A3.2 3.2 0 0 0 12 2z",
  };
  function isRed(suit) { return suit === "heart" || suit === "diamond"; }
  function rand(n) { return Math.floor(Math.random() * n); }
  function pick(arr) { return arr[rand(arr.length)]; }

  function cardEl(rank, suit, deal) {
    var el = document.createElement("div");
    el.className = "card " + (isRed(suit) ? "red" : "black") + (deal ? " dealt" : "");
    el.innerHTML =
      '<span class="rank">' + rank + "</span>" +
      '<svg class="pip" viewBox="0 0 24 24"><path d="' + PIP[suit] + '"/></svg>';
    return el;
  }

  /* ---------- Persistenter State ---------- */
  var STRAT_KEY = "bjt_strategy_v1";
  var COUNT_KEY = "bjt_counting_v1";
  function load(key, def) {
    try { var v = JSON.parse(localStorage.getItem(key)); return v || def; }
    catch (e) { return def; }
  }
  function save(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} }

  var stratStats = load(STRAT_KEY, { total: 0, correct: 0, streak: 0, best: 0 });
  var countStats = load(COUNT_KEY, { rounds: 0, rcOk: 0, tcOk: 0 });

  /* ---------- Strategie-Modus ---------- */
  var dealerCardsEl = document.getElementById("dealerCards");
  var playerCardsEl = document.getElementById("playerCards");
  var handMetaEl = document.getElementById("handMeta");
  var verdictEl = document.getElementById("verdict");
  var current = null; // { player:[ranks], dealer:rank, best:code }

  function describeHand(ranks) {
    var total = 0, aces = 0;
    for (var i = 0; i < ranks.length; i++) {
      var v = cardValue(ranks[i]); total += v; if (v === 11) aces++;
    }
    var a = aces;
    while (total > 21 && a > 0) { total -= 10; a--; }
    var isPair = ranks.length === 2 && cardValue(ranks[0]) === cardValue(ranks[1]);
    if (isPair) return "Paar " + ranks[0] + "/" + ranks[1];
    if (a > 0) return "Weiche " + total;
    return "Harte " + total;
  }

  function newStrategyHand() {
    // Zufällige 2-Karten-Hand (Gesamtwert <= 21 garantiert)
    var p1 = pick(RANKS), p2 = pick(RANKS);
    var dealer = pick(RANKS);
    var ps1 = pick(SUITS), ps2 = pick(SUITS), ds = pick(SUITS);
    current = { player: [p1, p2], dealer: dealer, best: bestAction([p1, p2], dealer) };

    dealerCardsEl.innerHTML = "";
    dealerCardsEl.appendChild(cardEl(dealer, ds, true));
    playerCardsEl.innerHTML = "";
    playerCardsEl.appendChild(cardEl(p1, ps1, true));
    playerCardsEl.appendChild(cardEl(p2, ps2, true));
    handMetaEl.textContent = describeHand([p1, p2]) + "  •  Dealer " + dealer;

    verdictEl.className = "verdict idle";
    verdictEl.innerHTML = '<div class="v-line">Deine Aktion?</div>';
  }

  function resolveStrategy(actionId) {
    if (!current) return;
    var correctId = CODE_TO_ID[current.best];
    var ok = actionId === correctId;
    stratStats.total++;
    if (ok) { stratStats.correct++; stratStats.streak++; if (stratStats.streak > stratStats.best) stratStats.best = stratStats.streak; }
    else { stratStats.streak = 0; }
    save(STRAT_KEY, stratStats);
    renderStratStats();

    verdictEl.className = "verdict " + (ok ? "correct" : "wrong");
    if (ok) {
      verdictEl.innerHTML = '<div class="v-line">Richtig — ' + ID_TO_LABEL[correctId] + "</div>" +
        '<div class="v-sub">' + describeHand(current.player) + " vs " + current.dealer + "</div>";
    } else {
      verdictEl.innerHTML = '<div class="v-line">Falsch — korrekt: ' + ID_TO_LABEL[correctId] + "</div>" +
        '<div class="v-sub">Du: ' + ID_TO_LABEL[actionId] + "  •  " + describeHand(current.player) + " vs " + current.dealer + "</div>";
    }
    current = null;
    setTimeout(newStrategyHand, 1100);
  }

  function renderStratStats() {
    document.getElementById("msStreak").textContent = stratStats.streak;
    document.getElementById("msCorrect").textContent = stratStats.correct;
    var acc = stratStats.total ? Math.round((stratStats.correct / stratStats.total) * 100) + "%" : "–";
    document.getElementById("msAcc").textContent = acc;
    document.getElementById("dStratTotal").textContent = stratStats.total;
    document.getElementById("dStratCorrect").textContent = stratStats.correct;
    document.getElementById("dStratAcc").textContent = acc;
    document.getElementById("dStratBest").textContent = stratStats.best;
  }

  /* ---------- Radiales Steuermenü (Pointer Events) ---------- */
  var controlZone = document.getElementById("controlZone");
  var hub = document.getElementById("hub");
  var petals = Array.prototype.slice.call(document.querySelectorAll(".petal"));
  // Winkel (math. Konvention, 0°=rechts, gegen den Uhrzeigersinn) im oberen/linken Sektor.
  // Komplett zwischen 82° (fast senkrecht) und 178° (waagerecht links), damit kein Petal
  // über den rechten Bildschirmrand klippt. Reihenfolge wie im DOM: surrender,split,double,stand,hit.
  var ANGLES = [178, 154, 130, 106, 82];
  var RADIUS = 128;
  var ACTIVATE_DIST = 30;
  var dragging = false;
  var targeted = null;

  // Petals positionieren
  petals.forEach(function (p, i) {
    var a = ANGLES[i] * Math.PI / 180;
    var x = Math.cos(a) * RADIUS;
    var y = -Math.sin(a) * RADIUS; // Screen-Y zeigt nach unten
    p.style.setProperty("--x", x.toFixed(1) + "px");
    p.style.setProperty("--y", y.toFixed(1) + "px");
  });

  function openRadial() {
    // Positionen/Transforms macht komplett das CSS (.open / .is-targeted),
    // damit der scale-Pop des hervorgehobenen Petals nicht von inline-Styles überschrieben wird.
    controlZone.classList.add("open");
  }
  function closeRadial() {
    controlZone.classList.remove("open");
    targeted = null;
    petals.forEach(function (p) { p.classList.remove("is-targeted"); });
  }

  function updateTarget(px, py) {
    var rect = hub.getBoundingClientRect();
    var cx = rect.left + rect.width / 2;
    var cy = rect.top + rect.height / 2;
    var dx = px - cx, dy = py - cy;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var best = null, bestDiff = Infinity;
    if (dist >= ACTIVATE_DIST) {
      var ang = Math.atan2(-dy, dx) * 180 / Math.PI; // 0=rechts, oben positiv
      if (ang < 0) ang += 360;
      petals.forEach(function (p, i) {
        var diff = Math.abs(ang - ANGLES[i]);
        if (diff > 180) diff = 360 - diff;
        if (diff < bestDiff) { bestDiff = diff; best = p; }
      });
      if (bestDiff > 40) best = null; // außerhalb jedes Sektors
    }
    if (best !== targeted) {
      petals.forEach(function (p) { p.classList.remove("is-targeted"); });
      if (best) best.classList.add("is-targeted");
      targeted = best;
    }
  }

  hub.addEventListener("pointerdown", function (e) {
    e.preventDefault();
    dragging = true;
    try { hub.setPointerCapture(e.pointerId); } catch (err) {}
    openRadial();
  });
  hub.addEventListener("pointermove", function (e) {
    if (!dragging) return;
    e.preventDefault();
    updateTarget(e.clientX, e.clientY);
  });
  hub.addEventListener("pointerup", function (e) {
    if (!dragging) return;
    dragging = false;
    var chosen = targeted ? targeted.getAttribute("data-action") : null;
    closeRadial();
    if (chosen) resolveStrategy(chosen);
  });
  hub.addEventListener("pointercancel", function () {
    dragging = false;
    closeRadial();
  });

  /* ---------- Counting-Modus ---------- */
  var DECK_CARDS = { 1: 12, 2: 18, 4: 26, 6: 34 }; // Karten pro Runde je Schuh
  var deckCount = 4;
  var shoe = [];
  var dealt = 0;
  var totalToDeal = 0;
  var actualRC = 0;     // tatsächlicher Running Count
  var userRC = 0;       // vom Nutzer gezählt
  var countCardEl = document.getElementById("countCard");
  var ccFaceEl = document.getElementById("ccFace");
  var swipeFbEl = document.getElementById("swipeFb");
  var countProgressEl = document.getElementById("countProgress");

  function buildShoe(decks) {
    var arr = [];
    for (var d = 0; d < decks; d++)
      for (var r = 0; r < RANKS.length; r++)
        for (var s = 0; s < SUITS.length; s++)
          arr.push({ rank: RANKS[r], suit: SUITS[s] });
    // Fisher-Yates
    for (var i = arr.length - 1; i > 0; i--) {
      var j = rand(i + 1); var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  function startRound() {
    shoe = buildShoe(deckCount);
    dealt = 0; actualRC = 0; userRC = 0;
    totalToDeal = Math.min(DECK_CARDS[deckCount], shoe.length - 4);
    showCountCard();
    updateCountProgress();
  }

  function showCountCard() {
    if (dealt >= shoe.length) return;
    var c = shoe[dealt];
    ccFaceEl.parentElement.className = "count-card " + (isRed(c.suit) ? "red" : "black");
    ccFaceEl.innerHTML =
      '<span class="rank">' + c.rank + "</span>" +
      '<svg class="pip" viewBox="0 0 24 24"><path d="' + PIP[c.suit] + '"/></svg>';
    countCardEl.style.transform = "translateX(0)";
  }

  function updateCountProgress() {
    countProgressEl.textContent = dealt + " / " + totalToDeal + " Karten";
  }

  function flashFb(text, cls) {
    swipeFbEl.textContent = text;
    swipeFbEl.className = "swipe-fb show " + cls;
    setTimeout(function () { swipeFbEl.className = "swipe-fb"; }, 350);
  }

  // userDelta: was der Nutzer für DIESE Karte zählt (-1/0/+1)
  function advanceCard(userDelta) {
    if (dealt >= totalToDeal) return;
    var c = shoe[dealt];
    actualRC += hiLo(c.rank);
    userRC += userDelta;
    dealt++;
    updateCountProgress();
    if (dealt >= totalToDeal) {
      promptRunningCount();
    } else {
      showCountCard();
    }
  }

  // Swipe-Gesten auf der Counting-Karte
  var cStartX = 0, cStartY = 0, cDragging = false, cMoved = false;
  countCardEl.addEventListener("pointerdown", function (e) {
    cDragging = true; cMoved = false; cStartX = e.clientX; cStartY = e.clientY;
    try { countCardEl.setPointerCapture(e.pointerId); } catch (err) {}
  });
  countCardEl.addEventListener("pointermove", function (e) {
    if (!cDragging) return;
    var dx = e.clientX - cStartX;
    if (Math.abs(dx) > 6) cMoved = true;
    countCardEl.style.transform = "translateX(" + dx * 0.6 + "px) rotate(" + dx * 0.03 + "deg)";
  });
  countCardEl.addEventListener("pointerup", function (e) {
    if (!cDragging) return;
    cDragging = false;
    var dx = e.clientX - cStartX;
    countCardEl.style.transform = "translateX(0)";
    if (dx > 50) { flashFb("+1", "plus"); advanceCard(1); }
    else if (dx < -50) { flashFb("−1", "minus"); advanceCard(-1); }
    else if (!cMoved) { advanceCard(0); } // Tap = neutral & weiter
  });
  countCardEl.addEventListener("pointercancel", function () {
    cDragging = false; countCardEl.style.transform = "translateX(0)";
  });

  /* ---------- Count-Modal (RC -> TC) ---------- */
  var modalScrim = document.getElementById("modalScrim");
  var modalTitle = document.getElementById("modalTitle");
  var modalSub = document.getElementById("modalSub");
  var modalInput = document.getElementById("modalInput");
  var modalResult = document.getElementById("modalResult");
  var modalSubmit = document.getElementById("modalSubmit");
  var modalStage = null; // 'rc' | 'tc'
  var roundRCright = false;

  function openModal(stage) {
    modalStage = stage;
    modalResult.className = "modal-result";
    modalResult.textContent = "";
    modalInput.value = "";
    if (stage === "rc") {
      modalTitle.textContent = "Running Count?";
      modalSub.textContent = "Wie hoch ist der laufende Hi-Lo-Count nach " + totalToDeal + " Karten?";
      modalInput.step = "1";
    } else {
      var remaining = (shoe.length - dealt) / 52;
      modalTitle.textContent = "True Count?";
      modalSub.textContent = "Running Count " + actualRC + " ÷ ~" + remaining.toFixed(1) + " verbleibende Decks (Toleranz ±0.4)";
      modalInput.step = "0.5";
    }
    modalScrim.classList.add("show");
    setTimeout(function () { modalInput.focus(); }, 60);
  }
  function promptRunningCount() { openModal("rc"); }

  modalSubmit.addEventListener("click", function () {
    var val = parseFloat(modalInput.value);
    if (isNaN(val)) { modalInput.focus(); return; }
    if (modalStage === "rc") {
      roundRCright = val === actualRC;
      modalResult.className = "modal-result " + (roundRCright ? "correct" : "wrong");
      modalResult.textContent = roundRCright
        ? "Richtig! RC = " + actualRC
        : "Falsch. Tatsächlich RC = " + actualRC + " (deine Eingabe: " + val + ")";
      modalSubmit.textContent = "Weiter zu True Count";
      modalStage = "rc-done";
    } else if (modalStage === "rc-done") {
      openModal("tc");
      modalSubmit.textContent = "Prüfen";
    } else if (modalStage === "tc") {
      var remaining = (shoe.length - dealt) / 52;
      var actualTC = actualRC / Math.max(0.5, remaining);
      var tcOk = Math.abs(val - actualTC) <= 0.4;
      modalResult.className = "modal-result " + (tcOk ? "correct" : "wrong");
      modalResult.textContent = tcOk
        ? "Richtig! TC ≈ " + actualTC.toFixed(2)
        : "Falsch. TC ≈ " + actualTC.toFixed(2) + " (deine Eingabe: " + val + ")";
      // Statistik fortschreiben
      countStats.rounds++;
      if (roundRCright) countStats.rcOk++;
      if (tcOk) countStats.tcOk++;
      save(COUNT_KEY, countStats);
      renderCountStats();
      modalSubmit.textContent = "Nächste Runde";
      modalStage = "tc-done";
    } else if (modalStage === "tc-done") {
      modalScrim.classList.remove("show");
      modalSubmit.textContent = "Prüfen";
      startRound();
    }
  });

  function renderCountStats() {
    document.getElementById("cmRounds").textContent = countStats.rounds;
    document.getElementById("cmCount").textContent = countStats.rcOk;
    document.getElementById("cmTrue").textContent = countStats.tcOk;
    document.getElementById("dCountRounds").textContent = countStats.rounds;
    document.getElementById("dCountRC").textContent = countStats.rcOk;
    document.getElementById("dCountTC").textContent = countStats.tcOk;
    var acc = countStats.rounds ? Math.round((countStats.tcOk / countStats.rounds) * 100) + "%" : "–";
    document.getElementById("dCountAcc").textContent = acc;
  }

  // Schuh-Auswahl
  document.getElementById("deckSeg").addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    deckCount = parseInt(b.getAttribute("data-decks"), 10);
    Array.prototype.forEach.call(this.children, function (c) { c.classList.remove("is-active"); });
    b.classList.add("is-active");
    startRound();
  });

  /* ---------- Tabs ---------- */
  var modeStrategy = document.getElementById("modeStrategy");
  var modeCount = document.getElementById("modeCount");
  var tabStrategy = document.getElementById("tabStrategy");
  var tabCount = document.getElementById("tabCount");

  function setMode(mode) {
    var strat = mode === "strategy";
    modeStrategy.classList.toggle("is-hidden", !strat);
    modeCount.classList.toggle("is-hidden", strat);
    tabStrategy.classList.toggle("is-active", strat);
    tabCount.classList.toggle("is-active", !strat);
    controlZone.classList.toggle("is-hidden", !strat); // Radialmenü nur im Strategie-Modus
    if (!strat && dealt === 0) startRound();
  }
  tabStrategy.addEventListener("click", function () { setMode("strategy"); });
  tabCount.addEventListener("click", function () { setMode("count"); });

  /* ---------- Drawer ---------- */
  var drawer = document.getElementById("drawer");
  var scrim = document.getElementById("scrim");
  function openDrawer() { drawer.classList.add("show"); scrim.classList.add("show"); }
  function closeDrawer() { drawer.classList.remove("show"); scrim.classList.remove("show"); }
  document.getElementById("openStats").addEventListener("click", openDrawer);
  document.getElementById("closeStats").addEventListener("click", closeDrawer);
  scrim.addEventListener("click", closeDrawer);
  document.getElementById("resetStats").addEventListener("click", function () {
    stratStats = { total: 0, correct: 0, streak: 0, best: 0 };
    countStats = { rounds: 0, rcOk: 0, tcOk: 0 };
    save(STRAT_KEY, stratStats); save(COUNT_KEY, countStats);
    renderStratStats(); renderCountStats();
  });

  /* ---------- Init ---------- */
  renderStratStats();
  renderCountStats();
  newStrategyHand();

  // Service Worker
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    });
  }
})(typeof self !== "undefined" ? self : this);
