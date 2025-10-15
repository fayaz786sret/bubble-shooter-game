import React, { useState, useEffect, useRef } from 'react';

const BubbleShooter = () => {
  const canvasRef = useRef(null);
  const [score, setScore] = useState(0);
  const [targetScore, setTargetScore] = useState(1000);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [confetti, setConfetti] = useState([]);
  const gameStateRef = useRef({
    bubbles: [],
    currentBubble: null,
    nextBubble: null,
    angle: 0,
    shooting: false,
    shootingBubble: null
  });

  const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];
  const BUBBLE_RADIUS = 20;
  const ROWS = 8;
  const COLS = 15;
  const SHOOTER_Y = 550;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationId;

    // Initialize grid
    const initGrid = () => {
      const bubbles = [];
      for (let row = 0; row < 5; row++) {
        for (let col = 0; col < COLS; col++) {
          if (row % 2 === 1 && col === COLS - 1) continue;
          bubbles.push({
            x: col * BUBBLE_RADIUS * 2 + (row % 2 === 1 ? BUBBLE_RADIUS : 0) + BUBBLE_RADIUS,
            y: row * BUBBLE_RADIUS * 2 + BUBBLE_RADIUS,
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            row,
            col
          });
        }
      }
      return bubbles;
    };

    const createBubble = () => ({
      color: COLORS[Math.floor(Math.random() * COLORS.length)]
    });

    gameStateRef.current.bubbles = initGrid();
    gameStateRef.current.currentBubble = createBubble();
    gameStateRef.current.nextBubble = createBubble();

    const drawBubble = (x, y, color) => {
      ctx.beginPath();
      ctx.arc(x, y, BUBBLE_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    };

    const getGridPosition = (x, y) => {
      const row = Math.round((y - BUBBLE_RADIUS) / (BUBBLE_RADIUS * 2));
      const offset = row % 2 === 1 ? BUBBLE_RADIUS : 0;
      const col = Math.round((x - BUBBLE_RADIUS - offset) / (BUBBLE_RADIUS * 2));
      return { row, col };
    };

    const getNeighbors = (row, col) => {
      const neighbors = [];
      const isOddRow = row % 2 === 1;
      
      const offsets = isOddRow
        ? [[-1, 0], [-1, 1], [0, -1], [0, 1], [1, 0], [1, 1]]
        : [[-1, -1], [-1, 0], [0, -1], [0, 1], [1, -1], [1, 0]];

      offsets.forEach(([dr, dc]) => {
        const newRow = row + dr;
        const newCol = col + dc;
        neighbors.push({ row: newRow, col: newCol });
      });

      return neighbors;
    };

    const findMatches = (row, col, color) => {
      const matches = [];
      const visited = new Set();
      const queue = [{ row, col }];

      while (queue.length > 0) {
        const { row: r, col: c } = queue.shift();
        const key = `${r},${c}`;
        
        if (visited.has(key)) continue;
        visited.add(key);

        const bubble = gameStateRef.current.bubbles.find(
          b => b.row === r && b.col === c && b.color === color
        );

        if (bubble) {
          matches.push(bubble);
          getNeighbors(r, c).forEach(n => {
            if (!visited.has(`${n.row},${n.col}`)) {
              queue.push(n);
            }
          });
        }
      }

      return matches;
    };

    const removeFloating = () => {
      const connected = new Set();
      const queue = [];

      // Find all bubbles connected to top row
      gameStateRef.current.bubbles.forEach(b => {
        if (b.row === 0) {
          queue.push(b);
          connected.add(`${b.row},${b.col}`);
        }
      });

      while (queue.length > 0) {
        const bubble = queue.shift();
        getNeighbors(bubble.row, bubble.col).forEach(({ row, col }) => {
          const key = `${row},${col}`;
          if (!connected.has(key)) {
            const neighbor = gameStateRef.current.bubbles.find(
              b => b.row === row && b.col === col
            );
            if (neighbor) {
              connected.add(key);
              queue.push(neighbor);
            }
          }
        });
      }

      const removed = gameStateRef.current.bubbles.filter(
        b => !connected.has(`${b.row},${b.col}`)
      );

      gameStateRef.current.bubbles = gameStateRef.current.bubbles.filter(
        b => connected.has(`${b.row},${b.col}`)
      );

      return removed.length;
    };

    const gameLoop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw background
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw grid bubbles
      gameStateRef.current.bubbles.forEach(bubble => {
        drawBubble(bubble.x, bubble.y, bubble.color);
      });

      // Draw aiming line
      const shooterX = canvas.width / 2;
      if (!gameStateRef.current.shooting) {
        ctx.save();
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(shooterX, SHOOTER_Y);
        
        // Calculate line endpoint
        const lineLength = 300;
        const endX = shooterX + Math.sin(gameStateRef.current.angle) * lineLength;
        const endY = SHOOTER_Y - Math.cos(gameStateRef.current.angle) * lineLength;
        
        // Draw line with wall bounce
        let currentX = shooterX;
        let currentY = SHOOTER_Y;
        let dirX = Math.sin(gameStateRef.current.angle);
        let dirY = -Math.cos(gameStateRef.current.angle);
        let remainingLength = lineLength;
        
        while (remainingLength > 0) {
          const nextX = currentX + dirX * remainingLength;
          const nextY = currentY + dirY * remainingLength;
          
          // Check wall collision
          if (nextX < BUBBLE_RADIUS) {
            const t = (BUBBLE_RADIUS - currentX) / dirX;
            const bounceX = BUBBLE_RADIUS;
            const bounceY = currentY + dirY * t;
            ctx.lineTo(bounceX, bounceY);
            currentX = bounceX;
            currentY = bounceY;
            dirX = -dirX;
            remainingLength -= t;
          } else if (nextX > canvas.width - BUBBLE_RADIUS) {
            const t = (canvas.width - BUBBLE_RADIUS - currentX) / dirX;
            const bounceX = canvas.width - BUBBLE_RADIUS;
            const bounceY = currentY + dirY * t;
            ctx.lineTo(bounceX, bounceY);
            currentX = bounceX;
            currentY = bounceY;
            dirX = -dirX;
            remainingLength -= t;
          } else {
            ctx.lineTo(nextX, nextY);
            break;
          }
        }
        
        ctx.stroke();
        ctx.restore();
      }

      // Draw shooter
      ctx.save();
      ctx.translate(shooterX, SHOOTER_Y);
      ctx.rotate(gameStateRef.current.angle);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -40);
      ctx.stroke();
      ctx.restore();

      // Draw current bubble
      if (gameStateRef.current.currentBubble && !gameStateRef.current.shooting) {
        drawBubble(shooterX, SHOOTER_Y, gameStateRef.current.currentBubble.color);
      }

      // Draw next bubble
      if (gameStateRef.current.nextBubble) {
        drawBubble(50, SHOOTER_Y, gameStateRef.current.nextBubble.color);
        ctx.fillStyle = '#fff';
        ctx.font = '14px Arial';
        ctx.fillText('Next:', 50, SHOOTER_Y - 35);
      }

      // Update shooting bubble
      if (gameStateRef.current.shooting && gameStateRef.current.shootingBubble) {
        const sb = gameStateRef.current.shootingBubble;
        sb.x += sb.vx;
        sb.y += sb.vy;

        // Wall collision
        if (sb.x - BUBBLE_RADIUS < 0 || sb.x + BUBBLE_RADIUS > canvas.width) {
          sb.vx *= -1;
        }

        // Check collision with bubbles
        let collided = false;
        for (const bubble of gameStateRef.current.bubbles) {
          const dx = sb.x - bubble.x;
          const dy = sb.y - bubble.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < BUBBLE_RADIUS * 2) {
            collided = true;
            break;
          }
        }

        // Check if reached top or collided
        if (sb.y - BUBBLE_RADIUS < 0 || collided) {
          const { row, col } = getGridPosition(sb.x, sb.y);
          const offset = row % 2 === 1 ? BUBBLE_RADIUS : 0;
          const snapX = col * BUBBLE_RADIUS * 2 + offset + BUBBLE_RADIUS;
          const snapY = row * BUBBLE_RADIUS * 2 + BUBBLE_RADIUS;

          gameStateRef.current.bubbles.push({
            x: snapX,
            y: snapY,
            color: sb.color,
            row,
            col
          });

          // Check for matches
          const matches = findMatches(row, col, sb.color);
          if (matches.length >= 3) {
            gameStateRef.current.bubbles = gameStateRef.current.bubbles.filter(
              b => !matches.includes(b)
            );
            const floatingRemoved = removeFloating();
            setScore(s => s + matches.length * 10 + floatingRemoved * 5);
          }

          // Check win condition
          if (gameStateRef.current.bubbles.length === 0) {
            setWon(true);
            // Create confetti
            const newConfetti = [];
            for (let i = 0; i < 100; i++) {
              newConfetti.push({
                x: Math.random() * canvas.width,
                y: -Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 4,
                vy: Math.random() * 3 + 2,
                color: COLORS[Math.floor(Math.random() * COLORS.length)],
                size: Math.random() * 8 + 4,
                rotation: Math.random() * 360,
                rotationSpeed: (Math.random() - 0.5) * 10
              });
            }
            setConfetti(newConfetti);
            return;
          }

          // Check game over
          const maxY = Math.max(...gameStateRef.current.bubbles.map(b => b.y), 0);
          if (maxY > 500) {
            setGameOver(true);
          }

          gameStateRef.current.shooting = false;
          gameStateRef.current.shootingBubble = null;
          gameStateRef.current.currentBubble = gameStateRef.current.nextBubble;
          gameStateRef.current.nextBubble = createBubble();
        }

        drawBubble(sb.x, sb.y, sb.color);
      }

      // Draw confetti for win
      if (won && confetti.length > 0) {
        confetti.forEach((c, i) => {
          c.y += c.vy;
          c.x += c.vx;
          c.rotation += c.rotationSpeed;
          c.vy += 0.1; // Gravity

          ctx.save();
          ctx.translate(c.x, c.y);
          ctx.rotate((c.rotation * Math.PI) / 180);
          ctx.fillStyle = c.color;
          ctx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size);
          ctx.restore();

          if (c.y > canvas.height) {
            confetti[i].y = -10;
            confetti[i].x = Math.random() * canvas.width;
          }
        });
      }

      if (!gameOver && !won) {
        animationId = requestAnimationFrame(gameLoop);
      } else if (won) {
        animationId = requestAnimationFrame(gameLoop);
      }
    };

    const handleMouseMove = (e) => {
      if (gameStateRef.current.shooting) return;
      
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const shooterX = canvas.width / 2;
      
      // Calculate angle based on mouse X position relative to shooter
      const maxAngle = Math.PI * 0.45;
      const canvasCenter = canvas.width / 2;
      const mouseOffset = mouseX - canvasCenter;
      const maxOffset = canvas.width / 2;
      
      // Map mouse X position to angle
      gameStateRef.current.angle = (mouseOffset / maxOffset) * maxAngle;
      
      // Clamp angle
      gameStateRef.current.angle = Math.max(-maxAngle, Math.min(maxAngle, gameStateRef.current.angle));
    };

    const handleClick = () => {
      if (gameStateRef.current.shooting || !gameStateRef.current.currentBubble) return;

      const speed = 8;
      gameStateRef.current.shooting = true;
      gameStateRef.current.shootingBubble = {
        x: canvas.width / 2,
        y: SHOOTER_Y,
        vx: Math.sin(gameStateRef.current.angle) * speed,
        vy: -Math.cos(gameStateRef.current.angle) * speed,
        color: gameStateRef.current.currentBubble.color
      };
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('click', handleClick);

    gameLoop();

          return () => {
      cancelAnimationFrame(animationId);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('click', handleClick);
    };
  }, [gameOver, won, confetti]);

  const resetGame = () => {
    setScore(0);
    setGameOver(false);
    setWon(false);
    setConfetti([]);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-4">
      <div className="mb-4 text-center">
        <h1 className="text-4xl font-bold text-white mb-2">Bubble Shooter</h1>
        <p className="text-xl text-white">Score: {score}</p>
      </div>
      
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={620}
          height={600}
          className="border-4 border-blue-400 rounded-lg bg-gray-800"
        />
        
        {gameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 rounded-lg">
            <div className="text-center">
              <h2 className="text-4xl font-bold text-white mb-4">Game Over!</h2>
              <p className="text-2xl text-white mb-6">Final Score: {score}</p>
              <button
                onClick={resetGame}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-bold text-lg"
              >
                Play Again
              </button>
            </div>
          </div>
        )}

        {won && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-purple-900 to-blue-900 bg-opacity-95 rounded-lg">
            <div className="text-center relative">
              {/* Winner Frame */}
              <div className="absolute -inset-8 border-8 border-yellow-400 rounded-3xl animate-pulse shadow-2xl"></div>
              <div className="absolute -inset-4 border-4 border-yellow-300 rounded-2xl"></div>
              
              {/* Stars */}
              <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 flex gap-4">
                <span className="text-6xl animate-bounce" style={{ animationDelay: '0ms' }}>⭐</span>
                <span className="text-7xl animate-bounce" style={{ animationDelay: '150ms' }}>⭐</span>
                <span className="text-6xl animate-bounce" style={{ animationDelay: '300ms' }}>⭐</span>
              </div>

              <div className="relative z-10 bg-gradient-to-br from-yellow-400 to-orange-500 p-8 rounded-xl">
                <h2 className="text-5xl font-bold text-white mb-2 drop-shadow-lg animate-pulse">
                  🎉 YOU WIN! 🎉
                </h2>
                <p className="text-3xl text-white mb-2 font-bold drop-shadow-md">
                  CHAMPION!
                </p>
                <p className="text-2xl text-white mb-6 drop-shadow-md">
                  Final Score: {score}
                </p>
                <button
                  onClick={resetGame}
                  className="px-8 py-4 bg-green-500 text-white rounded-xl hover:bg-green-600 font-bold text-xl shadow-lg transform hover:scale-105 transition-transform"
                >
                  🎮 Play Again
                </button>
              </div>

              {/* Trophy */}
              <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2">
                <span className="text-8xl animate-bounce">🏆</span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-4 text-white text-center max-w-md">
        <p className="mb-2">🎯 Match 3 or more bubbles of the same color</p>
        <p>🖱️ Move mouse to aim, click to shoot</p>
      </div>
    </div>
  );
};

export default BubbleShooter;