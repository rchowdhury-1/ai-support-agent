'use client';

import { useEffect, useState } from 'react';

/** Time-of-day greeting; client-side so static prerendering doesn't freeze it. */
export function Greeting({ name }: { name: string }) {
  const [word, setWord] = useState('Hello');
  useEffect(() => {
    const h = new Date().getHours();
    setWord(h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening');
  }, []);
  return (
    <h1 className="m-0 mb-1.5 text-[26px] font-bold tracking-[-.025em]">
      {word}, {name.split(' ')[0]}
    </h1>
  );
}
