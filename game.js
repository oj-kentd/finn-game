// Main game class
class Game {
    constructor() {
        // ----
        // (DO NOT DELETE THIS LINE)
        this.version = "v0.8.25"; // Increment version UP
        this.version += ` (${new Date().toISOString().slice(0, 19)})`;
        // ----

        // Add timestamp to version for absolute cache busting
        this.debugLog = [];      // Store debug messages
        this.maxDebugLines = 20;  // Number of debug lines to show

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

        // Initialize game objects
        this.initializeGameObjects();
        
        // Initialize UI system
        this.initializeUI();
        
        // Initialize controls
        this.pressedButtons = {
            left: false,
            right: false
        };

        // Setup event handlers
        this.setupTouchControls();
        window.addEventListener('keydown', (e) => {
            if (e.key === 'M' || e.key === 'm') {
                this.toggleSound();
            }
        });

        // Start game loop
        this.startGameLoop();
    }

    initializeGameObjects() {
        // Initialize game objects with proper relative positioning
        const groundHeight = 200;
        this.groundHeight = groundHeight;

        this.player = {
            x: 200,
            y: this.canvas.height - groundHeight - (32 * 4),
            width: this.spriteConfig.width * this.spriteConfig.scale,
            height: this.spriteConfig.height * this.spriteConfig.scale,
            speed: 10,
            direction: 'right',
            hasWeapon: false
        };

        this.house = {
            x: 0,
            y: this.canvas.height - 400,
            width: 300,
            height: 400
        };

        this.oakTree = {
            x: this.canvas.width - 400,
            y: this.canvas.height - 600,
            width: 300,
            height: 600,
            scrollFound: false
        };

        // Initialize game state
        this.currentWave = 0;
        this.enemies = [];
        this.waveInProgress = false;
        this.totalWaves = 9;

        this.weaponShop = {
            minigun: { name: 'Minigun', price: 100, damage: 20 },
            bat: { name: 'Bat', price: 50, damage: 8 },
            laserGun: { name: 'Laser Gun', price: 10, damage: 1 },
            rpg: { name: 'RPG', price: 1000, damage: 42 },
            pistol: { name: 'Pistol', price: 100, damage: 2 },
            sniper3000: { name: 'Sniper3000', price: 0, damage: 100, secret: true }
        };

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

        // Add sound cooldowns system
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

        // Add uniform scaling helper
        this.getUniformScale = () => {
            const rect = this.canvas.getBoundingClientRect();
            // Use the smaller scale to maintain aspect ratio
            return Math.min(
                this.canvas.width / rect.width,
                this.canvas.height / rect.height
            );
        };

        // Add sound configurations
        this.soundConfigs = {
            // Background music - reduced to 30% of original volume
            houseBgm: { 
                url: './sounds/house.mp3',
                volume: 0.15,
                loop: true 
            },
            defendBgm: { 
                url: './sounds/defend.mp3',
                volume: 0.15,
                loop: true 
            },
            radioSong: {
                url: './sounds/radio.mp3',
                volume: 0.25
            },
            
            // Weapon sounds - reduced to 25% of original volume
            'shoot.minigun': { 
                url: './sounds/minigun.mp3',
                volume: 0.1
            },
            'shoot.bat': { 
                url: './sounds/bat.mp3',
                volume: 0.1
            },
            'shoot.laserGun': { 
                url: './sounds/laser.mp3',
                volume: 0.1
            },
            'shoot.rpg': { 
                url: './sounds/rpg.mp3',
                volume: 0.1
            },
            'shoot.pistol': { 
                url: './sounds/pistol.mp3',
                volume: 0.1
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
    }

    setupTouchControls() {
        const handleTouch = (e) => {
            e.preventDefault();
            if (!e.touches.length) return;
            
            const touch = e.touches[0];
            const pos = this.screenToRelative(touch.clientX, touch.clientY);
            
            // Handle all UI interactions through the new system
            const regions = this.getActiveRegions();
            for (const region of regions) {
                const buttons = this.getButtonsForRegion(region);
                for (const button of buttons) {
                    if (this.isInRegion(pos, button, region)) {
                        this.handleButton(button);
                        if (!button.isControl) return;
                    }
                }
            }
        };

        const handleTouchEnd = () => {
            this.pressedButtons.left = false;
            this.pressedButtons.right = false;
        };

        this.canvas.addEventListener('touchstart', handleTouch, { passive: false });
        this.canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
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
            if (this.pressedButtons.left && this.player.x > this.house.width) {
                this.player.x -= this.player.speed;
                this.player.direction = 'left';
            }
            if (this.pressedButtons.right && this.player.x < this.canvas.width - this.player.width) {
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
            
            // Draw game state specific elements
            switch(this.gameState) {
                case 'start':
                    this.drawStartScreen();
                    break;
                case 'house':
                    this.drawHouse();
                    break;
                case 'defend':
                    this.drawDefendMode();
                    break;
                case 'shop':
                    this.drawShop();
                    break;
            }

            // Draw UI on top
            this.drawUI();

            // Draw version at bottom
            this.ctx.fillStyle = '#666';
            this.ctx.font = '24px Arial';
            this.ctx.fillText(this.version, 10, this.canvas.height - 10);
        } catch (error) {
            this.debug(`Draw error: ${error.message}`);
        }
    }

    drawStartScreen() {
        // Draw background
        this.ctx.fillStyle = '#2c3e50';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw title
        this.ctx.fillStyle = '#ecf0f1';
        this.ctx.font = '64px Arial';
        this.ctx.fillText('8-Bit House Defense', 
            this.canvas.width/2 - 300, 
            this.canvas.height/3
        );

        // Draw start button using UI system
        const startRegion = this.ui.start;
        startRegion.buttons.forEach(button => {
            this.drawButton(button, startRegion);
        });
    }

    drawHouse() {
        // Draw background
        this.ctx.fillStyle = '#8b4513';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw stats
        this.ctx.fillStyle = 'white';
        this.ctx.font = '40px Arial';
        this.ctx.fillText(`Coins: ${this.coins}`, 40, 60);
        this.ctx.fillText(`Hearts: ${this.hearts}`, 40, 110);

        // Draw oak tree
        this.drawOakTree();

        // UI buttons are drawn by drawUI()
    }

    drawDefendMode() {
        // Draw background
        this.ctx.fillStyle = '#2c3e50';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw ground
        this.ctx.fillStyle = '#8b4513';
        this.ctx.fillRect(0, this.canvas.height - this.groundHeight, this.canvas.width, this.groundHeight);

        // Draw house
        this.ctx.fillStyle = '#4a6fa5';
        this.ctx.fillRect(this.house.x, this.house.y, this.house.width, this.house.height);

        // Draw player
        this.drawSprite(this.playerSprite, this.player.x, this.player.y, this.player.direction);

        // Draw shooting effect
        if (this.shootingAnimation.active) {
            const weaponConfig = {
                minigun: { color: '#ff0000', width: 2, range: 400 },
                bat: { color: '#8b4513', width: 2, range: 400 },
                laserGun: { color: '#00ff00', width: 2, range: this.canvas.width },
                rpg: { color: '#ff6600', width: 2, range: 400 },
                pistol: { color: '#ffff00', width: 2, range: 400 },
                sniper3000: { color: '#00ffff', width: 4, range: this.canvas.width }
            }[this.selectedWeapon] || { color: '#fff', width: 2, range: 400 };

            this.ctx.strokeStyle = weaponConfig.color;
            this.ctx.lineWidth = weaponConfig.width;
            this.ctx.beginPath();
            
            const startX = this.player.direction === 'right' ? 
                this.player.x + this.player.width : 
                this.player.x;
            const endX = this.player.direction === 'right' ? 
                startX + weaponConfig.range : 
                startX - weaponConfig.range;

            this.ctx.moveTo(startX, this.player.y + this.player.height/2);
            this.ctx.lineTo(endX, this.player.y + this.player.height/2);
            this.ctx.stroke();
        }

        // Draw enemies
        this.enemies.forEach(enemy => {
            if (enemy.alive) {
                this.drawSprite(this.loadedSprites[enemy.type], enemy.x, enemy.y, enemy.direction);
                
                // Draw health bar
                const healthPercentage = enemy.health / 100;
                this.ctx.fillStyle = '#f00';
                this.ctx.fillRect(
                    enemy.x, 
                    enemy.y - 20,
                    this.spriteConfig.width * this.spriteConfig.scale * healthPercentage,
                    8
                );
            }
        });

        // Draw stats
        this.ctx.fillStyle = 'white';
        this.ctx.font = '40px Arial';
        this.ctx.fillText(`Wave: ${this.currentWave + 1}/${this.totalWaves}`, 40, 60);
        this.ctx.fillText(`Hearts: ${this.hearts}`, 40, 110);
        if (this.selectedWeapon) {
            this.ctx.fillText(`Weapon: ${this.weaponShop[this.selectedWeapon].name}`, 40, 160);
        }
    }

    drawShop() {
        // Draw background
        this.ctx.fillStyle = '#2c3e50';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw header
        this.ctx.fillStyle = '#ecf0f1';
        this.ctx.font = '64px Arial';
        this.ctx.fillText('WEAPON SHOP', this.canvas.width/2 - 200, 100);

        // Draw coins
        this.ctx.font = '48px Arial';
        this.ctx.fillText(`Coins: ${this.coins}`, 40, 80);

        // Draw instructions
        this.ctx.fillStyle = '#bdc3c7';
        this.ctx.font = '36px Arial';
        this.ctx.fillText('↑↓: Select weapon | Enter: Purchase | Esc: Exit shop', 
            this.canvas.width/2 - 400, 
            this.canvas.height - 60
        );

        // UI buttons are now drawn by drawUI()
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

    drawUI() {
        // Draw menu buttons if in appropriate state
        if (this.gameState === 'house' || this.gameState === 'shop') {
            const menuRegion = this.ui.menu;
            const currentButtons = menuRegion.buttons[this.gameState] || [];
            
            currentButtons.forEach(button => {
                if (button.id === 'defend' && !this.player.hasWeapon) return;
                this.drawButton(button, menuRegion);
            });
        }

        // Draw shop items if in shop
        if (this.gameState === 'shop') {
            const shopRegion = this.ui.shop;
            shopRegion.buttons.forEach((button, index) => {
                if (!button.isWeapon || !this.weaponShop[button.id].secret || this.oakTree.scrollFound) {
                    const buttonRegion = {
                        ...shopRegion,
                        top: shopRegion.top + (index * shopRegion.spacing)
                    };
                    this.drawButton(button, buttonRegion, index === this.shopSelection);
                }
            });
        }

        // Draw game controls if in defend mode
        if (this.gameState === 'defend') {
            const controlRegion = this.ui.controls;
            controlRegion.buttons.forEach(button => {
                const isPressed = 
                    (button.id === 'left' && this.pressedButtons.left) ||
                    (button.id === 'right' && this.pressedButtons.right);
                this.drawButton(button, controlRegion, isPressed);
            });
        }

        // Draw debug info
        if (this.debugLog.length > 0) {
            this.ctx.fillStyle = '#ff0';
            this.ctx.font = '24px Arial';
            this.debugLog.forEach((msg, i) => {
                this.ctx.fillText(msg, 
                    this.canvas.width - 600,
                    50 + (i * 30)
                );
            });
        }
    }

    drawButton(button, region, isPressed = false) {
        const pos = this.relativeToScreen(button.x, region.top);
        const size = {
            width: button.width * this.canvas.width,
            height: region.height * this.canvas.height
        };

        // Draw button background
        this.ctx.fillStyle = button.color;
        this.ctx.globalAlpha = isPressed ? 0.9 : 0.7;
        this.ctx.fillRect(pos.x, pos.y, size.width, size.height);

        // Draw button text
        this.ctx.globalAlpha = 1;
        this.ctx.fillStyle = isPressed ? '#fff' : '#ddd';
        this.ctx.font = '32px Arial';
        
        // Center text
        const textWidth = this.ctx.measureText(button.text).width;
        const textX = pos.x + (size.width - textWidth) / 2;
        const textY = pos.y + size.height/2 + 12;
        
        this.ctx.fillText(button.text, textX, textY);

        // Draw selection highlight for shop items
        if (button.isWeapon && isPressed) {
            this.ctx.strokeStyle = '#f1c40f';
            this.ctx.lineWidth = 4;
            this.ctx.strokeRect(pos.x - 2, pos.y - 2, size.width + 4, size.height + 4);
        }

        // Draw debug outline
        if (this.debugLog.length > 0) {
            this.ctx.strokeStyle = '#ff0';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(pos.x, pos.y, size.width, size.height);
        }
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

    // Helper to convert screen coordinates to relative coordinates
    screenToRelative(x, y) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: (x - rect.left) / rect.width,
            y: (y - rect.top) / rect.height
        };
    }

    // Helper to convert relative coordinates to screen coordinates
    relativeToScreen(x, y) {
        return {
            x: x * this.canvas.width,
            y: y * this.canvas.height
        };
    }

    isInRegion(pos, button, region) {
        return (
            pos.y >= region.top && 
            pos.y <= region.top + region.height &&
            pos.x >= button.x && 
            pos.x <= button.x + button.width
        );
    }

    getActiveRegions() {
        switch (this.gameState) {
            case 'start':
                return [this.ui.start];
            case 'house':
                return [this.ui.menu];
            case 'shop':
                return [this.ui.menu, this.ui.shop];
            case 'defend':
                return [this.ui.controls];
            default:
                return [];
        }
    }

    handleButton(button) {
        this.debug(`Button pressed: ${button.id}`);
        
        if (button.id === 'start') {
            // Initialize audio and transition to house screen
            try {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                this.audioContext = new AudioContext();
                this.unlockAudioContext(this.audioContext)
                    .then(() => {
                        this.initializeAudio();
                        // We don't immediately change gameState because initializeAudio 
                        // will handle that after loading sounds
                    })
                    .catch(error => {
                        console.error('Error unlocking audio context:', error);
                        // Fall back to changing state directly if audio fails
                        this.gameState = 'house';
                    });
            } catch (error) {
                console.error('Error starting game:', error);
                // Fall back to changing state directly if audio fails
                this.gameState = 'house';
            }
            return;
        }

        if (button.isControl) {
            switch(button.id) {
                case 'left':
                    this.pressedButtons.left = true;
                    break;
                case 'right':
                    this.pressedButtons.right = true;
                    break;
                case 'shoot':
                    this.shoot();
                    break;
            }
            return;
        }

        switch(button.id) {
            case 'shop':
                this.gameState = 'shop';
                break;
            case 'radio':
                this.listenToRadio();
                break;
            case 'defend':
                if (this.player.hasWeapon) {
                    this.gameState = 'defend';
                    this.switchBackgroundMusic('defend');
                    this.startWave();
                }
                break;
            case 'back':
                this.gameState = 'house';
                break;
        }

        if (button.isWeapon) {
            this.shopSelection = button.index;
            this.purchaseSelectedWeapon();
        }
    }

    initializeUI() {
        // Define UI regions and buttons for all game states
        this.ui = {
            start: {
                top: 0.4,
                height: 0.2,
                buttons: [
                    { id: 'start', text: 'Tap to Start', x: 0.2, width: 0.6, color: '#4a6fa5' }
                ]
            },
            menu: {
                top: 0.1,
                height: 0.15,
                buttons: {
                    house: [
                        { id: 'shop', text: 'Shop', x: 0.1, width: 0.25, color: '#4a6fa5' },
                        { id: 'radio', text: 'Radio', x: 0.4, width: 0.25, color: '#4a6fa5' },
                        { id: 'defend', text: 'Defend', x: 0.7, width: 0.25, color: '#4a6fa5' }
                    ],
                    shop: [
                        { id: 'back', text: 'Back', x: 0.1, width: 0.2, color: '#4a6fa5' }
                    ]
                }
            },
            shop: {
                top: 0.3,
                height: 0.1,
                spacing: 0.12,
                buttons: Object.entries(this.weaponShop).map(([id, weapon], index) => ({
                    id,
                    text: `${weapon.name} - ${weapon.price} coins`,
                    x: 0.1,
                    width: 0.8,
                    color: '#4a6fa5',
                    isWeapon: true,
                    index
                }))
            },
            controls: {
                top: 0.7,
                height: 0.2,
                buttons: [
                    { id: 'left', text: '←', x: 0.1, width: 0.2, color: '#333', isControl: true },
                    { id: 'right', text: '→', x: 0.35, width: 0.2, color: '#333', isControl: true },
                    { id: 'shoot', text: 'SHOOT', x: 0.6, width: 0.3, color: '#f00' }
                ]
            }
        };

        // Initialize shop selection
        this.shopSelection = 0;
    }

    startGameLoop() {
        setInterval(() => this.update(), 1000/60);
    }

    getButtonsForRegion(region) {
        if (region === this.ui.menu) {
            return region.buttons[this.gameState] || [];
        } else if (region === this.ui.shop) {
            // Filter out secret weapons if scroll not found
            return region.buttons.filter(button => 
                !button.isWeapon || 
                !this.weaponShop[button.id].secret || 
                this.oakTree.scrollFound
            );
        }
        return region.buttons || [];
    }
} 