import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

function WorldCamera({ children }) {
  return (
    <div className="w-screen h-screen overflow-hidden relative">
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
          <div className="w-[3300px] h-[3300px] p-[150px] box-border bg-muted/30 relative">
            {children}
          </div>
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
}

export default WorldCamera;
