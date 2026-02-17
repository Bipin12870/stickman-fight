import React, { useRef, useEffect } from 'react';
import { gameInstance } from '../game/Game';

export const GameCanvas: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (canvasRef.current) {
            // Ensure canvas fits window
            canvasRef.current.width = window.innerWidth;
            canvasRef.current.height = window.innerHeight;

            gameInstance.init(canvasRef.current);
        }

        const handleResize = () => {
            if (canvasRef.current) {
                canvasRef.current.width = window.innerWidth;
                canvasRef.current.height = window.innerHeight;
            }
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            gameInstance.destroy();
        };
    }, []);

    return <canvas ref={canvasRef} style={{ display: 'block' }} />;
};
