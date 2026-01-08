/* Copyright (c) 2025 XBID LABS LLC
 *
 * This file is part of XBID-AI project.
 * Licensed under the MIT License.
 * Author: Fred Kyung-jin Rezeau (오경진 吳景振) <hello@kyungj.in>
 */

import { css } from 'lit';

export const animations = css`
    @keyframes flip-square {
        0% {
            transform: perspective(50px) rotate(45deg) rotateX(0deg) rotateY(0deg);
        }
        50% {
            transform: perspective(50px) rotate(45deg) rotateX(-180deg) rotateY(0deg);
        }
        100% {
            transform: perspective(50px) rotate(45deg) rotateX(-180deg) rotateY(-180deg);
        }
    }

    @keyframes pulse {
        0%, 100% { 
            opacity: 1; 
        }
        50% { 
            opacity: 0.6; 
        }
    }

    @keyframes fadeSlideIn {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }

    @keyframes line {
        from {
            background-position: -60px 0;
        }
        to {
            background-position: 60px 0;
        }
    }

    @keyframes blink {
        0%, 50% {
            opacity: 1;
        }
        51%, 100% {
            opacity: 0;
        }
    }

    @keyframes fadeIn {
        from {
            opacity: 0;
            transform: scale(0.5, 0.5) translateY(40px);
        }

        to {
            opacity: 1;
            transform: scale(1, 1) translateY(0);
        }
    }

    @keyframes fadeOut {
        from {
            opacity: 0.7;
            transform: scale(0.7, 0.7) translateY(0);
        }

        to {
            opacity: 0;
            transform: scale(0.5, 0.5) translateY(60px);
        }
    }
`;
