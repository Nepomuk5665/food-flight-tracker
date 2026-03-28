import { describe, it, expect, vi, beforeEach } from 'vitest';
import { onRecallCreated, emitRecallCreated } from '@/lib/recall-events';

describe('recall-events', () => {
  beforeEach(() => {
    // Clear globalThis listeners between tests
    (globalThis as any).__recall_event_listeners__ = undefined;
  });

  it('calls registered listener with event payload', () => {
    const listener = vi.fn();
    onRecallCreated(listener);
    
    const event = { recallId: 'r1', reason: 'contamination', severity: 'critical', lotCodes: ['L001'] };
    emitRecallCreated(event);
    
    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(event);
  });

  it('unsubscribe removes listener', () => {
    const listener = vi.fn();
    const unsubscribe = onRecallCreated(listener);
    unsubscribe();
    
    emitRecallCreated({ recallId: 'r2', reason: 'test', severity: 'low', lotCodes: [] });
    
    expect(listener).not.toHaveBeenCalled();
  });
});
