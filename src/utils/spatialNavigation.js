/**
 * Simple Geometric Spatial Navigation for Smart TVs and Keyboard arrows.
 * Automatically manages focus between elements based on their visual coordinates.
 */

const SELECTOR = 'button, input, textarea, [tabindex="0"], a, select';

// Calculates the center of a DOMRect
function getCenter(rect) {
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2
  };
}

// Check if element is visible on screen
function isVisible(el) {
  const rect = el.getBoundingClientRect();
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    window.getComputedStyle(el).display !== 'none' &&
    window.getComputedStyle(el).visibility !== 'hidden' &&
    el.getAttribute('disabled') === null
  );
}

// Find all focusable elements on the page
function getFocusableElements() {
  const elements = Array.from(document.querySelectorAll(SELECTOR));
  return elements.filter(isVisible);
}

// Moves focus in a specific direction (ArrowUp, ArrowDown, ArrowLeft, ArrowRight)
export function moveFocus(direction) {
  const elements = getFocusableElements();
  if (elements.length === 0) return;

  const active = document.activeElement;
  
  // If no element is focused, or the active element is not in our list, focus the first one
  if (!active || active === document.body || !elements.includes(active)) {
    elements[0].focus();
    return;
  }

  const activeRect = active.getBoundingClientRect();
  const activeCenter = getCenter(activeRect);

  let bestTarget = null;
  let bestScore = Infinity;

  elements.forEach((target) => {
    if (target === active) return;

    const targetRect = target.getBoundingClientRect();
    const targetCenter = getCenter(targetRect);

    const dx = targetCenter.x - activeCenter.x;
    const dy = targetCenter.y - activeCenter.y;

    let isDirectionMatch = false;
    let score = 0;

    switch (direction) {
      case 'ArrowLeft':
        // Target must be to the left of active
        if (targetCenter.x < activeCenter.x - 2) {
          isDirectionMatch = true;
          // Score formula: prioritize horizontal proximity, penalize vertical offset
          score = Math.abs(dx) + Math.abs(dy) * 2.5;
        }
        break;
      case 'ArrowRight':
        // Target must be to the right of active
        if (targetCenter.x > activeCenter.x + 2) {
          isDirectionMatch = true;
          score = Math.abs(dx) + Math.abs(dy) * 2.5;
        }
        break;
      case 'ArrowUp':
        // Target must be above active
        if (targetCenter.y < activeCenter.y - 2) {
          isDirectionMatch = true;
          score = Math.abs(dy) + Math.abs(dx) * 2.5;
        }
        break;
      case 'ArrowDown':
        // Target must be below active
        if (targetCenter.y > activeCenter.y + 2) {
          isDirectionMatch = true;
          score = Math.abs(dy) + Math.abs(dx) * 2.5;
        }
        break;
      default:
        break;
    }

    if (isDirectionMatch && score < bestScore) {
      bestScore = score;
      bestTarget = target;
    }
  });

  if (bestTarget) {
    bestTarget.focus();
    // Scroll element into view smoothly if needed
    bestTarget.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  }
}

// Hook global keydown events for Spatial Navigation
export function initSpatialNavigation() {
  const handleKeyDown = (e) => {
    const active = document.activeElement;
    
    // Allow standard input typing for Arrow keys inside text/url inputs
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        // Let the cursor move inside the input box normally
        return;
      }
    }

    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault(); // Stop page scrolling
      moveFocus(e.key);
    }

    // Enter key support for active elements that don't trigger naturally
    if (e.key === 'Enter') {
      if (active && active !== document.body) {
        // Ensure buttons, lists, and elements are clicked
        active.click();
      }
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  
  // Focus the first element initially after a short timeout to let layout settle
  setTimeout(() => {
    const elements = getFocusableElements();
    if (elements.length > 0) {
      elements[0].focus();
    }
  }, 1000);

  return () => {
    window.removeEventListener('keydown', handleKeyDown);
  };
}
