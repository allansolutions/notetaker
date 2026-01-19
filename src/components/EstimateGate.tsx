import { EstimateInput } from './EstimateInput';

interface EstimateGateProps {
  onSubmit: (minutes: number) => void;
}

export function EstimateGate({ onSubmit }: EstimateGateProps) {
  return (
    <div className="absolute inset-0 bg-surface/95 backdrop-blur-sm flex items-center justify-center z-10">
      <div className="text-center p-8">
        <h2 className="text-xl font-semibold text-primary mb-2">
          How long do you expect this task to take?
        </h2>
        <p className="text-muted mb-6">
          Set an estimate to start tracking time
        </p>
        <EstimateInput onSubmit={onSubmit} />
      </div>
    </div>
  );
}
