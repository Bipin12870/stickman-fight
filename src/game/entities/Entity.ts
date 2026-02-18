export type Vector3 = {
    x: number;
    y: number;
    z: number;
};

export abstract class Entity {
    public position: Vector3 = { x: 0, y: 0, z: 0 };
    public velocity: Vector3 = { x: 0, y: 0, z: 0 };
    public width: number = 50;
    public height: number = 100;
    public color: string = '#fff';

    abstract update(delta: number): void;
    abstract draw(ctx: CanvasRenderingContext2D, interpolation: number): void;
}
