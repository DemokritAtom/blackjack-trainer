/* Automatisierte Tests der Basisstrategie (S17, 4–8 Decks, DAS, Late Surrender).
 * Lauf:  node test.js
 * Prüft bekannte Standard-Entscheidungen aus öffentlichen Basisstrategie-Charts. */
var S = require("./app.js");

// [Spielerkarten, Dealer-Upcard, erwarteter Aktionscode, Beschreibung]
var CASES = [
  [["10", "6"], "10", "R", "Hard 16 vs 10 -> Surrender"],
  [["10", "6"], "9", "R", "Hard 16 vs 9 -> Surrender"],
  [["10", "6"], "A", "R", "Hard 16 vs A -> Surrender"],
  [["10", "6"], "7", "H", "Hard 16 vs 7 -> Hit"],
  [["10", "5"], "10", "R", "Hard 15 vs 10 -> Surrender"],
  [["10", "5"], "9", "H", "Hard 15 vs 9 -> Hit (kein Surrender)"],
  [["10", "5"], "A", "H", "Hard 15 vs A -> Hit (kein Surrender)"],
  [["7", "4"], "6", "D", "Hard 11 vs 6 -> Double"],
  [["7", "4"], "A", "D", "Hard 11 vs A -> Double (S17)"],
  [["5", "4"], "3", "D", "Hard 9 vs 3 -> Double"],
  [["5", "4"], "2", "H", "Hard 9 vs 2 -> Hit"],
  [["6", "4"], "10", "H", "Hard 10 vs 10 -> Hit"],
  [["7", "5"], "3", "H", "Hard 12 vs 3 -> Hit"],
  [["7", "5"], "4", "S", "Hard 12 vs 4 -> Stand"],
  [["9", "4"], "2", "S", "Hard 13 vs 2 -> Stand"],
  [["10", "7"], "A", "S", "Hard 17 vs A -> Stand"],
  [["A", "2"], "5", "D", "Soft 13 vs 5 -> Double"],
  [["A", "6"], "2", "H", "Soft 17 vs 2 -> Hit"],
  [["A", "7"], "2", "S", "Soft 18 vs 2 -> Stand"],
  [["A", "7"], "3", "D", "Soft 18 vs 3 -> Double"],
  [["A", "7"], "9", "H", "Soft 18 vs 9 -> Hit"],
  [["A", "8"], "6", "S", "Soft 19 vs 6 -> Stand"],
  [["8", "8"], "10", "P", "Pair 8,8 vs 10 -> Split"],
  [["A", "A"], "5", "P", "Pair A,A vs 5 -> Split"],
  [["6", "6"], "7", "H", "Pair 6,6 vs 7 -> Hit (kein Split)"],
  [["6", "6"], "6", "P", "Pair 6,6 vs 6 -> Split"],
  [["4", "4"], "4", "H", "Pair 4,4 vs 4 -> Hit (kein Split)"],
  [["4", "4"], "5", "P", "Pair 4,4 vs 5 -> Split"],
  [["9", "9"], "7", "S", "Pair 9,9 vs 7 -> Stand"],
  [["9", "9"], "9", "P", "Pair 9,9 vs 9 -> Split"],
  [["5", "5"], "6", "D", "Pair 5,5 vs 6 -> Double (wie Hard 10)"],
  [["10", "10"], "6", "S", "Pair 10,10 vs 6 -> Stand (nie Split)"],
  [["2", "2"], "7", "P", "Pair 2,2 vs 7 -> Split"],
  [["2", "2"], "8", "H", "Pair 2,2 vs 8 -> Hit"],
  [["7", "7"], "8", "H", "Pair 7,7 vs 8 -> Hit"],
];

var pass = 0, fail = 0;
CASES.forEach(function (c) {
  var got = S.bestAction(c[0], c[1]);
  var ok = got === c[2];
  if (ok) { pass++; }
  else { fail++; console.log("FAIL: " + c[3] + "  (erwartet " + c[2] + ", erhalten " + got + ")"); }
});

console.log("\n" + pass + "/" + CASES.length + " Tests bestanden.");
if (fail > 0) { console.log(fail + " fehlgeschlagen."); process.exit(1); }
else { console.log("Alle Basisstrategie-Tests bestanden."); }
