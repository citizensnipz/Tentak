import React from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

function WorldCamera({ children }) {
  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <TransformWrapper
        minScale={0.5}
        maxScale={3}
        panning={{
          allowLeftClickPan: true,
          excluded: ['input', 'textarea', 'select', 'button', 'task-card', 'table-header'],
        }}
        wheel={{ step: 0.1 }}
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
            style={{
              width: '3300px',
              height: '3300px',
              padding: '150px',
              boxSizing: 'border-box',
              background: '#fafafa',
              position: 'relative',
            }}
          >
            {children}
          </div>
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
}

export default WorldCamera;
