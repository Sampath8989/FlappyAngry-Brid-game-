// Game variables
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('highScore');
const gameOverElement = document.getElementById('gameOver');
const instructionsElement = document.getElementById('instructions');

// Power-up UI elements
const shieldStatusElement = document.getElementById('shieldStatus');
const speedStatusElement = document.getElementById('speedStatus');
const slowStatusElement = document.getElementById('slowStatus');

// Character selection elements
const characterSelectElement = document.getElementById('characterSelect');

// Audio elements
const flapSound = document.getElementById('flapSound');
const crashSound = document.getElementById('crashSound');
const pigLaughSound = document.getElementById('pigLaughSound');

// Game state
let gameState = 'menu'; // 'menu', 'characterSelect', 'playing', 'gameOver'
let score = 0;
let highScore = parseInt(localStorage.getItem('flappyBirdHighScore')) || 0;
let gameSpeed = 2;
let backgroundX = 0;

// Bird characters
let selectedBirdType = 'red';
const birdTypes = {
    red: {
        name: 'Red Bird',
        color: '#FF4444',
        gravity: 0.1,
        flapStrength: -5,
        ability: 'Standard flight',
        description: 'Classic angry bird with balanced stats'
    },
    blue: {
        name: 'Blue Bird',
        color: '#4444FF',
        gravity: 0.1,
        flapStrength: -5,

        ability: 'Light weight',
        description: 'Slower fall, gentler flap for precise control'
    },
    yellow: {
        name: 'Yellow Bird',
        color: '#FFFF44',
        gravity: 0.1,
        flapStrength: -5,

        ability: 'Speed boost',
        description: 'Faster fall but powerful flap for quick movement'
    },
    black: {
        name: 'Black Bird',
        color: '#444444',
        gravity: 0.1,
        flapStrength: -5,

        ability: 'Explosive power',
        description: 'Standard stats with explosive particle effects'
    }
};

// Power-up effects
let shieldActive = false;
let shieldTime = 0;
let speedBoostActive = false;
let speedBoostTime = 0;
let slowMotionActive = false;
let slowMotionTime = 0;

// Images
const images = {};
const imageLoaded = {};

// Game objects
let bird = {};
let buildings = [];
let pigs = [];
let arrows = [];
let powerUps = [];
let particles = [];

// Game constants (will be overridden by bird type)
let GRAVITY = 2;
let FLAP_STRENGTH = -12;
const BUILDING_WIDTH = 80;
const BUILDING_GAP = 300;
const BUILDING_SPACING = 400;

// Initialize game
function init() {
    // Set canvas size
    resizeCanvas();
    
    // Load images
    loadImages();
    
    // Initialize bird
    resetBird();
    
    // Initialize game objects
    buildings = [];
    pigs = [];
    arrows = [];
    powerUps = [];
    particles = [];
    
    // Show high score
    highScoreElement.textContent = `High Score: ${highScore}`;
    
    // Show instructions
    instructionsElement.classList.remove('hidden');
    
    // Set initial game state
    gameState = 'menu';
    
    // Start game loop
    gameLoop();
}

function loadImages() {
    const imageUrls = {
        bird: 'assets/bird.png',
        pig: 'assets/pig.png',
        arrow: 'assets/arrow.png',
        bg: 'assets/bg.png'
    };
    
    Object.keys(imageUrls).forEach(key => {
        images[key] = new Image();
        imageLoaded[key] = false;
        
        images[key].onload = () => {
            imageLoaded[key] = true;
        };
        
        images[key].onerror = () => {
            console.log(`Failed to load ${key} image, using fallback`);
            imageLoaded[key] = true; // Allow game to continue
        };
        
        images[key].src = imageUrls[key];
    });
}

function resizeCanvas() {
    const container = document.querySelector('.game-container');
    const containerRect = container.getBoundingClientRect();
    
    // Calculate canvas size maintaining aspect ratio
    const aspectRatio = 600 / 800;
    let newWidth = Math.min(containerRect.width, 600);
    let newHeight = Math.min(containerRect.height, 800);
    
    if (newWidth / newHeight > aspectRatio) {
        newWidth = newHeight * aspectRatio;
    } else {
        newHeight = newWidth / aspectRatio;
    }
    
    canvas.style.width = newWidth + 'px';
    canvas.style.height = newHeight + 'px';
}

function resetBird() {
    bird = {
        x: 150,
        y: canvas.height / 2,
        width: 50,
        height: 50,
        velocity: 0,
        rotation: 0
    };
}

function startGame() {
    gameState = 'playing';
    score = 0;
    gameSpeed = 2;
    backgroundX = 0;
    
    // Apply selected bird stats
    const selectedBird = birdTypes[selectedBirdType];
    GRAVITY = selectedBird.gravity;
    FLAP_STRENGTH = selectedBird.flapStrength;
    
    // Reset power-ups
    shieldActive = false;
    speedBoostActive = false;
    slowMotionActive = false;
    shieldStatusElement.classList.add('hidden');
    speedStatusElement.classList.add('hidden');
    slowStatusElement.classList.add('hidden');
    
    resetBird();
    buildings = [];
    pigs = [];
    arrows = [];
    powerUps = [];
    particles = [];
    
    // Generate initial buildings
    for (let i = 0; i < 3; i++) {
        generateBuilding(canvas.width + i * BUILDING_SPACING);
    }
    
    // Hide UI elements
    gameOverElement.classList.add('hidden');
    instructionsElement.classList.add('hidden');
    characterSelectElement.classList.add('hidden');
    
    updateScore();
}

function generateBuilding(x) {
    const minHeight = 100;
    const maxHeight = canvas.height - BUILDING_GAP - minHeight;
    const topHeight = Math.random() * (maxHeight - minHeight) + minHeight;
    const bottomHeight = canvas.height - topHeight - BUILDING_GAP;
    
    const building = {
        x: x,
        topHeight: topHeight,
        bottomHeight: bottomHeight,
        width: BUILDING_WIDTH,
        passed: false
    };
    
    buildings.push(building);
    
    // Add pig on top building with 70% chance
    if (Math.random() < 0.7) {
        pigs.push({
            x: x + BUILDING_WIDTH / 2,
            y: topHeight - 40,
            width: 30,
            height: 30,
            lastShot: 0,
            shootInterval: 2000 + Math.random() * 3000 // Random interval between 2-5 seconds
        });
    }
    
    // Add power-up with 30% chance
    if (Math.random() < 0.3) {
        const powerUpTypes = ['shield', 'speed', 'slow'];
        const randomType = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
        
        powerUps.push({
            x: x + BUILDING_WIDTH + 50,
            y: topHeight + BUILDING_GAP / 2,
            width: 25,
            height: 25,
            type: randomType,
            collected: false
        });
    }
}

function selectBird(birdType) {
    selectedBirdType = birdType;
    
    // Update selected visual state
    const birdOptions = document.querySelectorAll('.bird-option');
    birdOptions.forEach(option => {
        option.classList.remove('selected');
        if (option.dataset.bird === birdType) {
            option.classList.add('selected');
        }
    });
    
    // Update game constants
    const bird = birdTypes[birdType];
    GRAVITY = bird.gravity;
    FLAP_STRENGTH = bird.flapStrength;
    
    // Save selection
    localStorage.setItem('selectedBirdType', birdType);
}

function showCharacterSelect() {
    gameState = 'characterSelect';
    characterSelectElement.classList.remove('hidden');
    instructionsElement.classList.add('hidden');
    gameOverElement.classList.add('hidden');
    
    // Load saved selection or default to red
    const savedBird = localStorage.getItem('selectedBirdType') || 'red';
    selectBird(savedBird);
}

function hideCharacterSelect() {
    characterSelectElement.classList.add('hidden');
}

function flap() {
    if (gameState === 'menu') {
        startGame();
        return;
    }
    
    if (gameState === 'characterSelect') {
        hideCharacterSelect();
        startGame();
        return;
    }
    
    if (gameState === 'gameOver') {
        startGame();
        return;
    }
    
    if (gameState === 'playing') {
        bird.velocity = FLAP_STRENGTH;
        playSound(flapSound);
    }
}

function playSound(audio) {
    try {
        audio.currentTime = 0;
        audio.play().catch(e => {
            console.log('Audio play failed:', e);
        });
    } catch (e) {
        console.log('Audio error:', e);
    }
}

function updateBird() {
    if (gameState !== 'playing') return;
    
    // Update power-up timers
    updatePowerUpEffects();
    
    // Apply gravity (reduced if slow motion is active)
    const currentGravity = slowMotionActive ? GRAVITY * 0.5 : GRAVITY;
    bird.velocity += currentGravity;
    bird.y += bird.velocity;
    
    // Update rotation based on velocity
    bird.rotation = Math.max(-30, Math.min(30, bird.velocity * 3));
    
    // Check boundaries (ignore if shield is active)
    if (!shieldActive && (bird.y < 0 || bird.y + bird.height > canvas.height)) {
        // Create crash particles
        createParticles(bird.x + bird.width / 2, bird.y + bird.height / 2, '#FF4444', 10);
        gameOver();
    }
}

function updatePowerUpEffects() {
    const currentTime = Date.now();
    
    // Update shield effect
    if (shieldActive && currentTime - shieldTime > 5000) {
        shieldActive = false;
        shieldStatusElement.classList.add('hidden');
    }
    
    // Update speed boost effect
    if (speedBoostActive && currentTime - speedBoostTime > 3000) {
        speedBoostActive = false;
        speedStatusElement.classList.add('hidden');
    }
    
    // Update slow motion effect
    if (slowMotionActive && currentTime - slowMotionTime > 4000) {
        slowMotionActive = false;
        slowStatusElement.classList.add('hidden');
    }
}

function createParticles(x, y, color, count = 5) {
    // Black bird creates more explosive particles
    const particleCount = selectedBirdType === 'black' ? count * 2 : count;
    
    for (let i = 0; i < particleCount; i++) {
        particles.push({
            x: x,
            y: y,
            velocityX: (Math.random() - 0.5) * 6,
            velocityY: (Math.random() - 0.5) * 6,
            size: Math.random() * 4 + 2,
            color: color,
            life: 1.0,
            decay: 0.02 + Math.random() * 0.02
        });
    }
}

function updateParticles() {
    // Prevent excessive particle buildup during intense sequences
    if (particles.length > 100) {
        particles.splice(0, particles.length - 100);
    }
    
    for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        
        // Update position
        particle.x += particle.velocityX;
        particle.y += particle.velocityY;
        
        // Apply gravity to particles
        particle.velocityY += 0.1;
        
        // Fade out
        particle.life -= particle.decay;
        
        // Remove dead particles
        if (particle.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

function drawParticles() {
    for (const particle of particles) {
        ctx.save();
        ctx.globalAlpha = particle.life;
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

function activatePowerUp(type) {
    const currentTime = Date.now();
    
    // Create power-up pickup particles
    const powerUpX = bird.x + bird.width / 2;
    const powerUpY = bird.y + bird.height / 2;
    
    switch (type) {
        case 'shield':
            shieldActive = true;
            shieldTime = currentTime;
            shieldStatusElement.classList.remove('hidden');
            createParticles(powerUpX, powerUpY, '#00BFFF', 8);
            score += 10;
            break;
        case 'speed':
            speedBoostActive = true;
            speedBoostTime = currentTime;
            speedStatusElement.classList.remove('hidden');
            createParticles(powerUpX, powerUpY, '#32CD32', 8);
            score += 5;
            break;
        case 'slow':
            slowMotionActive = true;
            slowMotionTime = currentTime;
            slowStatusElement.classList.remove('hidden');
            createParticles(powerUpX, powerUpY, '#FF6347', 8);
            score += 5;
            break;
    }
    
    updateScore();
    playSound(flapSound); // Use flap sound for power-up pickup
}

function updateBuildings() {
    if (gameState !== 'playing') return;
    
    // Calculate current game speed with effects
    const currentSpeed = speedBoostActive ? gameSpeed * 1.5 : gameSpeed;
    const adjustedSpeed = slowMotionActive ? currentSpeed * 0.5 : currentSpeed;
    
    for (let i = buildings.length - 1; i >= 0; i--) {
        const building = buildings[i];
        building.x -= adjustedSpeed;
        
        // Check if bird passed building
        if (!building.passed && bird.x > building.x + building.width) {
            building.passed = true;
            score++;
            updateScore();
            
            // Increase game speed slightly
            gameSpeed += 0.02;
        }
        
        // Remove buildings that are off screen
        if (building.x + building.width < 0) {
            buildings.splice(i, 1);
        }
    }
    
    // Generate new buildings
    if (buildings.length > 0 && buildings[buildings.length - 1].x < canvas.width - BUILDING_SPACING) {
        generateBuilding(buildings[buildings.length - 1].x + BUILDING_SPACING);
    }
}

function updatePigs() {
    if (gameState !== 'playing') return;
    
    const currentTime = Date.now();
    const currentSpeed = speedBoostActive ? gameSpeed * 1.5 : gameSpeed;
    const adjustedSpeed = slowMotionActive ? currentSpeed * 0.5 : currentSpeed;
    
    for (let i = pigs.length - 1; i >= 0; i--) {
        const pig = pigs[i];
        pig.x -= adjustedSpeed;
        
        // Check if pig should shoot
        if (currentTime - pig.lastShot > pig.shootInterval && pig.x > 0 && pig.x < canvas.width) {
            shootArrow(pig);
            pig.lastShot = currentTime;
        }
        
        // Remove pigs that are off screen
        if (pig.x < -pig.width) {
            pigs.splice(i, 1);
        }
    }
}

function shootArrow(pig) {
    const dx = bird.x - pig.x;
    const dy = bird.y - pig.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Base arrow speed adjusted for current game state
    const baseSpeed = 5;
    const currentSpeed = speedBoostActive ? baseSpeed * 1.5 : baseSpeed;
    const adjustedSpeed = slowMotionActive ? currentSpeed * 0.5 : currentSpeed;
    
    arrows.push({
        x: pig.x,
        y: pig.y,
        width: 20,
        height: 5,
        velocityX: (dx / distance) * adjustedSpeed,
        velocityY: (dy / distance) * adjustedSpeed,
        rotation: Math.atan2(dy, dx)
    });
    
    playSound(pigLaughSound);
}

function updateArrows() {
    if (gameState !== 'playing') return;
    
    for (let i = arrows.length - 1; i >= 0; i--) {
        const arrow = arrows[i];
        arrow.x += arrow.velocityX;
        arrow.y += arrow.velocityY;
        
        // Remove arrows that are off screen
        if (arrow.x < 0 || arrow.x > canvas.width || arrow.y < 0 || arrow.y > canvas.height) {
            arrows.splice(i, 1);
        }
    }
}

function updatePowerUps() {
    if (gameState !== 'playing') return;
    
    const currentSpeed = speedBoostActive ? gameSpeed * 1.5 : gameSpeed;
    const adjustedSpeed = slowMotionActive ? currentSpeed * 0.5 : currentSpeed;
    
    for (let i = powerUps.length - 1; i >= 0; i--) {
        const powerUp = powerUps[i];
        powerUp.x -= adjustedSpeed;
        
        // Remove power-ups that are off screen
        if (powerUp.x + powerUp.width < 0) {
            powerUps.splice(i, 1);
        }
    }
}

function checkCollisions() {
    if (gameState !== 'playing') return;
    
    // Check building collisions (ignore if shield is active)
    if (!shieldActive) {
        for (const building of buildings) {
            if (bird.x + bird.width > building.x && 
                bird.x < building.x + building.width) {
                if (bird.y < building.topHeight || 
                    bird.y + bird.height > canvas.height - building.bottomHeight) {
                    // Create crash particles
                    createParticles(bird.x + bird.width / 2, bird.y + bird.height / 2, '#FF4444', 10);
                    gameOver();
                    return;
                }
            }
        }
    }
    
    // Check arrow collisions
    for (let i = arrows.length - 1; i >= 0; i--) {
        const arrow = arrows[i];
        if (bird.x + bird.width > arrow.x && 
            bird.x < arrow.x + arrow.width &&
            bird.y + bird.height > arrow.y && 
            bird.y < arrow.y + arrow.height) {
            if (shieldActive) {
                // Shield deflects arrow - remove it and create particles
                createParticles(arrow.x + arrow.width / 2, arrow.y + arrow.height / 2, '#00BFFF', 6);
                arrows.splice(i, 1);
            } else {
                // Normal collision - create crash particles and game over
                createParticles(bird.x + bird.width / 2, bird.y + bird.height / 2, '#FF4444', 10);
                arrows.splice(i, 1);
                gameOver();
                return;
            }
        }
    }
    
    // Check power-up collisions
    for (let i = powerUps.length - 1; i >= 0; i--) {
        const powerUp = powerUps[i];
        if (!powerUp.collected &&
            bird.x + bird.width > powerUp.x && 
            bird.x < powerUp.x + powerUp.width &&
            bird.y + bird.height > powerUp.y && 
            bird.y < powerUp.y + powerUp.height) {
            powerUp.collected = true;
            powerUps.splice(i, 1);
            activatePowerUp(powerUp.type);
        }
    }
}

function gameOver() {
    gameState = 'gameOver';
    playSound(crashSound);
    
    // Update high score
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('flappyBirdHighScore', highScore.toString());
        highScoreElement.textContent = `High Score: ${highScore}`;
    }
    
    gameOverElement.classList.remove('hidden');
}

function updateScore() {
    scoreElement.textContent = `Score: ${score}`;
}

function drawBackground() {
    // Scrolling background with speed modifiers
    const currentSpeed = speedBoostActive ? gameSpeed * 1.5 : gameSpeed;
    const adjustedSpeed = slowMotionActive ? currentSpeed * 0.5 : currentSpeed;
    backgroundX -= adjustedSpeed * 0.5;
    if (backgroundX <= -canvas.width) {
        backgroundX = 0;
    }
    
    // Draw sky gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#98FB98');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw background image if loaded
    if (imageLoaded.bg) {
        ctx.drawImage(images.bg, backgroundX, 0, canvas.width, canvas.height);
        ctx.drawImage(images.bg, backgroundX + canvas.width, 0, canvas.width, canvas.height);
    } else {
        // Draw simple clouds as fallback
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        for (let i = 0; i < 5; i++) {
            const x = (backgroundX + i * 150) % (canvas.width + 100);
            const y = 50 + i * 30;
            ctx.beginPath();
            ctx.arc(x, y, 30, 0, Math.PI * 2);
            ctx.arc(x + 25, y, 35, 0, Math.PI * 2);
            ctx.arc(x + 50, y, 30, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

function drawBird() {
    ctx.save();
    
    // Move to bird center for rotation
    ctx.translate(bird.x + bird.width / 2, bird.y + bird.height / 2);
    ctx.rotate(bird.rotation * Math.PI / 180);
    
    // Draw shield effect if active
    if (shieldActive) {
        ctx.strokeStyle = '#00BFFF';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, bird.width / 2 + 8, 0, Math.PI * 2);
        ctx.stroke();
        
        // Pulsing effect
        const shieldPulse = Math.sin(Date.now() * 0.01) * 0.3 + 0.7;
        ctx.strokeStyle = `rgba(0, 191, 255, ${shieldPulse})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, bird.width / 2 + 12, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    if (imageLoaded.bird) {
        ctx.drawImage(images.bird, -bird.width / 2, -bird.height / 2, bird.width, bird.height);
    } else {
        // Draw bird with selected color
        const selectedBird = birdTypes[selectedBirdType];
        ctx.fillStyle = selectedBird.color;
        ctx.beginPath();
        ctx.arc(0, 0, bird.width / 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Add beak
        ctx.fillStyle = '#FFA500';
        ctx.beginPath();
        ctx.moveTo(bird.width / 2, 0);
        ctx.lineTo(bird.width / 2 + 15, -5);
        ctx.lineTo(bird.width / 2 + 15, 5);
        ctx.closePath();
        ctx.fill();
        
        // Add eye
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(-5, -5, 8, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(-3, -5, 4, 0, Math.PI * 2);
        ctx.fill();
    }
    
    ctx.restore();
}

function drawBuildings() {
    ctx.fillStyle = '#8B4513';
    
    for (const building of buildings) {
        // Draw top building
        ctx.fillRect(building.x, 0, building.width, building.topHeight);
        
        // Draw bottom building
        ctx.fillRect(building.x, canvas.height - building.bottomHeight, building.width, building.bottomHeight);
        
        // Add building details
        ctx.fillStyle = '#654321';
        for (let i = 0; i < building.topHeight; i += 40) {
            ctx.fillRect(building.x + 10, i + 10, building.width - 20, 20);
        }
        for (let i = 0; i < building.bottomHeight; i += 40) {
            ctx.fillRect(building.x + 10, canvas.height - building.bottomHeight + i + 10, building.width - 20, 20);
        }
        ctx.fillStyle = '#8B4513';
    }
}

function drawPigs() {
    for (const pig of pigs) {
        if (imageLoaded.pig) {
            ctx.drawImage(images.pig, pig.x - pig.width / 2, pig.y - pig.height / 2, pig.width, pig.height);
        } else {
            // Draw simple green circle as fallback
            ctx.fillStyle = '#90EE90';
            ctx.beginPath();
            ctx.arc(pig.x, pig.y, pig.width / 2, 0, Math.PI * 2);
            ctx.fill();
            
            // Add snout
            ctx.fillStyle = '#FFB6C1';
            ctx.beginPath();
            ctx.arc(pig.x, pig.y + 5, 5, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

function drawArrows() {
    for (const arrow of arrows) {
        ctx.save();
        ctx.translate(arrow.x + arrow.width / 2, arrow.y + arrow.height / 2);
        ctx.rotate(arrow.rotation);
        
        if (imageLoaded.arrow) {
            ctx.drawImage(images.arrow, -arrow.width / 2, -arrow.height / 2, arrow.width, arrow.height);
        } else {
            // Draw simple arrow as fallback
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(-arrow.width / 2, -arrow.height / 2, arrow.width, arrow.height);
            
            // Arrow tip
            ctx.fillStyle = '#555';
            ctx.beginPath();
            ctx.moveTo(arrow.width / 2, 0);
            ctx.lineTo(arrow.width / 2 - 5, -arrow.height / 2);
            ctx.lineTo(arrow.width / 2 - 5, arrow.height / 2);
            ctx.closePath();
            ctx.fill();
        }
        
        ctx.restore();
    }
}

function drawPowerUps() {
    for (const powerUp of powerUps) {
        if (!powerUp.collected) {
            // Draw pulsing effect
            const pulse = Math.sin(Date.now() * 0.01) * 0.1 + 1;
            const size = powerUp.width * pulse;
            
            // Different colors for different power-up types
            let fillColor, strokeColor, symbol;
            switch (powerUp.type) {
                case 'shield':
                    fillColor = '#00BFFF';
                    strokeColor = '#0080FF';
                    symbol = 'S';
                    break;
                case 'speed':
                    fillColor = '#32CD32';
                    strokeColor = '#228B22';
                    symbol = '>';
                    break;
                case 'slow':
                    fillColor = '#FF6347';
                    strokeColor = '#FF4500';
                    symbol = '<';
                    break;
                default:
                    fillColor = '#FFD700';
                    strokeColor = '#FFA500';
                    symbol = '?';
            }
            
            ctx.fillStyle = fillColor;
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = 2;
            
            // Draw power-up square
            ctx.fillRect(powerUp.x + powerUp.width / 2 - size / 2, 
                        powerUp.y + powerUp.height / 2 - size / 2, 
                        size, size);
            ctx.strokeRect(powerUp.x + powerUp.width / 2 - size / 2, 
                          powerUp.y + powerUp.height / 2 - size / 2, 
                          size, size);
            
            // Draw symbol
            ctx.fillStyle = 'white';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(symbol, powerUp.x + powerUp.width / 2, powerUp.y + powerUp.height / 2 + 5);
        }
    }
}

function render() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw game elements
    drawBackground();
    drawBuildings();
    drawPigs();
    drawArrows();
    drawPowerUps();
    drawParticles();
    drawBird();
}

function gameLoop() {
    if (gameState === 'playing') {
        updateBird();
        updateBuildings();
        updatePigs();
        updateArrows();
        updatePowerUps();
        checkCollisions();
    }
    
    // Always update particles regardless of game state for crash effects
    updateParticles();
    
    render();
    requestAnimationFrame(gameLoop);
}

// Event listeners
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        flap();
    }
    if (e.code === 'KeyC' && (gameState === 'menu' || gameState === 'gameOver')) {
        e.preventDefault();
        showCharacterSelect();
    }
});

// Character selection click handlers
document.addEventListener('DOMContentLoaded', () => {
    const birdOptions = document.querySelectorAll('.bird-option');
    birdOptions.forEach(option => {
        option.addEventListener('click', () => {
            selectBird(option.dataset.bird);
        });
    });
});

canvas.addEventListener('click', flap);
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    flap();
});

window.addEventListener('resize', resizeCanvas);

// Start the game
init();
