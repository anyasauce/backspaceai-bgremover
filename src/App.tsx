import React, { useState, useEffect, useRef } from "react";
import { Upload, FileImage, CheckCircle, Download, Trash2 } from "lucide-react";

type AnimationState = "idle" | "animating" | "completed";
type Position = {
  x: number;
  y: number;
  delay: number;
  active: boolean;
  currentRadius: number;
};

const BackgroundRemover: React.FC = () => {
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [animationState, setAnimationState] = useState<AnimationState>("idle");
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result as string);
      setImage(file);
      setResultUrl(null);
      setAnimationState("idle");
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileChange({ target: { files: [file] } } as any);
    }
  };

  const resetAll = (): void => {
    setImage(null);
    setPreviewUrl(null);
    setResultUrl(null);
    setAnimationState("idle");
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const processImage = async (): Promise<void> => {
    if (!image) return;

    setLoading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("image_file", image);
    formData.append("size", "auto");

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          const newProgress = prev + Math.random() * 15;
          return newProgress >= 90 ? 90 : newProgress;
        });
      }, 300);

      const response = await fetch("https://api.remove.bg/v1.0/removebg", {
        method: "POST",
        headers: {
          "X-Api-Key": "urtnd39BHtrmc6uqTUDrZfBr",
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`API returned status: ${response.status}`);
      }

      const blob = await response.blob();
      const resultUrl = URL.createObjectURL(blob);

      clearInterval(progressInterval);
      setUploadProgress(100);

      setResultUrl(resultUrl);

      setAnimationState("animating");
    } catch (error) {
      console.error("Error removing background:", error);
      alert("Failed to remove background. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (
      animationState !== "animating" ||
      !previewUrl ||
      !resultUrl ||
      !canvasRef.current
    )
      return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const originalImg = new Image();
    originalImg.src = previewUrl;

    const resultImg = new Image();
    resultImg.src = resultUrl;
    resultImg.onload = () => {
      canvas.width = resultImg.width;
      canvas.height = resultImg.height;

      ctx.drawImage(originalImg, 0, 0, canvas.width, canvas.height);

      const positions: Position[] = [];
      const maxRadius = Math.max(canvas.width, canvas.height) * 0.8;

      const numPositions = 12;
      for (let i = 0; i < numPositions; i++) {
        positions.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          delay: i * 80,
          active: false,
          currentRadius: 0,
        });
      }

      let startTime: number | null = null;

      const animate = (timestamp: number): void => {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;

        positions.forEach((pos) => {
          if (elapsed > pos.delay) {
            pos.active = true;
            if (pos.currentRadius < maxRadius) {
              pos.currentRadius = Math.min(
                maxRadius,
                (elapsed - pos.delay) / 5
              );
            }
          }
        });

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.drawImage(originalImg, 0, 0, canvas.width, canvas.height);

        positions.forEach((pos) => {
          if (pos.active) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, pos.currentRadius, 0, Math.PI * 2);
            ctx.clip();

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(resultImg, 0, 0, canvas.width, canvas.height);

            ctx.restore();
          }
        });

        const allComplete = positions.every(
          (pos) => pos.active && pos.currentRadius >= maxRadius
        );

        if (allComplete) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(resultImg, 0, 0, canvas.width, canvas.height);
          setAnimationState("completed");
          return;
        }

        animationFrameRef.current = requestAnimationFrame(animate);
      };

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [animationState, previewUrl, resultUrl]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-6">
      <div className="w-full max-w-3xl bg-gray-800 rounded-xl shadow-2xl overflow-hidden border border-gray-700">
        <div className="p-6 bg-gray-800 border-b border-gray-700">
          <h1 className="text-3xl font-bold text-center bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text text-transparent">
            Backspace AI Background Remover
          </h1>
        </div>

        <div className="p-6">
          {!image ? (
            <div
              className="border-2 border-dashed border-gray-600 rounded-lg p-10 flex flex-col items-center justify-center cursor-pointer hover:border-purple-500 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDragEnter={(e) => e.preventDefault()} // Prevent browser's default handling
              onDragLeave={(e) => e.preventDefault()} // Prevent browser's default handling
            >
              <Upload className="w-16 h-16 text-purple-500 mb-4" />
              <p className="text-xl font-medium text-gray-300 mb-2">
                Drop your image here
              </p>
              <p className="text-sm text-gray-500">or click to browse</p>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
              />
            </div>
          )  : (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="w-full md:w-1/2">
                  <div className="aspect-square relative overflow-hidden rounded-lg border border-gray-700 bg-gray-900">
                    {previewUrl && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <img
                          src={previewUrl}
                          alt="Preview"
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                    )}
                    <div className="absolute bottom-2 right-2">
                      <button
                        onClick={resetAll}
                        className="p-2 bg-gray-800 rounded-full hover:bg-red-900 transition-colors"
                      >
                        <Trash2 className="w-5 h-5 text-red-500" />
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 text-center text-gray-400">
                    Original Image
                  </p>
                </div>

                <div className="w-full md:w-1/2">
                  <div
                    className="aspect-square relative overflow-hidden rounded-lg border border-gray-700"
                    style={{
                      background: "repeating-crisscross-pattern, #f0f0f0",
                      backgroundImage:
                        "linear-gradient(45deg, #444 25%, transparent 25%, transparent 75%, #444 75%, #444), linear-gradient(45deg, #444 25%, transparent 25%, transparent 75%, #444 75%, #444)",
                      backgroundSize: "16px 16px",
                      backgroundPosition: "0 0, 8px 8px",
                    }}
                  >
                    {animationState === "idle" ? (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                        <div className="text-center">
                          <FileImage className="w-16 h-16 mx-auto mb-2 opacity-50" />
                          <p>Result will appear here</p>
                        </div>
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <canvas
                          ref={canvasRef}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                    )}
                  </div>
                  <p className="mt-2 text-center text-gray-400">
                    Processed Result
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-center space-y-4">
                {loading ? (
                  <div className="w-full">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-400">
                        Removing background...
                      </span>
                      <span className="text-sm text-gray-400">
                        {Math.round(uploadProgress)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={processImage}
                    disabled={!image || animationState !== "idle"}
                    className={`px-6 py-3 rounded-full flex items-center space-x-2 shadow-lg transition-all ${
                      !image || animationState !== "idle"
                        ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                        : "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white"
                    }`}
                  >
                    {animationState === "completed" ? (
                      <>
                        <CheckCircle className="w-5 h-5 mr-2" />
                        <span>Completed</span>
                      </>
                    ) : (
                      <>
                        <span>Remove Background</span>
                      </>
                    )}
                  </button>
                )}

                {animationState === "completed" && (
                  <a
                    href={resultUrl || "#"}
                    download="no-background.png"
                    className="px-6 py-3 bg-green-600 hover:bg-green-500 rounded-full flex items-center space-x-2 shadow-lg transition-colors"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    <span>Download Result</span>
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-gray-900 text-center text-gray-500 text-sm">
          Upload an image and watch the Backspace AI happen with our animated
          background removal.
          <br />
          If you want to use the color palette extractor, check it out here:{" "}
          <a
            href="https://nightshadepalette.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-500 hover:underline"
          >
            Nightshade Palette Extractor
          </a>
          <br />
          Powered by{" "}
          <a
            href="https://www.remove.bg/api"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-500 hover:underline"
          >
            remove.bg API
          </a>
          <br />
          Created by{" "}
          <a
            href="https://josiahh.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-500 hover:underline"
          >
            Josiah Dev
          </a>
        </div>
      </div>
    </div>
  );
};

export default BackgroundRemover;
