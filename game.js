// Main game class
class Game {
    constructor() {
        this.version = "v0.8.5"; // Increment this when making changes (DO NOT DELETE THIS LINE)
        this.debugLog = [];      // Store debug messages
        this.maxDebugLines = 5;  // Number of debug lines to show

        // Add debug helper method
        this.debug = (message) => {
            console.log(message);
            this.debugLog.unshift(new Date().toLocaleTimeString() + ': ' + message);
            if (this.debugLog.length > this.maxDebugLines) {
                this.debugLog.pop();
            }
        };

        this.canvas = document.querySelector('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.gameState = 'start'; // house, story, defend, start
        this.coins = 1000;
        this.hearts = 15;
        this.weapons = [];
        this.selectedWeapon = null;
        this.gamepadConnected = false;

        // Double the canvas size
        this.canvas.width = 1600;  // Was 800
        this.canvas.height = 1200; // Was 600

        // Update sprite configuration for larger sprites
        this.spriteConfig = {
            width: 32,    // Double the base sprite size
            height: 32,
            scale: 4      // Increase scale for larger sprites
        };

        // Load player sprite
        this.playerSprite = new Image();
        this.playerSprite.src = './sprites/player.png';  // Green character sprite

        const groundHeight = 200;  // Define ground height as a class property
        this.groundHeight = groundHeight;

        // Update player position to be on the ground
        this.player = {
            x: 200,
            y: this.canvas.height - groundHeight - (32 * 4),  // groundHeight + sprite height * scale
            width: this.spriteConfig.width * this.spriteConfig.scale,
            height: this.spriteConfig.height * this.spriteConfig.scale,
            speed: 10,
            direction: 'right',
            hasWeapon: false
        };

        // Update house dimensions and position
        this.house = {
            x: 0,
            y: this.canvas.height - 400,  // Adjust height
            width: 300,                   // Wider house
            height: 400                   // Taller house
        };

        this.weaponShop = {
            minigun: { name: 'Minigun', price: 100, damage: 20 },
            bat: { name: 'Bat', price: 50, damage: 8 },
            laserGun: { name: 'Laser Gun', price: 10, damage: 1 },
            rpg: { name: 'RPG', price: 1000, damage: 42 },
            pistol: { name: 'Pistol', price: 100, damage: 2 },
            sniper3000: { name: 'Sniper3000', price: 0, damage: 100, secret: true }
        };

        // Add new properties for defend mode
        this.currentWave = 0;
        this.enemies = [];
        this.waveInProgress = false;
        this.totalWaves = 9;
        
        // Wave configurations
        this.waveConfigs = [
            { zombie: 3, skeleton: 0, snake: 0, monster: 0, vampire: 0 },
            { zombie: 3, skeleton: 2, snake: 0, monster: 0, vampire: 0 },
            { zombie: 4, skeleton: 2, snake: 1, monster: 0, vampire: 0 },
            { zombie: 4, skeleton: 3, snake: 2, monster: 1, vampire: 0 },
            { zombie: 5, skeleton: 3, snake: 2, monster: 1, vampire: 1 },
            { zombie: 5, skeleton: 4, snake: 3, monster: 2, vampire: 1 },
            { zombie: 6, skeleton: 4, snake: 3, monster: 2, vampire: 2 },
            { zombie: 6, skeleton: 5, snake: 4, monster: 3, vampire: 2 },
            { zombie: 7, skeleton: 5, snake: 4, monster: 3, vampire: 3 }
        ];

        // Add shop state
        this.shopSelection = 0;  // Current selected weapon index

        // Simplify enemy sprite configurations to use direct sprites
        this.enemySprites = {
            zombie: {
                src: './sprites/vampire.png',
                width: 16,
                height: 16
            },
            skeleton: {
                src: './sprites/skeleton.png',
                width: 16,
                height: 16
            },
            snake: {
                src: './sprites/snake.png',
                width: 16,
                height: 16
            },
            monster: {
                src: './sprites/pumpkin.png',
                width: 16,
                height: 16
            },
            vampire: {
                src: './sprites/vampire.png',
                width: 16,
                height: 16
            }
        };

        // Load enemy sprites
        this.loadedSprites = {};
        Object.entries(this.enemySprites).forEach(([type, config]) => {
            const img = new Image();
            img.src = config.src;
            this.loadedSprites[type] = img;
        });

        // Add shooting animation properties
        this.shootingAnimation = {
            active: false,
            frame: 0,
            maxFrames: 10
        };

        // Update start screen interaction to be more touch-friendly
        const startGame = async (e) => {
            e.preventDefault(); // Prevent default behavior
            e.stopPropagation(); // Stop event bubbling
            
            if (this.gameState === 'start') {
                try {
                    // Force touch events to be enabled
                    this.touchEnabled = true;
                    
                    // Create audio context immediately
                    const AudioContext = window.AudioContext || window.webkitAudioContext;
                    this.audioContext = new AudioContext();
                    
                    // Force unlock audio
                    await this.unlockAudioContext(this.audioContext);
                    
                    // Initialize audio system
                    this.initializeAudio();
                    
                    // Change game state
                    this.gameState = 'house';
                    
                    // Remove all start screen listeners
                    ['touchstart', 'touchend', 'click'].forEach(event => {
                        this.canvas.removeEventListener(event, startGame);
                    });

                    // Initialize touch controls immediately
                    this.setupTouchControls();
                } catch (error) {
                    console.error('Error starting game:', error);
                    // Fallback - proceed without audio
                    this.gameState = 'house';
                    this.setupTouchControls();
                }
            }
        };

        // Add all possible event listeners for starting
        ['touchstart', 'touchend', 'click'].forEach(event => {
            this.canvas.addEventListener(event, startGame, { passive: false });
        });

        // Don't initialize audio yet, just load the configurations
        this.soundConfigs = {
            // Background music - reduced to 30% of original volume
            houseBgm: { 
                url: './sounds/house.mp3',
                volume: 0.15,  // Was 0.3
                loop: true 
            },
            defendBgm: { 
                url: './sounds/defend.mp3',
                volume: 0.15,  // Was 0.3
                loop: true 
            },
            radioSong: {
                url: './sounds/radio.mp3',
                volume: 0.25   // Was 0.5
            },
            
            // Weapon sounds - reduced to 25% of original volume
            'shoot.minigun': { 
                url: './sounds/minigun.mp3',
                volume: 0.1    // Was 0.4
            },
            'shoot.bat': { 
                url: './sounds/bat.mp3',
                volume: 0.1    // Was 0.4
            },
            'shoot.laserGun': { 
                url: './sounds/laser.mp3',
                volume: 0.1    // Was 0.4
            },
            'shoot.rpg': { 
                url: './sounds/rpg.mp3',
                volume: 0.1    // Was 0.4
            },
            'shoot.pistol': { 
                url: './sounds/pistol.mp3',
                volume: 0.1    // Was 0.4
            },
            
            // Game effects - keep these at current volume
            enemyDeath: { 
                url: './sounds/enemy-death.mp3',
                volume: 0.5 
            },
            playerHit: { 
                url: './sounds/player-hit.mp3',
                volume: 0.5 
            },
            purchase: { 
                url: './sounds/purchase.mp3',
                volume: 0.5 
            },
            noMoney: { 
                url: './sounds/no-money.mp3',
                volume: 0.5 
            },
            waveStart: { 
                url: './sounds/wave-start.mp3',
                volume: 0.5 
            },
            victory: { 
                url: './sounds/victory.mp3',
                volume: 0.6 
            },
            gameOver: { 
                url: './sounds/game-over.mp3',
                volume: 0.6 
            }
        };

        // Add mute/unmute controls
        window.addEventListener('keydown', (e) => {
            if (e.key === 'M' || e.key === 'm') {
                this.toggleSound();
            }
        });

        // Setup event listeners
        this.setupControls();
        this.setupGamepad();

        // Start the game loop immediately, but don't play sounds yet
        this.startGameLoop();

        // Update oak tree position and size
        this.oakTree = {
            x: this.canvas.width - 400,   // Position from right
            y: this.canvas.height - 600,  // Taller tree
            width: 300,                   // Wider tree
            height: 600,                  // Taller tree
            scrollFound: false
        };

        // Add touch control properties
        this.touchControls = {
            leftButton: {
                x: 50,
                y: this.canvas.height - 150,
                radius: 40,
                pressed: false
            },
            rightButton: {
                x: 150,
                y: this.canvas.height - 150,
                radius: 40,
                pressed: false
            },
            shootButton: {
                x: this.canvas.width - 100,
                y: this.canvas.height - 150,
                radius: 50,
                pressed: false
            },
            actionButton: {
                x: this.canvas.width - 200,
                y: this.canvas.height - 150,
                radius: 40,
                pressed: false
            }
        };

        // Add touch event listeners
        this.setupTouchControls();

        // Add sound cooldown system
        this.soundCooldowns = {
            'shoot.minigun': 100,  // 100ms cooldown for minigun
            'shoot.bat': 200,      // 200ms cooldown for bat
            'shoot.laserGun': 150, // 150ms cooldown for laser
            'shoot.rpg': 500,      // 500ms cooldown for rpg
            'shoot.pistol': 250,   // 250ms cooldown for pistol
            'shoot.sniper3000': 400, // 400ms cooldown for sniper
            'enemyDeath': 100      // 100ms cooldown for death sound
        };
        
        // Track last play time for each sound
        this.lastSoundPlayed = {};

        // Update menu touch controls with adjusted positions
        this.menuControls = {
            shopButton: {
                x: 40,  // Was 200, align with text
                y: 90,  // Was 120, align with text
                width: 200,
                height: 60,
                text: '1: Shop'
            },
            radioButton: {
                x: 40,  // Was 200
                y: 150, // Was 180
                width: 300,
                height: 60,
                text: '2: Listen to Radio'
            },
            defendButton: {
                x: 40,  // Was 200
                y: 210, // Was 240
                width: 300,
                height: 60,
                text: '3: Start Defend Mode'
            },
            backButton: {
                x: 40,  // Was 100
                y: this.canvas.height - 100,
                width: 200,
                height: 60,
                text: 'Back to House'
            }
        };

        // Add canvas scaling helper
        this.getCanvasScaling = () => {
            const rect = this.canvas.getBoundingClientRect();
            return {
                scaleX: this.canvas.width / rect.width,
                scaleY: this.canvas.height / rect.height
            };
        };
    }

    toggleSound() {
        this.soundsEnabled = !this.soundsEnabled;
        Object.values(this.sounds).forEach(sound => {
            if (typeof sound === 'object' && sound !== null) {
                if (typeof sound.volume !== 'undefined') {
                    sound.volume = this.soundsEnabled ? sound._originalVolume : 0;
                }
            }
        });
        console.log(`Sound ${this.soundsEnabled ? 'enabled' : 'disabled'}`);
    }

    initializeAudio() {
        console.log('Initializing audio system...');
        
        this.sounds = {};
        this.soundsToLoad = 0;
        this.soundsLoaded = 0;
        this.audioInitialized = false;
        this.soundsEnabled = true;

        // Initialize with sound configs
        this.initSounds(this.soundConfigs);
    }

    initSounds(soundConfigs) {
        console.log('Starting sound loading...');
        this.soundsToLoad = Object.keys(soundConfigs).length;
        
        Object.entries(soundConfigs).forEach(([key, config]) => {
            console.log(`Attempting to load sound: ${key} from ${config.url}`);
            
            const audio = new Audio();
            
            // Add more detailed event listeners
            audio.addEventListener('loadstart', () => {
                console.log(`Started loading: ${key}`);
            });

            audio.addEventListener('canplaythrough', () => {
                console.log(`Successfully loaded sound: ${key}`);
                this.soundLoaded();
            }, { once: true });

            audio.addEventListener('error', (e) => {
                console.error(`Error loading sound ${key}:`, e.target.error);
                console.error('Error details:', {
                    code: e.target.error.code,
                    message: e.target.error.message,
                    url: config.url
                });
                this.createSilentFallback(key);
                this.soundLoaded();
            });

            // Add more error catching
            audio.onerror = (e) => {
                console.error(`Additional error info for ${key}:`, e);
            };

            // Set timeout for loading
            const timeout = setTimeout(() => {
                if (!audio.readyState) {
                    console.warn(`Sound ${key} taking too long to load, creating fallback`);
                    this.createSilentFallback(key);
                    this.soundLoaded();
                }
            }, 5000);

            // Clean up timeout if loaded successfully
            audio.addEventListener('canplaythrough', () => {
                clearTimeout(timeout);
            }, { once: true });

            try {
                audio.src = config.url;
                audio.volume = config.volume || 0.5;
                audio._originalVolume = audio.volume;
                if (config.loop) audio.loop = true;
                
                // Store the audio element
                if (key.includes('.')) {
                    const [category, name] = key.split('.');
                    if (!this.sounds[category]) this.sounds[category] = {};
                    this.sounds[category][name] = audio;
                } else {
                    this.sounds[key] = audio;
                }
            } catch (error) {
                console.error(`Error setting up sound ${key}:`, error);
                this.createSilentFallback(key);
                this.soundLoaded();
            }
        });
    }

    createSilentFallback(key) {
        console.log(`Creating silent fallback for: ${key}`);
        const silentAudio = new Audio();
        silentAudio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
        
        if (key.includes('.')) {
            const [category, name] = key.split('.');
            if (!this.sounds[category]) this.sounds[category] = {};
            this.sounds[category][name] = silentAudio;
        } else {
            this.sounds[key] = silentAudio;
        }
    }

    soundLoaded() {
        this.soundsLoaded++;
        
        // Update loading progress
        const progress = (this.soundsLoaded / this.soundsToLoad) * 100;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = 'white';
        this.ctx.font = '24px Arial';
        this.ctx.fillText(`Loading sounds... ${Math.round(progress)}%`, 
            this.canvas.width/2 - 100, 
            this.canvas.height/2);

        // Start game when all sounds are loaded
        if (this.soundsLoaded >= this.soundsToLoad) {
            console.log('All sounds loaded!');
            this.gameState = 'house';
            this.audioInitialized = true;
            // Try playing background music
            try {
                this.switchBackgroundMusic('house');
            } catch (e) {
                console.error('Error playing initial music:', e);
            }
        }
    }

    setupControls() {
        window.addEventListener('keydown', (e) => this.handleKeyPress(e));
    }

    setupGamepad() {
        window.addEventListener("gamepadconnected", (e) => {
            console.log("Gamepad connected:", e.gamepad);
            this.gamepadConnected = true;
        });

        window.addEventListener("gamepaddisconnected", (e) => {
            console.log("Gamepad disconnected");
            this.gamepadConnected = false;
        });
    }

    handleKeyPress(e) {
        if (this.gameState === 'house') {
            switch(e.key) {
                case '1':
                    this.gameState = 'shop';
                    break;
                case '2':
                    this.listenToRadio();
                    break;
                case '3':
                    if (this.player.hasWeapon) {
                        this.gameState = 'defend';
                        this.switchBackgroundMusic('defend');
                        this.startWave();
                    } else {
                        alert("You need to buy a weapon first!");
                        this.playSound('noMoney');
                    }
                    break;
            }
        } else if (this.gameState === 'shop') {
            switch(e.key) {
                case 'ArrowUp':
                    this.shopSelection = (this.shopSelection - 1 + Object.keys(this.weaponShop).length) % Object.keys(this.weaponShop).length;
                    break;
                case 'ArrowDown':
                    this.shopSelection = (this.shopSelection + 1) % Object.keys(this.weaponShop).length;
                    break;
                case 'Enter':
                    this.purchaseSelectedWeapon();
                    break;
                case 'Escape':
                    this.gameState = 'house';
                    break;
            }
        } else if (this.gameState === 'defend') {
            switch(e.key) {
                case ' ': // Space to shoot
                    this.shoot();
                    break;
                case 'ArrowLeft':
                    if (this.player.x > this.house.width) {
                        this.player.x -= this.player.speed;
                        this.player.direction = 'left';
                    }
                    break;
                case 'ArrowRight':
                    if (this.player.x < this.canvas.width - this.player.width) {
                        this.player.x += this.player.speed;
                        this.player.direction = 'right';
                    }
                    break;
                case 'Escape':
                    // Return to house between waves
                    if (!this.waveInProgress) {
                        this.gameState = 'house';
                        this.switchBackgroundMusic('house');
                    }
                    break;
            }
        }
    }

    listenToRadio() {
        this.debug('Radio activated');
        console.log("Attempting to play radio...");
        if (!this.sounds.radioSong) {
            console.error('Radio song not loaded');
            return;
        }

        try {
            // Stop current music
            if (this.sounds.houseBgm) {
                this.sounds.houseBgm.pause();
                this.sounds.houseBgm.currentTime = 0;
            }

            // Play radio song
            this.sounds.radioSong.currentTime = 0; // Reset to start
            this.sounds.radioSong.play()
                .then(() => {
                    console.log('Radio playing successfully');
                    setTimeout(() => {
                        alert("Secret Message: 'The ancient scroll lies beneath the old oak tree...'");
                        // Resume house music
                        if (this.sounds.houseBgm) {
                            this.sounds.radioSong.pause();
                            this.sounds.houseBgm.play()
                                .catch(e => console.error('Error resuming house music:', e));
                        }
                    }, 3000);
                })
                .catch(e => {
                    console.error('Error playing radio:', e);
                    alert("Secret Message: 'The ancient scroll lies beneath the old oak tree...'");
                });
        } catch (e) {
            console.error('Error in listenToRadio:', e);
            // Fallback to just showing the message
            alert("Secret Message: 'The ancient scroll lies beneath the old oak tree...'");
        }
    }

    buyWeapon(weaponName) {
        const weapon = this.weaponShop[weaponName];
        if (this.coins >= weapon.price) {
            this.coins -= weapon.price;
            this.player.hasWeapon = true;
            this.selectedWeapon = weaponName;
            return true;
        }
        return false;
    }

    startWave() {
        if (this.currentWave >= this.totalWaves) {
            this.playSound('victory');
            alert("Congratulations! You've defended your house from all waves!");
            this.gameState = 'house';
            this.switchBackgroundMusic('house');
            return;
        }

        this.playSound('waveStart');
        this.waveInProgress = true;
        const waveConfig = this.waveConfigs[this.currentWave];
        
        // Spawn enemies at the correct height
        Object.entries(waveConfig).forEach(([type, count]) => {
            for (let i = 0; i < count; i++) {
                this.enemies.push(new Enemy(
                    type, 
                    this.canvas.width + Math.random() * 200,  // Random X position off-screen
                    this.canvas.height - this.groundHeight - (32 * 4)  // Same Y position as player
                ));
            }
        });
    }

    shoot() {
        if (!this.selectedWeapon) return;
        
        this.playWeaponSound();
        this.shootingAnimation.active = true;
        this.shootingAnimation.frame = 0;

        const weapon = this.weaponShop[this.selectedWeapon];
        const range = this.selectedWeapon === 'sniper3000' ? 
            this.canvas.width : 
            400;

        const enemiesInRange = this.enemies.filter(e => {
            const inFront = this.player.direction === 'right' ? 
                e.x > this.player.x : 
                e.x < this.player.x;
            const distance = Math.abs(e.x - this.player.x);
            return distance < range && e.alive && inFront;
        });

        if (enemiesInRange.length > 0) {
            const closest = enemiesInRange.reduce((prev, curr) => 
                Math.abs(curr.x - this.player.x) < Math.abs(prev.x - this.player.x) ? curr : prev
            );
            closest.takeDamage(weapon.damage);
            if (!closest.alive) {
                this.playSound('enemyDeath');
            }
        }
    }

    purchaseSelectedWeapon() {
        this.debug('Attempting purchase');
        const weaponName = Object.keys(this.weaponShop)[this.shopSelection];
        const weapon = this.weaponShop[weaponName];
        
        if (this.coins >= weapon.price) {
            if (this.buyWeapon(weaponName)) {
                this.playSound('purchase');
                alert(`Successfully purchased ${weapon.name}!`);
                this.gameState = 'house';
            }
        } else {
            this.playSound('noMoney');
            alert("Not enough coins!");
        }
    }

    drawSprite(sprite, x, y, direction) {
        const { scale } = this.spriteConfig;
        
        this.ctx.save();
        if (direction === 'left') {
            // Flip sprite horizontally if facing left
            this.ctx.scale(-1, 1);
            this.ctx.drawImage(
                sprite,
                -x - this.spriteConfig.width * scale,  // Adjust x position when flipped
                y,
                this.spriteConfig.width * scale,
                this.spriteConfig.height * scale
            );
        } else {
            this.ctx.drawImage(
                sprite,
                x,
                y,
                this.spriteConfig.width * scale,
                this.spriteConfig.height * scale
            );
        }
        this.ctx.restore();
    }

    update() {
        try {
            this.checkGamepad();
            
            if (this.gameState === 'defend' && this.waveInProgress) {
                // Update enemies
                this.enemies.forEach(enemy => {
                    if (enemy.alive) {
                        enemy.update(this.player.x);
                        
                        // Check collision with player - improved collision detection
                        const dx = Math.abs(enemy.x - this.player.x);
                        const dy = Math.abs(enemy.y - this.player.y);
                        if (dx < (enemy.width + this.player.width) / 2 && 
                            dy < (enemy.height + this.player.height) / 2) {
                            this.hearts--;
                            if (this.hearts <= 0) {
                                this.playSound('gameOver');
                                alert("Game Over!");
                                this.gameState = 'house';
                                this.switchBackgroundMusic('house');
                                this.hearts = 15;
                                this.currentWave = 0;
                                this.enemies = [];
                                this.waveInProgress = false;
                            }
                        }
                    }
                });

                // Check if wave is complete
                if (this.enemies.every(e => !e.alive)) {
                    this.currentWave++;
                    this.waveInProgress = false;
                    setTimeout(() => this.startWave(), 2000);
                }
            }

            // Add touch control movement
            if (this.touchControls.leftButton.pressed) {
                this.player.x -= this.player.speed;
                this.player.direction = 'left';
            }
            if (this.touchControls.rightButton.pressed) {
                this.player.x += this.player.speed;
                this.player.direction = 'right';
            }

            this.draw();
        } catch (error) {
            this.debug(`Error: ${error.message}`);
        }
    }

    checkGamepad() {
        if (this.gamepadConnected) {
            const gamepad = navigator.getGamepads()[0];
            if (gamepad) {
                const axisX = gamepad.axes[0];
                if (Math.abs(axisX) > 0.1) {
                    const newX = this.player.x + axisX * this.player.speed;
                    // Keep player within bounds
                    if (newX > this.house.width && newX < this.canvas.width - this.player.width) {
                        this.player.x = newX;
                    }
                }
            }
        }
    }

    draw() {
        try {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            
            if (this.gameState === 'start') {
                this.drawStartScreen();
            } else if (this.gameState === 'house') {
                this.drawHouse();
            } else if (this.gameState === 'defend') {
                this.drawDefendMode();
            } else if (this.gameState === 'shop') {
                this.drawShop();
            }

            // Draw touch controls
            if (this.isMobileDevice()) {
                this.drawTouchControls();
            }

            // Draw version number
            this.ctx.fillStyle = '#666';
            this.ctx.font = '24px Arial';
            this.ctx.fillText(this.version, this.canvas.width - 100, this.canvas.height - 10);

            // Draw debug messages
            this.ctx.fillStyle = '#ff0';
            this.ctx.font = '20px Arial';
            this.debugLog.forEach((msg, i) => {
                this.ctx.fillText(msg, 10, 30 + (i * 25));
            });
        } catch (error) {
            this.debug(`Draw error: ${error.message}`);
        }
    }

    drawStartScreen() {
        this.ctx.fillStyle = '#2c3e50';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = '#ecf0f1';
        this.ctx.font = '48px Arial';
        this.ctx.fillText('Click or Touch Anywhere to Start', this.canvas.width/2 - 300, this.canvas.height/2);

        // Add version number in bottom right
        this.ctx.fillStyle = '#666';
        this.ctx.font = '24px Arial';
        this.ctx.fillText(this.version, this.canvas.width - 100, this.canvas.height - 10);

        // Add debug messages even on start screen
        this.ctx.fillStyle = '#ff0';
        this.ctx.font = '20px Arial';
        this.debugLog.forEach((msg, i) => {
            this.ctx.fillText(msg, 10, 30 + (i * 25));
        });
    }

    drawHouse() {
        this.ctx.fillStyle = '#8b4513';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.fillStyle = 'white';
        this.ctx.font = '40px Arial';  // Was 20px
        this.ctx.fillText(`Coins: ${this.coins}`, 40, 60);

        // Draw menu buttons with debug outlines
        this.ctx.fillStyle = '#4a6fa5';
        this.ctx.globalAlpha = 0.8;

        Object.entries(this.menuControls).forEach(([name, button]) => {
            if (button === this.menuControls.defendButton && !this.player.hasWeapon) {
                return;
            }
            if (button === this.menuControls.backButton) {
                return;
            }

            // Draw button background
            this.ctx.fillRect(button.x, button.y, button.width, button.height);
            
            // Draw button text
            this.ctx.fillStyle = 'white';
            this.ctx.font = '32px Arial';
            this.ctx.fillText(button.text, button.x + 20, button.y + 40);
            
            // Draw debug outline and coordinates
            this.ctx.strokeStyle = '#ff0';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(button.x, button.y, button.width, button.height);
            
            // Draw debug coordinates
            this.ctx.fillStyle = '#ff0';
            this.ctx.font = '12px Arial';
            this.ctx.fillText(`${Math.round(button.x)},${Math.round(button.y)}`, button.x, button.y - 5);
            
            this.ctx.fillStyle = '#4a6fa5';
        });

        this.ctx.globalAlpha = 1.0;
    }

    drawDefendMode() {
        // Draw night sky background
        this.ctx.fillStyle = '#000033';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw stars
        for(let i = 0; i < 50; i++) {
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillRect(
                (Math.sin(i + this.currentWave) * this.canvas.width + this.canvas.width) % this.canvas.width,
                (Math.cos(i) * this.canvas.height/2 + this.canvas.height/2) % this.canvas.height,
                2,
                2
            );
        }

        // Draw detailed house
        this.drawDetailedHouse();

        // Draw ground
        this.ctx.fillStyle = '#663300';
        this.ctx.fillRect(0, this.canvas.height - this.groundHeight, this.canvas.width, this.groundHeight);
        
        // Ground texture
        for(let i = 0; i < this.canvas.width; i += 80) {
            this.ctx.fillStyle = '#552200';
            this.ctx.fillRect(i, this.canvas.height - this.groundHeight, 40, 20);
        }

        // Draw oak tree
        this.drawOakTree();

        // Draw player
        if (this.playerSprite.complete) {
            this.drawSprite(
                this.playerSprite,
                this.player.x,
                this.player.y,
                this.player.direction
            );
        }

        // Draw shooting animation if active
        if (this.shootingAnimation.active) {
            this.drawShootingEffect();
        }

        // Draw enemies
        this.enemies.forEach(enemy => {
            if (enemy.alive && this.loadedSprites[enemy.type]?.complete) {
                const direction = enemy.x > this.player.x ? 'left' : 'right';
                this.drawSprite(
                    this.loadedSprites[enemy.type],
                    enemy.x,
                    enemy.y,
                    direction
                );

                // Draw health bar above enemy
                const healthPercentage = enemy.health / 100;
                this.ctx.fillStyle = 'red';
                this.ctx.fillRect(
                    enemy.x, 
                    enemy.y - 20,  // Moved health bar up a bit
                    this.spriteConfig.width * this.spriteConfig.scale * healthPercentage,
                    8  // Made health bar thicker
                );
            }
        });

        // Check if player is near the tree and hasn't found the scroll
        if (!this.oakTree.scrollFound && 
            Math.abs(this.player.x - (this.oakTree.x + 150)) < 100) {  // Adjusted position for larger tree
            this.findSecretScroll();
        }

        // Update UI text
        this.ctx.fillStyle = 'white';
        this.ctx.font = '40px Arial';  // Was 20px
        this.ctx.fillText(`Wave: ${this.currentWave + 1}/${this.totalWaves}`, 40, 60);
        this.ctx.fillText(`Hearts: ${this.hearts}`, 40, 120);
        
        if (this.selectedWeapon) {
            this.ctx.fillText(`Weapon: ${this.weaponShop[this.selectedWeapon].name}`, 40, 180);
        }
    }

    drawDetailedHouse() {
        // Main house structure
        this.ctx.fillStyle = '#8B4513';
        this.ctx.fillRect(this.house.x, this.house.y, this.house.width, this.house.height);
        
        // Roof
        this.ctx.fillStyle = '#A52A2A';
        this.ctx.beginPath();
        this.ctx.moveTo(this.house.x, this.house.y);
        this.ctx.lineTo(this.house.x + this.house.width/2, this.house.y - 100);
        this.ctx.lineTo(this.house.x + this.house.width, this.house.y);
        this.ctx.fill();

        // Window
        this.ctx.fillStyle = '#FFF8DC';
        this.ctx.fillRect(this.house.x + 40, this.house.y + 60, 80, 80);
        this.ctx.strokeStyle = '#8B4513';
        this.ctx.lineWidth = 4;
        this.ctx.strokeRect(this.house.x + 40, this.house.y + 60, 80, 80);

        // Door
        this.ctx.fillStyle = '#4A3000';
        this.ctx.fillRect(this.house.x + 180, this.house.y + 200, 80, 160);
        this.ctx.fillStyle = '#FFD700';
        this.ctx.beginPath();
        this.ctx.arc(this.house.x + 240, this.house.y + 280, 8, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawShootingEffect() {
        if (this.shootingAnimation.active) {
            const weaponColor = {
                minigun: '#ff0000',
                bat: '#8b4513',
                laserGun: '#00ff00',
                rpg: '#ff6600',
                pistol: '#ffff00',
                sniper3000: '#00ffff'  // Cyan color for sniper
            }[this.selectedWeapon];

            this.ctx.strokeStyle = weaponColor;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();

            // Adjust shooting position based on player direction
            const shootStartX = this.player.direction === 'right' ? 
                this.player.x + this.player.width : 
                this.player.x;

            this.ctx.moveTo(shootStartX, this.player.y + this.player.height/2);
            
            // Create weapon-specific effects
            switch(this.selectedWeapon) {
                case 'laserGun':
                    this.ctx.lineTo(
                        this.player.direction === 'right' ? this.canvas.width : 0,
                        this.player.y + this.player.height/2
                    );
                    break;
                case 'minigun':
                    for(let i = 0; i < 3; i++) {
                        this.ctx.moveTo(shootStartX, this.player.y + this.player.height/2);
                        const targetX = this.player.direction === 'right' ?
                            shootStartX + 400 :
                            shootStartX - 400;
                        this.ctx.lineTo(
                            targetX,
                            this.player.y + this.player.height/2 + Math.sin(this.shootingAnimation.frame + i) * 20
                        );
                    }
                    break;
                case 'sniper3000':
                    this.ctx.lineWidth = 4;
                    this.ctx.shadowColor = weaponColor;
                    this.ctx.shadowBlur = 10;
                    this.ctx.lineTo(
                        this.player.direction === 'right' ? this.canvas.width : 0,
                        this.player.y + this.player.height/2
                    );
                    this.ctx.shadowBlur = 0;
                    break;
                default:
                    const targetX = this.player.direction === 'right' ?
                        shootStartX + 400 :
                        shootStartX - 400;
                    this.ctx.lineTo(targetX, this.player.y + this.player.height/2);
            }

            this.ctx.stroke();

            this.shootingAnimation.frame++;
            if (this.shootingAnimation.frame >= this.shootingAnimation.maxFrames) {
                this.shootingAnimation.active = false;
                this.shootingAnimation.frame = 0;
            }
        }
    }

    drawShop() {
        this.ctx.fillStyle = '#2c3e50';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.fillStyle = '#ecf0f1';
        this.ctx.font = '64px Arial';  // Was 32px
        this.ctx.fillText('WEAPON SHOP', this.canvas.width/2 - 200, 100);

        this.ctx.font = '48px Arial';  // Was 24px
        this.ctx.fillText(`Coins: ${this.coins}`, 40, 80);

        // Draw back button
        this.ctx.fillStyle = '#4a6fa5';
        this.ctx.globalAlpha = 0.8;
        const backButton = this.menuControls.backButton;
        this.ctx.fillRect(backButton.x, backButton.y, backButton.width, backButton.height);
        this.ctx.fillStyle = 'white';
        this.ctx.font = '32px Arial';
        this.ctx.fillText(backButton.text, backButton.x + 20, backButton.y + 40);
        this.ctx.globalAlpha = 1.0;

        // Draw weapon selection buttons
        let y = 240;
        Object.entries(this.weaponShop).forEach(([key, weapon], index) => {
            if (weapon.secret && !this.oakTree.scrollFound) return;

            this.ctx.fillStyle = index === this.shopSelection ? '#f1c40f' : '#4a6fa5';
            this.ctx.globalAlpha = 0.8;
            this.ctx.fillRect(100, y - 40, this.canvas.width - 200, 60);
            
            this.ctx.fillStyle = '#ffffff';
            let text = `${weapon.name} - ${weapon.price} coins (Damage: ${weapon.damage})`;
            if (weapon.secret) {
                text += ' [LEGENDARY]';
                this.ctx.fillStyle = '#FFD700';
            }
            this.ctx.fillText(text, 120, y);
            y += 100;
        });

        this.ctx.fillStyle = '#bdc3c7';
        this.ctx.font = '36px Arial';  // Was 18px
        this.ctx.fillText('↑↓: Select weapon | Enter: Purchase | Esc: Exit shop', 
            this.canvas.width/2 - 400, 
            this.canvas.height - 60
        );
    }

    // Separate game loop start from audio start
    startGameLoop() {
        setInterval(() => this.update(), 1000/60);
    }

    // Update the switchBackgroundMusic method to check if audio is ready
    switchBackgroundMusic(newState) {
        if (!this.audioInitialized || !this.sounds) {
            console.log('Audio not yet initialized');
            return;
        }

        try {
            // Stop all background music
            if (this.sounds.houseBgm) {
                this.sounds.houseBgm.pause();
                this.sounds.houseBgm.currentTime = 0;
            }
            if (this.sounds.defendBgm) {
                this.sounds.defendBgm.pause();
                this.sounds.defendBgm.currentTime = 0;
            }
            if (this.sounds.radioSong) {
                this.sounds.radioSong.pause();
                this.sounds.radioSong.currentTime = 0;
            }

            // Play appropriate music
            switch(newState) {
                case 'house':
                    if (this.sounds.houseBgm) this.sounds.houseBgm.play();
                    break;
                case 'defend':
                    if (this.sounds.defendBgm) this.sounds.defendBgm.play();
                    break;
            }
        } catch (e) {
            console.error('Error switching music:', e);
        }
    }

    // Update playSound method to check if audio is ready
    playSound(soundName) {
        if (!this.audioInitialized || !this.soundsEnabled || !this.sounds) {
            return;
        }

        const now = Date.now();
        const cooldown = this.soundCooldowns[soundName] || 0;
        const lastPlayed = this.lastSoundPlayed[soundName] || 0;

        // Check if sound is still in cooldown
        if (now - lastPlayed < cooldown) {
            return;
        }
        
        try {
            if (soundName.includes('.')) {
                const [category, name] = soundName.split('.');
                if (this.sounds[category]?.[name]) {
                    // Stop any existing instances of this sound
                    if (this.sounds[category][name].isPlaying) {
                        this.sounds[category][name].pause();
                        this.sounds[category][name].currentTime = 0;
                    }
                    const sound = this.sounds[category][name].cloneNode();
                    sound.volume = this.sounds[category][name]._originalVolume;
                    sound.play()
                        .then(() => {
                            this.lastSoundPlayed[soundName] = now;
                        })
                        .catch(e => console.error(`Failed to play ${category}.${name}:`, e));
                }
            } else if (this.sounds[soundName]) {
                if (soundName.includes('Bgm') || soundName === 'radioSong') {
                    // Background music handles differently
                    this.sounds[soundName].play()
                        .catch(e => console.error(`Failed to play ${soundName}:`, e));
                } else {
                    const sound = this.sounds[soundName].cloneNode();
                    sound.play()
                        .then(() => {
                            this.lastSoundPlayed[soundName] = now;
                        })
                        .catch(e => console.error(`Failed to play ${soundName}:`, e));
                }
            }
        } catch (error) {
            console.error('Error in playSound:', error);
        }
    }

    playWeaponSound() {
        if (this.selectedWeapon) {
            const soundName = `shoot.${this.selectedWeapon}`;
            this.playSound(soundName);
        }
    }

    drawOakTree() {
        // Draw trunk
        this.ctx.fillStyle = '#8B4513';
        this.ctx.fillRect(
            this.oakTree.x + 100,
            this.oakTree.y + 200,
            100,
            400
        );

        // Draw foliage (larger circles)
        this.ctx.fillStyle = '#228B22';
        this.ctx.beginPath();
        this.ctx.arc(
            this.oakTree.x + 150,
            this.oakTree.y + 180,
            150,
            0,
            Math.PI * 2
        );
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(
            this.oakTree.x + 80,
            this.oakTree.y + 120,
            120,
            0,
            Math.PI * 2
        );
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(
            this.oakTree.x + 220,
            this.oakTree.y + 120,
            120,
            0,
            Math.PI * 2
        );
        this.ctx.fill();

        // Larger hint for scroll
        if (!this.oakTree.scrollFound) {
            this.ctx.fillStyle = '#FFD700';
            this.ctx.globalAlpha = 0.3;
            this.ctx.beginPath();
            this.ctx.arc(
                this.oakTree.x + 150,
                this.oakTree.y + 300,
                30,
                0,
                Math.PI * 2
            );
            this.ctx.fill();
            this.ctx.globalAlpha = 1.0;
        }
    }

    findSecretScroll() {
        if (!this.oakTree.scrollFound) {
            this.oakTree.scrollFound = true;
            alert("You found an ancient scroll beneath the oak tree!\nIt contains the blueprint for a legendary weapon: Sniper3000!");
            // Add Sniper3000 to available weapons
            this.playSound('purchase');
            this.player.hasWeapon = true;
            this.selectedWeapon = 'sniper3000';
        }
    }

    setupTouchControls() {
        this.debug('Setting up touch controls');
        
        const handleTouch = (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const touches = e.touches;
            const rect = this.canvas.getBoundingClientRect();
            
            // Get actual canvas position and size
            const canvasX = rect.left;
            const canvasY = rect.top;
            const canvasWidth = rect.width;
            const canvasHeight = rect.height;
            
            // Calculate scaling factors
            const scaleX = this.canvas.width / canvasWidth;
            const scaleY = this.canvas.height / canvasHeight;
            
            // Debug touch coordinates and current game state
            if (touches.length > 0) {
                const touch = touches[0];
                // Convert touch coordinates to canvas space
                const x = (touch.clientX - canvasX) * scaleX;
                const y = (touch.clientY - canvasY) * scaleY;
                
                this.debug(`Raw touch: ${touch.clientX},${touch.clientY}`);
                this.debug(`Canvas pos: ${canvasX},${canvasY}`);
                this.debug(`Canvas size: ${canvasWidth}x${canvasHeight}`);
                this.debug(`Scale: ${scaleX.toFixed(2)}x${scaleY.toFixed(2)}`);
                this.debug(`Adjusted touch: ${Math.round(x)},${Math.round(y)}`);
                
                // Debug all button positions in house state
                if (this.gameState === 'house') {
                    Object.entries(this.menuControls).forEach(([name, button]) => {
                        const buttonInfo = `${name}: x=${button.x}-${button.x + button.width}, y=${button.y}-${button.y + button.height}`;
                        this.debug(buttonInfo);
                        
                        if (this.isInsideButton(x, y, button)) {
                            this.debug(`HIT -> ${name} at ${Math.round(x)},${Math.round(y)}`);
                            if (name === 'shopButton') {
                                this.gameState = 'shop';
                                return;
                            } else if (name === 'radioButton') {
                                this.listenToRadio();
                                return;
                            } else if (name === 'defendButton' && this.player.hasWeapon) {
                                this.gameState = 'defend';
                                this.switchBackgroundMusic('defend');
                                this.startWave();
                                return;
                            }
                        }
                    });
                }
            }

            // Reset button states
            this.touchControls.leftButton.pressed = false;
            this.touchControls.rightButton.pressed = false;
            
            for (let i = 0; i < touches.length; i++) {
                const touch = touches[i];
                // Convert touch coordinates to canvas coordinates
                const x = (touch.clientX - canvasX) * scaleX;
                const y = (touch.clientY - canvasY) * scaleY;
                
                // First check menu buttons based on game state
                if (this.gameState === 'house') {
                    if (this.isInsideButton(x, y, this.menuControls.shopButton)) {
                        this.gameState = 'shop';
                        return;
                    } else if (this.isInsideButton(x, y, this.menuControls.radioButton)) {
                        this.listenToRadio();
                        return;
                    } else if (this.isInsideButton(x, y, this.menuControls.defendButton) && this.player.hasWeapon) {
                        this.gameState = 'defend';
                        this.switchBackgroundMusic('defend');
                        this.startWave();
                        return;
                    }
                } else if (this.gameState === 'shop') {
                    if (this.isInsideButton(x, y, this.menuControls.backButton)) {
                        this.gameState = 'house';
                        return;
                    }
                    // Check weapon selection buttons
                    let buttonY = 240;
                    Object.entries(this.weaponShop).forEach(([key, weapon], index) => {
                        if (weapon.secret && !this.oakTree.scrollFound) return;
                        if (y >= buttonY - 40 && y <= buttonY + 20 && x >= 100 && x <= this.canvas.width - 200) {
                            this.shopSelection = index;
                            this.purchaseSelectedWeapon();
                            return;
                        }
                        buttonY += 100;
                    });
                }
                
                // Then check game controls
                if (this.isInsideCircle(x, y, this.touchControls.leftButton)) {
                    this.touchControls.leftButton.pressed = true;
                }
                if (this.isInsideCircle(x, y, this.touchControls.rightButton)) {
                    this.touchControls.rightButton.pressed = true;
                }
                if (this.isInsideCircle(x, y, this.touchControls.shootButton)) {
                    this.shoot();
                }
            }
        };

        // Add touch event listeners with passive: false
        ['touchstart', 'touchmove'].forEach(event => {
            this.canvas.addEventListener(event, handleTouch, { passive: false });
        });

        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.touchControls.leftButton.pressed = false;
            this.touchControls.rightButton.pressed = false;
        }, { passive: false });
    }

    isInsideCircle(x, y, circle) {
        return Math.sqrt(
            Math.pow(x - circle.x, 2) + 
            Math.pow(y - circle.y, 2)
        ) < circle.radius;
    }

    handleAction() {
        this.debug('Action triggered');
        // This method is no longer needed
    }

    drawTouchControls() {
        // Make controls more visible
        this.ctx.globalAlpha = 0.7; // More visible

        // Left button
        this.ctx.fillStyle = '#333';
        this.ctx.beginPath();
        this.ctx.arc(this.touchControls.leftButton.x, this.touchControls.leftButton.y, 
            this.touchControls.leftButton.radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Add arrow symbol
        this.ctx.fillStyle = 'white';
        this.ctx.font = '30px Arial';
        this.ctx.fillText('←', 
            this.touchControls.leftButton.x - 15, 
            this.touchControls.leftButton.y + 10);

        // Right button
        this.ctx.fillStyle = '#333';
        this.ctx.beginPath();
        this.ctx.arc(this.touchControls.rightButton.x, this.touchControls.rightButton.y, 
            this.touchControls.rightButton.radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Add arrow symbol
        this.ctx.fillStyle = 'white';
        this.ctx.fillText('→', 
            this.touchControls.rightButton.x - 15, 
            this.touchControls.rightButton.y + 10);

        // Shoot button
        this.ctx.fillStyle = '#f00';
        this.ctx.beginPath();
        this.ctx.arc(this.touchControls.shootButton.x, this.touchControls.shootButton.y, 
            this.touchControls.shootButton.radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Add shoot text
        this.ctx.fillStyle = 'white';
        this.ctx.fillText('SHOOT', 
            this.touchControls.shootButton.x - 40, 
            this.touchControls.shootButton.y + 10);

        // Action button
        this.ctx.fillStyle = '#0f0';
        this.ctx.beginPath();
        this.ctx.arc(this.touchControls.actionButton.x, this.touchControls.actionButton.y, 
            this.touchControls.actionButton.radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Add action text
        this.ctx.fillStyle = 'white';
        this.ctx.fillText('ACTION', 
            this.touchControls.actionButton.x - 40, 
            this.touchControls.actionButton.y + 10);

        this.ctx.globalAlpha = 1.0;
    }

    isMobileDevice() {
        return true; // Always show touch controls for testing
        // return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    async unlockAudioContext(audioContext) {
        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }
        // Create and play a silent sound
        const buffer = audioContext.createBuffer(1, 1, 22050);
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.destination);
        source.start(0);
        return audioContext;
    }

    isInsideButton(x, y, button) {
        const inside = x >= button.x && 
               x <= button.x + button.width && 
               y >= button.y && 
               y <= button.y + button.height;
        
        if (inside) {
            this.debug(`Button hit: ${button.text}`);
        }
        return inside;
    }
} 