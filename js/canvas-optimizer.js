/**
 * CanvasOptimizer - Optimizes canvas rendering with dirty rect technique
 * Reduces unnecessary redraws for better performance
 */
class CanvasOptimizer {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.dirtyRects = [];
        this.previousState = null;
        this.useLayering = true;
        this.layers = new Map();
    }

    /**
     * Mark a region as dirty (needs redraw)
     */
    markDirty(x, y, width, height) {
        this.dirtyRects.push({
            x: Math.floor(x),
            y: Math.floor(y),
            width: Math.ceil(width),
            height: Math.ceil(height)
        });
    }

    /**
     * Mark entire canvas as dirty
     */
    markAllDirty() {
        this.dirtyRects = [{
            x: 0,
            y: 0,
            width: this.canvas.width,
            height: this.canvas.height
        }];
    }

    /**
     * Clear only dirty regions
     */
    clearDirtyRegions() {
        if (this.dirtyRects.length === 0) return;

        const merged = this.mergeDirtyRects();

        merged.forEach(rect => {
            this.ctx.clearRect(rect.x, rect.y, rect.width, rect.height);
        });
    }

    /**
     * Merge overlapping dirty rectangles for efficiency
     */
    mergeDirtyRects() {
        if (this.dirtyRects.length === 0) return [];
        if (this.dirtyRects.length === 1) return this.dirtyRects;

        // Simple merge: combine all into one if too many
        if (this.dirtyRects.length > 10) {
            const bounds = this.getBoundingRect(this.dirtyRects);
            return [bounds];
        }

        // Otherwise use basic overlap detection
        const merged = [];
        const sorted = [...this.dirtyRects].sort((a, b) => a.x - b.x);

        for (let i = 0; i < sorted.length; i++) {
            let current = sorted[i];
            let didMerge = false;

            for (let j = 0; j < merged.length; j++) {
                if (this.rectsOverlap(current, merged[j])) {
                    merged[j] = this.mergeRects(current, merged[j]);
                    didMerge = true;
                    break;
                }
            }

            if (!didMerge) {
                merged.push(current);
            }
        }

        return merged;
    }

    /**
     * Check if two rectangles overlap
     */
    rectsOverlap(r1, r2) {
        return !(r1.x + r1.width < r2.x ||
                 r2.x + r2.width < r1.x ||
                 r1.y + r1.height < r2.y ||
                 r2.y + r2.height < r1.y);
    }

    /**
     * Merge two rectangles into their bounding rectangle
     */
    mergeRects(r1, r2) {
        const x = Math.min(r1.x, r2.x);
        const y = Math.min(r1.y, r2.y);
        const right = Math.max(r1.x + r1.width, r2.x + r2.width);
        const bottom = Math.max(r1.y + r1.height, r2.y + r2.height);

        return {
            x,
            y,
            width: right - x,
            height: bottom - y
        };
    }

    /**
     * Get bounding rectangle of all dirty rects
     */
    getBoundingRect(rects) {
        if (rects.length === 0) return null;

        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        rects.forEach(rect => {
            minX = Math.min(minX, rect.x);
            minY = Math.min(minY, rect.y);
            maxX = Math.max(maxX, rect.x + rect.width);
            maxY = Math.max(maxY, rect.y + rect.height);
        });

        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    }

    /**
     * Clear dirty rects array
     */
    clearDirtyRectsList() {
        this.dirtyRects = [];
    }

    /**
     * Save canvas state
     */
    saveState() {
        this.previousState = this.ctx.getImageData(
            0, 0, this.canvas.width, this.canvas.height
        );
    }

    /**
     * Restore canvas state
     */
    restoreState() {
        if (this.previousState) {
            this.ctx.putImageData(this.previousState, 0, 0);
        }
    }

    /**
     * Create an off-screen layer
     */
    createLayer(id, width, height) {
        const layerCanvas = document.createElement('canvas');
        layerCanvas.width = width || this.canvas.width;
        layerCanvas.height = height || this.canvas.height;
        const layerCtx = layerCanvas.getContext('2d');

        this.layers.set(id, {
            canvas: layerCanvas,
            ctx: layerCtx,
            dirty: true
        });

        return { canvas: layerCanvas, ctx: layerCtx };
    }

    /**
     * Get layer by ID
     */
    getLayer(id) {
        return this.layers.get(id);
    }

    /**
     * Mark layer as dirty
     */
    markLayerDirty(id) {
        const layer = this.layers.get(id);
        if (layer) {
            layer.dirty = true;
        }
    }

    /**
     * Composite all layers onto main canvas
     */
    compositeLayers() {
        this.layers.forEach((layer, id) => {
            if (layer.dirty) {
                this.ctx.drawImage(layer.canvas, 0, 0);
                layer.dirty = false;
            }
        });
    }

    /**
     * Clear a specific layer
     */
    clearLayer(id) {
        const layer = this.layers.get(id);
        if (layer) {
            layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
            layer.dirty = true;
        }
    }

    /**
     * Remove a layer
     */
    removeLayer(id) {
        this.layers.delete(id);
    }

    /**
     * Optimize drawing by batching operations
     */
    batchDraw(drawOperations) {
        this.ctx.save();

        // Group operations by type
        const batched = {
            circles: [],
            rectangles: [],
            paths: [],
            images: []
        };

        drawOperations.forEach(op => {
            if (batched[op.type]) {
                batched[op.type].push(op);
            }
        });

        // Draw all circles
        if (batched.circles.length > 0) {
            batched.circles.forEach(op => {
                this.ctx.beginPath();
                this.ctx.arc(op.x, op.y, op.radius, 0, Math.PI * 2);
                if (op.fill) {
                    this.ctx.fillStyle = op.fill;
                    this.ctx.fill();
                }
                if (op.stroke) {
                    this.ctx.strokeStyle = op.stroke;
                    this.ctx.stroke();
                }
            });
        }

        // Draw all rectangles
        if (batched.rectangles.length > 0) {
            batched.rectangles.forEach(op => {
                if (op.fill) {
                    this.ctx.fillStyle = op.fill;
                    this.ctx.fillRect(op.x, op.y, op.width, op.height);
                }
                if (op.stroke) {
                    this.ctx.strokeStyle = op.stroke;
                    this.ctx.strokeRect(op.x, op.y, op.width, op.height);
                }
            });
        }

        this.ctx.restore();
    }

    /**
     * Use requestAnimationFrame with automatic dirty rect management
     */
    createOptimizedLoop(drawCallback) {
        let lastFrameTime = 0;

        const loop = (currentTime) => {
            const deltaTime = currentTime - lastFrameTime;
            lastFrameTime = currentTime;

            // Clear dirty regions
            this.clearDirtyRegions();

            // Draw callback should mark dirty regions
            drawCallback(deltaTime, this);

            // Clear dirty rects list for next frame
            this.clearDirtyRectsList();

            requestAnimationFrame(loop);
        };

        requestAnimationFrame(loop);
    }

    /**
     * Get statistics
     */
    getStats() {
        return {
            dirtyRects: this.dirtyRects.length,
            layers: this.layers.size,
            canvasSize: {
                width: this.canvas.width,
                height: this.canvas.height
            }
        };
    }

    /**
     * Reset optimizer
     */
    reset() {
        this.dirtyRects = [];
        this.previousState = null;
        this.layers.clear();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CanvasOptimizer;
}
