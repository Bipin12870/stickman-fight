import { Entity } from '../entities/Entity';

export class PhysicsSystem {
    private gravity: number = 0.5;
    private friction: number = 0.8;

    public update(entities: Entity[], delta: number) {
        entities.forEach(entity => {
            // Apply gravity
            entity.velocity.y += this.gravity * (delta / 16.67);

            // Apply velocity
            entity.position.x += entity.velocity.x * (delta / 16.67);
            entity.position.y += entity.velocity.y * (delta / 16.67);
            entity.position.z += entity.velocity.z * (delta / 16.67);

            // Simple ground collision (placeholder)
            const groundY = 300;
            if (entity.position.y > groundY) {
                entity.position.y = groundY;
                entity.velocity.y = 0;
                entity.velocity.x *= this.friction;
                entity.velocity.z *= this.friction;
            }
        });
    }

    public checkCollision(a: Entity, b: Entity): boolean {
        // Simple AABB collision for now
        return (
            a.position.x < b.position.x + b.width &&
            a.position.x + a.width > b.position.x &&
            a.position.y < b.position.y + b.height &&
            a.position.y + a.height > b.position.y
        );
    }
}

export const physicsSystem = new PhysicsSystem();
