import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
	return twMerge(clsx(inputs));
}

/**
 * Calculate time elapsed since a given timestamp
 * @param {string|Date} publishedAt - The published timestamp
 * @returns {string} Formatted time string (e.g., "2 sec ago", "5 min ago", "3 hrs ago")
 */
export function getTimeSincePublished(publishedAt) {
  // Handle null, undefined, or invalid dates
  if (!publishedAt) return 'Just now';
  
  try {
    const now = new Date();
    const published = new Date(publishedAt);
    
    // Check if date is valid
    if (isNaN(published.getTime())) return 'Just now';
    
    const diffMs = now - published;
    
    // Handle future dates or negative differences
    if (diffMs < 0) return 'Just now';
    
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    
    if (diffSeconds < 10) return 'Few sec ago';
    if (diffSeconds < 60) return `${diffSeconds} sec ago`;
    if (diffMinutes < 60) return `${diffMinutes} min ago`;
    if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hr' : 'hrs'} ago`;
    if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
    if (diffWeeks < 4) return `${diffWeeks} ${diffWeeks === 1 ? 'week' : 'weeks'} ago`;
    if (diffMonths < 12) return `${diffMonths} ${diffMonths === 1 ? 'month' : 'months'} ago`;
    
    const diffYears = Math.floor(diffMonths / 12);
    return `${diffYears} ${diffYears === 1 ? 'year' : 'years'} ago`;
  } catch (error) {
    // Fallback for any unexpected errors
    console.warn('Error calculating time since published:', error);
    return 'Just now';
  }
}