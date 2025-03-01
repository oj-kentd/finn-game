// Enemy class to handle different types of enemies
class Enemy {
    constructor(type, x, y) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.alive = true;
        this.width = 32;
        this.height = 32;
        
        // Enemy type configurations with adjusted speeds
        const enemyTypes = {
            zombie:   { health: 100, speed: 0.5, damage: 10, color: '#3a5f0b' },
            skeleton: { health: 70,  speed: 1, damage: 15, color: '#e0e0e0' },
            snake:    { health: 50,  speed: 1.5, damage: 5,  color: '#2d5a27' },
            monster:  { health: 150, speed: 0.3, damage: 20, color: '#8b0000' },
            vampire:  { health: 120, speed: 1, damage: 15, color: '#4a0404' }
        };

        // Set enemy properties based on type
        Object.assign(this, enemyTypes[type]);
    }

    update(playerX) {
        // Move towards player with smoother movement
        if (this.alive) {
            const direction = this.x < playerX ? 1 : -1;
            this.x += this.speed * direction;
        }
    }

    draw(ctx) {
        // Temporary rectangle representation of enemy
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Draw health bar
        ctx.fillStyle = 'red';
        ctx.fillRect(this.x, this.y - 10, this.width * (this.health / 100), 5);
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            this.alive = false;
        }
    }
} 