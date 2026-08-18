export type DependencyName = 'mysql' | 'redis';
export type DependencyStatus = 'up' | 'down';

export interface DependencyStatusSnapshot {
  name: DependencyName;
  status: DependencyStatus;
  lastCheckedAt?: string;
  lastChangedAt?: string;
  lastError?: string;
}

export interface DependencyStatusMap {
  mysql: DependencyStatusSnapshot;
  redis: DependencyStatusSnapshot;
}
