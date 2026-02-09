import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

const DEFAULT_BOARD_BACKGROUND = '#f4f4f5';

const WorldCamera = forwardRef(function WorldCamera({ children, backgroundColor }, ref) {
  const transformRef = useRef(null);
  const isInitializedRef = useRef(false);

  useImperativeHandle(ref, () => ({
    centerOnWorldPoint(wx, wy) {
      const ctx = transformRef.current;
      if (!ctx) return;
      
      // Wait for initialization and next frame to ensure DOM and transform are ready
      const attemptCenter = () => {
        const instance = ctx.instance;
        if (!instance || !isInitializedRef.current) {
          requestAnimationFrame(attemptCenter);
          return;
        }
        
        const wrapper = instance.wrapperComponent;
        if (!wrapper) {
          requestAnimationFrame(attemptCenter);
          return;
        }
        
        // Get viewport dimensions
        const wrapperRect = wrapper.getBoundingClientRect();
        const viewportWidth = wrapperRect.width;
        const viewportHeight = wrapperRect.height;
        
        if (viewportWidth === 0 || viewportHeight === 0) {
          requestAnimationFrame(attemptCenter);
          return;
        }
        
        // Get current transform state - try multiple access patterns
        // The ref context structure: { instance, state, ...handlers }
        // state contains: { scale, positionX, positionY, previousScale }
        let currentScale = 1;
        try {
          if (ctx.state && typeof ctx.state.scale === 'number' && ctx.state.scale > 0) {
            currentScale = ctx.state.scale;
          } else if (instance.transformState && typeof instance.transformState.scale === 'number' && instance.transformState.scale > 0) {
            currentScale = instance.transformState.scale;
          } else if (instance.state && typeof instance.state.scale === 'number' && instance.state.scale > 0) {
            currentScale = instance.state.scale;
          }
        } catch (e) {
          // Fallback to scale 1 if state access fails
        }
        
        // World coordinates (wx, wy) are absolute positions in the content's coordinate system
        // The content div is 3300x3300 with 150px padding (box-border)
        // Tables use absolute positioning relative to the content box
        // Example: Today table at x=850, y=150, width=600, height=400
        // Center point: (850 + 300, 150 + 200) = (1150, 350)
        
        // Calculate the position needed to center the world point (wx, wy) in the viewport
        // CSS transform: translate(positionX, positionY) scale(scale)
        // A world point (wx, wy) appears at screen position: (wx * scale + positionX, wy * scale + positionY)
        // To center it in viewport: wx * scale + positionX = viewportWidth / 2
        // Therefore: positionX = viewportWidth / 2 - wx * scale
        const newX = viewportWidth / 2 - wx * currentScale;
        const newY = viewportHeight / 2 - wy * currentScale;
        
        // Apply the transform with smooth animation (300ms)
        ctx.setTransform(newX, newY, currentScale, 300);
      };
      
      requestAnimationFrame(attemptCenter);
    },
  }), []);

  return (
    <div className="w-full h-full overflow-hidden relative">
      <TransformWrapper
        ref={transformRef}
        minScale={0.5}
        maxScale={3}
        panning={{
          allowLeftClickPan: true,
          excluded: ['input', 'textarea', 'select', 'button', 'task-card', 'table-header'],
        }}
        wheel={{ step: 0.1 }}
        onInit={() => {
          isInitializedRef.current = true;
        }}
      >
        <TransformComponent
          wrapperStyle={{
            width: '100%',
            height: '100%',
            minWidth: '100%',
            minHeight: '100%',
          }}
        >
          <div
            className="w-[3300px] h-[3300px] p-[150px] box-border relative"
            style={{ backgroundColor: backgroundColor || DEFAULT_BOARD_BACKGROUND }}
          >
            {children}
          </div>
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
});

export default WorldCamera;
