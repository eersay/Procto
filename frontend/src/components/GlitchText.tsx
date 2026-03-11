import { useState, useEffect, ElementType, HTMLAttributes } from 'react';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*!';

interface GlitchTextProps extends HTMLAttributes<HTMLElement> {
    as?: ElementType;
    children: string;
}

export default function GlitchText({ as: Tag = 'span', children, className, ...rest }: GlitchTextProps) {
    const [display, setDisplay] = useState(children);
    const [glitching, setGlitching] = useState(false);

    useEffect(() => {
        // Trigger glitch every 4 seconds
        const id = setInterval(() => {
            setGlitching(true);
            let iter = 0;
            const letters = children.split('');
            const inner = setInterval(() => {
                setDisplay(
                    letters
                        .map((c, i) => {
                            if (c === ' ') return ' ';
                            if (i < iter) return letters[i];
                            return CHARS[Math.floor(Math.random() * CHARS.length)];
                        })
                        .join('')
                );
                iter += 0.5;
                if (iter >= letters.length) {
                    clearInterval(inner);
                    setDisplay(children);
                    setGlitching(false);
                }
            }, 30);
        }, 4000);

        return () => clearInterval(id);
    }, [children]);

    return (
        <Tag
            className={`${className} ${glitching ? 'opacity-90' : ''}`}
            style={{ fontVariantNumeric: 'tabular-nums' }}
            {...rest}
        >
            {display}
        </Tag>
    );
}
