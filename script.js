document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const targetColorPicker = document.getElementById('targetColorPicker');
    const targetColorHex = document.getElementById('targetColorHex');
    const targetBox = document.getElementById('targetBox');

    const matteColorPicker = document.getElementById('matteColorPicker');
    const matteColorHex = document.getElementById('matteColorHex');
    const matteBox = document.getElementById('matteBox');

    const opacityRange = document.getElementById('opacityRange');
    const opacityDisplay = document.getElementById('opacityDisplay');

    // Source Elements
    const sourceSolidHalf = document.getElementById('sourceSolidHalf');
    const sourceTransparentHalf = document.getElementById('sourceTransparentHalf');
    const sourceColorHexDisplay = document.getElementById('sourceColorHex');
    const sourceColorPicker = document.getElementById('sourceColorPicker');
    const sourceColorHexInput = document.getElementById('sourceColorHexInput');
    const copyButton = document.getElementById('copyButton');
    const errorIcon = document.getElementById('errorIcon');
    
    // Title element for mode transition
    const titleElement = document.querySelector('header h1');

    // State - Defaults
    let state = {
        target: { r: 128, g: 128, b: 128 }, // #808080
        source: { r: 0, g: 0, b: 0 }, // #000000 (初期値)
        opacity: 0.5, // 50%
        matte: { r: 255, g: 255, b: 255 }, // #ffffff
        mode: 'reverse' // 'reverse' (target→source) or 'forward' (source→target)
    };

    // Utils
    function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    function rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }

    function isValidHex(hex) {
        return /^#([0-9A-F]{3}){1,2}$/i.test(hex);
    }

    function getLuminance(r, g, b) {
        const a = [r, g, b].map(function (v) {
            v /= 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
    }

    // Core Logic
    function calculateSourceColor(target, opacity, matte) {
        if (opacity === 0) return null;

        const calculateChannel = (t, m) => {
            const val = (t - m) / opacity + m;
            return val;
        };

        const r = calculateChannel(target.r, matte.r);
        const g = calculateChannel(target.g, matte.g);
        const b = calculateChannel(target.b, matte.b);

        return { r, g, b };
    }
    
    function calculateTargetColor(source, opacity, matte) {
        const calculateChannel = (s, m) => {
            return s * opacity + m * (1 - opacity);
        };

        const r = calculateChannel(source.r, matte.r);
        const g = calculateChannel(source.g, matte.g);
        const b = calculateChannel(source.b, matte.b);

        return { r, g, b };
    }
    
    function setMode(newMode) {
        if (state.mode === newMode) return;
        state.mode = newMode;
        
        // Update title transform with transition
        if (titleElement) {
            if (newMode === 'forward') {
                titleElement.style.transform = 'scaleX(1)';
            } else {
                titleElement.style.transform = 'scaleX(-1)';
            }
        }
        
        // Update source box style
        const sourceBox = document.getElementById('sourceBox');
        if (sourceBox) {
            if (newMode === 'forward') {
                sourceBox.classList.add('clickable');
            } else {
                sourceBox.classList.remove('clickable');
            }
        }
    }

    function updateUI() {
        const matteLum = getLuminance(state.matte.r, state.matte.g, state.matte.b);
        const matteTextColor = matteLum > 0.5 ? '#000000' : '#ffffff';

        // Smart contrast for source text inside matte
        if (sourceColorHexDisplay) {
            sourceColorHexDisplay.style.color = matteTextColor;
        }
        if (copyButton) {
            copyButton.style.color = matteTextColor;
        }
        const sourceLabel = document.querySelector('.label-source');
        if (sourceLabel) {
            sourceLabel.style.color = matteLum > 0.5 ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.4)';
        }

        opacityDisplay.textContent = Math.round(state.opacity * 100) + "% of";

        const matteHex = rgbToHex(state.matte.r, state.matte.g, state.matte.b);
        matteColorPicker.value = matteHex;
        matteBox.style.backgroundColor = matteHex;

        if (state.mode === 'reverse') {
            // Reverse mode: Target → Source
            const targetHex = rgbToHex(state.target.r, state.target.g, state.target.b);
            targetColorPicker.value = targetHex;
            targetColorHex.value = targetHex;
            targetBox.style.backgroundColor = targetHex;

            // Visually indicate target is editable
            targetBox.style.cursor = 'pointer';
            targetBox.style.opacity = '1';
            targetBox.style.filter = 'none';
            targetColorHex.style.opacity = '1';

            const rawSource = calculateSourceColor(state.target, state.opacity, state.matte);

            if (!rawSource || state.opacity === 0) {
                sourceColorHexDisplay.textContent = "Error";
                errorIcon.style.display = 'flex';
                copyButton.style.display = 'none';
                // Keep inputs enabled but hide hex input
                if (sourceColorHexInput) {
                    sourceColorHexInput.style.display = 'none';
                    sourceColorHexDisplay.style.display = 'block';
                }
                return;
            }

            const smartRound = (num) => {
                if (num < 1.5) return 0;
                if (num > 254.5) return 255;
                return Math.round(num);
            };
            const clamp = (num) => Math.min(255, Math.max(0, smartRound(num)));
            const clampedSource = {
                r: clamp(rawSource.r),
                g: clamp(rawSource.g),
                b: clamp(rawSource.b)
            };

            const isOutOfGamut =
                rawSource.r < -0.5 || rawSource.r > 255.5 ||
                rawSource.g < -0.5 || rawSource.g > 255.5 ||
                rawSource.b < -0.5 || rawSource.b > 255.5;

            const sourceHex = rgbToHex(clampedSource.r, clampedSource.g, clampedSource.b);
            state.source = clampedSource; // Update state for potential mode switch

            // Update Source Visuals
            const sourceBox = document.getElementById('sourceBox');
            if (isOutOfGamut) {
                // Error: Show only diagonal stripe pattern on the whole box
                const stripeGradient = 'repeating-linear-gradient(135deg, transparent, transparent 22px, rgba(179, 179, 179, 1) 22px, rgba(179, 179, 179, 1) 44px)';
                if (sourceBox) {
                    sourceBox.style.backgroundColor = 'rgba(151, 151, 151, 1)';
                    sourceBox.style.backgroundImage = stripeGradient;
                    sourceBox.style.backgroundSize = 'auto auto';
                    // Disable all potential blur causes
                    sourceBox.style.transform = 'none';
                    sourceBox.style.transition = 'none';
                    sourceBox.style.willChange = 'auto';
                    sourceBox.style.backfaceVisibility = 'visible';
                }
                sourceSolidHalf.style.display = 'none';
                sourceTransparentHalf.style.display = 'none';
                
                errorIcon.style.display = 'flex';
                sourceColorHexDisplay.textContent = "Error";
                copyButton.style.display = 'none';
                
                // Error icon always white
                const errorSvg = errorIcon.querySelector('svg');
                if (errorSvg) {
                    errorSvg.style.color = '#ffffff';
                }
                
                if (sourceColorHexInput) {
                    sourceColorHexInput.style.display = 'none';
                    sourceColorHexDisplay.style.display = 'block';
                }
            } else {
                // Normal: Show solid color
                if (sourceBox) {
                    sourceBox.style.backgroundColor = '';
                    sourceBox.style.backgroundImage = '';
                    sourceBox.style.backgroundSize = '';
                    sourceBox.style.transform = '';
                    sourceBox.style.transition = '';
                    sourceBox.style.willChange = '';
                    sourceBox.style.backfaceVisibility = '';
                }
                sourceSolidHalf.style.display = '';
                sourceTransparentHalf.style.display = '';
                sourceSolidHalf.style.background = sourceHex;
                sourceTransparentHalf.style.background = sourceHex;
                sourceTransparentHalf.style.opacity = state.opacity;
                
                errorIcon.style.display = 'none';
                sourceColorHexDisplay.textContent = sourceHex;
                copyButton.style.display = 'flex';
                
                if (sourceColorHexInput) {
                    sourceColorHexInput.value = sourceHex;
                    sourceColorHexInput.style.display = 'none';
                    sourceColorHexDisplay.style.display = 'block';
                }
            }
            
            if (sourceColorPicker) {
                sourceColorPicker.value = sourceHex;
            }

            // Hide source text input in reverse mode
            if (sourceColorHexInput) {
                sourceColorHexInput.style.display = 'none';
            }

        } else {
            // Forward mode: Source → Target
            const sourceHex = rgbToHex(state.source.r, state.source.g, state.source.b);
            
            // Restore normal source display
            const sourceBox = document.getElementById('sourceBox');
            if (sourceBox) {
                sourceBox.style.backgroundColor = '';
                sourceBox.style.backgroundImage = '';
                sourceBox.style.backgroundSize = '';
                sourceBox.style.transform = '';
                sourceBox.style.transition = '';
                sourceBox.style.willChange = '';
                sourceBox.style.backfaceVisibility = '';
            }
            sourceSolidHalf.style.display = '';
            sourceTransparentHalf.style.display = '';
            sourceSolidHalf.style.background = sourceHex;
            sourceTransparentHalf.style.background = sourceHex;
            sourceTransparentHalf.style.opacity = state.opacity;
            
            // Show source inputs in forward mode
            if (sourceColorPicker) {
                sourceColorPicker.value = sourceHex;
            }
            if (sourceColorHexInput) {
                sourceColorHexInput.value = sourceHex;
                sourceColorHexInput.style.display = 'block';
                sourceColorHexDisplay.style.display = 'none';
                // Apply matte-based text color to input
                sourceColorHexInput.style.color = matteTextColor;
            }

            errorIcon.style.display = 'none';
            copyButton.style.display = 'none';

            const calculatedTarget = calculateTargetColor(state.source, state.opacity, state.matte);
            
            // Use same smart rounding as reverse mode
            const smartRound = (num) => {
                if (num < 1.5) return 0;
                if (num > 254.5) return 255;
                return Math.round(num);
            };
            const clamp = (num) => Math.min(255, Math.max(0, smartRound(num)));
            state.target = {
                r: clamp(calculatedTarget.r),
                g: clamp(calculatedTarget.g),
                b: clamp(calculatedTarget.b)
            };

            const targetHex = rgbToHex(state.target.r, state.target.g, state.target.b);
            targetColorPicker.value = targetHex;
            targetColorHex.value = targetHex;
            targetBox.style.backgroundColor = targetHex;

            // Visually indicate target is not the input in forward mode
            targetBox.style.cursor = 'not-allowed';
            targetBox.style.opacity = '1';
            targetBox.style.filter = 'none';
            
            // Dim the hex text instead of the box
            targetColorHex.style.opacity = '0.5';
        }
    }

    // Event Listeners
    function handleHexInput(inputElement, stateKey) {
        let hex = inputElement.value;
        if (!hex.startsWith('#')) {
            hex = '#' + hex;
        }
        if (isValidHex(hex)) {
            if (hex.length === 4) {
                hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
            }
            state[stateKey] = hexToRgb(hex);
            updateUI();
        }
    }

    // Target - always switch to reverse mode when edited
    targetColorPicker.addEventListener('input', (e) => {
        setMode('reverse');
        state.target = hexToRgb(e.target.value);
        targetColorHex.value = e.target.value;
        updateUI();
    });
    
    targetColorPicker.addEventListener('click', () => {
        // Switch to reverse mode when color picker is opened
        setMode('reverse');
    });
    
    targetColorHex.addEventListener('input', (e) => {
        setMode('reverse');
        handleHexInput(e.target, 'target');
    });
    
    targetColorHex.addEventListener('focus', () => {
        setMode('reverse');
    });
    
    targetColorHex.addEventListener('blur', () => {
        targetColorHex.value = rgbToHex(state.target.r, state.target.g, state.target.b);
    });
    
    // Source - always switch to forward mode when edited
    if (sourceColorPicker) {
        sourceColorPicker.addEventListener('input', (e) => {
            setMode('forward');
            state.source = hexToRgb(e.target.value);
            if (sourceColorHexInput) {
                sourceColorHexInput.value = e.target.value;
            }
            updateUI();
        });
        
        sourceColorPicker.addEventListener('click', () => {
            // Switch to forward mode when color picker is opened
            setMode('forward');
        });
    }
    
    if (sourceColorHexInput) {
        sourceColorHexInput.addEventListener('input', (e) => {
            setMode('forward');
            let hex = e.target.value;
            if (!hex.startsWith('#')) {
                hex = '#' + hex;
            }
            if (isValidHex(hex)) {
                if (hex.length === 4) {
                    hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
                }
                state.source = hexToRgb(hex);
                updateUI();
            }
        });
        
        sourceColorHexInput.addEventListener('focus', () => {
            setMode('forward');
        });
        
        sourceColorHexInput.addEventListener('blur', () => {
            sourceColorHexInput.value = rgbToHex(state.source.r, state.source.g, state.source.b);
        });
    }

    // Matte
    matteColorPicker.addEventListener('input', (e) => {
        state.matte = hexToRgb(e.target.value);
        matteColorHex.value = e.target.value;
        updateUI();
    });
    matteColorHex.addEventListener('input', (e) => handleHexInput(e.target, 'matte'));
    matteColorHex.addEventListener('blur', () => {
        matteColorHex.value = rgbToHex(state.matte.r, state.matte.g, state.matte.b);
    });

    // Opacity
    opacityRange.addEventListener('input', (e) => {
        state.opacity = parseInt(e.target.value) / 100;
        updateUI();
    });

    // Copy
    if (copyButton) {
        copyButton.addEventListener('click', () => {
            const hex = sourceColorHexDisplay.textContent;
            if (hex !== "Error") {
                navigator.clipboard.writeText(hex).then(() => {
                    // Visual feedback could be added here
                });
            }
        });
    }
    
    // Note: Mode switching is now handled by the color picker click events above
    // No need for separate box click handlers

    // Initial Run
    updateUI();
});
