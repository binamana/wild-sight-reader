import { useEffect, useRef, useState } from "react";
import "./App.css";

const MODE_BPM = {
  easy: 70,
  normal: 80,
  hard: 95,
};
const COUNT_IN_BEATS = 4;
const PLAY_BEATS = 8;
const MAX_ROUND = 5;

const MODE_CONFIG = {
  easy: { perfect: 100, good: 170, okay: 250 },
  normal: { perfect: 70, good: 130, okay: 200 },
  hard: { perfect: 40, good: 90, okay: 150 },
};

const ROUND_DIALOGUES = {
  1: [
    "침착해. 첫 총성은 박자를 놓치지 않는 자의 것이다.",
    "모래바람이 거칠어진다. 쉼표에서도 방아쇠를 당기지 마라.",
    "놈도 네 박자를 읽기 시작했다. 흔들리지 마.",
    "한 박자만 늦어도 끝장이다. 숨을 고르고 다시 조준해라.",
    "마지막 결투다. 네 리듬으로 황야를 잠재워라.",
  ],
};

function generateQuarterRhythm() {
  const beats = [];
  const symbols = [];

  for (let i = 0; i < 8; i++) {
    const isNote = Math.random() > 0.25;

    if (isNote) {
      beats.push(i);
      symbols.push("♩");
    } else {
      symbols.push("𝄽");
    }
  }

  if (beats.length === 0) {
    beats.push(0);
    symbols[0] = "♩";
  }

  return {
    beats,
    display: `${symbols.slice(0, 4).join(" ")} | ${symbols.slice(4).join(" ")}`,
  };
}

function getDamage(grade) {
  switch (grade) {
    case "Perfect":
      return { enemyDamage: 35, playerDamage: 0 };
    case "Good":
      return { enemyDamage: 25, playerDamage: 0 };
    case "Okay":
      return { enemyDamage: 15, playerDamage: 10 };
    case "Miss":
      return { enemyDamage: 0, playerDamage: 20 };
    case "Fail":
      return { enemyDamage: 0, playerDamage: 35 };
    default:
      return { enemyDamage: 0, playerDamage: 0 };
  }
}

function judgeRhythm(inputTimes, mode, answerBeats, bpm) {
  const config = MODE_CONFIG[mode] || MODE_CONFIG.normal;
  const beatMs = 60000 / bpm;
const answerTimes = answerBeats.map((beat) => beat * beatMs);

  let score = 0;
  const usedInputs = new Set();

  for (const answerTime of answerTimes) {
    let bestDiff = Infinity;
    let bestIndex = -1;

    inputTimes.forEach((inputTime, index) => {
      if (usedInputs.has(index)) return;
      const diff = Math.abs(inputTime - answerTime);

      if (diff < bestDiff) {
        bestDiff = diff;
        bestIndex = index;
      }
    });

    let point = 0;

    if (bestDiff <= config.perfect) point = 100;
    else if (bestDiff <= config.good) point = 80;
    else if (bestDiff <= config.okay) point = 50;

    if (bestIndex !== -1 && bestDiff <= config.okay) {
      usedInputs.add(bestIndex);
    }

    score += point;
  }

  const extraInputs = inputTimes.length - usedInputs.size;
  score -= extraInputs * 20;

  const maxScore = answerTimes.length * 100;
  const accuracy = Math.max(0, score / maxScore);
  const percent = Math.round(accuracy * 100);

  let grade = "Fail";
  if (accuracy >= 0.9) grade = "Perfect";
  else if (accuracy >= 0.75) grade = "Good";
  else if (accuracy >= 0.6) grade = "Okay";
  else if (accuracy >= 0.4) grade = "Miss";

  return { grade, percent, extraInputs };
}

function judgeSingleInput(elapsedTime, mode, answerBeats, bpm) {
  const config = MODE_CONFIG[mode] || MODE_CONFIG.normal;
  const beatMs = 60000 / bpm;
const answerTimes = answerBeats.map((beat) => beat * beatMs);

  let bestDiff = Infinity;

  answerTimes.forEach((answerTime) => {
    const diff = Math.abs(elapsedTime - answerTime);
    if (diff < bestDiff) bestDiff = diff;
  });

  if (bestDiff <= config.perfect) return "Perfect!";
  if (bestDiff <= config.good) return "Good!";
  if (bestDiff <= config.okay) return "Bad!";
  return "Miss!";
}

function App() {
  const bgmRef = useRef(null);
  const autoNextTimerRef = useRef(null);

  const [screen, setScreen] = useState("main");
  const [mode, setMode] = useState(null);
  const [level, setLevel] = useState(null);

  const [gameState, setGameState] = useState("ready");
  const [countNumber, setCountNumber] = useState(null);
  const [inputTimes, setInputTimes] = useState([]);
  const [startTime, setStartTime] = useState(null);
  const [message, setMessage] = useState("시작 버튼을 누르세요");
  const [judgment, setJudgment] = useState(null);

  const [playerHp, setPlayerHp] = useState(100);
  const [enemyHp, setEnemyHp] = useState(100);
  const [round, setRound] = useState(1);
  const [battleResult, setBattleResult] = useState(null);

  const [rhythmPattern, setRhythmPattern] = useState({
    beats: [0, 1, 2, 3, 4, 5, 6, 7],
    display: "♩ ♩ ♩ ♩ | ♩ ♩ ♩ ♩",
  });

  const currentDialogue =
    ROUND_DIALOGUES[level]?.[round - 1] || "정신 똑바로 차려라.";

  function clearAutoTimer() {
    if (autoNextTimerRef.current) {
      clearTimeout(autoNextTimerRef.current);
      autoNextTimerRef.current = null;
    }
  }
  const currentBpm = MODE_BPM[mode] || 80;
const currentBeatMs = 60000 / currentBpm;

  function startBgm() {
    if (!bgmRef.current) return;

    bgmRef.current.volume = 0.35;
    bgmRef.current.play().catch((error) => {
      console.log("BGM 재생 실패:", error);
    });
  }

  useEffect(() => {
    if (!bgmRef.current) return;

    if (screen === "main" || screen === "mode" || screen === "level") {
      bgmRef.current.volume = 0.35;
      bgmRef.current.play().catch(() => {});
    } else {
      bgmRef.current.pause();
    }
  }, [screen]);

  useEffect(() => {
    return () => clearAutoTimer();
  }, []);

  function playMetronomeSound(isAccent = false) {
    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = isAccent ? 1200 : 800;

    gain.gain.setValueAtTime(0.3, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      audioContext.currentTime + 0.08
    );

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.08);
  }

  function endBattle(result, text) {
    setBattleResult(result);
    setGameState("battleEnd");
    setMessage(text);
  }

  function checkBattleEnd(nextPlayerHp, nextEnemyHp, currentRound) {
    if (nextEnemyHp <= 0) {
      endBattle("win", "승리! 상대를 쓰러뜨렸습니다.");
      return true;
    }

    if (nextPlayerHp <= 0) {
      endBattle("lose", "패배... 쓰러졌습니다.");
      return true;
    }

    if (currentRound >= MAX_ROUND) {
      if (nextPlayerHp > nextEnemyHp) {
        endBattle("win", "승리! HP 판정으로 이겼습니다.");
      } else if (nextPlayerHp < nextEnemyHp) {
        endBattle("lose", "패배... HP 판정으로 졌습니다.");
      } else {
        endBattle("draw", "무승부!");
      }

      return true;
    }

    return false;
  }

  function goNextRoundAutomatically() {
    setRound((prev) => prev + 1);
    setInputTimes([]);
    setJudgment(null);
    setStartTime(null);
    setGameState("ready");
    setCountNumber(null);
    setMessage("시작 버튼을 누르세요");
    setRhythmPattern(generateQuarterRhythm());
  }

  function finishRhythmTest(finalInputs) {
    const result = judgeRhythm(
  finalInputs,
  mode,
  rhythmPattern.beats,
  currentBpm
);
    const damage = getDamage(result.grade);

    const nextEnemyHp = Math.max(0, enemyHp - damage.enemyDamage);
    const nextPlayerHp = Math.max(0, playerHp - damage.playerDamage);

    setJudgment({ ...result, ...damage });
    setEnemyHp(nextEnemyHp);
    setPlayerHp(nextPlayerHp);

    setGameState("roundEnd");
    setMessage(`${result.grade}! 정확도 ${result.percent}%`);
    setStartTime(null);

    const isBattleEnded = checkBattleEnd(nextPlayerHp, nextEnemyHp, round);

    if (!isBattleEnded) {
      autoNextTimerRef.current = setTimeout(() => {
        goNextRoundAutomatically();
      }, 1800);
    }
  }

  function startRhythmTest() {
    if (gameState !== "ready") return;

    clearAutoTimer();

    setInputTimes([]);
    setJudgment(null);
    setStartTime(null);
    setGameState("countin");
    setMessage("카운트 인");
    setCountNumber(1);

    const recordedInputs = [];
    let beat = 1;

    playMetronomeSound(true);

    const interval = setInterval(() => {
      beat += 1;

      if (beat <= COUNT_IN_BEATS) {
        setCountNumber(beat);
        setMessage(`카운트 ${beat}`);
        playMetronomeSound(beat === 1);
      } else if (beat === COUNT_IN_BEATS + 1) {
        setCountNumber(null);
        setGameState("playing");
        setMessage("연주 시작!");

        const now = Date.now();
        setStartTime(now);

        playMetronomeSound(true);
      } else if (beat <= COUNT_IN_BEATS + PLAY_BEATS) {
        playMetronomeSound((beat - COUNT_IN_BEATS - 1) % 4 === 0);
      } else {
        clearInterval(interval);
        finishRhythmTest(recordedInputs);
      }
    }, currentBeatMs);

    window.currentRhythmInputs = recordedInputs;
  }

  function resetBattle() {
    clearAutoTimer();

    setInputTimes([]);
    setStartTime(null);
    setGameState("ready");
    setCountNumber(null);
    setJudgment(null);
    setPlayerHp(100);
    setEnemyHp(100);
    setRound(1);
    setBattleResult(null);
    setMessage("시작 버튼을 누르세요");
    setRhythmPattern(generateQuarterRhythm());
  }

  useEffect(() => {
    function handleKeyDown(event) {
      if (screen !== "duel") return;
      if (event.code !== "Space") return;
      if (gameState !== "playing") return;
      if (startTime === null) return;

      event.preventDefault();

      const elapsedTime = Date.now() - startTime;
      const newInputs = [...inputTimes, elapsedTime];

      setInputTimes(newInputs);

      if (window.currentRhythmInputs) {
        window.currentRhythmInputs.push(elapsedTime);
      }

      const hitJudge = judgeSingleInput(
  elapsedTime,
  mode,
  rhythmPattern.beats,
  currentBpm
);

      setMessage(hitJudge);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [screen, gameState, startTime, inputTimes, mode, rhythmPattern]);

  return (
    <div className="app">
      <audio ref={bgmRef} src="/audio/main-bgm.mp3" loop />

      {screen === "main" && (
        <div className="screen main-screen">
          <img
            className="title-logo"
            src="/images/logo.png"
            alt="황야의 초견가"
          />

          <button
            className="main-button"
            onClick={() => {
              startBgm();
              setScreen("mode");
            }}
          >
            게임 시작
          </button>
        </div>
      )}

      {screen === "mode" && (
        <div className="screen mode-screen">
          <h2>모드 선택</h2>

          {["easy", "normal", "hard"].map((item) => (
            <button
              key={item}
              className="mode-button"
              onClick={() => {
                setMode(item);
                setScreen("level");
              }}
            >
              {item.toUpperCase()}
            </button>
          ))}
        </div>
      )}

      {screen === "level" && (
        <div className="screen level-screen">
          <img
            className="story-bubble-image"
            src="/images/story-bubble.png"
            alt="스토리 말풍선"
          />

          <p>선택한 모드: {mode}</p>

          <div className="level-grid">
            {Array.from({ length: 20 }, (_, index) => {
              const currentLevel = index + 1;
              const unlocked = currentLevel === 1;

              return (
                <button
                  key={currentLevel}
                  className={unlocked ? "level-button" : "level-button locked"}
                  disabled={!unlocked}
                  onClick={() => {
                    setLevel(currentLevel);
                    resetBattle();
                    setScreen("duel");
                  }}
                >
                  {unlocked
                    ? `Level ${currentLevel}`
                    : `🔒 Level ${currentLevel}`}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {screen === "duel" && (
        <div className="duel-screen">
          <div className="round-info">
            <p>Mode: {mode}</p>
            <p>Level {level}</p>
            <p>
              Round {round} / {MAX_ROUND}
            </p>
            <p>BPM {currentBpm}</p>
          </div>

          <div className="duel-area">
            <div className="ground-line"></div>

            <div className="round-dialogue">{currentDialogue}</div>

            <div className="enemy-status status-card">
              <p className="status-name">상대</p>
              <div className="hp-bar">
                <div
                  className={`hp-fill ${
                    enemyHp > 60 ? "high" : enemyHp > 30 ? "mid" : "low"
                  }`}
                  style={{ width: `${enemyHp}%` }}
                ></div>
              </div>
              <p>{enemyHp} HP</p>
            </div>

            <img
              className="character enemy-character"
              src="/images/enemy.png"
              alt="enemy"
            />

            <div className="rhythm-box">
              <p className="rhythm-label">리듬악보</p>

              <div className="rhythm-staff">
                {rhythmPattern.display.split(" ").map((symbol, index) => (
                  <span
                    key={index}
                    className={symbol === "|" ? "bar-line" : "rhythm-note"}
                  >
                    {symbol}
                  </span>
                ))}
              </div>

              {gameState === "countin" && (
                <div className="count-number">{countNumber}</div>
              )}

              {gameState === "playing" && (
                <div className="count-number">PLAY!</div>
              )}

              {gameState === "battleEnd" && (
                <div className="count-number">
                  {battleResult === "win" && "승리!"}
                  {battleResult === "lose" && "패배"}
                  {battleResult === "draw" && "무승부"}
                </div>
              )}

              <p className="message">{message}</p>
              <p>입력 횟수: {inputTimes.length}</p>
            </div>

            <div className="player-status status-card">
              <p className="status-name">나</p>
              <div className="hp-bar">
                <div
                  className={`hp-fill ${
                    playerHp > 60 ? "high" : playerHp > 30 ? "mid" : "low"
                  }`}
                  style={{ width: `${playerHp}%` }}
                ></div>
              </div>
              <p>{playerHp} HP</p>
            </div>

            <img
              className="character player-character"
              src="/images/player.png"
              alt="player"
            />
          </div>

          <div className="bottom-panel">
            <button
              className="main-button"
              onClick={startRhythmTest}
              disabled={gameState !== "ready"}
            >
              리듬 시작
            </button>

            <div className="judgment-panel">
              <h3>판정</h3>
              {judgment ? (
                <>
                  <h2>{judgment.grade}</h2>
                  <p>정확도: {judgment.percent}%</p>
                  <p>상대 피해: {judgment.enemyDamage}</p>
                  <p>내 피해: {judgment.playerDamage}</p>
                  <p>추가 입력: {judgment.extraInputs}개</p>
                </>
              ) : (
                <>
                  <h2>-</h2>
                  <p>정확도: -%</p>
                  <p>상대 피해: -</p>
                  <p>내 피해: -</p>
                  <p>추가 입력: -</p>
                </>
              )}
            </div>

            {gameState === "battleEnd" && (
              <button className="main-button" onClick={resetBattle}>
                다시 도전
              </button>
            )}

            <button
              className="main-button"
              onClick={() => {
                clearAutoTimer();
                setScreen("level");
              }}
            >
              레벨 선택으로
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;