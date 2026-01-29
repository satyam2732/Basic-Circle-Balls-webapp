document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded');

  // Get elements that actually exist in the HTML
  const circleSvg = document.getElementById('circle-svg');
  const circleElement = document.querySelector('#circle-svg circle');
  const speedUpBtn = document.getElementById('speed-up');
  const speedDownBtn = document.getElementById('speed-down');
  const breakMoreBtn = document.getElementById('break-more');
  const breakLessBtn = document.getElementById('break-less');
  const speedBallUpBtn = document.getElementById('speed-ball-up');
  const speedBallDownBtn = document.getElementById('speed-ball-down');
  const resetBtn = document.getElementById('reset');
  const speedDisplay = document.getElementById('speed-display');
  const breakDisplay = document.getElementById('break-display');
  const ballSpeedDisplay = document.getElementById('ball-speed-display');
  const ballCountDisplay = document.getElementById('ball-count-display');
  const totalBallsDisplay = document.getElementById('total-balls-display');
  const ballMessageDisplay = document.getElementById('ball-message');

  // Check if essential elements exist
  if (!circleSvg || !circleElement) {
    console.error('Circle elements not found');
    return;
  }

  let rotationDuration = 2.5; // seconds
  let breakDegrees = 30; // degrees (0-180)

  // Ball physics
  let ballSpeed = 5.0; // Constant speed (units per frame)
  const ballRadius = 4;
  const circleRadius = 80;
  const circleCenterX = 100;
  const circleCenterY = 100;
  let rotationAngle = 0; // Track current rotation of circle

  // Array to store multiple balls
  let balls = [];

  // Animation state
  let isPlaying = true;
  let animationFrameId = null;

  // Track number of ball exits for sound limiting
  let exitCount = 0;

  // Track total number of balls generated (cumulative)
  let totalBallsGenerated = 0;

  // Track last spawn time to ensure 0.5s spacing between pairs
  let lastSpawnTime = 0;

  // Sound rate limiting to prevent audio overload
  let lastCollisionSoundTime = 0;
  let lastExitSoundTime = 0;
  const minSoundInterval = 50; // Minimum milliseconds between sounds

  // Array of colors for balls
  const ballColors = [
    '#FF5722', '#2196F3', '#4CAF50', '#FFC107', '#9C27B0', '#E91E63', '#00BCD4', '#FF9800',
    '#F44336', '#3F51B5', '#009688', '#CDDC39', '#673AB7', '#FF4081', '#00E5FF', '#FFD54F',
    '#D32F2F', '#1976D2', '#388E3C', '#FBC02D', '#512DA8', '#C2185B', '#0097A7', '#F57C00',
    '#E64A19', '#1E88E5', '#689F38', '#FDD835', '#7B1FA2', '#AD1457', '#0288D1', '#FB8C00',
    '#FF6F00', '#5E35B1', '#43A047', '#C0CA33', '#8E24AA', '#D81B60', '#0277BD', '#EF6C00'
  ];

  // Audio context for sound effects - initialize immediately
  let audioContext = new (window.AudioContext || window.webkitAudioContext)();

  // Initialize audio context on first user interaction
  function initAudioContext() {
    // Resume context if suspended (required by some browsers)
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
  }

  // Function to play collision sound with circle
  async function playCircleCollisionSound() {
    // Rate limiting: only play if enough time has passed since last sound
    const currentTime = Date.now();
    if (currentTime - lastCollisionSoundTime < minSoundInterval) {
      return; // Skip this sound
    }
    lastCollisionSoundTime = currentTime;

    // Try to resume audio context if it's suspended
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(300, audioContext.currentTime + 0.1);

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  }

  // Function to play ball-to-ball collision sound (same as circle collision)
  async function playBallCollisionSound() {
    // Rate limiting: only play if enough time has passed since last sound
    const currentTime = Date.now();
    if (currentTime - lastCollisionSoundTime < minSoundInterval) {
      return; // Skip this sound
    }
    lastCollisionSoundTime = currentTime;

    // Try to resume audio context if it's suspended
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(300, audioContext.currentTime + 0.1);

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  }

  // Function to play ball exit sound (when ball leaves circle)
  async function playBallExitSound() {
    // Rate limiting: only play if enough time has passed since last exit sound
    const currentTime = Date.now();
    if (currentTime - lastExitSoundTime < minSoundInterval) {
      return; // Skip this sound
    }
    lastExitSoundTime = currentTime;

    // Try to resume audio context if it's suspended
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Descending tone for exit sound
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.3);

    gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  }

  function updateRotation() {
    // No CSS animation - rotation handled in animateBall()
    speedDisplay.textContent = `${rotationDuration}s`;
  }

  function updateBreak() {
    const circumference = 2 * Math.PI * 80; // 2πr where r=80
    // Convert degrees to arc length
    const breakGap = (breakDegrees / 360) * circumference;
    const dashLength = circumference - breakGap;

    // Set stroke-dasharray
    circleElement.setAttribute('stroke-dasharray', `${dashLength} ${breakGap}`);

    // Position the break centered at 270° (top of circle)
    // Pattern by default: solid from 0° to dashLength, gap from dashLength to circumference
    // Gap center in pattern: dashLength + breakGap/2 = (circumference - breakGap) + breakGap/2 = circumference - breakGap/2
    // Want gap center at 270° = circumference * 0.75
    // Need to shift: offset = circumference * 0.75 - (circumference - breakGap/2)
    // offset = circumference * 0.75 - circumference + breakGap/2 = -circumference * 0.25 + breakGap/2
    // But stroke-dashoffset positive = counter-clockwise, so we negate
    const offset = circumference * 0.25 - breakGap / 2;
    circleElement.setAttribute('stroke-dashoffset', offset);

    breakDisplay.textContent = `${breakDegrees}°`;
  }

  // Initialize audio on first user interaction
  document.addEventListener('click', initAudioContext, { once: true });
  document.addEventListener('keydown', initAudioContext, { once: true });

  // Try to resume audio context on any button click
  document.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', initAudioContext);
  });

  // Speed controls
  if (speedUpBtn) {
    speedUpBtn.addEventListener('click', () => {
      initAudioContext();
      rotationDuration = Math.max(0.5, rotationDuration - 0.5);
      updateRotation();
    });
  }

  if (speedDownBtn) {
    speedDownBtn.addEventListener('click', () => {
      initAudioContext();
      rotationDuration += 0.5;
      updateRotation();
    });
  }

  // Break controls
  if (breakMoreBtn) {
    breakMoreBtn.addEventListener('click', () => {
      initAudioContext();
      breakDegrees = Math.min(180, breakDegrees + 5);
      updateBreak();
    });
  }

  if (breakLessBtn) {
    breakLessBtn.addEventListener('click', () => {
      initAudioContext();
      breakDegrees = Math.max(0, breakDegrees - 5);
      updateBreak();
    });
  }

  // Ball speed controls
  if (speedBallUpBtn) {
    speedBallUpBtn.addEventListener('click', () => {
      initAudioContext();
      ballSpeed = Math.min(10, ballSpeed + 0.5);
      ballSpeedDisplay.textContent = ballSpeed.toFixed(1);
      // Update velocity to match new effective speed for all existing balls (maintain direction)
      const effectiveSpeed = getEffectiveSpeed();
      for (let i = 0; i < balls.length; i++) {
        const currentSpeed = Math.sqrt(balls[i].velocityX * balls[i].velocityX + balls[i].velocityY * balls[i].velocityY);
        if (currentSpeed > 0) {
          balls[i].velocityX = (balls[i].velocityX / currentSpeed) * effectiveSpeed;
          balls[i].velocityY = (balls[i].velocityY / currentSpeed) * effectiveSpeed;
        }
      }
    });
  }

  if (speedBallDownBtn) {
    speedBallDownBtn.addEventListener('click', () => {
      initAudioContext();
      ballSpeed = Math.max(0.5, ballSpeed - 0.5);
      ballSpeedDisplay.textContent = ballSpeed.toFixed(1);
      // Update velocity to match new effective speed for all existing balls (maintain direction)
      const effectiveSpeed = getEffectiveSpeed();
      for (let i = 0; i < balls.length; i++) {
        const currentSpeed = Math.sqrt(balls[i].velocityX * balls[i].velocityX + balls[i].velocityY * balls[i].velocityY);
        if (currentSpeed > 0) {
          balls[i].velocityX = (balls[i].velocityX / currentSpeed) * effectiveSpeed;
          balls[i].velocityY = (balls[i].velocityY / currentSpeed) * effectiveSpeed;
        }
      }
    });
  }

  // Reset
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      initAudioContext();
      rotationDuration = 2;
      breakDegrees = 30;
      ballSpeed = 5.0;
      rotationAngle = 0;
      exitCount = 0; // Reset exit counter
      totalBallsGenerated = 0; // Reset total balls counter
      lastSpawnTime = 0; // Reset spawn time tracker
      lastCollisionSoundTime = 0; // Reset sound rate limiters
      lastExitSoundTime = 0;
      updateRotation();
      updateBreak();
      ballSpeedDisplay.textContent = ballSpeed.toFixed(1);

      // Clear all existing balls
      while (balls.length > 0) {
        if (balls[0] && balls[0].element) {
          circleSvg.removeChild(balls[0].element);
        }
        balls.splice(0, 1);
      }

      // Spawn initial ball at +10°
      balls.push(createBall(10));
      updateBallCount();
    });
  }

  // Helper function to create a new ball at specific angle
  // angleDegrees: 0 = straight down, +10 = right of down, -10 = left of down
  function createBall(angleDegrees) {
    // Convert angle to radians, with 0° = straight down (90° in standard math)
    const launchAngle = (90 + angleDegrees) * (Math.PI / 180);
    const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    svgElement.setAttribute('r', ballRadius);

    // Random color from the ballColors array
    const randomColor = ballColors[Math.floor(Math.random() * ballColors.length)];
    svgElement.setAttribute('fill', randomColor);

    circleSvg.appendChild(svgElement);

    // Increment total balls generated counter
    totalBallsGenerated++;

    // Use effective speed based on current ball count (before adding this new ball)
    const effectiveSpeed = getEffectiveSpeed();

    return {
      x: circleCenterX,
      y: circleCenterY - circleRadius + ballRadius + 2, // Inside the circle at top (2 units below top edge)
      velocityX: effectiveSpeed * Math.cos(launchAngle), // cos for X component when 0° is down
      velocityY: effectiveSpeed * Math.sin(launchAngle), // sin for Y component when 0° is down
      element: svgElement,
      wasOutsideBoundary: false // Track if ball was outside in previous frame
    };
  }

  // Helper function to spawn two balls (one at +10°, one at -10°)
  function spawnBalls() {
    balls.push(createBall(10));  // Right
    balls.push(createBall(-10)); // Left
    updateBallCount();
  }

  // Helper function to remove a ball
  function removeBall(index) {
    if (balls[index] && balls[index].element) {
      circleSvg.removeChild(balls[index].element);
    }
    balls.splice(index, 1);
    updateBallCount();
  }

  // Calculate effective speed based on ball count
  // Speed decreases linearly from base speed (at 1 ball) to minimum 2.0 (at 200 balls)
  function getEffectiveSpeed() {
    if (balls.length <= 1) {
      return ballSpeed;
    }
    // Reduction increases from 0 (at 1 ball) to 3.0 (at 200 balls)
    const reductionFactor = Math.min(((balls.length - 1) / 199) * 3.0, 3.0);
    return Math.max(2.0, ballSpeed - reductionFactor);
  }

  // Helper function to update ball count display
  function updateBallCount() {
    if (ballCountDisplay) {
      ballCountDisplay.textContent = balls.length;
    }

    if (totalBallsDisplay) {
      totalBallsDisplay.textContent = totalBallsGenerated;
    }

    // Update message based on ball count
    if (ballMessageDisplay) {
      if (balls.length === 1) {
        ballMessageDisplay.textContent = 'let see what happen when ball get out of circle';
      } else if (balls.length >= 2 && balls.length <= 10) {
        ballMessageDisplay.textContent = 'two balls generate when one goes out of circle.';
      } else if (balls.length >= 11) {
        ballMessageDisplay.textContent = 'lets see what happen at last..';
      }
    }
  }

  // Helper function to check if angle is in the break gap
  function isInBreakGap(angle) {
    // Normalize angle to 0-360
    let normalizedAngle = ((angle % 360) + 360) % 360;

    // Calculate break start and end angles (break is at top, rotates with circle)
    const breakStartAngle = (270 - breakDegrees / 2 + rotationAngle) % 360;
    const breakEndAngle = (270 + breakDegrees / 2 + rotationAngle) % 360;

    // Handle wrap-around case
    if (breakStartAngle > breakEndAngle) {
      return normalizedAngle >= breakStartAngle || normalizedAngle <= breakEndAngle;
    } else {
      return normalizedAngle >= breakStartAngle && normalizedAngle <= breakEndAngle;
    }
  }

  // Helper function to handle ball-to-ball collision
  function handleBallCollision(ball1, ball2) {
    const dx = ball2.x - ball1.x;
    const dy = ball2.y - ball1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const minDistance = ballRadius * 2;

    // Check if balls are colliding
    if (distance < minDistance && distance > 0) {
      // Normalize collision vector
      const nx = dx / distance;
      const ny = dy / distance;

      // Relative velocity
      const dvx = ball2.velocityX - ball1.velocityX;
      const dvy = ball2.velocityY - ball1.velocityY;

      // Relative velocity in collision normal direction
      const dvn = dvx * nx + dvy * ny;

      // Do not resolve if velocities are separating
      if (dvn > 0) return;

      // Play ball collision sound
      playBallCollisionSound();

      // Equal mass elastic collision - exchange velocity components along collision normal
      ball1.velocityX += dvn * nx;
      ball1.velocityY += dvn * ny;
      ball2.velocityX -= dvn * nx;
      ball2.velocityY -= dvn * ny;

      // Get effective speed for normalization
      const effectiveSpeed = getEffectiveSpeed();

      // Normalize speeds to ensure they remain constant
      const speed1 = Math.sqrt(ball1.velocityX * ball1.velocityX + ball1.velocityY * ball1.velocityY);
      const speed2 = Math.sqrt(ball2.velocityX * ball2.velocityX + ball2.velocityY * ball2.velocityY);
      if (speed1 > 0) {
        ball1.velocityX = (ball1.velocityX / speed1) * effectiveSpeed;
        ball1.velocityY = (ball1.velocityY / speed1) * effectiveSpeed;
      }
      if (speed2 > 0) {
        ball2.velocityX = (ball2.velocityX / speed2) * effectiveSpeed;
        ball2.velocityY = (ball2.velocityY / speed2) * effectiveSpeed;
      }

      // Separate balls to prevent overlap
      const overlap = minDistance - distance;
      const separationX = (overlap / 2) * nx;
      const separationY = (overlap / 2) * ny;
      ball1.x -= separationX;
      ball1.y -= separationY;
      ball2.x += separationX;
      ball2.y += separationY;
    }
  }

  // Ball animation with constant velocity - moves in straight lines
  function animateBall() {
    // Update rotation angle based on duration (degrees per frame at 60fps)
    const rotationSpeed = 360 / (rotationDuration * 60); // degrees per frame
    rotationAngle = (rotationAngle + rotationSpeed) % 360;

    // Apply rotation to circle via transform
    circleElement.style.transform = `rotate(${rotationAngle}deg)`;

    const padding = 30;
    const maxDist = circleRadius - ballRadius;

    // Get effective speed based on current ball count
    const effectiveSpeed = getEffectiveSpeed();

    // Track which balls need to be removed (touched rectangle)
    const ballsToRemove = [];

    // Process each ball
    for (let i = 0; i < balls.length; i++) {
      const currentBall = balls[i];

      // Normalize ball velocity to effective speed
      const currentSpeed = Math.sqrt(currentBall.velocityX * currentBall.velocityX + currentBall.velocityY * currentBall.velocityY);
      if (currentSpeed > 0) {
        currentBall.velocityX = (currentBall.velocityX / currentSpeed) * effectiveSpeed;
        currentBall.velocityY = (currentBall.velocityY / currentSpeed) * effectiveSpeed;
      }

      // Update position (straight line motion with constant velocity in world coordinates)
      currentBall.x += currentBall.velocityX;
      currentBall.y += currentBall.velocityY;

      // Check if ball has touched the rectangular container boundary
      if (currentBall.x - ballRadius < -padding || currentBall.x + ballRadius > 200 + padding ||
          currentBall.y - ballRadius < -padding || currentBall.y + ballRadius > 200 + padding) {
        ballsToRemove.push(i);
        continue;
      }

      // Calculate distance from center
      const dx = currentBall.x - circleCenterX;
      const dy = currentBall.y - circleCenterY;
      const distFromCenter = Math.sqrt(dx * dx + dy * dy);

      // Check if ball is outside the circle boundary
      const isOutsideBoundary = distFromCenter > maxDist;

      if (isOutsideBoundary) {
        // Calculate angle of ball position (in degrees)
        let ballAngle = Math.atan2(dy, dx) * (180 / Math.PI);

        if (isInBreakGap(ballAngle)) {
          // Ball is outside in the break gap area - let it pass through
          // It will reset when it hits the square boundary
          currentBall.wasOutsideBoundary = true;
        } else {
          // Ball is outside at a solid part

          // Only process collision if this is a NEW collision (ball wasn't outside last frame)
          if (!currentBall.wasOutsideBoundary) {
            // Play collision sound
            playCircleCollisionSound();

            // Normal vector (pointing outward from center)
            const nx = dx / distFromCenter;
            const ny = dy / distFromCenter;

            // Calculate velocity dot product with normal
            const vDotN = currentBall.velocityX * nx + currentBall.velocityY * ny;

            // Calculate collision point on the circle boundary
            const collisionX = circleCenterX + nx * maxDist;
            const collisionY = circleCenterY + ny * maxDist;

            // Reflect velocity: v' = v - 2(v·n)n
            currentBall.velocityX = currentBall.velocityX - 2 * vDotN * nx;
            currentBall.velocityY = currentBall.velocityY - 2 * vDotN * ny;

            // Add random angle variation (-2 to +2 degrees) to reflected velocity
            const randomAngle = (Math.random() * 4 - 2) * (Math.PI / 180); // -2 to +2 degrees in radians
            const currentVx = currentBall.velocityX;
            const currentVy = currentBall.velocityY;
            const cosAngle = Math.cos(randomAngle);
            const sinAngle = Math.sin(randomAngle);
            currentBall.velocityX = currentVx * cosAngle - currentVy * sinAngle;
            currentBall.velocityY = currentVx * sinAngle + currentVy * cosAngle;

            // Ensure speed is exactly preserved after rotation
            const currentSpeed = Math.sqrt(currentBall.velocityX * currentBall.velocityX + currentBall.velocityY * currentBall.velocityY);
            if (currentSpeed > 0) {
              currentBall.velocityX = (currentBall.velocityX / currentSpeed) * effectiveSpeed;
              currentBall.velocityY = (currentBall.velocityY / currentSpeed) * effectiveSpeed;
            }

            // No energy loss - ball maintains speed after reflection

            // Move ball back to exactly the boundary position
            currentBall.x = collisionX;
            currentBall.y = collisionY;
          }

          // Mark that ball is outside boundary
          currentBall.wasOutsideBoundary = true;
        }
      } else {
        // Ball is inside boundary - reset the flag
        currentBall.wasOutsideBoundary = false;
      }

      // Update ball position in SVG
      currentBall.element.setAttribute('cx', currentBall.x);
      currentBall.element.setAttribute('cy', currentBall.y);
    }

    // Check for ball-to-ball collisions
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        handleBallCollision(balls[i], balls[j]);
      }
    }

    // Remove balls that touched rectangle and spawn two new ones for each
    for (let i = ballsToRemove.length - 1; i >= 0; i--) {
      // Play exit sound only for first 10 exits
      if (exitCount < 10) {
        playBallExitSound();
        exitCount++;
      }

      removeBall(ballsToRemove[i]);

      // Calculate delay: base 1s + 1s for each subsequent pair
      // Each pair takes 0.5s to spawn (first ball + 0.5s for second ball)
      // Plus 0.5s gap before next pair = 1s total between pair starts
      const pairIndex = ballsToRemove.length - 1 - i; // 0 for first, 1 for second, etc.
      const delay = 1000 + (pairIndex * 1000); // 1s, 2s, 3s, etc.

      setTimeout(() => {
        spawnBalls();
        lastSpawnTime = Date.now() + 500; // Mark when this pair will complete (current time + 0.5s for second ball)
      }, delay);

      // Stop animation if we've reached more than 200 balls
      if (balls.length > 200) {
        isPlaying = false;
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
          animationFrameId = null;
        }
        break;
      }
    }

    // Continue animation if playing
    if (isPlaying) {
      animationFrameId = requestAnimationFrame(animateBall);
    }
  }

  // Initialize
  updateRotation();
  updateBreak();
  ballSpeedDisplay.textContent = ballSpeed.toFixed(1);

  // Spawn initial ball at +10°
  balls.push(createBall(10));
  updateBallCount();

  animateBall();
});