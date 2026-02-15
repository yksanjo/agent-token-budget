/**
 * Example: Agent Token Budget Manager
 */

import { TokenBudgetManager, ExecutionMode } from '../src';

const budget = new TokenBudgetManager({ defaultBudget: 10000 });

console.log('Initial:', budget.getStatus());

const check = budget.canExecute(5000, ExecutionMode.MULTI_AGENT);
console.log('\nCan execute multi-agent?', check);

budget.reserve(1000, ExecutionMode.SINGLE_AGENT);
console.log('After reserve:', budget.getStatus());

budget.consume(800, ExecutionMode.SINGLE_AGENT);
console.log('After consume:', budget.getStatus());
