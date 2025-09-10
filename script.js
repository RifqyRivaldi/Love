var settings = {
    particles: {
        length: 500, // Number of particles
        duration: 2, // Particle duration in seconds
        velocity: 100, // Particle velocity in pixels per second
        effect: -0.75, // Particle effect (0 = no effect, -1 = reverse, 1 = normal)
        size: 30, // Particle size in pixels
    },
};

// Polyfill for requestAnimationFrame
(function(){
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
        window.cancelAnimationFrame = window[vendors[x] + 'CancelAnimationFrame'] || 
                                     window[vendors[x] + 'CancelRequestAnimationFrame'];
    }
    
    if (!window.requestAnimationFrame) {
        window.requestAnimationFrame = function(callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function() { callback(currTime + timeToCall); }, timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };
    }
    
    if (!window.cancelAnimationFrame) {
        window.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
    }
}());

// Point class
var Point = (function() {
    function Point(x, y) {
        this.x = (typeof x !== 'undefined') ? x : 0;
        this.y = (typeof y !== 'undefined') ? y : 0;
    }   
    
    Point.prototype.clone = function() {
        return new Point(this.x, this.y);
    };
    
    Point.prototype.length = function(length) {
        if (typeof length === 'undefined') {
            return Math.sqrt(this.x * this.x + this.y * this.y);
        }
        this.normalize();
        this.x *= length;
        this.y *= length;
        return this;
    };
    
    Point.prototype.normalize = function() {
        var length = this.length();
        if (length > 0) {
            this.x /= length;
            this.y /= length;
        }
        return this;
    };

    return Point;
})();

// Particle class
var Particle = (function() {
    function Particle() {
        this.position = new Point();
        this.velocity = new Point();
        this.acceleration = new Point();
        this.age = 0;
    }
    
    Particle.prototype.initialize = function(x, y, dx, dy) {
        this.position.x = x;
        this.position.y = y;
        this.velocity.x = dx;
        this.velocity.y = dy;
        this.acceleration.x = dx * settings.particles.effect;
        this.acceleration.y = dy * settings.particles.effect;
        this.age = 0;
    };
    
    Particle.prototype.update = function(deltaTime) {
        this.position.x += this.velocity.x * deltaTime;
        this.position.y += this.velocity.y * deltaTime;
        this.velocity.x += this.acceleration.x * deltaTime;
        this.velocity.y += this.acceleration.y * deltaTime;
        this.age += deltaTime;
    };
    
    Particle.prototype.draw = function(context, image) {
        function ease(t) {
            return (--t) * t * t + 1;
        }
        
        var size = image.width * ease(this.age / settings.particles.duration);
        context.globalAlpha = 1 - this.age / settings.particles.duration;
        context.drawImage(image, this.position.x - size / 2, this.position.y - size / 2, size, size);
    };

    return Particle;
})();

// Particle pool class
var ParticlePool = (function() {
    var particles, firstActive = 0, firstFree = 0, duration = settings.particles.duration;

    function ParticlePool(length) {
        particles = new Array(length);
        for (var i = 0; i < particles.length; i++) {
            particles[i] = new Particle();
        }
    }
    
    ParticlePool.prototype.add = function(x, y, dx, dy) {
        particles[firstFree].initialize(x, y, dx, dy);
        firstFree++;
        
        if (firstFree === particles.length) {
            firstFree = 0;
        }
        if (firstActive === firstFree) {
            firstActive++;
            if (firstActive === particles.length) {
                firstActive = 0;
            }
        }
    };
    
    ParticlePool.prototype.update = function(deltaTime) {
        var i;
        
        // Update active particles
        if (firstActive < firstFree) {
            for (i = firstActive; i < firstFree; i++) {
                particles[i].update(deltaTime);
            }
        } else if (firstFree < firstActive) {
            for (i = firstActive; i < particles.length; i++) {
                particles[i].update(deltaTime);
            }
            for (i = 0; i < firstFree; i++) {
                particles[i].update(deltaTime);
            }
        }
        
        // Remove old particles
        while (particles[firstActive].age >= duration && firstActive !== firstFree) {
            firstActive++;
            if (firstActive === particles.length) {
                firstActive = 0;
            }
        }
    };
    
    ParticlePool.prototype.draw = function(context, image) {
        var i;
        
        if (firstActive < firstFree) {
            for (i = firstActive; i < firstFree; i++) {
                particles[i].draw(context, image);
            }
        } else if (firstFree < firstActive) {
            for (i = firstActive; i < particles.length; i++) {
                particles[i].draw(context, image);
            }
            for (i = 0; i < firstFree; i++) {
                particles[i].draw(context, image);
            }
        }
    };

    return ParticlePool;
})();

// Main animation function
(function(canvas) {
    if (!canvas) return;
    
    var context = canvas.getContext('2d');
    var particles = new ParticlePool(settings.particles.length);
    var particleRate = settings.particles.length / settings.particles.duration;
    var time;
    
    function pointOnHeart(t) {
        return new Point(
            160 * Math.pow(Math.sin(t), 3),
            130 * Math.cos(t) - 50 * Math.cos(2 * t) - 20 * Math.cos(3 * t) - 10 * Math.cos(4 * t) + 25
        );
    }
    
    var image = (function() {
        var canvas = document.createElement('canvas');
        var context = canvas.getContext('2d');
        canvas.width = settings.particles.size;
        canvas.height = settings.particles.size;
        
        function to(t) {
            var point = pointOnHeart(t);
            point.x = settings.particles.size / 2 + point.x * settings.particles.size / 350;
            point.y = settings.particles.size / 2 - point.y * settings.particles.size / 350;
            return point;
        }
        
        context.beginPath();
        var t = -Math.PI;
        var point = to(t);
        context.moveTo(point.x, point.y);
        
        while (t < Math.PI) {
            t += 0.01;
            point = to(t);
            context.lineTo(point.x, point.y);
        }
        
        context.closePath();
        context.fillStyle = '#87ceeb';
        context.fill();
        
        var image = new Image();
        image.src = canvas.toDataURL();
        return image;
    })();
    
    function render() {
        requestAnimationFrame(render);
        
        var newTime = new Date().getTime() / 1000;
        var deltaTime = newTime - (time || newTime);
        time = newTime;
        
        context.clearRect(0, 0, canvas.width, canvas.height);
        
        var amount = particleRate * deltaTime;
        for (var i = 0; i < amount; i++) {
            var pos = pointOnHeart(Math.PI - 2 * Math.PI * Math.random());
            var dir = pos.clone().length(settings.particles.velocity);
            particles.add(canvas.width / 2 + pos.x, canvas.height / 2 - pos.y, dir.x, -dir.y);
        }
        
        particles.update(deltaTime);
        particles.draw(context, image);
    }
    
    function onResize() {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
    }
    
    window.addEventListener('resize', onResize);
    
    // Start the animation after the image is loaded
    if (image.complete) {
        setTimeout(function() {
            onResize();
            render();
        }, 10);
    } else {
        image.onload = function() {
            setTimeout(function() {
                onResize();
                render();
            }, 10);
        };
    }
})(document.getElementById('pinkboard'));

// DOM interaction code
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the welcome page
    const envelope = document.querySelector('.envelope');
    const heartButton = document.querySelector('.heart-button');
    const welcomePage = document.querySelector('.welcome-page');
    const heartAnimationPage = document.querySelector('.heart-animation-page');
    
    if (!envelope || !welcomePage) return;
    
    // Function to create falling hearts
    function createFallingHearts() {
        const container = document.querySelector('.floating-hearts');
        if (!container) return;
        
        for (let i = 0; i < 15; i++) {
            const heart = document.createElement('div');
            heart.innerHTML = '❤';
            heart.style.position = 'absolute';
            heart.style.fontSize = (Math.random() * 15 + 10) + 'px';
            heart.style.color = ['#ff9ec0', '#ff6b8b', '#ffb3c8'][Math.floor(Math.random() * 3)];
            heart.style.opacity = Math.random() * 0.5 + 0.3;
            heart.style.left = Math.random() * 100 + '%';
            heart.style.top = '-50px';
            heart.style.animation = `fall ${Math.random() * 5 + 5}s linear infinite`;
            heart.style.animationDelay = Math.random() * 5 + 's';
            container.appendChild(heart);
        }
        
        // Add fall animation keyframes
        if (!document.querySelector('#fall-animation')) {
            const style = document.createElement('style');
            style.id = 'fall-animation';
            style.innerHTML = `
                @keyframes fall {
                    to {
                        transform: translateY(100vh) rotate(360deg);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    // Function to switch to heart animation page
    function showHeartAnimation() {
        if (welcomePage && heartAnimationPage) {
            welcomePage.classList.add('hidden');
            heartAnimationPage.classList.remove('hidden');
            
            // Trigger resize to ensure canvas is properly sized
            setTimeout(() => {
                window.dispatchEvent(new Event('resize'));
            }, 100);
        }
    }
    
    // Add event listeners
    if (envelope) {
        envelope.addEventListener('click', showHeartAnimation);
    }
    
    if (heartButton) {
        heartButton.addEventListener('click', showHeartAnimation);
    }
    
    // Create falling hearts
    createFallingHearts();
    
    // Typewriter effect for message
    const messageElement = document.querySelector('.letter-content p:nth-child(2)');
    if (messageElement) {
        const message = "Ada sesuatu yang spesial menantimu...";
        let i = 0;
        
        messageElement.textContent = '';
        
        function typeWriter() {
            if (i < message.length) {
                messageElement.textContent += message.charAt(i);
                i++;
                setTimeout(typeWriter, 100);
            }
        }
        
        // Start typewriter effect after delay
        setTimeout(typeWriter, 1000);
    }
});