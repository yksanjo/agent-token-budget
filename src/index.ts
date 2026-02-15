/**
 * Agent Token Budget Manager
 * Pre-execution cost estimator with hard limits, alerting, and auto-fallback
 */

export enum ExecutionMode {
  CHAT = 'chat',
  SINGLE_AGENT = 'single',
  MULTI_AGENT = 'multi'
}

export enum AlertLevel {
  WARNING = 'warning',
  CRITICAL = 'critical',
  EXCEEDED = 'exceeded'
}

export interface BudgetStatus {
  used: number;
  remaining: number;
  percentage: number;
  alertLevel: AlertLevel | null;
}

export interface TokenBudgetOptions {
  defaultBudget: number;
  warningThreshold?: number;
  criticalThreshold?: number;
  enableAutoFallback?: boolean;
}

export interface BudgetAlert {
  level: AlertLevel;
  message: string;
}

const COST_MULTIPLIERS: Record<ExecutionMode, number> = {
  [ExecutionMode.CHAT]: 1,
  [ExecutionMode.SINGLE_AGENT]: 4,
  [ExecutionMode.MULTI_AGENT]: 15
};

export class TokenBudgetManager {
  private maxTokens: number;
  private warningThreshold: number;
  private criticalThreshold: number;
  private enableAutoFallback: boolean;
  private used: number = 0;
  private alerts: BudgetAlert[] = [];

  constructor(options: TokenBudgetOptions) {
    this.maxTokens = options.defaultBudget;
    this.warningThreshold = options.warningThreshold || 0.7;
    this.criticalThreshold = options.criticalThreshold || 0.9;
    this.enableAutoFallback = options.enableAutoFallback ?? true;
  }

  getStatus(): BudgetStatus {
    const remaining = this.maxTokens - this.used;
    const percentage = this.used / this.maxTokens;
    let alertLevel: AlertLevel | null = null;
    if (percentage >= this.criticalThreshold) alertLevel = AlertLevel.CRITICAL;
    else if (percentage >= this.warningThreshold) alertLevel = AlertLevel.WARNING;
    return { used: this.used, remaining: Math.max(0, remaining), percentage: Math.min(1, percentage), alertLevel };
  }

  estimateCost(tokens: number, mode: ExecutionMode): number {
    return tokens * COST_MULTIPLIERS[mode];
  }

  canExecute(tokens: number, mode: ExecutionMode): { allowed: boolean; estimatedCost: number; fallback?: ExecutionMode; reason?: string } {
    const estimatedCost = this.estimateCost(tokens, mode);
    const status = this.getStatus();
    if (status.used + estimatedCost <= this.maxTokens) return { allowed: true, estimatedCost };
    if (this.enableAutoFallback) {
      const fallback = this.findFallback(tokens);
      if (fallback) return { allowed: false, estimatedCost, fallback, reason: `Use ${fallback} mode` };
    }
    return { allowed: false, estimatedCost, reason: 'Budget exceeded' };
  }

  private findFallback(tokens: number): ExecutionMode | null {
    const remaining = this.maxTokens - this.used;
    if (tokens * COST_MULTIPLIERS[ExecutionMode.CHAT] <= remaining) return ExecutionMode.CHAT;
    if (tokens * COST_MULTIPLIERS[ExecutionMode.SINGLE_AGENT] <= remaining) return ExecutionMode.SINGLE_AGENT;
    return null;
  }

  reserve(tokens: number, mode: ExecutionMode): string {
    this.used += this.estimateCost(tokens, mode);
    return `reserve_${Date.now()}`;
  }

  consume(tokens: number, mode: ExecutionMode): void {
    this.used += this.estimateCost(tokens, mode);
  }

  reset(): void {
    this.used = 0;
    this.alerts = [];
  }
}

export default TokenBudgetManager;
