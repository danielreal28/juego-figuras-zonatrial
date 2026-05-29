// --- CONFIGURACIÓN DEL JUEGO ---
const SHAPES = ['🎵', '🕹️', '👽', '🦖', '🚀', '💎', '🔥', '👑'];
let boardCards = [];
let selectedCards = [];
let score = 0; 
let lives = 7;           
let powersLeft = 3;      
let perfectStreak = 0;   
let isPreviewing = false; 
let musicStarted = false; 

// --- SISTEMA DE RÉCORDS ACUMULATIVOS ---
const GLOBAL_HIGH = 2000; 
let personalHigh = parseInt(localStorage.getItem('personalHigh')) || 0;

// --- ELEMENTOS DEL DOM ---
const startScreen = document.getElementById('start-screen');
const mainGameContainer = document.getElementById('main-game-container');
const menuGlobalHigh = document.getElementById('menu-global-high');
const menuPersonalHigh = document.getElementById('menu-personal-high');

const gameBoard = document.getElementById('game-board');
const scoreDisplay = document.getElementById('score');
const livesDisplay = document.getElementById('lives');
const powerDisplay = document.getElementById('power-count');
const globalHighDisplay = document.getElementById('global-high');
const personalHighDisplay = document.getElementById('personal-high');
const diffAlert = document.getElementById('difficulty-alert');

const btnShuffle = document.getElementById('btn-shuffle');
const btnHint = document.getElementById('btn-hint');
const btnPower = document.getElementById('btn-power');
const btnContinue = document.getElementById('btn-continue');
const btnNewGame = document.getElementById('btn-new-game');

const endScreen = document.getElementById('end-screen');
const endTitle = document.getElementById('end-title');
const endMessage = document.getElementById('end-message');
const btnRestart = document.getElementById('btn-restart');

// --- SISTEMA DE AUDIO OPTIMIZADO PARA NATIVO/CAPACITOR ---
let audioCtx = null;
const MELODY = [261.63, 293.66, 329.63, 349.23, 392.00, 349.23, 329.63, 293.66]; 
let noteIndex = 0;

function initAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function playBackgroundMusicTick() {
    if (lives <= 0 || boardCards.every(c => c.isCleared) || isPreviewing) {
        setTimeout(playBackgroundMusicTick, 450);
        return;
    }
    try {
        initAudioContext();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.type = 'triangle'; 
        osc.frequency.setValueAtTime(MELODY[noteIndex], audioCtx.currentTime);
        gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
        osc.start(); osc.stop(audioCtx.currentTime + 0.4);
        noteIndex = (noteIndex + 1) % MELODY.length;
    } catch (e) {}
    setTimeout(playBackgroundMusicTick, 450);
}

function startBackgroundMusic() {
    if (!musicStarted) {
        musicStarted = true;
        initAudioContext();
        playBackgroundMusicTick(); 
    }
}

function playSound(type) {
    initAudioContext();
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    const ahora = audioCtx.currentTime;

    if (type === 'select') {
        osc.type = 'sine'; osc.frequency.setValueAtTime(400, ahora); 
        gain.gain.setValueAtTime(0.1, ahora); gain.gain.exponentialRampToValueAtTime(0.01, ahora + 0.05);
        osc.start(ahora); osc.stop(ahora + 0.05);
    } else if (type === 'match') {
        osc.type = 'triangle'; osc.frequency.setValueAtTime(523.25, ahora);
        osc.frequency.setValueAtTime(659.25, ahora + 0.08); osc.frequency.setValueAtTime(783.99, ahora + 0.16);
        gain.gain.setValueAtTime(0.15, ahora); gain.gain.exponentialRampToValueAtTime(0.01, ahora + 0.3);
        osc.start(ahora); osc.stop(ahora + 0.3);
    } else if (type === 'error') {
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(150, ahora);
        osc.frequency.linearRampToValueAtTime(80, ahora + 0.2);
        gain.gain.setValueAtTime(0.12, ahora); gain.gain.exponentialRampToValueAtTime(0.01, ahora + 0.2);
        osc.start(ahora); osc.stop(ahora + 0.2);
    }
}

// --- CALCULAR TIEMPO DE MEMORIA SEGÚN PUNTOS ---
function getMemorizeTime() {
    if (personalHigh < 300) {
        diffAlert.textContent = "Nivel Inicial: 3s de memoria";
        diffAlert.style.background = "#2e1c3e";
        return 3000;
    } else if (personalHigh >= 300 && personalHigh < 1000) {
        diffAlert.textContent = "Nivel Medio 🔥: 2s de memoria";
        diffAlert.style.background = "#e65100";
        return 2000;
    } else {
        diffAlert.textContent = "Nivel Leyenda 💀: ¡1s de memoria!";
        diffAlert.style.background = "#b71c1c";
        return 1000;
    }
}

// --- CONTROL DEL MENÚ PRINCIPAL ---
function showMainMenu() {
    personalHigh = parseInt(localStorage.getItem('personalHigh')) || 0;
    menuGlobalHigh.textContent = GLOBAL_HIGH;
    menuPersonalHigh.textContent = personalHigh;
    
    if (personalHigh === 0) {
        btnContinue.style.opacity = "0.5";
        btnContinue.style.pointerEvents = "none";
    } else {
        btnContinue.style.opacity = "1";
        btnContinue.style.pointerEvents = "auto";
    }

    startScreen.classList.remove('hidden');
    mainGameContainer.classList.add('hidden');
    endScreen.classList.add('hidden');
}

// --- ARRANCAR EL JUEGO ---
function initGame() {
    score = 0; lives = 7; powersLeft = 3; perfectStreak = 0;
    selectedCards = []; isPreviewing = true; 
    
    scoreDisplay.textContent = score;
    livesDisplay.textContent = lives;
    powerDisplay.textContent = powersLeft;
    globalHighDisplay.textContent = GLOBAL_HIGH; 
    personalHighDisplay.textContent = personalHigh; 
    
    startScreen.classList.add('hidden');
    mainGameContainer.classList.remove('hidden');
    endScreen.classList.add('hidden');
    
    let deck = [...SHAPES, ...SHAPES];
    deck.sort(() => Math.random() - 0.5);
    
    boardCards = deck.map((shape, index) => ({
        id: index, shape: shape, isCleared: false
    }));
    
    renderBoard();
    let timeToShow = getMemorizeTime();
    
    setTimeout(() => {
        const elements = document.querySelectorAll('.card');
        elements.forEach(el => {
            if (!el.classList.contains('hidden-card')) {
                el.classList.add('facedown');
                el.textContent = 'zonatrialapp'; // Al taparse vuelve tu texto
            }
        });
        isPreviewing = false; 
        if (musicStarted) startBackgroundMusic();
    }, timeToShow);
}

function renderBoard() {
    gameBoard.innerHTML = '';
    boardCards.forEach(card => {
        const cardElement = document.createElement('div');
        cardElement.classList.add('card');
        cardElement.dataset.id = card.id;
        
        if (card.isCleared) {
            cardElement.classList.add('hidden-card');
        } else {
            if (!isPreviewing) {
                cardElement.classList.add('facedown');
                cardElement.textContent = 'zonatrialapp'; // Muestra tu marca de agua
            } else {
                cardElement.textContent = card.shape; // Muestra figura en previsualización
            }
            cardElement.addEventListener('click', () => handleCardClick(card, cardElement));
        }
        gameBoard.appendChild(cardElement);
    });
}

function handleCardClick(card, element) {
    if (isPreviewing || selectedCards.length >= 2 || !element.classList.contains('facedown')) return;
    startBackgroundMusic();
    playSound('select');
    element.classList.remove('facedown'); 
    element.textContent = card.shape; // Quita la marca de agua y muestra el emoji
    selectedCards.push({ card, element });
    if (selectedCards.length === 2) {
        isPreviewing = true; 
        setTimeout(checkMatch, 500);
    }
}

function checkMatch() {
    const [first, second] = selectedCards;
    if (first.card.shape === second.card.shape) {
        first.card.isCleared = true; second.card.isCleared = true;
        first.element.classList.add('hidden-card'); second.element.classList.add('hidden-card');
        score += 10; scoreDisplay.textContent = score; perfectStreak++; 
        if (perfectStreak === 3) {
            powersLeft++; powerDisplay.textContent = powersLeft;
            perfectStreak = 0;
        } else { playSound('match'); }
        checkGameOver();
    } else {
        first.element.classList.add('facedown'); second.element.classList.add('facedown');
        first.element.textContent = 'zonatrialapp'; // Regresa tu marca de agua si falla
        second.element.textContent = 'zonatrialapp';
        lives--; livesDisplay.textContent = lives; perfectStreak = 0; 
        playSound('error'); checkGameOver();
    }
    selectedCards = [];
    if (lives > 0 && !boardCards.every(c => c.isCleared)) isPreviewing = false; 
}

// --- ASIGNACIÓN DE BOTONES DEL MENÚ ---
btnContinue.addEventListener('click', () => {
    initAudioContext();
    initGame();
});

btnNewGame.addEventListener('click', () => {
    initAudioContext();
    personalHigh = 0;
    localStorage.setItem('personalHigh', 0);
    initGame();
});

// --- BOTONES DE PODERES ---
btnPower.addEventListener('click', () => {
    if (powersLeft <= 0 || isPreviewing || lives <= 0) return;
    powersLeft--; powerDisplay.textContent = powersLeft; perfectStreak = 0; isPreviewing = true;
    const elements = document.querySelectorAll('.card');
    elements.forEach(el => {
        if (!el.classList.contains('hidden-card')) {
            el.classList.remove('facedown');
            let id = parseInt(el.dataset.id);
            let c = boardCards.find(item => item.id === id);
            if (c) el.textContent = c.shape; // Revela figuras temporalmente
        }
    });
    setTimeout(() => {
        if (lives <= 0 || boardCards.every(c => c.isCleared)) return;
        elements.forEach(el => { 
            if (!el.classList.contains('hidden-card')) {
                el.classList.add('facedown');
                el.textContent = 'zonatrialapp'; // Regresa la marca de agua
            }
        });
        isPreviewing = false;
    }, 1200);
});

btnShuffle.addEventListener('click', () => {
    if (isPreviewing || lives <= 0) return;
    let active = boardCards.filter(c => !c.isCleared);
    let shapes = active.map(c => c.shape);
    shapes.sort(() => Math.random() - 0.5);
    let idx = 0;
    boardCards.forEach(card => { if (!card.isCleared) card.shape = shapes[idx++]; });
    perfectStreak = 0; renderBoard();
});

btnHint.addEventListener('click', () => {
    if (isPreviewing || lives <= 0) return;
    let active = boardCards.filter(c => !c.isCleared);
    for (let i = 0; i < active.length; i++) {
        for (let j = i + 1; j < active.length; j++) {
            if (active[i].shape === active[j].shape) {
                const elements = document.querySelectorAll('.card');
                elements.forEach(el => {
                    let id = parseInt(el.dataset.id);
                    if (id === active[i].id || id === active[j].id) {
                        el.style.borderColor = '#00bcd4';
                        setTimeout(() => el.style.borderColor = '', 800);
                    }
                });
                return;
            }
        }
    }
});

function checkGameOver() {
    const won = boardCards.every(card => card.isCleared);
    if (won) {
        personalHigh += score;
        localStorage.setItem('personalHigh', personalHigh);
        if (personalHigh >= GLOBAL_HIGH) {
            endTitle.textContent = "🏆 ¡RÉCORD MUNDIAL! 🏆";
            endMessage.textContent = `¡Felicidades DanielReal! Conquistaste la cima con ${personalHigh} pts totales.`;
        } else {
            endTitle.textContent = "¡VICTORIA TOTAL! 🎉";
            endMessage.textContent = `Sumaste +${score} pts. Llevas acumulados: ${personalHigh} / 2000.`;
        }
        endScreen.classList.remove('hidden');
    } else if (lives <= 0) {
        endTitle.textContent = "GAME OVER 💀";
        endMessage.textContent = `Perdiste esta ronda. Tu acumulado sigue firme en: ${personalHigh} pts.`;
        endScreen.classList.remove('hidden');
    }
}

btnRestart.addEventListener('click', () => {
    showMainMenu(); 
});

window.onload = () => {
    showMainMenu(); 
    document.body.addEventListener('click', () => {
        initAudioContext();
    }, { once: true });
};
