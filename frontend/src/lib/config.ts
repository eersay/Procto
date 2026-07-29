/**
 * Procto: AI-powered online exam proctoring system.
 * Copyright (c) 2026 Bhagyasree Roy. All rights reserved.
 */

export const getApiBaseUrl = () => {
  return import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';
};
