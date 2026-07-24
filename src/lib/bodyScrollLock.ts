// Ref-counted body scroll lock — prevents the race condition where one component
// restores overflow:'hidden' while another still has the lock active.
let lockCount = 0;

export function lockBodyScroll() {
  lockCount++;
  document.body.style.overflow = 'hidden';
}

export function unlockBodyScroll() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) document.body.style.overflow = '';
}
