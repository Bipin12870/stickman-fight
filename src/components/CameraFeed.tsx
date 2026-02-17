import React, { useEffect, useRef } from 'react';
import { cameraService } from '../game/systems/CameraService';

export const CameraFeed: React.FC = () => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        async function setup() {
            const video = await cameraService.init();
            if (videoRef.current) {
                videoRef.current.srcObject = video.srcObject;
            }
        }
        setup();
    }, []);

    return (
        <div style={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            width: '240px',
            height: '180px',
            border: '2px solid #00ffff',
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 0 15px rgba(0, 255, 255, 0.5)',
            backgroundColor: '#000',
            zIndex: 100
        }}>
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transform: 'scaleX(-1)', // Mirror effect
                    opacity: 0.7
                }}
            />
            {/* HUD Overlay */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                background: 'linear-gradient(rgba(0, 255, 255, 0.05) 50%, rgba(0, 0, 0, 0.1) 50%)',
                backgroundSize: '100% 4px',
                border: '1px solid rgba(0, 255, 255, 0.2)'
            }} />
            <div style={{
                position: 'absolute',
                top: '5px',
                left: '5px',
                color: '#00ffff',
                fontSize: '10px',
                fontFamily: 'monospace',
                textShadow: '0 0 5px #00ffff'
            }}>
                LIVE FEED // POSE_DETECT_ACTIVE
            </div>
            {/* Targeting brackets */}
            <div style={{
                position: 'absolute',
                top: '20%',
                left: '20%',
                width: '60%',
                height: '60%',
                border: '1px solid rgba(0, 255, 255, 0.3)',
                boxSizing: 'border-box'
            }} />
        </div>
    );
};
