// 背景动效 - 使用p5.js创建粒子和流体效果
let particles = [];
let flowField = [];
let cols, rows;
let zoff = 0;
let inc = 0.1;
let scl = 20;

// p5.js主函数
function setup() {
    // 创建画布并放入指定容器
    let canvas = createCanvas(windowWidth, windowHeight);
    canvas.parent('background-animation');
    
    // 设置流场网格
    cols = floor(width / scl) + 1;
    rows = floor(height / scl) + 1;
    
    // 初始化粒子系统
    for (let i = 0; i < 200; i++) {
        particles.push(new Particle());
    }
    
    // 初始化流场
    flowField = new Array(cols * rows);
}

function draw() {
    // 设置背景为透明
    clear();
    
    // 更新流场
    let yoff = 0;
    for (let y = 0; y < rows; y++) {
        let xoff = 0;
        for (let x = 0; x < cols; x++) {
            let index = x + y * cols;
            let angle = noise(xoff, yoff, zoff) * TWO_PI * 4;
            let v = p5.Vector.fromAngle(angle);
            v.setMag(1);
            flowField[index] = v;
            xoff += inc;
        }
        yoff += inc;
    }
    zoff += 0.003;
    
    // 更新和绘制粒子
    for (let particle of particles) {
        particle.follow(flowField);
        particle.update();
        particle.edges();
        particle.show();
    }
}

// 粒子类
class Particle {
    constructor() {
        this.pos = createVector(random(width), random(height));
        this.vel = createVector(0, 0);
        this.acc = createVector(0, 0);
        this.maxspeed = 2;
        this.prevPos = this.pos.copy();
        this.alpha = random(50, 150);
        this.size = random(1, 3);
        this.color = this.getRandomColor();
    }
    
    getRandomColor() {
        // 生成与主题匹配的颜色
        const colors = [
            [99, 102, 241],   // 主色调紫色
            [168, 85, 247],   // 渐变紫色
            [16, 185, 129],   // 成功色
            [245, 158, 11],   // 警告色
        ];
        return random(colors);
    }
    
    follow(vectors) {
        let x = floor(this.pos.x / scl);
        let y = floor(this.pos.y / scl);
        let index = x + y * cols;
        let force = vectors[index];
        if (force) {
            this.applyForce(force);
        }
    }
    
    applyForce(force) {
        this.acc.add(force);
    }
    
    update() {
        this.vel.add(this.acc);
        this.vel.limit(this.maxspeed);
        this.pos.add(this.vel);
        this.acc.mult(0);
        
        // 添加一些随机性
        if (random(1) < 0.01) {
            this.vel.add(p5.Vector.random2D().mult(0.5));
        }
    }
    
    show() {
        // 绘制粒子轨迹
        stroke(...this.color, this.alpha * 0.6);
        strokeWeight(this.size * 0.5);
        line(this.pos.x, this.pos.y, this.prevPos.x, this.prevPos.y);
        
        // 绘制粒子
        fill(...this.color, this.alpha);
        noStroke();
        ellipse(this.pos.x, this.pos.y, this.size);
        
        this.updatePrevPos();
    }
    
    updatePrevPos() {
        this.prevPos.x = this.pos.x;
        this.prevPos.y = this.pos.y;
    }
    
    edges() {
        // 边界处理 - 重新生成粒子
        if (this.pos.x > width) {
            this.pos.x = 0;
            this.updatePrevPos();
        }
        if (this.pos.x < 0) {
            this.pos.x = width;
            this.updatePrevPos();
        }
        if (this.pos.y > height) {
            this.pos.y = 0;
            this.updatePrevPos();
        }
        if (this.pos.y < 0) {
            this.pos.y = height;
            this.updatePrevPos();
        }
    }
}

// 响应窗口大小变化
function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    cols = floor(width / scl) + 1;
    rows = floor(height / scl) + 1;
    flowField = new Array(cols * rows);
}

// 鼠标交互 - 创建波动效果
function mousePressed() {
    if (mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height) {
        // 在鼠标位置添加一些新粒子
        for (let i = 0; i < 10; i++) {
            let particle = new Particle();
            particle.pos.x = mouseX + random(-50, 50);
            particle.pos.y = mouseY + random(-50, 50);
            particle.alpha = 255;
            particle.size = random(2, 5);
            particles.push(particle);
        }
        
        // 移除旧粒子保持性能
        if (particles.length > 300) {
            particles.splice(0, 10);
        }
    }
} 