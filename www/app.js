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
const endScreen = document.getElementById('end-screen');
const endTitle = document.getElementById('end-title');
const endMessage = document.getElementById('end-message');
const btnRestart = document.getElementById('btn-restart');

// --- SISTEMA DE AUDIO REFORZADO (NUEVO MOTOR SEGURO) ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const MELODY = [261.63, 293.66, 329.63, 349.23, 392.00, 349.23, 329.63, 293.66]; 
let noteIndex = 0;

function playBackgroundMusicTick() {
    // Si la partida terminó o el juego está en pausa, reintentamos en 450ms sin sonar
    if (lives <= 0 || boardCards.every(c => c.isCleared) || isPreviewing) {
        setTimeout(playBackgroundMusicTick, 450);
        return;
    }

    try {
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.type = 'triangle'; // Sonido suave tipo Nintendo
        osc.frequency.setValueAtTime(MELODY[noteIndex], audioCtx.currentTime);
        
        // Subimos un poco el volumen para asegurar que la oigas en los altavoces de la PC
        gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);

        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);

        // Avanzar a la siguiente nota de la melodía
        noteIndex = (noteIndex + 1) % MELODY.length;
    } catch (e) {
        console.log("Audio temporalmente en espera...");
    }

    // Volver a llamar de forma recursiva e infinita cada 450ms
    setTimeout(playBackgroundMusicTick, 450);
}

function startBackgroundMusic() {
    if (!musicStarted) {
        musicStarted = true;
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        playBackgroundMusicTick(); // Arranca el bucle forzado
    }
}

function playSound(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
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
    } else if (type === 'victory') {
        osc.type = 'square'; osc.frequency.setValueAtTime(523.25, ahora);
        osc.frequency.setValueAtTime(659.25, ahora + 0.1); osc.frequency.setValueAtTime(783.99, ahora + 0.2);
        osc.frequency.setValueAtTime(1046.50, ahora + 0.3);
        gain.gain.setValueAtTime(0.1, ahora); gain.gain.exponentialRampToValueAtTime(0.01, ahora + 0.6);
        osc.start(ahora); osc.stop(ahora + 0.6);
    } else if (type === 'gameover') {
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(120, ahora);
        osc.frequency.linearRampToValueAtTime(40, ahora + 0.5);
        gain.gain.setValueAtTime(0.2, ahora); gain.gain.exponentialRampToValueAtTime(0.01, ahora + 0.5);
        osc.start(ahora); osc.stop(ahora + 0.5);
    } else if (type === 'powerup') {
        osc.type = 'sine'; osc.frequency.setValueAtTime(300, ahora);
        osc.frequency.exponentialRampToValueAtTime(1200, ahora + 0.4);
        gain.gain.setValueAtTime(0.15, ahora); gain.gain.exponentialRampToValueAtTime(0.01, ahora + 0.4);
        osc.start(ahora); osc.stop(ahora + 0.4);
    }
}

// --- CALCULAR TIEMPO DE MEMORIA BASADO EN EL ACUMULADO ---
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

// --- INICIAR PARTIDA ---
function initGame() {
    score = 0; lives = 7; powersLeft = 3; perfectStreak = 0;
    selectedCards = []; isPreviewing = true; 
    
    scoreDisplay.textContent = score;
    livesDisplay.textContent = lives;
    powerDisplay.textContent = powersLeft;
    globalHighDisplay.textContent = GLOBAL_HIGH; 
    personalHighDisplay.textContent = personalHigh; 
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
        elements.forEach(el => el.classList.add('facedown'));
        isPreviewing = false; 
        
        // Intentar arrancar si ya se dio el primer clic antes
        if (musicStarted) startBackgroundMusic();
    }, timeToShow);
}

function renderBoard() {
    gameBoard.innerHTML = '';
    boardCards.forEach(card => {
        const cardElement = document.createElement('div');
        cardElement.classList.add('card');
        cardElement.textContent = card.shape;
        cardElement.dataset.id = card.id;
        
        if (card.isCleared) {
            cardElement.classList.add('hidden-card');
        } else {
            if (!isPreviewing) {
                cardElement.classList.add('facedown');
            }
            cardElement.addEventListener('click', () => handleCardClick(card, cardElement));
        }
        gameBoard.appendChild(cardElement);
    });
}

// --- MANEJADOR DE CLIC ACTIVA MÚSICA ---
function handleCardClick(card, element) {
    if (isPreviewing || selectedCards.length >= 2 || !element.classList.contains('facedown')) return;
    
    // Al hacer el primer clic del juego, forzamos la activación de la música
    startBackgroundMusic();

    playSound('select');
    element.classList.remove('facedown'); 
    selectedCards.push({ card, element });
    
    if (selectedCards.length === 2) {
        isPreviewing = true; 
        setTimeout(checkMatch, 500);
    }
}

function checkMatch() {
    const [first, second] = selectedCards;
    
    if (first.card.shape === second.card.shape) {
        first.card.isCleared = true;
        second.card.isCleared = true;
        first.element.classList.add('hidden-card');
        second.element.classList.add('hidden-card');
        
        score += 10;
        scoreDisplay.textContent = score;
        perfectStreak++; 
        
        if (perfectStreak === 3) {
            powersLeft++;
            powerDisplay.textContent = powersLeft;
            perfectStreak = 0; 
            playSound('powerup');
        } else {
            playSound('match');
        }
        
        checkGameOver();
    } else {
        first.element.classList.add('facedown');
        second.element.classList.add('facedown');
        
        lives--; 
        livesDisplay.textContent = lives;
        perfectStreak = 0; 
        
        playSound('error');
        checkGameOver();
    }
    
    selectedCards = [];
    if (lives > 0 && !boardCards.every(c => c.isCleared)) {
        isPreviewing = false; 
    }
}

// --- BOTONES DE ACCIÓN ---
btnPower.addEventListener('click', () => {
    if (powersLeft <= 0 || isPreviewing || lives <= 0) return;
    
    powersLeft--;
    powerDisplay.textContent = powersLeft;
    perfectStreak = 0; 
    isPreviewing = true;
    
    const elements = document.querySelectorAll('.card');
    elements.forEach(el => el.classList.remove('facedown'));
    playSound('powerup');

    setTimeout(() => {
        if (lives <= 0 || boardCards.every(c => c.isCleared)) return;
        elements.forEach(el => {
            if (!el.classList.contains('hidden-card')) el.classList.add('facedown');
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
    boardCards.forEach(card => {
        if (!card.isCleared) { card.shape = shapes[idx++]; }
    });
    
    perfectStreak = 0; 
    playSound('select');
    renderBoard();
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
                perfectStreak = 0; 
                playSound('select');
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
        personalHighDisplay.textContent = personalHigh;
        
        if (personalHigh >= GLOBAL_HIGH) {
            endTitle.textContent = "🏆 ¡RÉCORD MUNDIAL! 🏆";
            endMessage.textContent = `¡Felicidades DanielReal! Conquistaste la cima con ${personalHigh} pts totales.`;
        } else {
            endTitle.textContent = "¡VICTORIA TOTAL! 🎉";
            endMessage.textContent = `Sumaste +${score} pts. Llevas acumulados: ${personalHigh} / 2000 para el récord mundial.`;
        }
        
        endScreen.classList.remove('hidden');
        playSound('victory');
        
    } else if (lives <= 0) {
        const elements = document.querySelectorAll('.card');
        elements.forEach(el => el.classList.remove('facedown')); 
        
        endTitle.textContent = "GAME OVER 💀";
        endMessage.textContent = `Perdiste esta ronda. Tu acumulado sigue firme en: ${personalHigh} pts.`;
        endScreen.classList.remove('hidden');
        playSound('gameover');
    }
}

btnRestart.addEventListener('click', () => {
    initGame();
});

window.onload = () => {
    initGame();
    // Forzar activación del AudioContext global al primer clic en cualquier zona de la página
    document.body.addEventListener('click', () => {
        if (audioCtx.state === 'suspended') audioCtx.resume();
    }, { once: true });
};