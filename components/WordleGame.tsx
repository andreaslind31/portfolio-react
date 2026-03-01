"use client";

import { useEffect, useState, useRef, useCallback } from "react";

// ~2500 common 5-letter words
const WORDS = [
  "about","above","abuse","actor","acute","admit","adopt","adult","after","again",
  "agent","agree","ahead","alarm","album","alert","alien","align","alike","alive",
  "alley","allow","alone","along","alter","among","angel","anger","angle","angry",
  "anime","ankle","annex","apart","apple","apply","arena","argue","arise","armor",
  "arrow","aside","asset","audit","avoid","awake","award","aware","awful","bacon",
  "badge","badly","baker","bases","basic","basin","basis","batch","beach","beard",
  "beast","began","begin","being","belly","below","bench","berry","Bible","birth",
  "black","blade","blame","bland","blank","blast","blaze","bleed","blend","bless",
  "blind","blink","bliss","block","blood","bloom","blown","blues","blunt","board",
  "bonus","boost","booth","bound","brave","bread","break","breed","brick","bride",
  "brief","bring","broad","broke","brook","brown","brush","buddy","build","built",
  "bunch","burst","buyer","cabin","cable","camel","candy","cargo","carry","catch",
  "cater","cause","cease","chain","chair","chalk","champ","chaos","charm","chart",
  "chase","cheap","check","cheek","cheer","chess","chest","chief","child","chill",
  "china","chunk","civil","claim","clash","class","clean","clear","clerk","click",
  "cliff","climb","cling","clock","clone","close","cloth","cloud","coach","coast",
  "color","comet","comic","coral","couch","could","count","court","cover","crack",
  "craft","crane","crash","crazy","cream","creek","crime","crisp","cross","crowd",
  "crown","crude","crush","curve","cycle","daily","dance","dealt","death","debug",
  "debut","decor","decoy","deity","delay","delta","demon","dense","depot","depth",
  "derby","desert","devil","diary","dirty","disco","ditch","dizzy","dodge","doing",
  "donor","doubt","dough","draft","drain","drake","drama","drank","drape","drawn",
  "dream","dress","dried","drift","drill","drink","drive","drone","drops","drove",
  "drown","dying","eager","eagle","early","earth","eight","elder","elect","elite",
  "email","empty","enact","enemy","enjoy","enter","entry","equal","error","essay",
  "ethic","evade","event","every","exact","exert","exile","exist","extra","fable",
  "facet","faith","false","fancy","fatal","fault","feast","fence","ferry","fetch",
  "fever","fiber","field","fifth","fifty","fight","final","first","fixed","flame",
  "flash","fleet","flesh","float","flock","flood","floor","flora","flour","flown",
  "fluid","flush","flute","focal","focus","force","forge","forth","forum","found",
  "frame","frank","fraud","fresh","front","frost","froze","fruit","fully","funny",
  "gamma","gauge","genre","ghost","giant","given","glass","gleam","glide","globe",
  "gloom","glory","gloss","glove","going","grace","grade","grain","grand","grant",
  "graph","grasp","grass","grave","great","greed","green","greet","grief","grill",
  "grind","gripe","gross","group","grown","guard","guess","guest","guide","guild",
  "guilt","guise","guitar","habit","happy","hardy","harsh","hasty","haven","hazel",
  "heart","heavy","hedge","hence","herbs","hinge","hobby","homer","honey","honor",
  "horse","hotel","house","human","humid","humor","hurry","hyper","ideal","image",
  "imply","inbox","index","indie","infer","ingot","inner","input","intel","inter",
  "intro","irony","issue","ivory","jewel","joint","jolly","joker","juice","juicy",
  "jumbo","jumpy","kebab","khaki","knack","kneel","knife","knock","known","label",
  "labor","large","laser","later","laugh","layer","leach","learn","lease","leave",
  "legal","lemon","level","lever","light","liked","limit","linen","liner","lipid",
  "liver","lobby","local","lodge","logic","login","lonely","loose","lover","lower",
  "loyal","lucky","lunar","lunch","lying","lyric","macro","magic","major","maker",
  "manga","manor","maple","march","marry","marsh","match","maybe","mayor","medal",
  "media","mercy","merge","merit","merry","metal","meter","midst","might","minor",
  "minus","mixer","model","modem","money","month","moral","motor","mount","mouse",
  "mouth","movie","muddy","mural","music","naive","naval","nerve","never","newly",
  "nexus","night","noble","noise","north","noted","novel","nurse","nylon","oasis",
  "occur","ocean","olive","onset","opera","orbit","order","organ","other","ought",
  "outer","oxide","ozone","paint","panel","panic","papal","paper","paste","patch",
  "pause","peace","peach","pearl","penny","perch","peril","phase","phone","photo",
  "piano","piece","pilot","pinch","pitch","pixel","pizza","place","plain","plane",
  "plant","plate","plaza","plead","pluck","plumb","plume","plump","plunge","point",
  "poise","poker","polar","polls","poppy","porch","poser","pouch","pound","power",
  "press","price","pride","prime","print","prior","prize","probe","prone","proof",
  "prose","proud","prove","proxy","psalm","pulse","punch","pupil","purse","queen",
  "query","quest","queue","quick","quiet","quilt","quirk","quota","quote","radar",
  "radio","raise","rally","range","rapid","ratio","reach","react","ready","realm",
  "rebel","refer","reign","relax","relay","renal","renew","repay","reply","rider",
  "ridge","rifle","right","rigid","rival","river","robin","robot","rocky","rouge",
  "rough","round","route","royal","rugby","ruin","ruler","rural","saint","salad",
  "sauce","scale","scare","scene","scent","scope","score","scout","scrap","sedan",
  "sense","serve","setup","seven","shade","shaft","shake","shall","shame","shape",
  "share","shark","sharp","shave","sheep","sheer","sheet","shelf","shell","shift",
  "shine","shirt","shock","shoot","shore","short","shout","sight","sigma","silly",
  "since","sixth","sixty","sized","skill","skull","slash","slate","slave","sleep",
  "slice","slide","slope","small","smart","smell","smile","smoke","snack","snake",
  "solar","solid","solve","sorry","sound","south","space","spare","spark","speak",
  "spear","speed","spell","spend","spice","spite","split","spoke","spoon","sport",
  "spray","squad","stack","staff","stage","stain","stake","stale","stall","stamp",
  "stand","stare","start","state","stays","steak","steal","steam","steel","steep",
  "steer","stern","stick","stiff","still","stock","stole","stone","stood","store",
  "storm","story","stove","strap","straw","strip","stuck","study","stuff","style",
  "sugar","suite","sunny","super","surge","swamp","swarm","swear","sweat","sweep",
  "sweet","swept","swift","swing","sword","syrup","table","taste","teach","teeth",
  "tempo","tenor","terms","thank","theft","theme","there","thick","thing","think",
  "third","those","three","throw","thumb","tidal","tiger","tight","timer","tired",
  "title","toast","today","token","total","touch","tough","towel","tower","toxic",
  "trace","track","trade","trail","train","trait","trash","treat","trend","trial",
  "tribe","trick","tried","troop","truck","truly","trump","trunk","trust","truth",
  "tumor","tuner","twist","tying","ultra","uncle","under","unify","union","unite",
  "unity","until","upper","upset","urban","usage","usual","valid","value","valve",
  "vault","venue","verse","video","vigor","vinyl","viola","virus","visit","vista",
  "vital","vivid","vocal","vodka","voice","voter","waist","waste","watch","water",
  "weary","weave","wedge","weigh","weird","whale","wheat","wheel","where","which",
  "while","white","whole","whose","wider","widow","width","witch","woman","world",
  "worry","worse","worst","worth","would","wound","wrath","write","wrong","wrote",
  "yacht","yield","young","youth","zebra",
];

const WORD_LENGTH = 5;
const MAX_GUESSES = 6;

const KEYBOARD_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "DEL"],
];

type TileState = "empty" | "tbd" | "correct" | "present" | "absent";
type GameState = "playing" | "won" | "lost";

interface TileData {
  letter: string;
  state: TileState;
}

function pickWord(): string {
  return WORDS[Math.floor(Math.random() * WORDS.length)].toUpperCase();
}

function evaluateGuess(guess: string, answer: string): TileState[] {
  const result: TileState[] = Array(WORD_LENGTH).fill("absent");
  const answerChars = answer.split("");
  const guessChars = guess.split("");

  // First pass: mark correct
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guessChars[i] === answerChars[i]) {
      result[i] = "correct";
      answerChars[i] = "#"; // consumed
      guessChars[i] = "*"; // matched
    }
  }

  // Second pass: mark present
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guessChars[i] === "*") continue;
    const idx = answerChars.indexOf(guessChars[i]);
    if (idx !== -1) {
      result[i] = "present";
      answerChars[idx] = "#"; // consumed
    }
  }

  return result;
}

export default function WordleGame({
  onStreakSubmit,
}: {
  onStreakSubmit?: (name: string, streak: number) => Promise<string | null>;
}) {
  const answerRef = useRef(pickWord());
  const streakRef = useRef(0);

  const [guesses, setGuesses] = useState<TileData[][]>([]);
  const [currentInput, setCurrentInput] = useState("");
  const [gameState, setGameState] = useState<GameState>("playing");
  const [streak, setStreak] = useState(0);
  const [shake, setShake] = useState(false);
  const [revealingRow, setRevealingRow] = useState<number | null>(null);
  const [bounceRow, setBounceRow] = useState<number | null>(null);

  // Name input for streak submission
  const [showSubmit, setShowSubmit] = useState(false);
  const [lostStreak, setLostStreak] = useState(0);
  const [submitName, setSubmitName] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Load streak from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("wordle-streak");
      if (saved) {
        const val = parseInt(saved, 10);
        if (!isNaN(val) && val > 0) {
          streakRef.current = val;
          setStreak(val);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Compute keyboard letter states from guesses
  const keyStates = useCallback((): Record<string, TileState> => {
    const states: Record<string, TileState> = {};
    for (const row of guesses) {
      for (const tile of row) {
        if (!tile.letter) continue;
        const prev = states[tile.letter];
        if (tile.state === "correct") {
          states[tile.letter] = "correct";
        } else if (tile.state === "present" && prev !== "correct") {
          states[tile.letter] = "present";
        } else if (tile.state === "absent" && !prev) {
          states[tile.letter] = "absent";
        }
      }
    }
    return states;
  }, [guesses]);

  const submitGuess = useCallback(() => {
    if (gameState !== "playing") return;
    if (currentInput.length !== WORD_LENGTH) {
      setShake(true);
      setTimeout(() => setShake(false), 600);
      return;
    }

    const guess = currentInput.toUpperCase();
    const answer = answerRef.current;
    const states = evaluateGuess(guess, answer);
    const newRow: TileData[] = guess.split("").map((letter, i) => ({
      letter,
      state: states[i],
    }));

    const newGuesses = [...guesses, newRow];
    const rowIndex = newGuesses.length - 1;

    setGuesses(newGuesses);
    setCurrentInput("");
    setRevealingRow(rowIndex);

    const isWin = states.every((s) => s === "correct");
    const isLoss = !isWin && newGuesses.length >= MAX_GUESSES;

    // Delay state change to let flip animation complete
    setTimeout(() => {
      setRevealingRow(null);

      if (isWin) {
        setBounceRow(rowIndex);
        const newStreak = streakRef.current + 1;
        streakRef.current = newStreak;
        setStreak(newStreak);
        try {
          localStorage.setItem("wordle-streak", String(newStreak));
        } catch {
          // ignore
        }
        setTimeout(() => {
          setBounceRow(null);
          setGameState("won");
        }, 600);
      } else if (isLoss) {
        const hadStreak = streakRef.current;
        if (hadStreak > 0 && onStreakSubmit) {
          setLostStreak(hadStreak);
          setShowSubmit(true);
          setTimeout(() => nameInputRef.current?.focus(), 100);
        }
        setGameState("lost");
        // Reset streak
        streakRef.current = 0;
        setStreak(0);
        try {
          localStorage.removeItem("wordle-streak");
        } catch {
          // ignore
        }
      }
    }, WORD_LENGTH * 100 + 500);
  }, [currentInput, gameState, guesses, onStreakSubmit]);

  const addLetter = useCallback(
    (letter: string) => {
      if (gameState !== "playing") return;
      if (currentInput.length >= WORD_LENGTH) return;
      setCurrentInput((prev) => prev + letter.toUpperCase());
    },
    [gameState, currentInput.length]
  );

  const removeLetter = useCallback(() => {
    if (gameState !== "playing") return;
    setCurrentInput((prev) => prev.slice(0, -1));
  }, [gameState]);

  const handleKey = useCallback(
    (key: string) => {
      if (key === "ENTER") {
        submitGuess();
      } else if (key === "DEL" || key === "BACKSPACE") {
        removeLetter();
      } else if (/^[A-Z]$/.test(key)) {
        addLetter(key);
      }
    },
    [submitGuess, removeLetter, addLetter]
  );

  // Desktop keyboard
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      // Don't capture when typing in an input
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      const key = e.key.toUpperCase();
      if (key === "ENTER" || key === "BACKSPACE" || /^[A-Z]$/.test(key)) {
        e.preventDefault();
        handleKey(key);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleKey]);

  const resetGame = useCallback(() => {
    answerRef.current = pickWord();
    setGuesses([]);
    setCurrentInput("");
    setGameState("playing");
    setShake(false);
    setRevealingRow(null);
    setBounceRow(null);
    setShowSubmit(false);
    setLostStreak(0);
    setSubmitName("");
    setSubmitError(null);
    setSubmitting(false);
    setSubmitted(false);
  }, []);

  const handleSubmitStreak = useCallback(async () => {
    if (!onStreakSubmit || !submitName.trim()) return;
    setSubmitting(true);
    setSubmitError(null);
    const err = await onStreakSubmit(submitName.trim(), lostStreak);
    setSubmitting(false);
    if (err) {
      setSubmitError(err);
    } else {
      setSubmitted(true);
    }
  }, [onStreakSubmit, submitName, lostStreak]);

  // Build the board rows
  const board: TileData[][] = [];
  for (let r = 0; r < MAX_GUESSES; r++) {
    if (r < guesses.length) {
      board.push(guesses[r]);
    } else if (r === guesses.length && gameState === "playing") {
      // Current input row
      const row: TileData[] = [];
      for (let c = 0; c < WORD_LENGTH; c++) {
        row.push({
          letter: currentInput[c] || "",
          state: currentInput[c] ? "tbd" : "empty",
        });
      }
      board.push(row);
    } else {
      // Empty row
      board.push(
        Array.from({ length: WORD_LENGTH }, () => ({
          letter: "",
          state: "empty" as TileState,
        }))
      );
    }
  }

  const kStates = keyStates();

  return (
    <div className="wordle-container">
      {/* Streak badge */}
      {streak > 0 && gameState !== "lost" && (
        <div className="wordle-streak-badge">
          🔥 {streak} win streak
        </div>
      )}

      {/* Board */}
      <div className="wordle-board">
        {board.map((row, rowIdx) => {
          const isRevealing = revealingRow === rowIdx;
          const isBouncing = bounceRow === rowIdx;
          const isCurrentRow = rowIdx === guesses.length && gameState === "playing";
          const isShaking = isCurrentRow && shake;

          return (
            <div
              key={rowIdx}
              className={`wordle-row ${isShaking ? "wordle-shake" : ""}`}
            >
              {row.map((tile, colIdx) => {
                let tileClass = "wordle-tile";
                if (tile.state === "tbd") tileClass += " wordle-tile-tbd";
                else if (tile.state === "correct") tileClass += " wordle-tile-correct";
                else if (tile.state === "present") tileClass += " wordle-tile-present";
                else if (tile.state === "absent") tileClass += " wordle-tile-absent";

                if (isRevealing) tileClass += " wordle-tile-flip";
                if (isBouncing) tileClass += " wordle-tile-bounce";

                return (
                  <div
                    key={colIdx}
                    className={tileClass}
                    style={{
                      animationDelay: isRevealing || isBouncing
                        ? `${colIdx * 100}ms`
                        : undefined,
                    }}
                  >
                    {tile.letter}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Result */}
      {gameState === "won" && (
        <div className="wordle-result wordle-result-win">
          <p className="text-lg font-bold text-green-600 dark:text-green-400">
            🎉 Nice! Streak: {streak}
          </p>
          <button onClick={resetGame} className="arcade-btn mt-3" style={{ maxWidth: 200 }}>
            Play Again
          </button>
        </div>
      )}

      {gameState === "lost" && (
        <div className="wordle-result wordle-result-lose">
          <p className="text-base font-semibold text-gray-900 dark:text-white">
            The word was{" "}
            <span className="text-red-500 font-bold">{answerRef.current}</span>
          </p>

          {showSubmit && !submitted && lostStreak > 0 && (
            <div className="mt-3 w-full max-w-xs mx-auto">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                Your streak of <strong>{lostStreak}</strong> ended! Submit to leaderboard?
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmitStreak();
                }}
                className="flex flex-col gap-2"
              >
                <input
                  ref={nameInputRef}
                  type="text"
                  className="arcade-input"
                  placeholder="Your name (1–16 chars)"
                  value={submitName}
                  onChange={(e) => setSubmitName(e.target.value)}
                  maxLength={16}
                  disabled={submitting}
                />
                <button
                  type="submit"
                  className="arcade-btn"
                  disabled={submitting || !submitName.trim()}
                >
                  {submitting ? "Submitting..." : "Submit Streak"}
                </button>
                {submitError && (
                  <p className="text-xs text-red-500">{submitError}</p>
                )}
              </form>
            </div>
          )}

          {submitted && (
            <p className="text-sm text-green-600 dark:text-green-400 mt-2">
              Streak submitted!
            </p>
          )}

          <button onClick={resetGame} className="arcade-btn-secondary mt-3" style={{ maxWidth: 200 }}>
            Play Again
          </button>
        </div>
      )}

      {/* On-screen keyboard */}
      <div className="wordle-keyboard">
        {KEYBOARD_ROWS.map((row, rowIdx) => (
          <div key={rowIdx} className="wordle-keyboard-row">
            {row.map((key) => {
              const isWide = key === "ENTER" || key === "DEL";
              let keyClass = "wordle-key";
              if (isWide) keyClass += " wordle-key-wide";

              if (key.length === 1) {
                const st = kStates[key];
                if (st === "correct") keyClass += " wordle-key-correct";
                else if (st === "present") keyClass += " wordle-key-present";
                else if (st === "absent") keyClass += " wordle-key-absent";
              }

              return (
                <button
                  key={key}
                  className={keyClass}
                  onClick={() => handleKey(key)}
                  aria-label={key === "DEL" ? "Delete" : key}
                >
                  {key === "DEL" ? "⌫" : key}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
