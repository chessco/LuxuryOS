import React, { useState, useEffect, useRef } from 'react';

interface CameraCaptureModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCapture: (base64Image: string) => void;
    title?: string;
}

export default function CameraCaptureModal({
    isOpen,
    onClose,
    onCapture,
    title = 'Tomar Fotografía con Cámara Web'
}: CameraCaptureModalProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
    const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    // Stop active camera stream
    const stopStream = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => {
                try {
                    track.stop();
                } catch (e) {
                    console.error('Error stopping track:', e);
                }
            });
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    };

    // List available video input devices
    const loadDevices = async () => {
        try {
            if (!navigator.mediaDevices?.enumerateDevices) return;
            const allDevices = await navigator.mediaDevices.enumerateDevices();
            const videoInputs = allDevices.filter(d => d.kind === 'videoinput');
            setDevices(videoInputs);
            if (videoInputs.length > 0 && !selectedDeviceId) {
                // Default to environment/back or the first one
                const env = videoInputs.find(d => /back|rear|trasera|environment/i.test(d.label));
                setSelectedDeviceId(env ? env.deviceId : videoInputs[0].deviceId);
            }
        } catch (err) {
            console.warn('Could not enumerate video devices:', err);
        }
    };

    // Start video stream with selected device
    const startCamera = async (deviceId?: string) => {
        setIsLoading(true);
        setError(null);
        stopStream();

        if (!navigator.mediaDevices?.getUserMedia) {
            setError('Tu navegador no soporta captura de cámara directa (getUserMedia).');
            setIsLoading(false);
            return;
        }

        try {
            const constraints: MediaStreamConstraints = {
                video: deviceId
                    ? { deviceId: { exact: deviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } }
                    : { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
                audio: false
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.setAttribute('playsinline', 'true');
                await videoRef.current.play();
            }

            await loadDevices();
            setIsLoading(false);
        } catch (err: any) {
            console.error('Error opening camera:', err);
            // Fallback to simpler constraints
            try {
                const streamFallback = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
                streamRef.current = streamFallback;
                if (videoRef.current) {
                    videoRef.current.srcObject = streamFallback;
                    videoRef.current.setAttribute('playsinline', 'true');
                    await videoRef.current.play();
                }
                await loadDevices();
                setIsLoading(false);
            } catch (fallbackErr: any) {
                setError(
                    fallbackErr?.name === 'NotAllowedError' || fallbackErr?.name === 'PermissionDeniedError'
                        ? 'Permiso de cámara denegado. Permite el acceso a la cámara en la barra de tu navegador.'
                        : 'No se pudo conectar con la cámara web. Verifica que no esté en uso por otra app.'
                );
                setIsLoading(false);
            }
        }
    };

    useEffect(() => {
        if (isOpen) {
            setCapturedPreview(null);
            startCamera(selectedDeviceId || undefined);
        } else {
            stopStream();
            setCapturedPreview(null);
            setError(null);
        }

        return () => {
            stopStream();
        };
    }, [isOpen]);

    const handleDeviceChange = (newDeviceId: string) => {
        setSelectedDeviceId(newDeviceId);
        startCamera(newDeviceId);
    };

    const handleTakePhoto = () => {
        if (!videoRef.current) return;
        const video = videoRef.current;
        const width = video.videoWidth || 1280;
        const height = video.videoHeight || 720;

        const canvas = canvasRef.current || document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(video, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
        setCapturedPreview(dataUrl);
    };

    const handleConfirm = () => {
        if (capturedPreview) {
            onCapture(capturedPreview);
            stopStream();
            onClose();
        }
    };

    const handleRetake = () => {
        setCapturedPreview(null);
        if (!streamRef.current) {
            startCamera(selectedDeviceId || undefined);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-3xl sm:rounded-[32px] overflow-hidden shadow-2xl flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/80 bg-zinc-900/50">
                    <div className="flex items-center gap-2.5">
                        <span className="flex size-8 items-center justify-center rounded-xl bg-red-500/10 text-red-500 border border-red-500/20">
                            <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                        </span>
                        <div>
                            <h3 className="text-sm font-black text-white uppercase tracking-wider">{title}</h3>
                            <p className="text-[10px] text-zinc-400">Captura en vivo con tu cámara web o dispositivo</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            stopStream();
                            onClose();
                        }}
                        className="size-8 rounded-full bg-zinc-800/60 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
                        title="Cerrar"
                    >
                        <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                </div>

                {/* Body: Video Feed or Snapshot */}
                <div className="relative aspect-[4/3] sm:aspect-[16/10] bg-black flex items-center justify-center overflow-hidden">
                    {capturedPreview ? (
                        <img
                            src={capturedPreview}
                            alt="Foto capturada"
                            className="w-full h-full object-contain bg-black"
                        />
                    ) : (
                        <>
                            <video
                                ref={videoRef}
                                className={`w-full h-full object-cover ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
                                playsInline
                                muted
                            />
                            {isLoading && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-950 text-zinc-400">
                                    <div className="size-8 border-2 border-red-500/20 border-t-red-500 rounded-full animate-spin"></div>
                                    <span className="text-xs uppercase font-bold tracking-widest text-zinc-400">Iniciando cámara...</span>
                                </div>
                            )}
                        </>
                    )}

                    {error && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-zinc-950/95 text-red-400 gap-3">
                            <span className="material-symbols-outlined text-4xl text-red-500">videocam_off</span>
                            <p className="text-xs max-w-md font-semibold text-zinc-300">{error}</p>
                            <button
                                type="button"
                                onClick={() => startCamera(selectedDeviceId || undefined)}
                                className="px-4 py-2 mt-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors"
                            >
                                Reintentar
                            </button>
                        </div>
                    )}

                    {/* Camera selector pill in overlay (if multiple devices) */}
                    {!capturedPreview && devices.length > 1 && !error && (
                        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
                            <span className="material-symbols-outlined text-xs text-zinc-400">cameraswitch</span>
                            <select
                                value={selectedDeviceId}
                                onChange={(e) => handleDeviceChange(e.target.value)}
                                className="bg-transparent text-[11px] font-bold text-zinc-200 outline-none cursor-pointer pr-1"
                            >
                                {devices.map((device, idx) => (
                                    <option key={device.deviceId} value={device.deviceId} className="bg-zinc-900 text-white">
                                        {device.label || `Cámara ${idx + 1}`}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="p-4 sm:p-5 bg-zinc-900/90 border-t border-zinc-800 flex items-center justify-between gap-3">
                    {capturedPreview ? (
                        <>
                            <button
                                type="button"
                                onClick={handleRetake}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white text-xs font-bold uppercase tracking-wider transition-all active:scale-95"
                            >
                                <span className="material-symbols-outlined text-base">replay</span>
                                <span>Tomar Otra</span>
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirm}
                                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-red-600/30 active:scale-95"
                            >
                                <span className="material-symbols-outlined text-base">check</span>
                                <span>Usar Esta Foto</span>
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={() => {
                                    stopStream();
                                    onClose();
                                }}
                                className="px-4 py-2.5 rounded-xl bg-zinc-800/60 hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs font-bold uppercase tracking-wider transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                disabled={isLoading || !!error}
                                onClick={handleTakePhoto}
                                className="flex items-center gap-2 px-7 py-3 rounded-2xl bg-white hover:bg-zinc-200 text-black text-xs font-black uppercase tracking-widest transition-all shadow-xl active:scale-95 disabled:opacity-50"
                            >
                                <span className="material-symbols-outlined text-lg">photo_camera</span>
                                <span>Tomar Foto</span>
                            </button>
                        </>
                    )}
                </div>

                <canvas ref={canvasRef} className="hidden" />
            </div>
        </div>
    );
}
