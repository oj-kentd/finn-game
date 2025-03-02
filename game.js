// Main game class
class Game {
    constructor() {
        // ----
        // (DO NOT DELETE THIS LINE)
        this.version = "v0.9.8"; // Increment version for every update (DO NOT DELETE THIS LINE)
        this.version += ` (${new Date().toISOString().slice(0, 19)})`;
        // ----

        // Add timestamp to version for absolute cache busting
        this.debugLog = [];      // Store debug messages
        this.maxDebugLines = 20;  // Number of debug lines to show

        // Add wave set counter for increasing difficulty
        this.waveSet = 0;       // Tracks completed sets of waves
        this.enemyScaling = {   // Scaling factors for each completed set
            health: 1.5,        // 50% more health per set
            damage: 1.25,       // 25% more damage per set
            speed: 1.1          // 10% more speed per set
        };

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
            minigun: { name: 'Minigun', price: 100, damage: 20, fireRate: 10 }, // 10 shots per second
            bat: { name: 'Bat', price: 50, damage: 8, fireRate: 2 }, // 2 shots per second
            laserGun: { name: 'Laser Gun', price: 10, damage: 1, fireRate: 5 }, // 5 shots per second
            rpg: { name: 'RPG', price: 1000, damage: 42, fireRate: 0.5 }, // 1 shot every 2 seconds
            pistol: { name: 'Pistol', price: 100, damage: 2, fireRate: 3 }, // 3 shots per second
            sniper3000: { name: 'Sniper3000', price: 0, damage: 100, secret: true, fireRate: 1 } // 1 shot per second
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

        // Add click handler for initial interaction
        this.canvas.addEventListener('click', () => {
            if (this.gameState === 'start') {
                this.startGame();
            }
        });

        // Don't initialize audio yet, just load the configurations
        this.startGameLoop();

        // Update oak tree position and size
        this.oakTree = {
            x: this.canvas.width - 400,   // Position from right
            y: this.canvas.height - 600,  // Taller tree
            width: 300,                   // Wider tree
            height: 600,                  // Taller tree
            scrollFound: false
        };

        // Update touch controls configuration with better positioned defend mode controls
        this.touchControls = {
            leftButton: { 
                x: 100, 
                y: this.canvas.height - 150, 
                radius: 60, 
                pressed: false,
                icon: '←',
                lastPressed: 0
            },
            rightButton: { 
                x: 250, 
                y: this.canvas.height - 150, 
                radius: 60, 
                pressed: false,
                icon: '→',
                lastPressed: 0
            },
            shootButton: { 
                x: this.canvas.width - 150, 
                y: this.canvas.height - 150, 
                radius: 70, 
                pressed: false,
                icon: '🔥',
                lastPressed: 0
            },
            actionButton: { 
                x: this.canvas.width - 100, 
                y: 100, 
                radius: 40, 
                pressed: false,
                icon: '×',
                lastPressed: 0
            },
            menuButtons: [
                { x: this.canvas.width/2 - 200, y: 300, width: 400, height: 80, text: 'Shop', action: '1', pressed: false },
                { x: this.canvas.width/2 - 200, y: 400, width: 400, height: 80, text: 'Radio', action: '2', pressed: false },
                { x: this.canvas.width/2 - 200, y: 500, width: 400, height: 80, text: 'Start Wave', action: '3', pressed: false }
            ],
            shopButtons: [], // Will be populated in setupShop
            isTouching: false,
            touchStartTime: 0,
            showControls: false, // New flag for persistent controls
            lastTouchX: 0,
            lastTouchY: 0,
            activeTouches: new Map() // Track active touches by identifier
        };

        // Setup touch controls
        this.setupTouchControls();

        // Add sound cooldowns
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
        
        // Track active sound instances
        this.activeSounds = {};

        // Update enemy base stats for better scaling
        this.enemyBaseStats = {
            zombie: { health: 100, damage: 1, speed: 2 },
            skeleton: { health: 80, damage: 2, speed: 3 },
            snake: { health: 60, damage: 3, speed: 4 },
            monster: { health: 150, damage: 2, speed: 2 },
            vampire: { health: 120, damage: 3, speed: 3 }
        };

        // Add pet properties
        this.hasPet = false;
        this.petSprite = new Image();
        this.petSprite.src = './sprites/pet.png';
        this.petOffset = { x: 0, y: 0 }; // For floating animation
        this.petTime = 0; // For animation timing

        // Add secret button in house menu
        this.secretPetButton = {
            x: this.canvas ? this.canvas.width - 100 : 1500,
            y: this.canvas ? this.canvas.height - 100 : 1100,
            width: 100,
            height: 100,
            pressed: false
        };

        // Add mirror power-up properties
        this.hasMirrorPower = false;
        this.mirrorButton = {
            x: this.canvas ? this.canvas.width/2 - 50 : 750,
            y: 20,
            width: 100,
            height: 100,
            pressed: false
        };

        // Add boss properties
        this.boss = {
            alive: false,
            health: 1000,
            maxHealth: 1000,
            x: 0,
            y: 0,
            width: this.spriteConfig.width * this.spriteConfig.scale * 2, // 2x player size
            height: this.spriteConfig.height * this.spriteConfig.scale * 2,
            speed: 3, // Increased from 1 to 3 for better movement
            damage: 50,
            shootInterval: null,
            lastShot: 0,
            projectiles: [],
            direction: 'left'
        };

        // Load boss sprite
        this.bossSprite = new Image();
        this.bossSprite.src = './sprites/boss.png';
        
        // Add rate limiting for fire button
        this.lastFired = 0;
    }

    startGame() {
        this.initializeAudio();
        this.gameState = 'house';
        this.switchBackgroundMusic('house');
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

        // Test audio context availability
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();
            console.log('Audio context created successfully');
        } catch (e) {
            console.error('WebAudio not supported:', e);
        }

        // Updated sound configuration with local paths
        const soundConfigs = {
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
            'shoot.sniper3000': { 
                url: './sounds/sniper.mp3',
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

        // Initialize with all sounds
        this.initSounds(soundConfigs);
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
            if (!this.boss.alive) {
                // Spawn boss at the end of wave 9
                this.spawnBoss();
            } else {
                this.waveSet++; // Increment set counter
                this.playSound('victory');
                alert(`Congratulations! You've completed Set ${this.waveSet}!\nEnemies will be stronger in the next set.`);
                this.currentWave = 0; // Reset wave counter
                this.gameState = 'house';
                this.switchBackgroundMusic('house');
            }
            return;
        }

        this.playSound('waveStart');
        this.waveInProgress = true;
        const waveConfig = this.waveConfigs[this.currentWave];
        
        // Calculate scaling factors based on current set
        const healthScale = Math.pow(this.enemyScaling.health, this.waveSet);
        const damageScale = Math.pow(this.enemyScaling.damage, this.waveSet);
        const speedScale = Math.pow(this.enemyScaling.speed, this.waveSet);
        
        // Spawn enemies with scaled stats
        Object.entries(waveConfig).forEach(([type, count]) => {
            for (let i = 0; i < count; i++) {
                const enemy = new Enemy(
                    type, 
                    this.canvas.width + Math.random() * 200,
                    this.canvas.height - this.groundHeight - (32 * 4)
                );
                // Scale enemy stats
                enemy.health *= healthScale;
                enemy.damage *= damageScale;
                enemy.speed *= speedScale;
                this.enemies.push(enemy);
            }
        });
    }

    spawnBoss() {
        this.boss.alive = true;
        this.boss.health = this.boss.maxHealth;
        // Spawn boss just off the right edge of the screen
        this.boss.x = this.canvas.width - this.boss.width;
        this.boss.y = this.canvas.height - this.groundHeight - this.boss.height;
        this.boss.projectiles = [];
        
        // Start boss shooting
        this.boss.shootInterval = setInterval(() => {
            if (this.boss.alive) {
                this.bossShoots();
            }
        }, 2000); // Shoot every 2 seconds
    }

    bossShoots() {
        const now = Date.now();
        if (now - this.boss.lastShot < 2000) return; // Rate limit shots

        this.boss.lastShot = now;
        this.boss.projectiles.push({
            x: this.boss.x,
            y: this.boss.y + this.boss.height/2,
            speed: 8,
            width: 20,
            height: 20
        });
    }

    updateBoss() {
        if (!this.boss.alive) return;

        // Move boss from right to left
        this.boss.x -= this.boss.speed;

        // Keep boss direction facing left since it's moving left
        this.boss.direction = 'left';

        // Update projectiles
        this.boss.projectiles = this.boss.projectiles.filter(proj => {
            proj.x -= proj.speed;

            // Check collision with player
            if (this.checkCollision(proj, this.player)) {
                if (this.hasMirrorPower) {
                    // Reflect damage back to boss
                    this.boss.health -= this.boss.damage;
                    this.hasMirrorPower = false; // Use up mirror power
                    if (this.boss.health <= 0) {
                        this.boss.alive = false;
                        clearInterval(this.boss.shootInterval);
                        this.playSound('victory');
                        this.waveSet++;
                        this.currentWave = 0;
                        this.gameState = 'house';
                        this.switchBackgroundMusic('house');
                    }
                    return false;
                } else {
                    this.hearts -= 1;
                    if (this.hearts <= 0) {
                        this.gameOver();
                    }
                    return false;
                }
            }

            return proj.x > 0;
        });

        // If boss moves off screen to the left, move it back to the right
        if (this.boss.x + this.boss.width < 0) {
            this.boss.x = this.canvas.width;
        }
    }

    drawBoss() {
        if (!this.boss.alive || !this.bossSprite.complete) return;

        // Draw boss sprite
        this.ctx.save();
        if (this.boss.direction === 'left') {
            // Flip sprite horizontally if facing left
            this.ctx.scale(-1, 1);
            this.ctx.drawImage(
                this.bossSprite,
                -this.boss.x - this.boss.width,
                this.boss.y,
                this.boss.width,
                this.boss.height
            );
        } else {
            this.ctx.drawImage(
                this.bossSprite,
                this.boss.x,
                this.boss.y,
                this.boss.width,
                this.boss.height
            );
        }
        this.ctx.restore();

        // Draw boss health bar
        const healthPercentage = this.boss.health / this.boss.maxHealth;
        this.ctx.fillStyle = 'red';
        this.ctx.fillRect(
            this.boss.x,
            this.boss.y - 30,
            this.boss.width * healthPercentage,
            10
        );

        // Draw boss projectiles
        this.ctx.fillStyle = '#FF4444';
        this.boss.projectiles.forEach(proj => {
            this.ctx.fillRect(proj.x, proj.y, proj.width, proj.height);
        });
    }

    shoot() {
        if (!this.selectedWeapon) return;
        
        // Add rate limiting for shooting
        const now = Date.now();
        if (this.selectedWeapon) {
            const weapon = this.weaponShop[this.selectedWeapon];
            // Calculate minimum time between shots based on weapon fire rate
            const minTimeBetweenShots = 1000 / weapon.fireRate;
            
            // Check if enough time has passed since last shot
            if (now - this.lastFired < minTimeBetweenShots) {
                return; // Exit if firing too rapidly
            }
            
            // Update last fired timestamp
            this.lastFired = now;
        }
        
        this.playWeaponSound();
        this.shootingAnimation.active = true;
        this.shootingAnimation.frame = 0;

        const weapon = this.weaponShop[this.selectedWeapon];
        const range = this.selectedWeapon === 'sniper3000' ? 
            this.canvas.width : 
            400;

        // Check for boss hit first
        if (this.boss.alive) {
            const inRange = Math.abs(this.boss.x - this.player.x) < range;
            if (inRange) {
                const damage = this.hasPet ? this.boss.maxHealth / 5 : weapon.damage;
                this.boss.health -= damage;
                if (this.boss.health <= 0) {
                    this.boss.alive = false;
                    clearInterval(this.boss.shootInterval);
                    this.playSound('victory');
                    this.waveSet++;
                    this.currentWave = 0;
                    this.gameState = 'house';
                    this.switchBackgroundMusic('house');
                }
                return;
            }
        }

        // Check for regular enemy hits
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
            
            if (this.hasPet) {
                closest.health = 0;
                closest.alive = false;
                this.playSound('enemyDeath');
            } else {
                closest.takeDamage(weapon.damage);
                if (!closest.alive) {
                    this.playSound('enemyDeath');
                }
            }
        }
    }

    purchaseSelectedWeapon() {
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
        this.checkGamepad();
        
        if (this.gameState === 'defend' && this.waveInProgress) {
            // Update boss
            this.updateBoss();

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
                            this.boss.alive = false;
                            if (this.boss.shootInterval) {
                                clearInterval(this.boss.shootInterval);
                            }
                            this.boss.projectiles = [];
                            this.resetTouchControls();
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

        // Add touch control movement with rate limiting and boundary checks
        const now = Date.now();
        const moveSpeed = this.player.speed;
        
        if (this.touchControls.leftButton.pressed) {
            if (now - this.touchControls.leftButton.lastPressed >= 16) { // ~60fps rate limit
                const newX = this.player.x - moveSpeed;
                if (newX > this.house.width) { // Boundary check
                    this.player.x = newX;
                    this.player.direction = 'left';
                }
                this.touchControls.leftButton.lastPressed = now;
            }
        }
        
        if (this.touchControls.rightButton.pressed) {
            if (now - this.touchControls.rightButton.lastPressed >= 16) { // ~60fps rate limit
                const newX = this.player.x + moveSpeed;
                if (newX < this.canvas.width - this.player.width) { // Boundary check
                    this.player.x = newX;
                    this.player.direction = 'right';
                }
                this.touchControls.rightButton.lastPressed = now;
            }
        }

        this.draw();
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
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (this.gameState === 'start') {
            // Draw start screen
            this.ctx.fillStyle = '#2c3e50';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.ctx.fillStyle = '#ecf0f1';
            this.ctx.font = '32px Arial';
            this.ctx.fillText('8-Bit House Defense', this.canvas.width/2 - 150, this.canvas.height/2 - 50);
            
            this.ctx.font = '24px Arial';
            this.ctx.fillText('Click anywhere to start', this.canvas.width/2 - 100, this.canvas.height/2 + 50);
            
            this.ctx.font = '18px Arial';
            this.ctx.fillText('Controls: Arrow keys to move, Space to shoot', this.canvas.width/2 - 150, this.canvas.height/2 + 100);
            this.ctx.fillText('M to mute/unmute sound', this.canvas.width/2 - 80, this.canvas.height/2 + 130);
        } else if (this.gameState === 'house') {
            this.drawHouse();
        } else if (this.gameState === 'defend') {
            this.drawDefendMode();
        } else if (this.gameState === 'shop') {
            this.drawShop();
        }

        // Draw touch controls
        this.drawTouchControls();

        // Draw version number in all states
        this.ctx.fillStyle = 'white';
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(this.version, 10, this.canvas.height - 10);
    }

    drawHouse() {
        this.ctx.fillStyle = '#8b4513';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw menu buttons
        this.ctx.textAlign = 'center';
        this.touchControls.menuButtons.forEach(btn => {
            // Draw button background with hover effect
            this.ctx.fillStyle = btn.pressed ? '#4a4a4a' : '#333333';
            this.ctx.fillRect(btn.x, btn.y, btn.width, btn.height);
            
            // Draw button border
            this.ctx.strokeStyle = 'white';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(btn.x, btn.y, btn.width, btn.height);
            
            // Draw button text
            this.ctx.fillStyle = 'white';
            this.ctx.font = '32px Arial';
            this.ctx.fillText(btn.text, btn.x + btn.width/2, btn.y + btn.height/2 + 10);
        });

        // Draw coins
        this.ctx.textAlign = 'left';
        this.ctx.fillStyle = 'white';
        this.ctx.font = '40px Arial';
        this.ctx.fillText(`Coins: ${this.coins}`, 40, 60);

        // Draw secret pet button (invisible)
        if (this.debug) { // Only show button outline in debug mode
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            this.ctx.strokeRect(
                this.secretPetButton.x,
                this.secretPetButton.y,
                this.secretPetButton.width,
                this.secretPetButton.height
            );
        }

        // Reset text alignment
        this.ctx.textAlign = 'left';
    }

    drawPlayer(x, y, direction) {
        // Draw player
        if (this.playerSprite.complete) {
            this.drawSprite(
                this.playerSprite,
                x,
                y,
                direction
            );
        }

        // Draw pet if player has one
        if (this.hasPet && this.petSprite.complete) {
            // Update pet floating animation
            this.petTime += 0.05;
            this.petOffset.y = Math.sin(this.petTime) * 20; // Floating up and down
            this.petOffset.x = Math.cos(this.petTime * 0.5) * 10; // Slight side to side movement

            // Calculate pet position relative to player
            const petX = direction === 'right' ? 
                x - (this.player.width * 0.5) + this.petOffset.x : 
                x + (this.player.width * 0.5) + this.petOffset.x;
            const petY = y - (this.player.height * 0.2) + this.petOffset.y;

            // Draw pet at 1/2 the size of player (changed from 0.33)
            this.ctx.save();
            const petScale = this.spriteConfig.scale * 0.5; // 1/2 of player size
            if (direction === 'left') {
                this.ctx.scale(-1, 1);
                this.ctx.drawImage(
                    this.petSprite,
                    -petX - (this.spriteConfig.width * petScale),
                    petY,
                    this.spriteConfig.width * petScale,
                    this.spriteConfig.height * petScale
                );
            } else {
                this.ctx.drawImage(
                    this.petSprite,
                    petX,
                    petY,
                    this.spriteConfig.width * petScale,
                    this.spriteConfig.height * petScale
                );
            }
            this.ctx.restore();
        }
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

        // Draw player with pet
        this.drawPlayer(this.player.x, this.player.y, this.player.direction);

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
                    enemy.y - 20,
                    this.spriteConfig.width * this.spriteConfig.scale * healthPercentage,
                    8
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
        this.ctx.font = '40px Arial';
        this.ctx.fillText(`Set ${this.waveSet + 1}`, 40, 60);
        this.ctx.fillText(`Wave: ${this.currentWave + 1}/${this.totalWaves}`, 40, 120);
        this.ctx.fillText(`Hearts: ${this.hearts}`, 40, 180);
        
        if (this.selectedWeapon) {
            this.ctx.fillText(`Weapon: ${this.weaponShop[this.selectedWeapon].name}`, 40, 240);
        }

        // Draw mirror button if not used
        if (!this.hasMirrorPower) {
            this.ctx.fillStyle = '#ADD8E6';  // Light blue
            this.ctx.fillRect(
                this.mirrorButton.x,
                this.mirrorButton.y,
                this.mirrorButton.width,
                this.mirrorButton.height
            );
            this.ctx.strokeStyle = 'white';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(
                this.mirrorButton.x,
                this.mirrorButton.y,
                this.mirrorButton.width,
                this.mirrorButton.height
            );
            this.ctx.fillStyle = 'white';
            this.ctx.font = '20px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Mirror', 
                this.mirrorButton.x + this.mirrorButton.width/2,
                this.mirrorButton.y + this.mirrorButton.height/2
            );
        }

        // Draw boss
        this.drawBoss();

        // Draw touch controls last so they're on top
        if (this.isMobileDevice() || this.touchControls.isTouching) {
            this.drawTouchControls();
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

        // Draw title
        this.ctx.fillStyle = '#ecf0f1';
        this.ctx.font = '64px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('WEAPON SHOP', this.canvas.width/2, 100);

        // Draw coins
        this.ctx.font = '48px Arial';
        this.ctx.fillText(`Coins: ${this.coins}`, this.canvas.width/2, 180);

        // Draw weapon buttons
        let y = 250;
        Object.entries(this.weaponShop).forEach(([key, weapon], index) => {
            if (weapon.secret && !this.oakTree.scrollFound) return;

            // Create shop button if it doesn't exist
            if (!this.touchControls.shopButtons[index]) {
                this.touchControls.shopButtons[index] = {
                    x: this.canvas.width/2 - 300,
                    y: y,
                    width: 600,
                    height: 80,
                    weapon: key,
                    pressed: false
                };
            }

            const btn = this.touchControls.shopButtons[index];

            // Draw button background
            this.ctx.fillStyle = btn.pressed ? '#4a4a4a' : 
                               (index === this.shopSelection ? '#3498db' : '#333333');
            this.ctx.fillRect(btn.x, btn.y, btn.width, btn.height);

            // Draw button border
            this.ctx.strokeStyle = 'white';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(btn.x, btn.y, btn.width, btn.height);

            // Draw weapon info
            this.ctx.fillStyle = weapon.secret ? '#FFD700' : '#ecf0f1';
            this.ctx.font = '32px Arial';
            let text = `${weapon.name} - ${weapon.price} coins (Damage: ${weapon.damage})`;
            if (weapon.secret) text += ' [LEGENDARY]';
            this.ctx.fillText(text, this.canvas.width/2, y + 50);

            y += 100;
        });

        // Draw back button at the bottom
        const backBtn = {
            x: this.canvas.width/2 - 200,
            y: this.canvas.height - 120,
            width: 400,
            height: 80,
            text: 'Back to House',
            action: 'Escape',
            pressed: false
        };
        
        // Store back button reference
        this.touchControls.shopBackButton = backBtn;

        // Draw back button
        this.ctx.fillStyle = backBtn.pressed ? '#4a4a4a' : '#333333';
        this.ctx.fillRect(backBtn.x, backBtn.y, backBtn.width, backBtn.height);
        this.ctx.strokeStyle = 'white';
        this.ctx.strokeRect(backBtn.x, backBtn.y, backBtn.width, backBtn.height);
        this.ctx.fillStyle = 'white';
        this.ctx.fillText(backBtn.text, this.canvas.width/2, backBtn.y + 50);

        // Reset text alignment
        this.ctx.textAlign = 'left';
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

    // Updated playSound method to prevent overlapping sounds
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
                    // For weapon sounds, ensure previous instance is done before playing again
                    if (category === 'shoot' && this.activeSounds[soundName]) {
                        // If it's still playing, don't start a new sound
                        if (!this.activeSounds[soundName].ended) {
                            return;
                        }
                    }
                    
                    // Create a new sound instance
                    const sound = this.sounds[category][name].cloneNode();
                    sound.volume = this.sounds[category][name]._originalVolume;
                    
                    // Store the active sound instance
                    this.activeSounds[soundName] = sound;
                    
                    // Add event listener to clean up after playback ends
                    sound.addEventListener('ended', () => {
                        delete this.activeSounds[soundName];
                    }, { once: true });
                    
                    sound.play()
                        .then(() => {
                            this.lastSoundPlayed[soundName] = now;
                        })
                        .catch(e => {
                            console.error(`Failed to play ${category}.${name}:`, e);
                            delete this.activeSounds[soundName];
                        });
                }
            } else if (this.sounds[soundName]) {
                if (soundName.includes('Bgm') || soundName === 'radioSong') {
                    // Background music handles differently
                    this.sounds[soundName].play()
                        .catch(e => console.error(`Failed to play ${soundName}:`, e));
                } else {
                    // For other sound effects
                    if (this.activeSounds[soundName] && !this.activeSounds[soundName].ended) {
                        // If the sound is still playing, don't start a new one
                        return;
                    }
                    
                    const sound = this.sounds[soundName].cloneNode();
                    this.activeSounds[soundName] = sound;
                    
                    // Clean up after playback ends
                    sound.addEventListener('ended', () => {
                        delete this.activeSounds[soundName];
                    }, { once: true });
                    
                    sound.play()
                        .then(() => {
                            this.lastSoundPlayed[soundName] = now;
                        })
                        .catch(e => {
                            console.error(`Failed to play ${soundName}:`, e);
                            delete this.activeSounds[soundName];
                        });
                }
            }
        } catch (error) {
            console.error('Error in playSound:', error);
        }
    }

    // Updated weapon sound method to handle weapon-specific sound behavior
    playWeaponSound() {
        if (!this.selectedWeapon) return;
        
        const soundName = `shoot.${this.selectedWeapon}`;
        // Play sound with non-overlapping behavior
        this.playSound(soundName);
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
        // Helper function to get touch coordinates
        const getTouchCoordinates = (touch, canvas) => {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            return {
                x: (touch.clientX - rect.left) * scaleX,
                y: (touch.clientY - rect.top) * scaleY
            };
        };

        let shootInterval = null; // Store interval for continuous shooting

        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touches = e.touches;
            this.touchControls.isTouching = true;
            this.touchControls.showControls = true;
            this.touchControls.touchStartTime = Date.now();
            
            // Handle start screen with any touch
            if (this.gameState === 'start') {
                this.startGame();
                return;
            }
            
            for (let i = 0; i < touches.length; i++) {
                const touch = touches[i];
                const {x, y} = getTouchCoordinates(touch, this.canvas);
                
                this.touchControls.activeTouches.set(touch.identifier, {x, y});
                
                this.touchControls.lastTouchX = x;
                this.touchControls.lastTouchY = y;

                // Handle different game states
                switch (this.gameState) {
                    case 'house':
                        // Check for secret pet button first
                        if (x >= this.secretPetButton.x && 
                            x <= this.secretPetButton.x + this.secretPetButton.width &&
                            y >= this.secretPetButton.y && 
                            y <= this.secretPetButton.y + this.secretPetButton.height) {
                            if (!this.hasPet) {
                                this.hasPet = true;
                                this.playSound('purchase');
                                alert("You found a pet! It will now follow you on your adventures!");
                                return; // Exit after finding pet
                            }
                        }

                        // Then check regular menu buttons
                        this.touchControls.menuButtons.forEach(btn => {
                            if (this.isInsideButton(x, y, btn)) {
                                btn.pressed = true;
                                if (btn.action === '3' && !this.player.hasWeapon) {
                                    alert("You need to buy a weapon first!");
                                    this.playSound('noMoney');
                                    this.resetTouchControls();
                                } else {
                                    this.handleKeyPress({ key: btn.action });
                                }
                            }
                        });
                        break;
                    case 'shop':
                        this.touchControls.shopButtons.forEach((btn, index) => {
                            if (this.isInsideButton(x, y, btn)) {
                                btn.pressed = true;
                                this.shopSelection = index;
                                this.purchaseSelectedWeapon();
                            }
                        });

                        if (this.touchControls.shopBackButton && 
                            this.isInsideButton(x, y, this.touchControls.shopBackButton)) {
                            this.touchControls.shopBackButton.pressed = true;
                            this.handleKeyPress({ key: 'Escape' });
                        }
                        break;
                    case 'defend':
                        // Check for mirror button press
                        if (!this.hasMirrorPower &&
                            x >= this.mirrorButton.x && 
                            x <= this.mirrorButton.x + this.mirrorButton.width &&
                            y >= this.mirrorButton.y && 
                            y <= this.mirrorButton.y + this.mirrorButton.height) {
                            this.hasMirrorPower = true;
                            this.playSound('purchase');
                            alert("Mirror power activated! Next hit will be reflected!");
                            return;
                        }
                        if (this.isInsideCircle(x, y, this.touchControls.leftButton)) {
                            this.touchControls.leftButton.pressed = true;
                            this.touchControls.leftButton.lastPressed = Date.now();
                        }
                        if (this.isInsideCircle(x, y, this.touchControls.rightButton)) {
                            this.touchControls.rightButton.pressed = true;
                            this.touchControls.rightButton.lastPressed = Date.now();
                        }
                        if (this.isInsideCircle(x, y, this.touchControls.shootButton)) {
                            this.touchControls.shootButton.pressed = true;
                            this.touchControls.shootButton.lastPressed = Date.now();
                            
                            // Start continuous shooting with proper rate limiting
                            if (this.selectedWeapon) {
                                const weapon = this.weaponShop[this.selectedWeapon];
                                // Use weapon's actual fire rate instead of arbitrary doubled rate
                                const fireInterval = 1000 / weapon.fireRate; 
                                
                                // Initial shot (respects rate limiting)
                                this.shoot();
                                
                                // Clear any existing interval first to avoid multiple intervals
                                if (shootInterval) {
                                    clearInterval(shootInterval);
                                }
                                
                                // Set up new interval with proper weapon fire rate
                                shootInterval = setInterval(() => {
                                    // The shoot function now handles its own rate limiting
                                    this.shoot();
                                }, fireInterval);
                            }
                        }
                        if (this.isInsideCircle(x, y, this.touchControls.actionButton)) {
                            this.handleKeyPress({ key: 'Escape' });
                        }
                        break;
                }
            }
        });

        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            
            // Clear shooting interval if it exists
            if (shootInterval) {
                clearInterval(shootInterval);
                shootInterval = null;
            }

            // Remove ended touches from tracking
            Array.from(e.changedTouches).forEach(touch => {
                this.touchControls.activeTouches.delete(touch.identifier);
                
                // If this was the shooting touch, stop shooting
                const {x, y} = getTouchCoordinates(touch, this.canvas);
                if (this.isInsideCircle(x, y, this.touchControls.shootButton)) {
                    this.touchControls.shootButton.pressed = false;
                }
            });

            // Only reset isTouching if no touches remain
            if (e.touches.length === 0) {
                this.touchControls.isTouching = false;
                setTimeout(() => {
                    if (!this.touchControls.isTouching) {
                        this.touchControls.showControls = false;
                    }
                }, 3000);
            }

            this.resetTouchControls();
        });

        // Add touch cancel handler
        this.canvas.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            if (shootInterval) {
                clearInterval(shootInterval);
                shootInterval = null;
            }
            this.resetTouchControls();
        });
    }

    resetTouchControls() {
        // Reset all button states
        this.touchControls.leftButton.pressed = false;
        this.touchControls.rightButton.pressed = false;
        this.touchControls.menuButtons.forEach(btn => btn.pressed = false);
        this.touchControls.shopButtons.forEach(btn => btn.pressed = false);
        if (this.touchControls.shopBackButton) {
            this.touchControls.shopBackButton.pressed = false;
        }
        // Clear active touches
        this.touchControls.activeTouches.clear();
    }

    drawTouchControls() {
        // Show controls if touching or within 3 seconds of last touch, or on mobile
        if (!this.touchControls.showControls && !this.isMobileDevice()) {
            return;
        }

        this.ctx.globalAlpha = 0.5;
        
        // Draw controls based on game state
        switch (this.gameState) {
            case 'defend':
                // Movement buttons
                ['leftButton', 'rightButton', 'shootButton', 'actionButton'].forEach(btnName => {
                    const btn = this.touchControls[btnName];
                    
                    // Special handling for shoot button
                    if (btnName === 'shootButton') {
                        // Red background for shoot button
                        this.ctx.fillStyle = btn.pressed ? '#aa0000' : '#ff0000';
                        this.ctx.beginPath();
                        this.ctx.arc(btn.x, btn.y, btn.radius, 0, Math.PI * 2);
                        this.ctx.fill();

                        // Add a glow effect when pressed
                        if (btn.pressed) {
                            this.ctx.shadowColor = '#ff0000';
                            this.ctx.shadowBlur = 20;
                            this.ctx.strokeStyle = '#ff6666';
                            this.ctx.lineWidth = 4;
                            this.ctx.stroke();
                            this.ctx.shadowBlur = 0;
                        }

                        // White border
                        this.ctx.strokeStyle = 'white';
                        this.ctx.lineWidth = 3;
                        this.ctx.stroke();
                    } else {
                        // Normal buttons
                        this.ctx.fillStyle = btn.pressed ? '#666666' : '#333333';
                        this.ctx.beginPath();
                        this.ctx.arc(btn.x, btn.y, btn.radius, 0, Math.PI * 2);
                        this.ctx.fill();
                        this.ctx.strokeStyle = 'white';
                        this.ctx.lineWidth = 3;
                        this.ctx.stroke();
                    }

                    // Draw button icon/text
                    this.ctx.fillStyle = 'white';
                    this.ctx.font = btnName === 'shootButton' ? '48px Arial' : '36px Arial';
                    this.ctx.textAlign = 'center';
                    this.ctx.textBaseline = 'middle';
                    this.ctx.fillText(btn.icon, btn.x, btn.y);
                });

                // Draw labels under movement buttons
                this.ctx.fillStyle = 'white';
                this.ctx.font = '24px Arial';
                this.ctx.fillText('MOVE', 175, this.canvas.height - 60);
                this.ctx.fillText('SHOOT', this.canvas.width - 150, this.canvas.height - 60);

                // If a weapon is selected, show its fire rate
                if (this.selectedWeapon) {
                    const weapon = this.weaponShop[this.selectedWeapon];
                    this.ctx.font = '20px Arial';
                    this.ctx.fillText(`Rate: ${weapon.fireRate}/s`, this.canvas.width - 150, this.canvas.height - 30);
                }
                break;

            case 'house':
                // Menu buttons
                this.touchControls.menuButtons.forEach(btn => {
                    this.ctx.fillStyle = '#333';
                    this.ctx.fillRect(btn.x, btn.y, btn.width, btn.height);
                    this.ctx.fillStyle = '#fff';
                    this.ctx.font = '20px Arial';
                    this.ctx.textAlign = 'center';
                    this.ctx.fillText(btn.text, btn.x + btn.width/2, btn.y + btn.height/2 + 8);
                });
                break;
        }

        this.ctx.globalAlpha = 1.0;
        this.ctx.textBaseline = 'alphabetic'; // Reset textBaseline
    }

    isInsideButton(x, y, button) {
        return x >= button.x && x <= button.x + button.width &&
               y >= button.y && y <= button.y + button.height;
    }

    isInsideCircle(x, y, circle) {
        const dx = x - circle.x;
        const dy = y - circle.y;
        return Math.sqrt(dx * dx + dy * dy) <= circle.radius;
    }

    isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               (window.innerWidth <= 1024);
    }

    checkCollision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }

    gameOver() {
        // Stop all active sounds first
        Object.values(this.activeSounds).forEach(sound => {
            try {
                if (sound && typeof sound.pause === 'function') {
                    sound.pause();
                    sound.currentTime = 0;
                }
            } catch (e) {
                console.error('Error stopping sound:', e);
            }
        });
        this.activeSounds = {};
        
        this.playSound('gameOver');
        alert("Game Over!");
        this.gameState = 'house';
        this.switchBackgroundMusic('house');
        this.hearts = 15;
        this.currentWave = 0;
        this.enemies = [];
        this.waveInProgress = false;
        this.boss.alive = false;
        if (this.boss.shootInterval) {
            clearInterval(this.boss.shootInterval);
        }
        this.boss.projectiles = [];
        this.resetTouchControls();
    }
}