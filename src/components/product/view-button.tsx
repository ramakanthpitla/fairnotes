'use client';

export function ViewButton() {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const viewer = document.getElementById('viewer');
    if (viewer) {
      viewer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <a
      href="#viewer"
      onClick={handleClick}
      className="rounded-md bg-primary text-primary-foreground px-4 py-2.5 text-center font-medium hover:opacity-90 transition-opacity"
    >
      View now
    </a>
  );
}

