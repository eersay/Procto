/**
 * Generate a Google Classroom-style course code
 * Format: xxx-xxxx-xxx (e.g., "abc-defg-hij")
 * Uses lowercase letters and numbers, easy to type
 */
export function generateCourseCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  
  const part1 = Array.from({ length: 3 }, () => 
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
  
  const part2 = Array.from({ length: 4 }, () => 
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
  
  const part3 = Array.from({ length: 3 }, () => 
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
  
  return `${part1}-${part2}-${part3}`;
}
