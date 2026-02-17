export type Vector2 = {
    x: number;
    y: number;
};

export abstract class Entity {
    public position: Vector2 = { x: 0, y: 0 };
    public velocity: Vector2 = { x: 0, y: 0 };
    public width: number = 50;
    public height: number = 100;
    public color: string = '#fff';

    abstract update(delta: number): void;
    abstract draw(ctx: CanvasRenderingContext2D, interpolation: number): void;
}
